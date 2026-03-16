"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSocket = void 0;
const react_1 = require("react");
const socket_client_1 = require("./socket-client");
const useSocket = () => {
    const socketRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const socket = (0, socket_client_1.connectSocket)();
        socketRef.current = socket;
        return () => {
            // Don't disconnect on unmount — keep persistent connection
        };
    }, []);
    const on = (0, react_1.useCallback)((event, handler) => {
        var _a;
        const socket = (_a = socketRef.current) !== null && _a !== void 0 ? _a : (0, socket_client_1.connectSocket)();
        socket.on(event, handler);
        return () => { socket.off(event, handler); };
    }, []);
    const emit = (0, react_1.useCallback)((event, data) => {
        var _a;
        const socket = (_a = socketRef.current) !== null && _a !== void 0 ? _a : (0, socket_client_1.connectSocket)();
        socket.emit(event, data);
    }, []);
    return { on, emit, socketRef };
};
exports.useSocket = useSocket;
