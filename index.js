const express = require('express');
const fs = require('fs/promises');

const app = express();
app.use(express.json());

app.all('*', async (req, res, next) => {
    const auth = await fs.readFile('./auth')

    //if (auth !== 'public') {
        if (req.query.hostname) {
            fetch(`http://${req.query.hostname}/auth`)
                .then(response => response.text())
                .then(data => {
                    if (data == auth) {
                        next();
                    } else {
                        res.json({ error: true, errorMsg: `The domain ${req.query.hostname} does not contain the the auth token needed to access this server.` })
                    }
                })
                .catch(e => res.json({ error: true, errorMsg: `The domain ${req.query.hostname} is either not a GameHub instance or it is missing the verification token. If you are using an older fork of GameHub you may want to update.` }));
        } else {
            res.json({ error: true, errorMsg: `Missing required parameters.` })
        }
    /*} else {
        next();
    }*/
})

app.get('*', (req, res) => {
    fetch(`https://retronetworkapi.onrender.com/GameHub${req.originalUrl}`)
        .then(response => response.text())
        .then(response => {
            try {
                JSON.parse(response);
                res.json(JSON.parse(response));
            } catch (e) {
                res.send(response);
            }
        })
        .catch(e => res.json({ error: true, errorMsg: 'An internal server error occurred' }));
})

app.post('*', (req, res) => {
    fetch(`https://retronetworkapi.onrender.com/GameHub${req.originalUrl}`, { method: 'POST', body: JSON.stringify(req.body)})
        .then(response => response.text())
        .then(response => {
            try {
                JSON.parse(response);
                res.json(JSON.parse(response));
            } catch (e) {
                res.send(response);
            }
        })
        .catch(e => res.json({ error: true, errorMsg: 'An internal server error occurred' }));
})

app.listen(2000, () => {
    console.log('Your mirror server is running on port 2000');
});