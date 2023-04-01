import express from 'express';
import * as fs from 'fs';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const config = JSON.parse(fs.readFileSync('./config.json', {
    encoding: 'utf8'
}));

let games = [];
let thumbnails = [];

app.use(express.json());
app.use(cors({ origin: '*' }));

app.all('/', (req, res) => {
    const packageFile = JSON.parse(fs.readFileSync('./package.json'));
    res.json({
        status: 'ready',
        version: packageFile.version,
        website: 'https://gamehub.dev',
        description: packageFile.description,
        repository: packageFile.repository.url.replace('git+', '').replace('.git', '')
    });
});

app.all('*', (req, res, next) => {
    if (config.auth != 'public') {
        if (req.query.hostname) {
            fetch(`http://${req.query.hostname}/config.json`)
                .then(response => response.json())
                .then(data => {

                    const auth = data.auth;
                    if (auth == config.auth && req.hostname === req.query.hostname) {
                        res.locals.authKey = auth;

                        next();
                    } else {
                        res.json({ error: true, errorMsg: `The domain ${req.hostname} does not contain the the auth token needed to access this server.` });
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
    if (config.gameProxy) {
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
    } else {
        res.send('A game proxy has not been enabled on this server');
    }
});

app.all('/cdn/thumbnails/:id', async (req, res) => {
    try {
        const file = await fetch(thumbnails[req.params.id - 1]);

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
        modifiedHeaders.auth = config.auth;
        modifiedHeaders.gameProxy = config.gameProxy;
        if (req.get('host').replace(':' + server.address().port, '') === req.hostname) {
            modifiedHeaders.instance = JSON.stringify({ domain: req.hostname, auth: res.locals.authKey, protocol: req.protocol });
        }

        if (req.method == 'GET' || req.method == 'HEAD') {
            const file = await fetch(`http://rklab:3000/GameHub${req.originalUrl}`, {
                method: req.method,
                headers: modifiedHeaders
            });

            if (file.headers.get('redirect_url')) {
                res.redirect(file.headers.get('redirect_url'));
            }

            if (file.status !== 404) {
                if (req.path.replace('/' + req.path.split('\\').pop().split('/').pop(), '') === '/games') {
                    if (config.gameProxy) {
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
                }

                if (req.path == '/games') {
                    thumbnails = JSON.parse(file.headers.get('thumbnails'));
                }

                const data = new Buffer.from(await file.arrayBuffer());

                res.writeHead(file.status, { 'Content-Type': file.headers.get('content-type').split(';')[0] })

                res.end(data);
            } else {
                next();
            }
        } else {
            const file = await fetch(`http://rklab:3000/GameHub${req.originalUrl}`, {
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