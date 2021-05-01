const express = require('express');
const { default: axios } = require("axios");
const moment = require('moment');

app = express();

const getWhatsAppUrl = (message, whatsAppApiKey) => {
    return encodeURI(`https://api.callmebot.com/whatsapp.php?phone=+917406058845&text=${message}&apikey=${whatsAppApiKey}`);
}

const getTelegramUrl = (message, username) => {
    return encodeURI(`http://api.callmebot.com/text.php?user=${username}&text=${message}`);
}

const getTelegramCallUrl = (message, username) => {
    return encodeURI(`http://api.callmebot.com/start.php?user=@${username}&text=${message}&lang=en-US-Standard-B&rpt=2`);
}

app.get('/send', (req, res) => {
    let message = '';
    console.log(req.query);

    let telegramUsername = req.query.telegramUsername;
    let whatsAppApiKey = req.query.whatsAppApiKey;

    let date = moment(new Date()).format('DD-MM-YYYY')
    axios(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=294&date=${date}`)
    .then((res) => {
        let centers = res.data.centers;
        let result = '';
        let count = 0;
        centers.forEach(center => {
            let localCount = 0
            let availabilityCount = 0;
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
                result += `${center.name}[${availabilityCount}][${localCount}]\n`;
            }
        });
        if (result.length > 0) {
            axios(getTelegramCallUrl('Please check Cowin website!', telegramUsername))
            .then(res => {
                // console.log(res);
                message = res;
            })
            .catch(err => {
                axios(getWhatsAppUrl('Please check Cowin website!', whatsAppApiKey))
                // console.log(err);
                message = err;
            });
        }
        result = `Total Count: ${count}\n` + result;
        axios(getWhatsAppUrl(result, whatsAppApiKey))
        .then(res => {
            // console.log(res);
            message = res;
        })
        .catch(err => {
            console.log(err);
            axios(getTelegramUrl(result, telegramUsername))
            .then(res => {
                // console.log(res);
                message = res;
            })
            .catch(err => {
                // console.log(err);
                message = err;
            })
        });
    })
    .catch(err => {
        let message = 'CoWin API not working!!!\n' + err.message.substring(0,100);
        axios(getWhatsAppUrl(message, whatsAppApiKey))
        .catch(getTelegramUrl(message, telegramUsername));
    })
    res.send(message);
})

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log('\nApp listening at port 3000! \n');
});
