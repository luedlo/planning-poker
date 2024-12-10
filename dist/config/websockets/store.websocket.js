"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GATEWAY = exports.SERVER = exports.SOCKET = void 0;
const SERVER = 'devstrauss-data-sockets-service-planning-poker';
exports.SERVER = SERVER;
const GATEWAY = 'GatewayWebSocket';
exports.GATEWAY = GATEWAY;
const HACKER = 69;
const POINTS = [-2, -1, 0, 1, 2, 3, 5, 8, 13];
let WSAUX = null;
const STORE = {
    usersConnectedBySession: new Map(),
    configurationsBySession: new Map(),
    setUserInCacheStorage: (session, data) => STORE.usersConnectedBySession.set(session, data),
    setConfigurationsInCacheStorage: (session, data) => STORE.configurationsBySession.set(session, data),
    getUserInCacheStorage: (session) => STORE.usersConnectedBySession.get(session) || [],
    getConfigurationsInCacheStorage: (session) => STORE.configurationsBySession.get(session) || {}
};
const SOCKET = {
    sendData: async (client, payload, server) => {
        const { session } = client.handshake.headers;
        let users = STORE.getUserInCacheStorage(session);
        const user = users.findIndex(_ => _.ws === payload.user.ws);
        if (user !== -1) {
            switch (payload.action) {
                case 'save': {
                    SOCKET.saveScores(client, server, payload.user);
                    break;
                }
                case 'issues': {
                    SOCKET.changeIssues(client, server, payload.user);
                    break;
                }
                case 'reveal': {
                    SOCKET.revealScores(client, server);
                    break;
                }
                case 'kick': {
                    SOCKET.forceDisconnect(client, server, payload.user, { kick: true, ban: false });
                    break;
                }
                case 'perspective': {
                    SOCKET.changePerspective(client, server, payload.user);
                    break;
                }
                case 'admin': {
                    SOCKET.makeSuperUser(client, server, payload.user);
                    break;
                }
                case 'emojis': {
                    SOCKET.serveEmojis(client, server, payload.user);
                    break;
                }
                default: {
                    SOCKET.clearScores(client, server, payload.action);
                    break;
                }
            }
        }
        else {
            SOCKET.forceDisconnect(client, server, { ws: client.id }, { kick: false, ban: true });
        }
    },
    changePerspective: (client, server, user) => {
        const { session } = client.handshake.headers;
        let users = STORE.getUserInCacheStorage(session);
        let userAux = null;
        if (users) {
            users.some(_ => {
                if (_.ws === user.ws) {
                    userAux = _;
                    _.perspective = !_.perspective;
                    _.points = 0;
                    return true;
                }
            });
            STORE.setUserInCacheStorage(session, users);
            const configurations = STORE.getConfigurationsInCacheStorage(session);
            if (!configurations) {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: false,
                    delete_forever: false,
                    winner: null,
                    issues: null
                });
            }
            else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    issues: configurations.issues
                });
            }
            const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
            server.emit(session, Object.assign({ show: true, joinOrLeft: `(${!userAux.perspective ? '🃏' : '👁️'}) ${userAux.username} has changed of perspective (${userAux.perspective ? '🃏' : '👁️'})!`, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
            server.to(userAux.ws).emit(session, { perspective: userAux.perspective });
            server.to(userAux.ws).emit(session, { admin: userAux.admin });
        }
    },
    makeSuperUser: (client, server, user) => {
        const { session } = client.handshake.headers;
        let users = STORE.getUserInCacheStorage(session);
        let userAux = null, currentAdminAux = null;
        if (users) {
            users.some(_ => {
                if (_.admin) {
                    userAux = _;
                    _.admin = false;
                    return true;
                }
            });
            users.some(_ => {
                if (_.ws === user.ws) {
                    currentAdminAux = _;
                    _.admin = true;
                    return true;
                }
            });
            STORE.setUserInCacheStorage(session, users);
            const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
            server.emit(session, Object.assign({ show: true, joinOrLeft: `(${user.perspective ? '⭐🃏' : '⭐👁️'}) ${user.username} has been set as admin!`, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
            server.to(userAux.ws).emit(session, {
                admin: userAux.admin
            });
            server.to(currentAdminAux.ws).emit(session, {
                admin: currentAdminAux.admin
            });
        }
    },
    changeIssues: (client, server, { issues }) => {
        const { session } = client.handshake.headers;
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: false,
                visibility: SOCKET.completedScores(client),
                delete_forever: false,
                winner: null,
                issues
            });
        }
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
    },
    saveScores: (client, server, { points, ws }) => {
        const { session } = client.handshake.headers;
        let users = STORE.getUserInCacheStorage(session);
        const user = users.findIndex(_ => _.ws === ws);
        users[user].points = POINTS.includes(points) ? points : HACKER;
        STORE.setUserInCacheStorage(session, users);
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: false,
                visibility: SOCKET.completedScores(client),
                delete_forever: false,
                winner: null,
                issues: configurations.issues
            });
        }
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
    },
    revealScores: (client, server) => {
        const { session } = client.handshake.headers;
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: true,
                visibility: false,
                delete_forever: true,
                winner: SOCKET.winner(client),
                issues: configurations.issues
            });
        }
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
    },
    clearScores: (client, server, action) => {
        const { session } = client.handshake.headers;
        let users = STORE.getUserInCacheStorage(session);
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        users.forEach(_ => _.points = 0);
        STORE.setUserInCacheStorage(session, users);
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: false,
                visibility: false,
                delete_forever: false,
                winner: null,
                issues: configurations.issues
            });
        }
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ scores: array.scores, spectators: array.spectators, action }, STORE.getConfigurationsInCacheStorage(session)));
    },
    completedScores: (client) => {
        const { session } = client.handshake.headers;
        const users = STORE.getUserInCacheStorage(session);
        const hasZero = users.find(_ => _.points === 0 && _.perspective === true);
        return hasZero ? false : true;
    },
    winner: (client) => {
        const { session } = client.handshake.headers;
        const users = STORE.getUserInCacheStorage(session);
        let arr = [];
        users.forEach(_ => {
            if (_.perspective)
                arr.push(_.points);
        });
        const tally = (acc, x) => {
            if (!acc[x]) {
                acc[x] = 1;
                return acc;
            }
            acc[x] += 1;
            return acc;
        };
        const totals = arr.reduce(tally, {});
        const keys = Object.keys(totals);
        const values = keys.map(x => totals[Number(x)]);
        return (keys.filter(x => totals[x] === Math.max(...values))).map(x => Number(x));
    },
    anyoneIsAdmin: (users) => {
        return users.find((_) => _.admin);
    },
    makeAdmin: (client, server, users) => {
        const { session } = client.handshake.headers;
        users.some(_ => {
            if (!SOCKET.anyoneIsAdmin(users)) {
                _.admin = true;
                server.to(_.ws).emit(session, { admin: _.admin });
                return true;
            }
        });
        return users;
    },
    forceDisconnect: (client, server, user, reason) => {
        const { session, username, ws } = client.handshake.headers;
        const perspective = user.perspective ? '🃏' : '👁️';
        client.handshake.headers.ws = client.id;
        WSAUX = user.ws;
        if (reason.kick) {
            server.emit(session, {
                reason: `(${perspective}) ${user.username} has been kicked by admin!`,
                kick: false,
                ban: false
            });
        }
        else if (reason.ban) {
            server.to(user.ws).emit(session, {
                reason: `${username} has been banned for hacking 👾 ñññ!`,
                kick: false,
                ban: true
            });
            server.emit(session, {
                reason: `${username} has been banned for hacking 👾 ñññ!`,
                kick: false,
                ban: false
            });
        }
        else {
            server.to(user.ws).emit(session, {
                reason: 'The username is already in session!',
                kick: true,
                ban: false
            });
        }
        client.in(user.ws).disconnectSockets();
    },
    addUser: async (client, server) => {
        let { session, username, ws, perspective } = client.handshake.headers;
        perspective = perspective === 'true' ? true : false;
        let users = STORE.getUserInCacheStorage(session);
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        if (!(users.find(_ => _.username === username))) {
            const admin = !SOCKET.anyoneIsAdmin(users);
            const user = {
                username,
                points: 0,
                perspective,
                admin,
                ws: client.id
            };
            users.push(user);
            STORE.setUserInCacheStorage(session, users);
            if (admin)
                server.to(user.ws).emit(session, { admin });
            server.to(user.ws).emit(session, { ws: client.id });
            if (!configurations) {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: false,
                    delete_forever: false,
                    winner: null,
                    issues: null
                });
            }
            else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    issues: configurations.issues
                });
            }
            const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
            server.emit(session, Object.assign({ show: true, joinOrLeft: `(${perspective ? '🃏' : '👁️'}) ${username} has joined!`, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
        }
        else {
            SOCKET.forceDisconnect(client, server, { ws: client.id }, { kick: false, ban: false });
        }
    },
    removeUser: async (client, server) => {
        let { session, username, ws, perspective } = client.handshake.headers;
        perspective = perspective === 'true' ? true : false;
        let users = STORE.getUserInCacheStorage(session);
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        if (!(!!ws && !!WSAUX)) {
            WSAUX = client.id;
        }
        else {
            WSAUX = ws ? ws : WSAUX;
        }
        users = users.filter(_ => _.ws !== WSAUX);
        if (users.length) {
            users = SOCKET.makeAdmin(client, server, users);
            STORE.setUserInCacheStorage(session, users);
            if (!configurations) {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: false,
                    delete_forever: false,
                    winner: null,
                    issues: null
                });
            }
            else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    issues: configurations.issues
                });
            }
        }
        else {
            STORE.setUserInCacheStorage(session, []);
            STORE.setConfigurationsInCacheStorage(session, {});
        }
        client.disconnect(true);
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ show: ![WSAUX, ws, client.id].every(_ => _ === WSAUX), joinOrLeft: `(${perspective ? '🃏' : '👁️'}) ${username} has left!`, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
        WSAUX = null;
    },
    separateUsers: (users) => {
        let scores = [], spectators = [];
        users.forEach(user => {
            if (user.perspective)
                scores.push(user);
            else
                spectators.push(user);
        });
        return { scores, spectators };
    },
    serveEmojis: (client, server, { emojis }) => {
        const { session } = client.handshake.headers;
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ emojis, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
    }
};
exports.SOCKET = SOCKET;
//# sourceMappingURL=store.websocket.js.map