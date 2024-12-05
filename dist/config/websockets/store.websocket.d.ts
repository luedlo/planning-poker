import { Socket, Server } from 'socket.io';
declare const SERVER = "devstrauss-data-sockets-service-planning-poker";
declare const GATEWAY = "GatewayWebSocket";
declare const SOCKET: {
    sendData: (client: Socket, payload: any, server: Server) => Promise<void>;
    changePerspective: (client: Socket, server: Server, forceChange: any) => void;
    makeSuperUser: (client: Socket, server: Server, superUser: any) => void;
    changeHistory: (client: Socket, server: Server, history: string) => void;
    saveScores: (client: Socket, server: Server) => void;
    revealScores: (client: Socket, server: Server) => void;
    clearScores: (client: Socket, server: Server, action: string) => void;
    completedScores: (client: Socket) => boolean;
    winner: (client: Socket) => number[];
    anyoneIsAdmin: (users: any) => any;
    makeAdmin: (client: Socket, server: Server, users: Array<any>) => any[];
    forceDisconnect: (client: Socket, server: Server, forceDisconnect: any, reason: boolean) => void;
    addUser: (client: Socket, server: Server) => Promise<void>;
    removeUser: (client: Socket, server: Server) => Promise<void>;
    separateUsers: (users: Array<any>) => {
        scores: any[];
        spectators: any[];
    };
    serveEmojis: (client: Socket, server: Server, emojis: string) => Promise<void>;
};
export { SOCKET, SERVER, GATEWAY };
