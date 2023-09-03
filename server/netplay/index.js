import { Server } from 'socket.io';
import Twilio from 'twilio';

import http from 'node:http';

import Room from './room.js';

const server = http.createServer();

class NetplayServer {
    /**
     * 
     * @param {server} server 
     * @param {object} config
     */
    constructor(server, config) {
        /** @type {Array.<Room>} */
        this.rooms = [];
        this.server = server;
        this.config = config;
        this.cachedToken = null;
        this.io = new Server(this.server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        if (this.config.TWILIO_ACCOUNT_SID && this.config.TWILIO_AUTH_TOKEN) this.twilio = Twilio(this.config.TWILIO_ACCOUNT_SID || '', this.config.TWILIO_AUTH_TOKEN || '');
        else console.log('[Netplay Server] Missing twilio data');


        this.server.on('request', (req, res) => {
            req.path = (new URL('http://localhost' + req.url).pathname.includes('/netplay') ? new URL('http://localhost' + req.url).pathname.replace('/netplay', '') : null);

            if (req.path === '/webrtc') {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'application/json');

                if (!this.cachedToken) res.end('[]');
                else res.end(JSON.stringify(this.cachedToken.iceServers));
            } else if (req.path === '/list') {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'application/json');

                const args = this.transformArgs(req.url);
                const rv = {};

                if (!args.game_id || !args.domain || !args.coreVer) return res.end('{}');

                args.game_id = parseInt(args.game_id);
                args.coreVer = parseInt(args.coreVer);

                for (let i = 0; i < this.rooms.length; i++) {
                    if (this.rooms[i].domain !== args.domain ||
                        this.rooms[i].game_id !== args.game_id ||
                        this.rooms[i].coreVer !== args.coreVer) continue;

                    rv[this.rooms[i].sessionid] = {
                        owner_name: this.rooms[i].owner.extra.name,
                        room_name: this.rooms[i].name,
                        country: 'US',
                        max: this.rooms[i].max,
                        current: this.rooms[i].current,
                        password: (this.rooms[i].password.trim() ? 1 : 0)
                    };
                }

                res.end(JSON.stringify(rv));
            } else if (req.path) res.end(JSON.stringify({
                success: false,
                status: 404,
                message: 'Not found'
            }));
        });

        if (this.twilio) {
            this.getNewToken();
            setInterval(this.getNewToken, 1000 * 60 * 10);

            this.io.on('connection', (socket) => {
                nofusers = this.io.engine.clientsCount;
                const args = this.transformArgs(socket.handshake.url);
                let room = null;
                let extraData = JSON.parse(args.extra);

                function disconnect() {
                    nofusers = this.io.engine.clientsCount;

                    try {
                        if (room === null) return;
                        this.io.to(room.id).emit('user-disconnected', args.userid);

                        for (let i = 0; i < room.users.length; i++) {
                            if (room.users[i].userid === args.userid) {
                                room.users.splice(i, 1);
                                break;
                            }
                        }

                        if (!room.users[0]) {
                            for (let i = 0; i < this.rooms.length; i++) {
                                if (this.rooms[i].id === room.id) {
                                    this.rooms.splice(i, 1);
                                }
                            }
                        } else if (room.owner.userid === args.userid) {
                            room.owner = room.users[0];
                            room.owner.socket.emit('set-isInitiator-true', args.sessionid);
                        }
                        room.current = room.users.length;

                        socket.leave(room.id);

                        room = null;
                    } catch (e) { }
                }

                socket.on('disconnect', disconnect);

                socket.on('close-entire-session', (cb) => {
                    this.io.to(room.id).emit('closed-entire-session', args.sessionid, extraData);
                    if (typeof cb === 'function') cb(true);
                });

                socket.on('open-room', (data, cb) => {
                    room = new Room(data.extra.domain, data.extra.game_id, args.sessionid, data.extra.room_name, args.maxParticipantsAllowed, 1, data.password.trim(), args.userid, socket, data.extra, args.coreVer);
                    this.rooms.push(room);
                    extraData = data.extra;

                    socket.emit('extra-data-updated', null, extraData);
                    socket.emit('extra-data-updated', args.userid, extraData);

                    socket.join(room.id);
                    cb(true, undefined);
                });

                socket.on('check-presence', function (roomid, cb) {
                    cb(getRoom(extraData.domain, extraData.game_id, roomid) !== null, roomid, null);
                });

                socket.on('join-room', function (data, cb) {

                    room = getRoom(data.extra.domain, data.extra.game_id, data.sessionid);
                    if (room === null) {
                        cb(false, 'USERID_NOT_AVAILABLE');
                        return;
                    }
                    if (room.current >= room.max) {
                        cb(false, 'ROOM_FULL');
                        return;
                    }
                    if (room.hasPassword && !room.checkPassword(data.password)) {
                        cb(false, 'INVALID_PASSWORD');
                        return;
                    }

                    room.users.forEach(user => {
                        socket.to(room.id).emit('netplay', {
                            'remoteUserId': user.userid,
                            'message': {
                                'newParticipationRequest': true,
                                'isOneWay': false,
                                'isDataOnly': true,
                                'localPeerSdpConstraints': {
                                    'OfferToReceiveAudio': false,
                                    'OfferToReceiveVideo': false
                                },
                                'remotePeerSdpConstraints': {
                                    'OfferToReceiveAudio': false,
                                    'OfferToReceiveVideo': false
                                }
                            },
                            'sender': args.userid,
                            'extra': extraData
                        })
                    })

                    room.addUser({
                        userid: args.userid,
                        socket,
                        extra: data.extra
                    });

                    socket.to(room.id).emit('user-connected', args.userid);

                    socket.join(room.id);

                    cb(true, null);
                });

                socket.on('set-password', function (password, cb) {
                    if (room === null) {
                        if (typeof cb === 'function') cb(false);
                        return;
                    }
                    if (typeof password === 'string' && password.trim()) {
                        room.password = password;
                        room.hasPassword = true;
                    } else {
                        room.password = password.trim();
                        room.hasPassword = false;
                    }
                    if (typeof cb === 'function') cb(true);
                });

                socket.on('changed-uuid', function (newUid, cb) {
                    if (room === null) {
                        if (typeof cb === 'function') cb(false);
                        return;
                    }
                    for (let i = 0; i < room.users.length; i++) {
                        if (room.users[i].userid === args.userid) {
                            room.users[i].userid = newUid;
                            break;
                        }
                    }
                    if (typeof cb === 'function') cb(true);
                });

                socket.on('disconnect-with', function (userid, cb) {
                    //idk
                    if (typeof cb === 'function') cb(true);
                });

                socket.on('netplay', function (msg) {
                    if (room === null) return;
                    const outMsg = JSON.parse(JSON.stringify(msg));
                    outMsg.extra = extraData;
                    socket.to(room.id).emit('netplay', outMsg);
                    if (msg && msg.message && msg.message.userLeft === true) disconnect();
                });

                socket.on('extra-data-updated', function (msg) {
                    if (room === null) return;
                    let outMsg = JSON.parse(JSON.stringify(msg))
                    outMsg.country = 'US';
                    extraData = outMsg;

                    for (let i = 0; i < room.users.length; i++) {
                        if (room.users[i].userid === args.userid) {
                            room.users[i].extra = extraData;
                            break;
                        }
                    }

                    this.io.to(room.id).emit('extra-data-updated', args.userid, outMsg);
                });

                socket.on('get-remote-user-extra-data', function (id) {
                    if (room === null) return;
                    for (let i = 0; i < room.users.length; i++) {
                        if (room.users[i].userid === id) {
                            socket.emit('extra-data-updated', room.users[i].extra);
                        }
                    }
                });
            });

            if (server.address()) console.log(`[Netplay] Server is running on ${this.server.address().port}`);
            else server.on('listening', () => console.log(`[Netplay] Server is running on ${this.server.address().port}`));
        }
    }

    /**
     * Get the specified room, or return null if not found
     * @param {string} domain
     * @param {number} game_id
     * @param {string} sessionid
     * @return {Room} 
     */
    getRoom = (domain, game_id, sessionid) => {
        for (let i = 0; i < this.rooms.length; i++) {
            if (this.rooms[i].id === domain + ':' + game_id + ':' + sessionid) return this.rooms[i];
        }

        return null;
    }

    getNewToken = () => {
        if (this.twilio) this.twilio.tokens.create({}, (e, token) => this.cachedToken = token);
    }

    /**
     * Get the arguments from a url
     * @param {string} url 
     * @return {object}
     */
    transformArgs = (url) => {
        var args = {};
        var idx = url.indexOf('?');

        if (idx != -1) {
            var s = url.slice(idx + 1);
            var parts = s.split('&');

            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                var idx2 = p.indexOf('=');
                args[decodeURIComponent(p.slice(0, idx2))] = decodeURIComponent(p.slice(idx2 + 1, s.length));
            }
        }

        return args;
    }
}

export default NetplayServer;