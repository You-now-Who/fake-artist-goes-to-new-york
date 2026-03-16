import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: false,
    })
  }
  return socket
}

export const connectSocket = (): Socket => {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export const disconnectSocket = (): void => {
  if (socket?.connected) socket.disconnect()
}
