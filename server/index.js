import { Decompress } from './decompress.js';
import NetplayServer from './netplay/index.js';

import mime from 'mime';

import https from 'node:https';
import http from 'node:http';
import path from 'node:path';
import net from 'node:net';
import url from 'node:url';
import fs from 'node:fs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const mode = (fs.existsSync(path.join(__dirname, 'update.json')) && fs.existsSync(path.join(__dirname, '../../config.json')) ? 'attached' : (process.argv[2] === '--test' ? 'test' : (process.argv[2] === '--prod' ? 'prod' : 'test')));
const packageFile = (mode === 'attached' ? JSON.parse(fs.readFileSync(path.join(__dirname, 'update.json'))).package : JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'))));
const config = (mode === 'attached' ? JSON.parse(fs.readFileSync(path.join(__dirname, '../../config.json'))).serverConfig.mirror.config : JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'))));
var server = (mode === 'attached' ? null : http.createServer());
var onServerReady;
const serverPath = (mode === 'attached' ? JSON.parse(fs.readFileSync(path.join(__dirname, '../../config.json'))).serverConfig.mirror.config.path : '/');

if (mode !== 'attached') onServerReady();

onServerReady = () => {
    server.on('connection', (socket) => {
        socket.on('data', (data) => {
            try {
                const url = data.toString().split('\r')[0].split(' ')[1];
                const query = new URL('http://localhost' + url).searchParams;
                const path = new URL('http://localhost' + url).pathname;
                const headers = Object.fromEntries(data.toString()
                    .split('\r')
                    .slice(1)
                    .map(data => {
                        const headers = data.slice(1).replace(':', '').split(' ', 2);
                        headers[0] = headers[0].toLowerCase();

                        return headers;
                    })
                    .filter(data => (data[0] !== '')));

                if (path !== serverPath && !path.startsWith(serverPath + 'cdn/')) {
                    const protocol = (mode === 'test' ? 'http:' : (headers['upgrade-insecure-requests'] === '1' ? 'http:' : 'https:'));

                    const remoteSocket = net.createConnection({
                        host: (mode === 'prod' || mode === 'attached' ? 'api.embernet.work' : '127.0.0.1'),
                        port: (mode === 'prod' || mode === 'attached' ? 433 : 3000)
                    });

                    const connectionData = data.toString().split('\r').slice(1).slice(0, -2);
                    connectionData.unshift(`GET ${'/GameHub' + url} HTTP/1.1`);
                    connectionData.push(`\nMirror: ${protocol}//${headers['host'] || query.get('server') || 'invalid'}`);
                    connectionData.push('\n\n');

                    remoteSocket.write(connectionData.join('\r'));

                    socket.on('data', (data) => {
                        const path = new URL('http://localhost' + url).pathname;

                        if (path !== '/' && !path.startsWith('/cdn/')) {
                            const connectionData = data.toString().split('\r').slice(1).slice(0, -2);
                            connectionData.unshift(`GET ${'/GameHub' + url} HTTP/1.1`);
                            connectionData.push(`\nMirror: ${protocol}//${headers['host'] || query.get('server') || 'invalid'}`);
                            connectionData.push('\n\n');

                            remoteSocket.write(connectionData.join('\r'));
                        }
                    });
                    remoteSocket.pipe(socket);

                    remoteSocket.on('error', (e) => {
                        if (path.startsWith(serverPath)) {
                            socket.write('HTTP/1.1 502 BAD GATEWAY\r');
                            socket.write('\nContent-Type: application/json');
                            socket.write('\n\n');
                            socket.end(JSON.stringify({
                                success: false,
                                message: 'Unable to connect to API',
                                status: 502
                            }));
                        }
                    });

                    socket.on('error', (e) => {
                        if (path.startsWith(serverPath)) {
                            socket.write('HTTP/1.1 502 BAD GATEWAY\r');
                            socket.write('\nContent-Type: application/json');
                            socket.write('\n\n');
                            socket.end(JSON.stringify({
                                success: false,
                                message: 'Internal server error',
                                status: 502
                            }));
                        }
                    });
                }
            } catch (e) {
                if (path.startsWith(serverPath)) {
                    socket.write('HTTP/1.1 502 BAD GATEWAY\r');
                    socket.write('\nContent-Type: application/json');
                    socket.write('\n\n');
                    socket.end(JSON.stringify({
                        success: false,
                        message: 'Internal server error',
                        status: 502
                    }));
                }
            }
        });
    });

    var thumbails = [];

    (new URL(mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000').protocol === 'https:' ? https : http).get((mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000') + '/GameHub/cdn/thumbnails', res => {
        const chunks = [];

        res.on('data', chunk => chunks.push(chunk)).on('end', () => {
            try {
                thumbails = JSON.parse(Decompress(res, chunks));
            } catch (e) { }
        });
    }).on('error', () => { });

    setInterval(() => {
        (new URL(mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000').protocol === 'https:' ? https : http).get((mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000') + '/GameHub/cdn/thumbnails', res => {
            const chunks = [];

            res.on('data', chunk => chunks.push(chunk)).on('end', () => {
                try {
                    thumbails = JSON.parse(Decompress(res, chunks));
                } catch (e) { }
            });
        }).on('error', () => { });
    }, 60000);

    var avatars = [];

    (new URL(mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000').protocol === 'https:' ? https : http).get((mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000') + '/GameHub/cdn/avatars', res => {
        const chunks = [];

        res.on('data', chunk => chunks.push(chunk)).on('end', () => {
            try {
                avatars = JSON.parse(Decompress(res, chunks));
            } catch (e) { }
        });
    }).on('error', () => { });

    setInterval(() => {
        (new URL(mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000').protocol === 'https:' ? https : http).get((mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000') + '/GameHub/cdn/avatars', res => {
            const chunks = [];

            res.on('data', chunk => chunks.push(chunk)).on('end', () => {
                try {
                    avatars = JSON.parse(Decompress(res, chunks));
                } catch (e) { }
            });
        }).on('error', () => { });
    }, 60000);

    var games = [];

    (new URL(mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000').protocol === 'https:' ? https : http).get((mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000') + '/GameHub/cdn/games', res => {
        const chunks = [];

        res.on('data', chunk => chunks.push(chunk)).on('end', () => {
            try {
                games = JSON.parse(Decompress(res, chunks));
            } catch (e) { }
        });
    }).on('error', () => { });

    setInterval(() => {
        (new URL(mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000').protocol === 'https:' ? https : http).get((mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000') + '/GameHub/cdn/games', res => {
            const chunks = [];

            res.on('data', chunk => chunks.push(chunk)).on('end', () => {
                try {
                    games = JSON.parse(Decompress(res, chunks));
                } catch (e) { }
            });
        }).on('error', () => { });
    }, 60000);

    server.on('request', (req, res) => {
        if (!res.headersSent) {
            req.path = new URL('http://localhost' + req.url).pathname;

            if (req.path.startsWith(serverPath)) {
                req.path = '/' + req.path.replace(serverPath, '');
                res.setHeader('Access-Control-Allow-Origin', '*');

                if (req.path === '/') {
                    res.setHeader('content-type', 'application/json');

                    var apiStatus;

                    (new URL(mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000').protocol === 'https:' ? https : http).get((mode === 'prod' || mode === 'attached' ? 'https://api.embernet.work' : 'http://localhost:3000') + '/status', res => {
                        const chunks = [];

                        res.on('data', chunk => chunks.push(chunk)).on('end', () => {
                            try {
                                const status = JSON.parse(Decompress(res, chunks));

                                apiStatus = (status.success ? 'ready' : (status.message ? status.message : 'Unable to connect to API'))
                            } catch (e) {
                                apiStatus = 'Unable to connect to API';
                            }
                        });
                    }).on('error', () => apiStatus = 'Unable to connect to API');

                    const interval = setInterval(() => {
                        if (apiStatus) {
                            clearInterval(interval);

                            res.end(JSON.stringify({
                                status: apiStatus,
                                mode: mode,
                                version: packageFile.version,
                                description: packageFile.description,
                                repository: packageFile.repository.url.replace('git+', '').replace('.git', ''),
                                netplay: {
                                    enabled: config.netplay.enabled,
                                    path: (config.netplay.enabled ? serverPath + 'netplay/' : undefined)
                                }
                            }));
                        }
                    }, 1);
                } else if (req.path.startsWith('/cdn/')) {
                    if (req.path.replace('/cdn/', '').startsWith('thumbnails/')) {
                        if (Number(req.path.replace('/cdn/thumbnails/', '')) !== NaN ? (Number(req.path.replace('/cdn/thumbnails/', '')) < thumbails.length) && Math.sign(Number(req.path.replace('/cdn/thumbnails/', ''))) === 1 : false) {
                            (new URL(thumbails[Number(req.path.replace('/cdn/thumbnails/', '')) - 1]).protocol === 'https:' ? https : http).get(thumbails[Number(req.path.replace('/cdn/thumbnails/', '')) - 1], thumbResponse => {
                                const chunks = [];

                                thumbResponse.on('data', chunk => chunks.push(chunk)).on('end', () => {
                                    try {
                                        res.setHeader('content-type', thumbResponse.headers['content-type']);
                                    } catch (e) { }

                                    res.end(Decompress(thumbResponse, chunks));
                                });
                            }).on('error', () => res.end(JSON.stringify({
                                success: false,
                                status: 404,
                                message: 'Not found'
                            })));
                        } else res.end(JSON.stringify({
                            success: false,
                            status: 404,
                            message: 'Not found'
                        }))
                    } else if (req.path.replace('/cdn/', '').startsWith('avatars/')) {
                        if (Number(req.path.replace('/cdn/avatars/', '')) !== NaN ? (Number(req.path.replace('/cdn/avatars/', '')) < thumbails.length) && Math.sign(Number(req.path.replace('/cdn/avatars/', ''))) === 1 : false) {
                            try {
                                const avatar = avatars[Number(req.path.replace('/cdn/avatars/', '')) - 1];

                                res.setHeader('content-type', avatar.split(':')[1].split(';')[0]);

                                res.end(Buffer.from(avatar.split(',')[1], 'base64'));
                            } catch (e) {
                                res.end(JSON.stringify({
                                    success: false,
                                    status: 404,
                                    message: 'Not found'
                                }));
                            }
                        } else res.end(JSON.stringify({
                            success: false,
                            status: 404,
                            message: 'Not found'
                        }));
                    } else if (req.path.replace('/cdn/', '').startsWith('assets/')) {
                        if (req.path.replace('/cdn/assets/', '') === 'inject.js') {
                            const injectURL = (mode === 'prod' || mode === 'attached' ? 'https://raw.githubusercontent.com/EmberNetwork/GameHub/main/assets/js/inject.js' : 'http://localhost/assets/js/inject.js');

                            (new URL(injectURL).protocol === 'https:' ? https : http).get(injectURL, assetResponse => {
                                const chunks = [];

                                assetResponse.on('data', chunk => chunks.push(chunk)).on('end', () => {
                                    res.setHeader('content-type', 'application/javascript');

                                    res.end(Decompress(assetResponse, chunks));
                                });
                            }).on('error', () => res.end(JSON.stringify({
                                success: false,
                                status: 404,
                                message: 'Not found'
                            })));
                        } else if (req.path.startsWith('/cdn/assets/emulator')) {
                            const path = req.path.replace('/cdn/assets/emulator', '');
                            const url = 'https://raw.githubusercontent.com/GameHub88/EmulatorJS/main/data' + path;

                            try {
                                (new URL(url).protocol === 'https:' ? https : http).get(url, assetResponse => {
                                    const chunks = [];

                                    assetResponse.on('data', chunk => chunks.push(chunk)).on('end', () => {
                                        if ((!(assetResponse.statusCode >= 300)) && (!(assetResponse.statusCode < 200))) {
                                            res.body = Decompress(assetResponse, chunks);

                                            res.setHeader('content-type', mime.getType(url));

                                            res.end(res.body);
                                        } else res.end(JSON.stringify({
                                            success: false,
                                            status: 404,
                                            message: 'Not found'
                                        }))
                                    });
                                }).on('error', () => res.end(JSON.stringify({
                                    success: false,
                                    status: 404,
                                    message: 'Not found'
                                })));
                            } catch (e) {
                                res.statusCode = 404;

                                res.end(JSON.stringify({
                                    success: false,
                                    status: 404,
                                    message: 'Not found'
                                }));
                            }
                        } else if (Number(req.path.replace('/cdn/assets/', '').split('/')[0]) !== NaN ? (Number(req.path.replace('/cdn/assets/', '').split('/')[0]) < games.length) && Math.sign(Number(req.path.replace('/cdn/assets/', '').split('/')[0])) === 1 : false) {
                            try {
                                const path = games[Number(req.path.replace('/cdn/assets/', '').split('/')[0]) - 1].split('/');
                                path.pop();

                                const url = path.join('/') + '/' + req.path.replace('/cdn/assets/', '').split('/').slice(1).join('/');

                                try {
                                    (new URL(url).protocol === 'https:' ? https : http).get(url, assetResponse => {
                                        const chunks = [];

                                        assetResponse.on('data', chunk => chunks.push(chunk)).on('end', () => {
                                            if ((!(assetResponse.statusCode >= 300)) && (!(assetResponse.statusCode < 200))) {
                                                res.body = Decompress(assetResponse, chunks);

                                                res.setHeader('content-type', mime.getType(url));

                                                if (mime.getType(url) === 'text/html') res.body = `<script src="/cdn/assets/inject.js" async></script>` + res.body;

                                                res.end(res.body);
                                            } else res.end(JSON.stringify({
                                                success: false,
                                                status: 404,
                                                message: 'Not found'
                                            }))
                                        });
                                    }).on('error', () => res.end(JSON.stringify({
                                        success: false,
                                        status: 404,
                                        message: 'Not found'
                                    })));
                                } catch (e) {
                                    res.statusCode = 404;

                                    res.end(JSON.stringify({
                                        success: false,
                                        status: 404,
                                        message: 'Not found'
                                    }))
                                }
                            } catch (e) {
                                res.end(JSON.stringify({
                                    success: false,
                                    status: 404,
                                    message: 'Not found'
                                }));
                            }
                        } else res.end(JSON.stringify({
                            success: false,
                            status: 404,
                            message: 'Not found'
                        }));
                    } else {
                        res.end(JSON.stringify({
                            success: false,
                            status: 404,
                            message: 'Not found'
                        }));
                    }
                }
            }
        }
    });

    if (mode !== 'attached') server.listen(process.env.PORT || (mode === 'prod' ? 8080 : 5000), () => console.log(`GameHub Mirror server listening.\n\nPort: ${server.address().port}\nMode: ${mode}\nNode.js version: ${process.version}`));

    if (config.netplay.enabled) new NetplayServer(server, config.netplay);
}

export default {
    attachToServer: (mainServer) => {
        if (mode === 'attached') {
            server = mainServer;
            onServerReady();
        }
    }
};
