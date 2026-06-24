export function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] Cliente conectado: ${socket.id}`)

    // Unirse a sala de una sección específica
    socket.on('join_section', (sectionId) => {
      socket.join(`section:${sectionId}`)
    })

    socket.on('leave_section', (sectionId) => {
      socket.leave(`section:${sectionId}`)
    })

    socket.on('disconnect', () => {
      console.log(`[socket] Cliente desconectado: ${socket.id}`)
    })
  })
}
