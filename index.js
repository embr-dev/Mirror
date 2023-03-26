import express from 'express';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const games = [];
const thumbnails = [];

app.use(express.json());
app.use(cors({ origin: '*' }));

app.all('/', async (req, res) => {
    const packageFile = JSON.parse(await fs.readFile('./package.json'));
    res.json({
        status: 'ready',
        version: packageFile.version,
        website: 'https://gamehub.dev',
        description: packageFile.description,
        repository: packageFile.repository.url.replace('git+', '').replace('.git', '')
    });
});

app.all('*', async (req, res, next) => {
    const auth = await fs.readFile('./auth');

    if (auth != 'public') {
        if (req.query.hostname) {
            fetch(`http://${req.query.hostname}/auth`)
                .then(response => response.text())
                .then(data => {
                    if (data == auth && req.hostname === req.query.hostname) {
                        res.locals.authKey = data;

                        next();
                    } else {
                        res.json({ error: true, errorMsg: `The domain ${req.hostname} does not contain the the auth token needed to access tauthKeys server.` });
                    }
                })
                .catch(e => res.json({ error: true, errorMsg: `The domain ${req.query.hostname} is either not a GameHub instance or it is missing the verification token. If you are using an older fork of GameHub you may want to update.` }));
        } else {
            res.json({ error: true, errorMsg: `Missing required parameters.` })
        }
    } else {
        res.locals.authKey = 'public';
        next();
    }
})

app.all('/cdn/games/:id/*', async (req, res) => {
    const gameIds = [];
    games.forEach(game => {
        gameIds.push(game.id);
    })

    try {
        const file = await fetch(games[gameIds.indexOf(`${req.params.id}`)].url + req.path.replace(`/cdn/games/${req.params.id}`, ''));

        const data = new Buffer.from(await file.arrayBuffer());

        if (file.status !== 404) {
            res.writeHead(file.status, { 'Content-Type': file.headers.get('content-type').split(';')[0] })
            res.end(data);
        } else {
            return res.sendStatus(404);
        }
    } catch (e) {
        res.sendStatus(404);
    }
});

app.all('/cdn/thumbnails/:id', async (req, res) => {
    try {
        const file = await fetch(thumbnails[req.params.id-1]);

        const data = new Buffer.from(await file.arrayBuffer());

        if (file.status !== 404) {
            res.writeHead(file.status, { 'Content-Type': file.headers.get('content-type').split(';')[0] })
            res.end(data);
        } else {
            return res.sendStatus(404);
        }
    } catch (e) {
        res.sendStatus(404);
    }
});

app.all('*', async (req, res, next) => {
    try {
        const modifiedHeaders = req.headers;
        modifiedHeaders.host = req.get('host');
        modifiedHeaders.origin = `${req.protocol}://${req.get('host')}`;
        modifiedHeaders.auth = await fs.readFile('./auth');
        if (req.get('host').replace(':' + server.address().port, '') === req.hostname) {
            modifiedHeaders.instance = JSON.stringify({ domain: req.hostname, auth: res.locals.authKey, protocol: req.protocol });
        }

        if (req.method == 'GET' || req.method == 'HEAD') {
            const file = await fetch(`http://localhost:3000/GameHub${req.originalUrl}`, {
                method: req.method,
                headers: modifiedHeaders
            });

            if (file.status !== 404) {
                if (req.path.replace('/' + req.path.split('\\').pop().split('/').pop(), '') === '/games') {
                    const gameIds = [];

                    games.forEach(game => {
                        gameIds.push(game.id);
                    })

                    if (!gameIds.includes(req.path.split('\\').pop().split('/').pop())) {
                        games.push({
                            id: req.path.split('\\').pop().split('/').pop(),
                            url: file.headers.get('gameUrl'),
                            thumb: file.headers.get('thumbUrl')
                        });
                    }
                }

                const data = new Buffer.from(await file.arrayBuffer());

                if (req.path == '/games') {
                    const moddedData = [];
                    JSON.parse(data.toString()).forEach(game => {
                        thumbnails.push(game.thumbnail);
                        moddedData.push({
                            thumbnail: `${req.protocol}://${req.get('host')}/cdn/thumbnails/${game.id}`,
                            name: game.name,
                            id: game.id
                        })
                    });

                    res.json(moddedData);
                } else {
                    res.writeHead(file.status, { 'Content-Type': file.headers.get('content-type').split(';')[0] })

                    res.end(data);
                }
            } else {
                next();
            }
        } else {
            const file = await fetch(`http://localhost:3000/GameHub${req.originalUrl}`, {
                method: req.method,
                headers: modifiedHeaders,
                body: JSON.stringify(req.body)
            });

            const data = new Buffer.from(await file.arrayBuffer());

            res.writeHead(file.status, { 'Content-Type': file.headers.get('content-type').split(';')[0] })

            res.end(data);
        }
    } catch (e) {
        next();
    }
})

app.use((req, res) => {
    try {
        res.sendStatus(404);
    } catch (e) { }
});

const server = app.listen(2000, () => {
    console.log(`Your mirror server is running on port 2000 using node ${process.version}`);
});