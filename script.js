const express = require('express');
const { default: axios } = require("axios");
const moment = require('moment');

app = express();

const getCowinUrl = (districtId, date) => {
    return `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${districtId}&date=${date}`;
}

const getWhatsAppUrl = (message, whatsAppApiKey) => {
    return encodeURI(`https://api.callmebot.com/whatsapp.php?phone=+917406058845&text=${message}&apikey=${whatsAppApiKey}`);
}

const getTelegramUrl = (message, username) => {
    return encodeURI(`http://api.callmebot.com/text.php?user=${username}&text=${message}`);
}

const getTelegramCallUrl = (message, username) => {
    return encodeURI(`http://api.callmebot.com/start.php?user=@${username}&text=${message}&lang=en-US-Standard-B&rpt=2`);
}

const blacklistCenters = [421758];

const handleCronJobStatusChange = (isCronJobEnabled) => {
    let token = ''
    axios.post('https://api.cron-job.org/', {
        email: "g.k100799@gmail.com", 
        password: "SGK100799"
    }, { 
        headers: {
            "X-API-Method": "Login" ,
            "Content-Type": "application/json"
        }
    })
    .then(res => {
        token = res.data.token;
        return axios.post('https://api.cron-job.org/', { 
            jobId: 3663421
        }, { 
            headers: {
                Authorization: `Bearer ${token}`, 
                "X-API-Method": "GetJobDetails",
                "Content-Type": "application/json"
            }
        })
    })
    .then(res => {
        let payload = {
            job: {
                ...res.data.jobDetails,
                enabled: isCronJobEnabled
            },
            jobId: 3663421
        }
        return axios.post('https://api.cron-job.org/', payload, { 
            headers: {
                Authorization: `Bearer ${token}`, 
                "X-API-Method": "UpdateJob",
                "Content-Type": "application/json"
            }
        })
    })
}

app.get('/send', (req, res) => {
    let response = '';

    let telegramUsername = req.query.telegramUsername;
    let whatsAppApiKey = req.query.whatsAppApiKey;
    let districtId = req.query.districtId;
    
    let date = moment(new Date()).format('DD-MM-YYYY')
    let nextWeekDate = moment(date, "DD-MM-YYYY").add(7, 'days').format('DD-MM-YYYY');

    Promise.all([
        axios(getCowinUrl(districtId, date)),
        axios(getCowinUrl(districtId, nextWeekDate))
    ])
    .then((result) => {
        let centers = [...result[0].data.centers, ...result[1].data.centers];
        let count = 0;
        centers.forEach(center => {
            let localCount = 0
            let availabilityCount = 0;
            if (!blacklistCenters.includes(center.center_id)) {
                center.sessions.forEach(session => {
                    if (session.min_age_limit === 18) {
                        count += 1;
                        if (session.available_capacity > 0) {
                            localCount += 1;
                            availabilityCount += session.available_capacity
                        }
                    }
                })
                if (localCount > 0) {
                    response += `${center.name}[${availabilityCount}][${localCount}]\n`;
                }
            }
        });
        if (response.length > 0) {
            // axios(getTelegramCallUrl('Please check Cowin website!', telegramUsername))
            // .catch(err => {
            axios(getWhatsAppUrl('Please check Cowin website!', whatsAppApiKey))
            // .then(res => handleCronJobStatusChange(false))
                // console.log(err.message);
            // });
        }
        response = `Total Count: ${count}\n` + response;
        axios(getTelegramUrl(response, telegramUsername))
        .then(result => {
        })
        .catch(err => {
            console.log(err);
            axios(getWhatsAppUrl(response, whatsAppApiKey))
            .then(result => {
            })
            .catch(err => {
                console.log(err.message);
            })
        })
    })
    .then(none => res.send(response))
    .catch(err => {
        let emergencyMessage = 'CoWin API not working!!!\n' + err.message.substring(0,100);
        axios(getWhatsAppUrl(emergencyMessage, whatsAppApiKey))
        .catch(getTelegramUrl(emergencyMessage, telegramUsername));
        res.send(err.message)
    })
})

app.get('/check', (req, res) => {
    let telegramUsername = req.query.telegramUsername;
    let whatsAppApiKey = req.query.whatsAppApiKey;
    let districtId = req.query.districtId;
    let callEnabled = req.query.callEnabled;

    let response = '1 minute Cron Job here.\n';
    let sendEmergencyMessage = false;

    let date = moment(new Date()).format('DD-MM-YYYY')
    let nextWeekDate = moment(date, "DD-MM-YYYY").add(7, 'days').format('DD-MM-YYYY');

    Promise.all([
        axios(getCowinUrl(districtId, date)),
        axios(getCowinUrl(districtId, nextWeekDate))
    ])
    .then((result) => {
        let centers = [...result[0].data.centers, ...result[1].data.centers];
        centers.forEach(center => {
            if (!blacklistCenters.includes(center.center_id)) {
                center.sessions.forEach(session => {
                    if (session.min_age_limit === 18 && session.available_capacity > 0) {
                        response += 'Hospital ' + center.name + ' has ' + session.available_capacity + ' availability capacity for ' + session.date + '\n';
                        sendEmergencyMessage = true;   
                    }
                })
            }
        });
        if (sendEmergencyMessage) {
            axios(getTelegramUrl(response.substring(0, 100), telegramUsername))
            .then(result => {
                // handleCronJobStatusChange(false)
            })
            if (callEnabled) {
                axios(getTelegramCallUrl(response.substring(0, 100), telegramUsername))
                .then(res => {})
            }
            res.send(response.substring(0, 100));
        } else {
            res.send('Not Available');
        }
    })
    .catch(err => {
        let emergencyMessage = 'CoWin API not working!!!\n' + err.message.substring(0,100);
        res.send(emergencyMessage)
    })
})

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log('\nApp listening at port 3000! \n');
});
