import express from 'express'
import { createServer } from 'http'
import { Server as SocketIO } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'

import phoneAuthRouter    from './routes/phoneAuth.js'
import comunicadosRouter  from './routes/comunicados.js'
import sectionsRouter     from './routes/sections.js'
import reportsRouter      from './routes/reports.js'
import reactionsRouter    from './routes/reactions.js'
import usersRouter        from './routes/users.js'
import adminRouter        from './routes/admin.js'
import chatRouter         from './routes/chat.js'
import predictionsRouter  from './routes/predictions.js'
import rankingsRouter     from './routes/rankings.js'
import directorioRouter   from './routes/directorio.js'
import publicidadRouter   from './routes/publicidad.js'
import pagosRouter        from './routes/pagos.js'
import foundationsRouter  from './routes/foundations.js'
import operationsRouter   from './routes/operations.js'
import { initSocket }  from './socket/index.js'
import { startScheduler } from './services/scheduler.js'
import { initWorkers } from './services/workers.js'
import { cacheFor, noCache } from './middleware/cache.js'
import { reportQueue, predQueue, maintenanceQueue } from './services/queue.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Railway y la mayoría de plataformas cloud usan un proxy inverso
app.set('trust proxy', 1)
const httpServer = createServer(app)

// Socket.io
const io = new SocketIO(httpServer, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET','POST'] }
})
initSocket(io)
app.set('io', io)

// Stripe webhook necesita body crudo — montarlo ANTES de express.json
app.use('/api/pagos/webhook', express.raw({ type: 'application/json' }))

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.CLIENT_URL || '*' }))
app.use(express.json({ limit: '10kb' }))
app.use(morgan('combined'))

// Rate limiting
app.use('/api/reports', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Demasiadas solicitudes' }))
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))

// API routes — con cache por tipo de dato
// Tiempo real: sin cache
app.use('/api/phone-auth',  noCache, phoneAuthRouter)
app.use('/api/comunicados', noCache, comunicadosRouter)
app.use('/api/reports',   noCache,        reportsRouter)
app.use('/api/reactions', noCache,        reactionsRouter)
app.use('/api/chat',      noCache,        chatRouter)
app.use('/api/users',     noCache,        usersRouter)
app.use('/api/admin',     noCache,        adminRouter)

// Directorio y publicidad
app.use('/api/directorio', cacheFor(60),  directorioRouter)
app.use('/api/publicidad', cacheFor(120), publicidadRouter)
app.use('/api/pagos',      noCache,        pagosRouter)
app.use('/api/foundations', noCache,       foundationsRouter)
app.use('/api/operations',  noCache,       operationsRouter)

// Semi-estático: cache corto + stale-while-revalidate
app.use('/api/sections',  cacheFor(30),   sectionsRouter)   // 30s  — zonas cambian seguido
app.use('/api/rankings',  cacheFor(300),  rankingsRouter)   // 5min — rankings no son urgentes

// Estático: cache largo — el servidor ya tiene cache interno de 15min
app.use('/api/predictions', cacheFor(900), predictionsRouter) // 15min

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    ts: new Date().toISOString(),
    queues: {
      reports: reportQueue.stats(),
      predictions: predQueue.stats(),
      maintenance: maintenanceQueue.stats(),
    },
  })
})

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'faro-portuario' })
})

// Servir cliente React (build estático)
const clientBuild = path.join(__dirname, '../../client/dist')
// Assets con hash en el nombre (JS/CSS de Vite) → cache permanente
app.use(express.static(clientBuild, {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res, filePath) => {
    // index.html y robots.txt nunca se cachean — siempre frescos
    if (filePath.endsWith('index.html') || filePath.endsWith('robots.txt') || filePath.endsWith('sitemap.xml')) {
      res.set('Cache-Control', 'no-cache')
    }
  },
}))
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.sendFile(path.join(clientBuild, 'index.html'))
})

// Workers y scheduler
initWorkers()
startScheduler()

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`Faro Portuario server corriendo en puerto ${PORT}`)
})
