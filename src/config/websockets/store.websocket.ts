import { Socket, Server } from 'socket.io'

const SERVER = 'devstrauss-data-sockets-service-planning-poker'
const GATEWAY = 'GatewayWebSocket'
const POINTS = [-2, -1, 0, 1, 2, 3, 5, 8, 13, 21]
const HACKER = 69

const STORE = {
    usersConnectedBySession: new Map<any, Array<any>>(),
    configurationsBySession: new Map<any, Object>(),

    setUserInCacheStorage: (session: any, data: any) => STORE.usersConnectedBySession.set(session, data),
    setConfigurationsInCacheStorage: (session: any, data: any) => STORE.configurationsBySession.set(session, data),

    getUserInCacheStorage: (session: any) => STORE.usersConnectedBySession.get(session) || [],
    getConfigurationsInCacheStorage: (session: any) => STORE.configurationsBySession.get(session) || {}
}

const SOCKET = {
    sendData: async (client: Socket, payload: any, server: Server) => {
        const { session, username } : any = client.handshake.headers
        let users: Array<any> = STORE.getUserInCacheStorage(session)
        const user = users.findIndex(_ => _.username === username)

        if (user !== -1) {
            switch (payload.action.type) {
                case 'save': {
                    users[user].points = POINTS.includes(payload.points) ? payload.points : HACKER
                    STORE.setUserInCacheStorage(session, users)
                    SOCKET.saveScores(client, server)
                    break
                }
                case 'history': {
                    SOCKET.changeHistory(client, server, payload.action.history)
                    break
                }
                case 'reveal': {
                    SOCKET.revealScores(client, server)
                    break
                }
                case 'kick': {
                    SOCKET.forceDisconnect(client, server, payload.action.user, true)
                    break
                }
                case 'perspective': {
                    SOCKET.changePerspective(client, server, payload.action.user)
                    break
                }
                case 'admin': {
                    SOCKET.makeSuperUser(client, server, payload.action.user)
                    break
                }
                case 'emojis': {
                    SOCKET.serveEmojis(client, server, payload.action.emojis)
                    break
                }
                default: {
                    SOCKET.clearScores(client, server, payload.action.type)
                    break
                }
            }
        } else {
            console.log('Ese wey no existe en la sesión (es h4ck3r :v) ññññññññ!')
        }
    },

    changePerspective: (client: Socket, server: Server, forceChange: any) => {
        const { session } : any = client.handshake.headers
        let users: Array<any> = STORE.getUserInCacheStorage(session)
        let userAux = null
        if (users) {
            users.some(user => {
                if (user.username === forceChange.username) {
                    userAux = user
                    user.perspective = !user.perspective
                    user.points = 0
                    // user.admin = false
                    return true
                }
            })

            // users = SOCKET.makeAdmin(client, server, users)
            STORE.setUserInCacheStorage(session, users)

            const configurations: any = STORE.getConfigurationsInCacheStorage(session)
            if (!configurations) {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: false,
                    delete_forever: false,
                    winner: null,
                    history: null
                })
            } else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    history: configurations.history
                })
            }

            const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
            server.emit(session, {
                joinOrLeft: `(${!userAux.perspective ? '🃏' : '👁️'}) ${userAux.username} has changed of perspective (${userAux.perspective ? '🃏' : '👁️'})!`,
                scores: array.scores,
                spectators: array.spectators,
                ...STORE.getConfigurationsInCacheStorage(session)
            })
            server.to(userAux.ws).emit(session, { perspective: userAux.perspective })
            server.to(userAux.ws).emit(session, { admin: userAux.admin })
        }
    },

    makeSuperUser: (client: Socket, server: Server, superUser: any) => {
        const  { session, username } : any = client.handshake.headers
        let users: Array<any> = STORE.getUserInCacheStorage(session)
        let superUserAux = null, currentAdminAux = null
        if (users) {
            users.some(user => {
                if (user.username === username) {
                    superUserAux = user
                    user.admin = false
                    return true
                }
            })
            users.some(user => {
                if (user.username === superUser.username) {
                    currentAdminAux = user
                    user.admin = true
                    return true
                }
            })
            STORE.setUserInCacheStorage(session, users)
            const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
            server.emit(session, {
                joinOrLeft: `(${superUser.perspective ? '⭐🃏' : '⭐👁️'}) ${superUser.username} has been set as admin!`,
                scores: array.scores,
                spectators: array.spectators,
                ...STORE.getConfigurationsInCacheStorage(session)
            })
            server.to(superUserAux.ws).emit(session, {
                admin: superUserAux.admin
            })
            server.to(currentAdminAux.ws).emit(session, {
                admin: currentAdminAux.admin
            })
        }
    },

    changeHistory: (client: Socket, server: Server, history: string) => {
        const { session } : any = client.handshake.headers
        const configurations: any = STORE.getConfigurationsInCacheStorage(session)
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: false,
                visibility: SOCKET.completedScores(client),
                delete_forever: false,
                winner: null,
                history
            })
        }

        const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
        server.emit(session, {
            scores: array.scores,
            spectators: array.spectators,
            ...STORE.getConfigurationsInCacheStorage(session)
        })
    },

    saveScores: (client: Socket, server: Server) => {
        const { session } : any = client.handshake.headers
        const configurations: any = STORE.getConfigurationsInCacheStorage(session)
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: false,
                visibility: SOCKET.completedScores(client),
                delete_forever: false,
                winner: null,
                history: configurations.history
            })
        }

        const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
        server.emit(session, {
            scores: array.scores,
            spectators: array.spectators,
            ...STORE.getConfigurationsInCacheStorage(session)
        })
    },

    revealScores: (client: Socket, server: Server) => {
        const { session } : any = client.handshake.headers
        const configurations: any = STORE.getConfigurationsInCacheStorage(session)
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: true,
                visibility: false,
                delete_forever: true,
                winner: SOCKET.winner(client),
                history: configurations.history
            })
        }
        const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
        server.emit(session, {
            scores: array.scores,
            spectators: array.spectators,
            ...STORE.getConfigurationsInCacheStorage(session)
        })
    },

    clearScores: (client: Socket, server: Server, action: string) => {
        const { session } : any = client.handshake.headers
        let users: Array<any> = STORE.getUserInCacheStorage(session)
        const configurations: any = STORE.getConfigurationsInCacheStorage(session)
        users.forEach(_ => _.points = 0)
        STORE.setUserInCacheStorage(session, users)
        if (configurations) {
            STORE.setConfigurationsInCacheStorage(session, {
                reveal: false,
                visibility: false,
                delete_forever: false,
                winner: null,
                history: configurations.history
            })
        }
        const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
        server.emit(session, {
            scores: array.scores,
            spectators: array.spectators,
            action,
            ...STORE.getConfigurationsInCacheStorage(session)
        })
    },

    completedScores: (client: Socket) => {
        const { session } : any = client.handshake.headers
        const users: Array<any> = STORE.getUserInCacheStorage(session)
        const hasZero = users.find(_ => _.points === 0 && _.perspective === true)
        return hasZero ? false : true
    },

    winner: (client: Socket) => {
        const { session } : any = client.handshake.headers
        const users: Array<any> = STORE.getUserInCacheStorage(session)
        let arr = []
        users.forEach(_ => {
            if (_.perspective) arr.push(_.points)
        })
        const tally = (acc: { [x: number]: number }, x: number) => {
            if (!acc[x]) {
                acc[x] = 1
                return acc
            }
            acc[x] += 1
            return acc
        }
        const totals = arr.reduce(tally, {})
        const keys = Object.keys(totals)
        const values = keys.map(x => totals[Number(x)])
        return (keys.filter(x => totals[x] === Math.max(...values))).map(x => Number(x))
    },

    anyoneIsAdmin: (users: any) => {
        return users.find((_: { admin: boolean }) => _.admin)
    },

    makeAdmin: (client: Socket, server: Server, users: Array<any>) => {
        const { session } : any = client.handshake.headers
        users.some(_ => {
            if (!SOCKET.anyoneIsAdmin(users) && _.perspective) {
                _.admin = true
                server.to(_.ws).emit(session, { admin: _.admin })
                return true
            }
        })
        return users
    },

    forceDisconnect: (client: Socket, server: Server, forceDisconnect: any, reason: boolean) => {
        const { session } : any = client.handshake.headers
        const perspective = forceDisconnect.perspective ? '🃏' : '👁️'
        if (reason) {
            server.emit(session, {
                reason: `(${perspective}) ${forceDisconnect.username} has been kicked by admin!`,
                type: true,
                username: forceDisconnect.username
            })
        } else {
            server.to(forceDisconnect.ws).emit(session, {
                reason: 'The username is already in session!',
                type: false
            })
            client.handshake.headers.username = client.id
        }
        client.in(forceDisconnect.ws).disconnectSockets()
    },

    addUser: async (client: Socket, server: Server) => {
        let { session, username, perspective } : any = client.handshake.headers
        perspective = perspective === 'true' ? true : false
        let users: Array<any> = STORE.getUserInCacheStorage(session)
        const configurations: any = STORE.getConfigurationsInCacheStorage(session)

        if (!(users.find(_ => _.username === username))) {
            const admin = !SOCKET.anyoneIsAdmin(users) && perspective
            const user = {
                username,
                points: 0,
                perspective: perspective,
                admin,
                ws: client.id
            }
            users.push(user)
            STORE.setUserInCacheStorage(session, users)
            if (admin) server.to(user.ws).emit(session, { admin })

            if (!configurations) {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: false,
                    delete_forever: false,
                    winner: null,
                    history: null
                })
            } else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    history: configurations.history
                })
            }
    
            const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
            server.emit(session, {
                joinOrLeft: `(${perspective ? '🃏' : '👁️'}) ${username} has joined!`,
                scores: array.scores,
                spectators: array.spectators,
                ...STORE.getConfigurationsInCacheStorage(session)
            })
        } else {
            SOCKET.forceDisconnect(client, server, { ws: client.id }, false)
        }
    },

    removeUser: async (client: Socket, server: Server) => {
        let { session, username, perspective } : any = client.handshake.headers
        if (client.id === username) return
        perspective = perspective === 'true' ? true : false
        let users: Array<any> = STORE.getUserInCacheStorage(session)
        const configurations: any = STORE.getConfigurationsInCacheStorage(session)
        users = users.filter(_ => _.username !== username)

        if (users.length) {
            users = SOCKET.makeAdmin(client, server, users)
            STORE.setUserInCacheStorage(session, users)
            if (!configurations) {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: false,
                    delete_forever: false,
                    winner: null,
                    history: null
                })
            } else {
                STORE.setConfigurationsInCacheStorage(session, {
                    reveal: false,
                    visibility: SOCKET.completedScores(client),
                    delete_forever: false,
                    winner: null,
                    history: configurations.history
                })
            }
        } else {
            STORE.setUserInCacheStorage(session, [])
            STORE.setConfigurationsInCacheStorage(session, {})
        }

        client.disconnect(true)
        const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
        server.emit(session, {
            joinOrLeft: `(${perspective ? '🃏' : '👁️'}) ${username} has left!`,
            scores: array.scores,
            spectators: array.spectators,
            ...STORE.getConfigurationsInCacheStorage(session)
        })
    },

    separateUsers: (users: Array<any>) => {
        let scores = [], spectators = []
        users.forEach(user => {
            if (user.perspective)   scores.push(user)
            else                    spectators.push(user)
        })
        return { scores, spectators }
    },

    serveEmojis: async (client: Socket, server: Server, emojis: string) => {
        const { session } : any = client.handshake.headers

        const array: any = SOCKET.separateUsers(STORE.getUserInCacheStorage(session))
        server.emit(session, {
            emojis: emojis,
            scores: array.scores,
            spectators: array.spectators,
            ...STORE.getConfigurationsInCacheStorage(session)
        })
    }
}

export { SOCKET, SERVER, GATEWAY }