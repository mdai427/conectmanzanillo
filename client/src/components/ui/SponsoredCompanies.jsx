import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || ''

async function fetchSponsors() {
  const response = await fetch(`${API}/api/publicidad?zona=principal`)
  if (!response.ok) return []
  const campaigns = await response.json()
  return campaigns.filter((campaign) => campaign.empresa_perfiles?.slug)
}

export default function SponsoredCompanies() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const impressions = useRef(new Set())
  const { data: campaigns = [] } = useQuery({ queryKey: ['home-sponsors'], queryFn: fetchSponsors, staleTime: 120_000, retry: 1 })
  const next = useCallback(() => setIndex((current) => (current + 1) % campaigns.length), [campaigns.length])

  useEffect(() => {
    if (paused || campaigns.length < 2) return
    const timer = window.setInterval(next, 7000)
    return () => window.clearInterval(timer)
  }, [campaigns.length, next, paused])

  useEffect(() => {
    const campaign = campaigns[index]
    if (!campaign || impressions.current.has(campaign.id)) return
    impressions.current.add(campaign.id)
    fetch(`${API}/api/publicidad/${campaign.id}/impresion`, { method: 'POST', keepalive: true }).catch(() => {})
  }, [campaigns, index])

  if (!campaigns.length) return null
  const campaign = campaigns[index]
  const company = campaign.empresa_perfiles
  const profilePath = `/directorio-empresarial/${company.slug}`

  return (
    <section aria-labelledby="sponsors-title" className="border-b border-slate-100 bg-white py-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400">Patrocinado</p><h2 id="sponsors-title" className="mt-1 text-lg font-black text-[#081f2c]">Empresas destacadas del ecosistema</h2></div>{campaigns.length > 1 && <div className="flex gap-2"><Control label="Anterior" onClick={() => setIndex((current) => (current - 1 + campaigns.length) % campaigns.length)}><ChevronLeft size={16} /></Control><Control label="Siguiente" onClick={next}><ChevronRight size={16} /></Control></div>}</div>
        <article className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(8,31,44,.06)] md:grid-cols-[240px_1fr_auto] md:items-center">
          <div className="h-36 bg-slate-100 md:h-full">{campaign.imagen_url ? <img src={campaign.imagen_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center">{company.logo_url ? <img src={company.logo_url} alt={`Logo de ${company.nombre_comercial}`} className="h-20 w-20 rounded-xl object-contain" /> : <span className="text-3xl font-black text-slate-300">{company.nombre_comercial?.charAt(0)}</span>}</div>}</div>
          <div className="p-5 sm:p-7"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black tracking-tight">{company.nombre_comercial}</h3>{company.es_verificado && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-800"><BadgeCheck size={11} /> Empresa verificada</span>}</div><p className="mt-1 text-xs font-bold uppercase tracking-wide text-teal-700">{company.categoria_slug?.replace(/-/g, ' ')}</p>{company.descripcion && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{company.descripcion}</p>}{company.direccion && <p className="mt-3 flex items-center gap-1 text-xs text-slate-400"><MapPin size={13} />{company.direccion}</p>}</div>
          <div className="flex flex-col gap-2 border-t border-slate-100 p-5 md:border-l md:border-t-0"><Link to={profilePath} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] px-5 text-xs font-extrabold text-white">Ver empresa <ArrowRight size={13} /></Link><Link to={`${profilePath}?cotizar=1`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-xs font-extrabold text-slate-700">Solicitar cotización</Link></div>
        </article>
        {campaigns.length > 1 && <div className="mt-4 flex justify-center gap-1.5">{campaigns.map((item, itemIndex) => <button key={item.id} aria-label={`Mostrar patrocinador ${itemIndex + 1}`} onClick={() => setIndex(itemIndex)} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? 'w-6 bg-teal-700' : 'w-1.5 bg-slate-200'}`} />)}</div>}
      </div>
    </section>
  )
}

function Control({ label, onClick, children }) { return <button aria-label={label} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-teal-700 hover:text-teal-800">{children}</button> }
