import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, CheckCircle2, ExternalLink, FileCheck2, Loader2, ShieldCheck, UserRound, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase.js'

const BASE = import.meta.env.VITE_API_URL || ''
const DOCUMENT_LABELS = {
  tax_certificate: 'Constancia de situación fiscal',
  official_id: 'Identificación oficial',
  incorporation_deed: 'Acta constitutiva',
  legal_representative_id: 'Identificación del representante legal',
  proof_of_address: 'Comprobante de domicilio fiscal',
}

async function foundationsRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${BASE}/api/foundations${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No fue posible completar la revisión')
  return data
}

export default function VerificationQueue() {
  const queryClient = useQueryClient()
  const [rejection, setRejection] = useState(null)
  const [reason, setReason] = useState('')
  const { data: companies = [], isLoading, isError } = useQuery({
    queryKey: ['company-verification-queue'],
    queryFn: () => foundationsRequest('/verification-queue'),
  })
  const decision = useMutation({
    mutationFn: ({ companyId, value, reason: decisionReason }) => foundationsRequest(`/companies/${companyId}/verification-decision`, {
      method: 'POST', body: JSON.stringify({ decision: value, reason: decisionReason }),
    }),
    onSuccess: (_data, variables) => {
      toast.success(variables.value === 'approved' ? 'Expediente aprobado' : 'Se solicitaron correcciones')
      setRejection(null); setReason('')
      queryClient.invalidateQueries({ queryKey: ['company-verification-queue'] })
    },
    onError: (error) => toast.error(error.message),
  })

  async function openDocument(documentId) {
    try {
      const data = await foundationsRequest(`/verification-documents/${documentId}/download-url`)
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (error) { toast.error(error.message) }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="mx-auto max-w-6xl">
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-800"><ArrowLeft size={14}/>Volver al inicio</Link>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-teal-700">Control de confianza</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Verificación legal</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Revisa el expediente antes de permitir que una empresa o persona física publique y solicite fletes.</p></div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4"><p className="text-2xl font-black text-teal-900">{companies.length}</p><p className="text-xs font-bold text-teal-700">pendientes</p></div>
      </div>

      {isLoading && <div className="mt-8 grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="animate-spin text-teal-700" aria-label="Cargando expedientes"/></div>}
      {isError && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-800">No fue posible cargar la cola. Confirma que tu cuenta tenga permiso para verificar empresas.</div>}
      {!isLoading && !isError && companies.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><ShieldCheck className="mx-auto text-teal-700"/><h2 className="mt-4 font-black">Todos los expedientes están atendidos</h2><p className="mt-2 text-xs text-slate-500">Las nuevas solicitudes aparecerán aquí.</p></div>}

      <div className="mt-8 space-y-5">{companies.map(company => <article key={company.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div className="flex gap-3">{company.legal_entity_type === 'individual_business' ? <UserRound className="mt-1 shrink-0 text-teal-700"/> : <Building2 className="mt-1 shrink-0 text-teal-700"/>}<div><h2 className="font-black text-slate-950">{company.trade_name || company.legal_name}</h2><p className="mt-1 text-xs text-slate-500">{company.legal_entity_type === 'individual_business' ? 'Persona física con actividad empresarial' : 'Persona moral'} · RFC {company.tax_id}</p><p className="mt-1 text-xs text-slate-500">Responsable: {company.responsible_name} · {company.business_email} · {company.phone}</p></div></div><span className="h-fit rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase text-amber-800">Pendiente</span></div></div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">{(company.company_documents || []).map(document => <button key={document.id} onClick={() => openDocument(document.id)} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-teal-600 hover:bg-teal-50"><span className="flex min-w-0 items-center gap-3"><FileCheck2 size={18} className="shrink-0 text-teal-700"/><span className="min-w-0"><b className="block truncate text-xs">{DOCUMENT_LABELS[document.document_type] || document.document_type}</b><small className="mt-1 block truncate text-slate-400">{document.original_name}</small></span></span><ExternalLink size={14} className="shrink-0 text-slate-400"/></button>)}</div>
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end"><button disabled={decision.isPending} onClick={() => { setRejection(company.id); setReason('') }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-xs font-black text-red-700"><XCircle size={15}/>Solicitar correcciones</button><button disabled={decision.isPending} onClick={() => decision.mutate({ companyId: company.id, value: 'approved', reason: 'Expediente legal revisado y aprobado' })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0d5b55] px-5 text-xs font-black text-white"><CheckCircle2 size={15}/>Aprobar verificación</button></div>
        {rejection === company.id && <div className="border-t border-red-100 bg-red-50 p-5"><label className="text-xs font-black text-red-900">Indica exactamente qué debe corregir</label><textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} maxLength={600} className="mt-2 w-full rounded-xl border border-red-200 bg-white p-3 text-sm outline-none focus:border-red-500" placeholder="Ejemplo: la constancia fiscal está vencida o no es legible."/><div className="mt-3 flex justify-end gap-2"><button onClick={() => setRejection(null)} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button disabled={!reason.trim() || decision.isPending} onClick={() => decision.mutate({ companyId: company.id, value: 'rejected', reason: reason.trim() })} className="rounded-lg bg-red-700 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Enviar correcciones</button></div></div>}
      </article>)}</div>
    </div>
  </main>
}
