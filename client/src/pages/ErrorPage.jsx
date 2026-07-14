import { AlertTriangle, ArrowLeft, Home, LockKeyhole, SearchX, ServerOff } from 'lucide-react'
import { Link, useRouteError } from 'react-router-dom'

const CONFIG = {
  403: { icon: LockKeyhole, title: 'No tienes acceso a esta sección', text: 'Tu cuenta no cuenta con el permiso necesario. Si crees que es un error, contacta a soporte.' },
  404: { icon: SearchX, title: 'Esta página no existe', text: 'La dirección puede haber cambiado o el contenido ya no está disponible.' },
  500: { icon: ServerOff, title: 'No pudimos cargar esta sección', text: 'Ocurrió un problema inesperado. Puedes volver al inicio o intentarlo nuevamente.' },
}

export default function ErrorPage({ status = 404 }) {
  const routeError = useRouteError()
  const resolvedStatus = routeError?.status || status
  const config = CONFIG[resolvedStatus] || CONFIG[500]
  const Icon = config.icon || AlertTriangle
  return <main className="grid min-h-[70vh] place-items-center bg-white px-4 py-16"><div className="max-w-lg text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 text-teal-800 shadow-sm"><Icon size={24} /></div><p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">Error {resolvedStatus}</p><h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#081f2c]">{config.title}</h1><p className="mt-4 text-sm leading-6 text-slate-500">{config.text}</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] px-5 text-sm font-extrabold text-white"><Home size={15} />Ir al inicio</Link><button onClick={() => window.history.back()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-extrabold text-slate-700"><ArrowLeft size={15} />Volver</button></div></div></main>
}
