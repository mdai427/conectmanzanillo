import { NavLink } from 'react-router-dom'
import { Anchor, MapPinned, RadioTower, ShieldCheck } from 'lucide-react'

const tabs = [
  ['/torre-control', 'Torre de control', RadioTower],
  ['/rutas-inteligentes', 'Rutas inteligentes', MapPinned],
  ['/control-aduanal', 'Control aduanal', Anchor],
]

export default function OperationalWorkspace({ title, eyebrow, description, companies, companyId, setCompanyId, children, updatedAt }) {
  return <div className="min-h-screen bg-[#f5f7f8] text-slate-950">
    <section className="border-b border-slate-800 bg-[#071d28] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-teal-300"><ShieldCheck size={14} />{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{description}</p></div>
          <label className="block min-w-64 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Empresa activa<select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-teal-300"><option value="" className="text-slate-900">Selecciona una empresa</option>{companies.map((company) => <option key={company.id} value={company.id} className="text-slate-900">{company.trade_name}</option>)}</select></label>
        </div>
        <nav className="mt-7 flex gap-1 overflow-x-auto" aria-label="Centro operativo">{tabs.map(([to,label,Icon]) => <NavLink key={to} to={to} className={({isActive}) => `flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-xs font-extrabold ${isActive ? 'bg-[#f5f7f8] text-[#071d28]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Icon size={15}/>{label}</NavLink>)}</nav>
      </div>
    </section>
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">{updatedAt && <p className="mb-4 text-right text-[10px] font-bold text-slate-500">Última actualización: {new Date(updatedAt).toLocaleString('es-MX')}</p>}{children}</main>
  </div>
}

export function EmptyOperational({ title='Selecciona una empresa', text='Necesitas una empresa activa y membresía autorizada para consultar este módulo.' }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><ShieldCheck className="mx-auto text-slate-300" size={32}/><h2 className="mt-4 text-lg font-black">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{text}</p></div> }

export const statusTone = (value='') => value === 'approved' || value === 'authorized' || value === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : value === 'blocked' || value === 'not_authorized' || value === 'critical' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'
