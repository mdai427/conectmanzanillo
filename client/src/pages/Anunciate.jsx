import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BarChart3, Check, Megaphone, ShieldCheck, Target, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase.js'

const API = import.meta.env.VITE_API_URL || ''

async function fetchPlans() {
  const response = await fetch(`${API}/api/publicidad/planes`)
  if (!response.ok) return []
  return response.json()
}

export default function Anunciate() {
  const [selected, setSelected] = useState(null)
  const { data: plans = [], isLoading } = useQuery({ queryKey: ['advertising-plans'], queryFn: fetchPlans, staleTime: 300_000, retry: 1 })

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="max-w-4xl"><div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-extrabold text-slate-600"><Megaphone size={13} /> Publicidad para el sector logístico</div><h1 className="mt-7 text-4xl font-black tracking-[-.05em] text-[#081f2c] sm:text-6xl">Haz visible tu empresa ante una audiencia especializada.</h1><p className="mt-6 max-w-3xl text-base leading-7 text-slate-500 sm:text-lg">Crea una presencia profesional dentro de Faro Portuario. Las campañas se revisan, programan y miden según el formato contratado y el tráfico real del periodo.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="#planes" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] px-5 text-sm font-extrabold text-white">Conocer opciones <ArrowRight size={15} /></a><Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-extrabold text-slate-700">Registrar mi empresa</Link></div></div>
        </div>
      </header>

      <section className="border-b border-slate-100 py-14 sm:py-20"><div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3">{[
        [Target, 'Audiencia especializada', 'Presencia dentro de un ecosistema enfocado en logística, transporte y comercio exterior.'],
        [BarChart3, 'Métricas según formato', 'Impresiones y clics se reportan cuando el formato contratado permite su medición.'],
        [ShieldCheck, 'Revisión antes de publicar', 'Cada creatividad se valida antes de programarse para proteger la confianza de la comunidad.'],
      ].map(([Icon, title, text]) => <article key={title} className="border-t border-slate-200 pt-6"><Icon size={22} className="text-teal-800" /><h2 className="mt-5 font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}</div></section>

      <section id="planes" className="border-b border-slate-100 py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4"><div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.2em] text-teal-700">Opciones administrables</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#081f2c] sm:text-4xl">Elige el nivel de presencia</h2><p className="mt-3 text-sm leading-6 text-slate-500">La disponibilidad, precio y duración se confirman antes de contratar.</p></div>
        {isLoading ? <div className="mt-9 grid gap-4 md:grid-cols-2"><div className="h-72 animate-pulse rounded-2xl bg-slate-100" /><div className="h-72 animate-pulse rounded-2xl bg-slate-100" /></div> : plans.length ? <div className="mt-9 grid gap-4 md:grid-cols-2">{plans.map((plan) => <article key={plan.code} className="flex flex-col rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgba(8,31,44,.04)]"><h3 className="text-xl font-black">{plan.name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{plan.description}</p><p className="mt-5 text-sm font-extrabold text-teal-800">{plan.monthly_price == null || plan.requires_quote ? 'Precio por cotización' : `$${Number(plan.monthly_price).toLocaleString('es-MX')} ${plan.currency} / mes`}</p><ul className="mt-6 space-y-3">{(plan.features || []).map((feature) => <li key={feature} className="flex gap-2 text-sm text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-teal-700" />{feature}</li>)}</ul><button onClick={() => setSelected(plan)} className="mt-7 min-h-11 rounded-xl bg-[#0d4f4b] px-5 text-sm font-extrabold text-white">Solicitar contratación</button></article>)}</div> : <div className="mt-9 rounded-2xl border border-slate-200 p-8 text-center"><p className="font-black">No hay paquetes disponibles en este momento</p><p className="mt-2 text-sm text-slate-500">Puedes registrar tu empresa y volver cuando se publiquen nuevas opciones.</p><Link to="/register" className="mt-5 inline-flex rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold">Registrar empresa</Link></div>}
      </div></section>

      <section className="py-16 sm:py-20"><div className="mx-auto max-w-5xl px-4"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-teal-700">Proceso</p><h2 className="mt-3 text-3xl font-black tracking-tight">De la solicitud a la publicación</h2></div><ol className="grid gap-4 sm:grid-cols-2">{['Elige una opción y registra tu empresa.','Comparte objetivo, creatividad y enlace.','El equipo revisa disponibilidad y contenido.','Se confirma cotización o pago seguro.','La campaña se programa después de aprobarse.','Consulta métricas disponibles al finalizar.'].map((step, index) => <li key={step} className="flex gap-3 border-t border-slate-200 pt-4"><span className="text-xs font-black text-teal-700">{String(index + 1).padStart(2, '0')}</span><p className="text-sm leading-6 text-slate-600">{step}</p></li>)}</ol></div></div></section>

      {selected && <LeadModal plan={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}

function LeadModal({ plan, onClose }) {
  const [form, setForm] = useState({ contact_name: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Inicia sesión y completa el registro de tu empresa para enviar la solicitud.')
      const response = await fetch(`${API}/api/publicidad/solicitudes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...form, plan_code: plan.code }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No fue posible enviar la solicitud')
      toast.success('Solicitud registrada. El equipo comercial podrá darle seguimiento.')
      onClose()
    } catch (error) { toast.error(error.message) } finally { setLoading(false) }
  }
  return <div role="dialog" aria-modal="true" aria-labelledby="lead-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Solicitud comercial</p><h2 id="lead-title" className="mt-2 text-xl font-black">{plan.name}</h2></div><button onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200"><X size={16} /></button></div><form onSubmit={submit} className="mt-6 space-y-4"><Input label="Nombre del responsable" value={form.contact_name} onChange={(value) => setForm({ ...form, contact_name: value })} required /><Input label="Correo empresarial" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required /><Input label="Teléfono" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} /><label className="block"><span className="mb-2 block text-xs font-extrabold">¿Qué quieres lograr?</span><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} maxLength={1500} rows="4" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-700" /></label><button disabled={loading} className="min-h-12 w-full rounded-xl bg-[#0d4f4b] text-sm font-extrabold text-white disabled:opacity-50">{loading ? 'Enviando…' : 'Enviar solicitud'}</button><p className="text-[10px] leading-5 text-slate-400">La solicitud no activa una campaña ni genera un cobro. El precio y la disponibilidad se confirman posteriormente.</p></form></div></div>
}
function Input({ label, value, onChange, type = 'text', required }) { return <label className="block"><span className="mb-2 block text-xs font-extrabold">{label}</span><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-700" /></label> }
