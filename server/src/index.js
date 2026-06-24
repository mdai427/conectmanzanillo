import express from 'express'
import { createServer } from 'http'
import { Server as SocketIO } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'

import sectionsRouter  from './routes/sections.js'
import reportsRouter   from './routes/reports.js'
import reactionsRouter from './routes/reactions.js'
import usersRouter     from './routes/users.js'
import adminRouter     from './routes/admin.js'
import { initSocket }  from './socket/index.js'
import { startScheduler } from './services/scheduler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const httpServer = createServer(app)

// Socket.io
const io = new SocketIO(httpServer, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET','POST'] }
})
initSocket(io)
app.set('io', io)

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.CLIENT_URL || '*' }))
app.use(express.json({ limit: '10kb' }))
app.use(morgan('combined'))

// Rate limiting
app.use('/api/reports', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Demasiadas solicitudes' }))
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))

// API routes
app.use('/api/sections',  sectionsRouter)
app.use('/api/reports',   reportsRouter)
app.use('/api/reactions', reactionsRouter)
app.use('/api/users',     usersRouter)
app.use('/api/admin',     adminRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// Servir cliente React (build estático)
const clientBuild = path.join(__dirname, '../../client/dist')
app.use(express.static(clientBuild))
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'))
})

// Scheduler (expirar reportes viejos cada 15 min)
startScheduler()

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`ConectManzanillo server corriendo en puerto ${PORT}`)
})
