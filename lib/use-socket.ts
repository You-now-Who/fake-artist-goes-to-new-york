"use client"

import { useEffect, useRef, useCallback } from "react"
import { Socket } from "socket.io-client"
import { connectSocket } from "./socket-client"

type EventHandler = (...args: unknown[]) => void

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = connectSocket()
    socketRef.current = socket
    return () => {
      // Don't disconnect on unmount — keep persistent connection
    }
  }, [])

  const on = useCallback((event: string, handler: EventHandler) => {
    const socket = socketRef.current ?? connectSocket()
    socket.on(event, handler)
    return () => { socket.off(event, handler) }
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    const socket = socketRef.current ?? connectSocket()
    socket.emit(event, data)
  }, [])

  return { on, emit, socketRef }
}
