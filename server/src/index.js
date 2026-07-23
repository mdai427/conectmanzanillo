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
import freightsRouter     from './routes/freights.js'
import resourcesRouter    from './routes/resources.js'
import newsRouter         from './routes/news.js'
import communityRouter    from './routes/community.js'
import marketplaceRouter  from './routes/marketplace.js'
import { initSocket }  from './socket/index.js'
import { startScheduler } from './services/scheduler.js'
import { startNewsScheduler } from './services/newsScheduler.js'
import { initWorkers } from './services/workers.js'
import { cacheFor, noCache } from './middleware/cache.js'
import { reportQueue, predQueue, maintenanceQueue } from './services/queue.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Orígenes permitidos para CORS (coma-separados en CLIENT_URL). El cliente se
// sirve same-origin desde este mismo servidor, así que las peticiones propias
// no dependen de CORS; esta allowlist solo controla accesos cross-origin.
const ALLOWED_ORIGINS = String(process.env.CLIENT_URL || '')
  .split(',').map(o => o.trim()).filter(Boolean)

function corsOrigin(origin, callback) {
  // Sin Origin (same-origin, curl, health checks, apps nativas) → permitir.
  // Si no hay allowlist configurada, permitir (comportamiento previo).
  if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    return callback(null, true)
  }
  return callback(new Error('Origen no permitido por CORS'))
}

// Railway y la mayoría de plataformas cloud usan un proxy inverso
app.set('trust proxy', 1)
const httpServer = createServer(app)

// Socket.io
const io = new SocketIO(httpServer, {
  cors: { origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : '*', methods: ['GET','POST'] }
})
initSocket(io)
app.set('io', io)

// Stripe webhook necesita body crudo — montarlo ANTES de express.json
app.use('/api/pagos/webhook', express.raw({ type: 'application/json' }))

// Orígenes de Supabase (REST/Auth + Realtime WebSocket) para connect-src.
const supabaseHttp = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const supabaseWs = supabaseHttp.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
const connectExtras = [supabaseHttp, supabaseWs, ...ALLOWED_ORIGINS].filter(Boolean)

// Middlewares — CSP en modo REPORT-ONLY: no bloquea nada, solo registra
// violaciones. Una vez verificado que no hay reportes legítimos rotos,
// cambiar `reportOnly` a false para hacerla efectiva.
app.use(helmet({
  contentSecurityPolicy: {
    reportOnly: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...connectExtras],
      frameSrc: ["'self'", 'https://checkout.stripe.com', 'https://js.stripe.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}))
app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '10kb' }))
app.use(morgan('combined'))

// Rate limiting — límites separados por endpoint para que gastar intentos de
// verificación no bloquee el reenvío de códigos (y viceversa).
const otpSendLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, message: { error: 'Demasiados envíos de código. Espera unos minutos antes de solicitar otro.' } })
const otpVerifyLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 12, message: { error: 'Demasiados intentos. Espera unos minutos antes de reintentar.' } })
app.use('/api/phone-auth/send', otpSendLimiter)
app.use('/api/phone-auth/reset-password', otpSendLimiter)
app.use('/api/phone-auth/verify', otpVerifyLimiter)
app.use('/api/phone-auth', rateLimit({ windowMs: 10 * 60 * 1000, max: 30 }))
app.use('/api/reports', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Demasiadas solicitudes' }))
app.use('/api/resources', rateLimit({ windowMs: 15 * 60 * 1000, max: 80, message: { error: 'Demasiadas descargas. Espera unos minutos.' } }))
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
app.use('/api/freights',    noCache,        freightsRouter)
app.use('/api/resources',   noCache,        resourcesRouter)
app.use('/api/news',        noCache,        newsRouter)
app.use('/api/community',   noCache,        communityRouter)
app.use('/api/marketplace', noCache,        marketplaceRouter)

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
startNewsScheduler()

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`Faro Portuario server corriendo en puerto ${PORT}`)
})
