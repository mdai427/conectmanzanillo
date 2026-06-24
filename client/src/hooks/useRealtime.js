import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || '', {
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function useSocketEvent(event, handler) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const s = getSocket()
    const fn = (...args) => handlerRef.current(...args)
    s.on(event, fn)
    return () => s.off(event, fn)
  }, [event])
}
