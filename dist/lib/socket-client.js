"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectSocket = exports.connectSocket = exports.getSocket = void 0;
const socket_io_client_1 = require("socket.io-client");
let socket = null;
const getSocket = () => {
    var _a;
    if (!socket) {
        socket = (0, socket_io_client_1.io)((_a = process.env.NEXT_PUBLIC_SOCKET_URL) !== null && _a !== void 0 ? _a : "", {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            autoConnect: false,
        });
    }
    return socket;
};
exports.getSocket = getSocket;
const connectSocket = () => {
    const s = (0, exports.getSocket)();
    if (!s.connected)
        s.connect();
    return s;
};
exports.connectSocket = connectSocket;
const disconnectSocket = () => {
    if (socket === null || socket === void 0 ? void 0 : socket.connected)
        socket.disconnect();
};
exports.disconnectSocket = disconnectSocket;
