"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayWebSocket = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const store_websocket_1 = require("./store.websocket");
let GatewayWebSocket = class GatewayWebSocket {
    constructor() {
        this.logger = new common_1.Logger(store_websocket_1.GATEWAY);
    }
    async handleMessage(client, payload) {
        await store_websocket_1.SOCKET.sendData(client, payload, this.server);
    }
    async handleConnection(client) {
        await store_websocket_1.SOCKET.addUser(client, this.server);
    }
    async handleDisconnect(client) {
        await store_websocket_1.SOCKET.removeUser(client, this.server);
    }
    async afterInit(_server) {
        this.logger.log('Planning-Poker-API has been initialized!');
    }
};
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GatewayWebSocket.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(store_websocket_1.SERVER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GatewayWebSocket.prototype, "handleMessage", null);
GatewayWebSocket = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    })
], GatewayWebSocket);
exports.GatewayWebSocket = GatewayWebSocket;
//# sourceMappingURL=gateway.websocket.js.map