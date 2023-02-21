import express from 'express';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
import cors from 'cors';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const app = express();
const packagefile = require('./package.json');
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
    res.json({ status: 'ready', version: packagefile.version, website: 'https://gh.retronetwork.ml', description: packagefile.description, repository: packagefile.repository.url.replace('git+', '').replace('.git', '') });
});

app.all('*', async (req, res) => {
    try {
        if (req.method == 'GET' || req.method == 'HEAD') {
            const file = await fetch(`http://api.retronetwork.ml/GameHub${req.originalUrl}`, {
                method: req.method,
                headers: req.headers
            });

            const data = new Buffer.from(await file.arrayBuffer());

            if (file.headers.get('content-type').split(';')[0] == 'text/plain' && req.path.endsWith('.html') || req.path.endsWith('.htm')) {
                res.writeHead(file.status, { 'Content-Type': 'text/html' })
            } else {
                res.writeHead(file.status, { 'Content-Type': file.headers.get('content-type').split(';')[0] })
            }

            res.end(data);
        } else {
            const file = await fetch(`http://api.retronetwork.ml/GameHub${req.originalUrl}`, {
                method: req.method,
                headers: req.headers,
                body: JSON.stringify(req.body)
            });

            const data = new Buffer.from(await file.arrayBuffer());
            res.writeHead(file.status, { 'Content-Type': file.headers.get('content-type').split(';')[0] })

            res.end(data);
        }
    } catch (e) {
        res.sendStatus(404);
        console.log(e);
    }
})

app.listen(2000, () => {
    console.log(`Your mirror server is running on port 2000 using node ${process.version}`);
});
