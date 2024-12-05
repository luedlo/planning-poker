"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GATEWAY = exports.SERVER = exports.SOCKET = void 0;
const SERVER = 'devstrauss-data-sockets-service-planning-poker';
exports.SERVER = SERVER;
const GATEWAY = 'GatewayWebSocket';
exports.GATEWAY = GATEWAY;
const POINTS = [-2, -1, 0, 1, 2, 3, 5, 8, 13, 21];
const HACKER = 69;
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
        const { session, username } = client.handshake.headers;
        let users = STORE.getUserInCacheStorage(session);
        const user = users.findIndex(_ => _.username === username);
        if (user !== -1) {
            switch (payload.action.type) {
                case 'save': {
                    users[user].points = POINTS.includes(payload.points) ? payload.points : HACKER;
                    STORE.setUserInCacheStorage(session, users);
                    SOCKET.saveScores(client, server);
                    break;
                }
                case 'history': {
                    SOCKET.changeHistory(client, server, payload.action.history);
                    break;
                }
                case 'reveal': {
                    SOCKET.revealScores(client, server);
                    break;
                }
                case 'kick': {
                    SOCKET.forceDisconnect(client, server, payload.action.user, true);
                    break;
                }
                case 'perspective': {
                    SOCKET.changePerspective(client, server, payload.action.user);
                    break;
                }
                case 'admin': {
                    SOCKET.makeSuperUser(client, server, payload.action.user);
                    break;
                }
                case 'emojis': {
                    SOCKET.serveEmojis(client, server, payload.action.emojis);
                    break;
                }
                default: {
                    SOCKET.clearScores(client, server, payload.action.type);
                    break;
                }
            }
        }
        else {
            console.log('Ese wey no existe en la sesión (es h4ck3r :v) ññññññññ!');
        }
    },
    changePerspective: (client, server, forceChange) => {
        const { session } = client.handshake.headers;
        let users = STORE.getUserInCacheStorage(session);
        let userAux = null;
        if (users) {
            users.some(user => {
                if (user.username === forceChange.username) {
                    userAux = user;
                    user.perspective = !user.perspective;
                    user.points = 0;
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
                    history: null
                });
            }
            else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    history: configurations.history
                });
            }
            const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
            server.emit(session, Object.assign({ joinOrLeft: `(${!userAux.perspective ? '🃏' : '👁️'}) ${userAux.username} has changed of perspective (${userAux.perspective ? '🃏' : '👁️'})!`, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
            server.to(userAux.ws).emit(session, { perspective: userAux.perspective });
            server.to(userAux.ws).emit(session, { admin: userAux.admin });
        }
    },
    makeSuperUser: (client, server, superUser) => {
        const { session, username } = client.handshake.headers;
        let users = STORE.getUserInCacheStorage(session);
        let superUserAux = null, currentAdminAux = null;
        if (users) {
            users.some(user => {
                if (user.username === username) {
                    superUserAux = user;
                    user.admin = false;
                    return true;
                }
            });
            users.some(user => {
                if (user.username === superUser.username) {
                    currentAdminAux = user;
                    user.admin = true;
                    return true;
                }
            });
            STORE.setUserInCacheStorage(session, users);
            const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
            server.emit(session, Object.assign({ joinOrLeft: `(${superUser.perspective ? '⭐🃏' : '⭐👁️'}) ${superUser.username} has been set as admin!`, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
            server.to(superUserAux.ws).emit(session, {
                admin: superUserAux.admin
            });
            server.to(currentAdminAux.ws).emit(session, {
                admin: currentAdminAux.admin
            });
        }
    },
    changeHistory: (client, server, history) => {
        const { session } = client.handshake.headers;
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: false,
                visibility: SOCKET.completedScores(client),
                delete_forever: false,
                winner: null,
                history
            });
        }
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
    },
    saveScores: (client, server) => {
        const { session } = client.handshake.headers;
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: false,
                visibility: SOCKET.completedScores(client),
                delete_forever: false,
                winner: null,
                history: configurations.history
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
                history: configurations.history
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
                history: configurations.history
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
            if (!SOCKET.anyoneIsAdmin(users) && _.perspective) {
                _.admin = true;
                server.to(_.ws).emit(session, { admin: _.admin });
                return true;
            }
        });
        return users;
    },
    forceDisconnect: (client, server, forceDisconnect, reason) => {
        const { session } = client.handshake.headers;
        const perspective = forceDisconnect.perspective ? '🃏' : '👁️';
        if (reason) {
            server.emit(session, {
                reason: `(${perspective}) ${forceDisconnect.username} has been kicked by admin!`,
                type: true,
                username: forceDisconnect.username
            });
        }
        else {
            server.to(forceDisconnect.ws).emit(session, {
                reason: 'The username is already in session!',
                type: false
            });
            client.handshake.headers.username = client.id;
        }
        client.in(forceDisconnect.ws).disconnectSockets();
    },
    addUser: async (client, server) => {
        let { session, username, perspective } = client.handshake.headers;
        perspective = perspective === 'true' ? true : false;
        let users = STORE.getUserInCacheStorage(session);
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        if (!(users.find(_ => _.username === username))) {
            const admin = !SOCKET.anyoneIsAdmin(users) && perspective;
            const user = {
                username,
                points: 0,
                perspective: perspective,
                admin,
                ws: client.id
            };
            users.push(user);
            STORE.setUserInCacheStorage(session, users);
            if (admin)
                server.to(user.ws).emit(session, { admin });
            if (!configurations) {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: false,
                    delete_forever: false,
                    winner: null,
                    history: null
                });
            }
            else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    history: configurations.history
                });
            }
            const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
            server.emit(session, Object.assign({ joinOrLeft: `(${perspective ? '🃏' : '👁️'}) ${username} has joined!`, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
        }
        else {
            SOCKET.forceDisconnect(client, server, { ws: client.id }, false);
        }
    },
    removeUser: async (client, server) => {
        let { session, username, perspective } = client.handshake.headers;
        if (client.id === username)
            return;
        perspective = perspective === 'true' ? true : false;
        let users = STORE.getUserInCacheStorage(session);
        const configurations = STORE.getConfigurationsInCacheStorage(session);
        users = users.filter(_ => _.username !== username);
        if (users.length) {
            users = SOCKET.makeAdmin(client, server, users);
            STORE.setUserInCacheStorage(session, users);
            if (!configurations) {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: false,
                    delete_forever: false,
                    winner: null,
                    history: null
                });
            }
            else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    history: configurations.history
                });
            }
        }
        else {
            STORE.setUserInCacheStorage(session, []);
            STORE.setConfigurationsInCacheStorage(session, {});
        }
        client.disconnect(true);
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ joinOrLeft: `(${perspective ? '🃏' : '👁️'}) ${username} has left!`, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
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
    serveEmojis: async (client, server, emojis) => {
        const { session } = client.handshake.headers;
        const array = SOCKET.separateUsers(STORE.getUserInCacheStorage(session));
        server.emit(session, Object.assign({ emojis: emojis, scores: array.scores, spectators: array.spectators }, STORE.getConfigurationsInCacheStorage(session)));
    }
};
exports.SOCKET = SOCKET;
//# sourceMappingURL=store.websocket.js.map