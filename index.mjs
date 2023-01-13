import express from 'express';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const package = require('./package.json');
app.use(express.json());
app.use(cors({ origin: '*' }));

app.all('*', async (req, res, next) => {
    const auth = await fs.readFile('./auth');

    if (auth != 'public') {
        if (req.query.hostname) {
            fetch(`http://${req.query.hostname}/auth`)
                .then(response => response.text())
                .then(data => {
                    if (data == auth) {
                        next();
                    } else {
                        res.json({ error: true, errorMsg: `The domain ${req.query.hostname} does not contain the the auth token needed to access this server.` });
                    }
                })
                .catch(e => res.json({ error: true, errorMsg: `The domain ${req.query.hostname} is either not a GameHub instance or it is missing the verification token. If you are using an older fork of GameHub you may want to update.` }));
        } else {
            res.json({ error: true, errorMsg: `Missing required parameters.` })
        }
    } else {
        next();
    }
})

app.all('/', async (req, res) => {
    res.json({ server: 'ready', version: package.version, website: 'https://gh.retronetwork.ml', description: package.description, repository: package.repository.replace('git+', '') });
});

app.get('*', (req, res) => {
    try {
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
    } catch (e) {
        res.json({ error: true, errorMsg: 'An internal server error occurred' });
    }
})

app.post('*', async (req, res) => {
    try {
        const response = await fetch(`https://retronetworkapi.onrender.com/GameHub${req.originalUrl}`, {
            method: 'post',
            body: JSON.stringify(req.body),
            headers: { 'Content-Type': 'application/json' }
        });

        let data;

        try {
            data = response.json();
            res.json(data);
        } catch (e) {
            data = response.text();
            res.send(data);
        }
    } catch (e) {
        res.json({ error: true, errorMsg: 'An internal server error occurred' });
    }
})

app.listen(2000, () => {
    console.log(`Your mirror server is running on port 2000 using node ${process.version}`);
});