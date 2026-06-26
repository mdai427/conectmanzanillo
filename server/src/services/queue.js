/**
 * Queue asíncrona in-process.
 * Sin Redis ni dependencias externas — ideal para Railway/single-instance.
 *
 * Funciona como un worker loop: los jobs se encolan y se procesan
 * uno a uno (o en paralelo según `concurrency`) sin bloquear el event loop.
 */

class Queue {
  constructor(name, { concurrency = 1 } = {}) {
    this.name = name
    this.concurrency = concurrency
    this._queue = []
    this._running = 0
    this._handlers = {}
    this._stats = { processed: 0, failed: 0, retried: 0 }
  }

  /** Registra el handler para un tipo de job */
  process(jobName, handler) {
    this._handlers[jobName] = handler
    return this
  }

  /** Agrega un job a la cola */
  add(jobName, data, { retries = 2, delay = 0 } = {}) {
    const job = { jobName, data, retries, attempt: 0, delay, addedAt: Date.now() }
    this._queue.push(job)
    setImmediate(() => this._tick())
    return job
  }

  /** Procesa el siguiente job disponible */
  async _tick() {
    if (this._running >= this.concurrency || this._queue.length === 0) return

    const job = this._queue.shift()
    const handler = this._handlers[job.jobName]

    if (!handler) {
      console.warn(`[queue:${this.name}] Sin handler para "${job.jobName}"`)
      return this._tick()
    }

    this._running++

    const run = async () => {
      try {
        if (job.delay > 0) await sleep(job.delay)
        await handler(job.data)
        this._stats.processed++
        console.log(`[queue:${this.name}] ✓ ${job.jobName} (${Date.now() - job.addedAt}ms)`)
      } catch (err) {
        this._stats.failed++
        console.error(`[queue:${this.name}] ✗ ${job.jobName} intento ${job.attempt + 1}:`, err.message)

        if (job.attempt < job.retries) {
          job.attempt++
          this._stats.retried++
          const backoff = Math.min(1000 * 2 ** job.attempt, 30_000) // exponential backoff, max 30s
          this._queue.unshift({ ...job, delay: backoff })
          console.log(`[queue:${this.name}] ↩ Reintento ${job.attempt} en ${backoff}ms`)
        }
      } finally {
        this._running--
        this._tick()
      }
    }

    run()
    if (this._running < this.concurrency) this._tick()
  }

  stats() {
    return { ...this._stats, pending: this._queue.length, running: this._running }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Queues de la aplicación ─────────────────────────────────────────────────

/** Jobs post-reporte: recalcular estado, puntos, notificaciones */
export const reportQueue = new Queue('reports', { concurrency: 3 })

/** Predicciones IA en background */
export const predQueue = new Queue('predictions', { concurrency: 1 })

/** Limpieza y mantenimiento */
export const maintenanceQueue = new Queue('maintenance', { concurrency: 1 })
