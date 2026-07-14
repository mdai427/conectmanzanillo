import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Building2, Check, FileCheck2, Loader2, ShieldCheck, Upload } from 'lucide-react'
import { foundationsApi } from '../lib/foundationsApi.js'
import { supabase } from '../lib/supabase.js'

const COMPANY_TYPES = [
  ['carrier', 'Transportista'], ['owner_operator', 'Hombre-camión'], ['customs_broker', 'Agente aduanal'], ['freight_forwarder', 'Freight forwarder'],
  ['importer', 'Importador'], ['exporter', 'Exportador'], ['logistics_operator', 'Operador logístico'], ['warehouse', 'Almacén'], ['yard', 'Patio'],
  ['rigging_company', 'Empresa de maniobras'], ['shipping_line', 'Naviera'], ['bonded_warehouse', 'Recinto fiscalizado'], ['supplier', 'Proveedor'],
  ['workshop', 'Taller'], ['tire_shop', 'Llantera'], ['crane_company', 'Empresa de grúas'], ['gps_company', 'Empresa de GPS'],
  ['security_company', 'Seguridad o custodia'], ['insurer', 'Aseguradora'], ['financial_company', 'Financiera'],
  ['training_center', 'Centro de capacitación'], ['trading_company', 'Comercializadora'], ['other_logistics_provider', 'Otro proveedor logístico'],
]

const STEPS = ['Empresa', 'Fiscal', 'Contacto', 'Comercial', 'Documentos', 'Plan', 'Revisión']
const INITIAL = { company_type: '', legal_name: '', trade_name: '', tax_id: '', tax_regime: '', fiscal_address: '', founded_year: '', responsible_name: '', responsible_title: '', business_email: '', phone: '', whatsapp: '', website: '', description: '', services: '', coverage: '', ports_served: 'Manzanillo', states_served: '', business_hours: '' }

export default function CompanyOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [companyId, setCompanyId] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [documents, setDocuments] = useState([])
  const [plans, setPlans] = useState([])
  const [planCode, setPlanCode] = useState('')
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  const audience = useMemo(() => ['carrier', 'owner_operator'].includes(form.company_type) ? 'carrier' : ['supplier', 'workshop', 'tire_shop', 'crane_company', 'gps_company', 'security_company', 'insurer', 'financial_company', 'training_center'].includes(form.company_type) ? 'provider' : 'company', [form.company_type])

  useEffect(() => {
    foundationsApi.getMyCompanies().then((memberships) => {
      const existing = memberships?.[0]?.companies
      if (existing && ['draft', 'incomplete', 'corrections_required'].includes(existing.status)) {
        setCompanyId(existing.id)
        setForm((current) => ({ ...current, ...existing, services: (existing.services || []).join(', '), coverage: (existing.coverage || []).join(', '), ports_served: (existing.ports_served || []).join(', '), states_served: (existing.states_served || []).join(', '), business_hours: typeof existing.business_hours === 'string' ? existing.business_hours : '' }))
        setStep(1)
      }
    }).catch(() => {}).finally(() => setInitializing(false))
  }, [])

  useEffect(() => {
    if (step !== 5 || !form.company_type) return
    foundationsApi.getPlans(audience).then(setPlans).catch((error) => toast.error(error.message))
  }, [step, audience, form.company_type])

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const arrayValue = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean)

  const saveStep = async () => {
    setLoading(true)
    try {
      if (step === 0) {
        if (!form.company_type || !form.legal_name.trim() || !form.trade_name.trim()) throw new Error('Completa el tipo, razón social y nombre comercial')
        const company = await foundationsApi.createCompany({ company_type: form.company_type, legal_name: form.legal_name, trade_name: form.trade_name })
        setCompanyId(company.id)
      } else if ([1, 2, 3].includes(step)) {
        const payload = step === 1
          ? { tax_id: form.tax_id, tax_regime: form.tax_regime, fiscal_address: form.fiscal_address, founded_year: form.founded_year ? Number(form.founded_year) : null }
          : step === 2
            ? { responsible_name: form.responsible_name, responsible_title: form.responsible_title, business_email: form.business_email, phone: form.phone, whatsapp: form.whatsapp, website: form.website }
            : { description: form.description, services: arrayValue(form.services), coverage: arrayValue(form.coverage), ports_served: arrayValue(form.ports_served), states_served: arrayValue(form.states_served), business_hours: form.business_hours ? { general: form.business_hours } : {} }
        await foundationsApi.updateCompany(companyId, payload)
      } else if (step === 5) {
        if (!planCode) throw new Error('Selecciona un plan para continuar')
        await foundationsApi.selectPlan(companyId, { plan_code: planCode, billing_period: billingPeriod })
      }
      setStep((current) => Math.min(current + 1, 6))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const uploadDocument = async (documentType, file) => {
    if (!file || !companyId) return
    setLoading(true)
    try {
      const prepared = await foundationsApi.prepareDocument(companyId, { document_type: documentType, original_name: file.name, mime_type: file.type, size_bytes: file.size })
      const { error } = await supabase.storage.from('company-documents').uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type })
      if (error) throw error
      setDocuments((current) => [...current.filter((item) => item.type !== documentType), { type: documentType, name: file.name }])
      toast.success('Documento cargado de forma privada')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    if (!accepted) return toast.error('Acepta los términos y reglas de publicación')
    setLoading(true)
    try {
      await foundationsApi.submitVerification(companyId)
      toast.success('Empresa enviada a validación')
      navigate('/empresa')
    } catch (error) {
      const missing = error.details?.missing_fields?.join(', ')
      toast.error(missing ? `Faltan campos: ${missing}` : error.message)
    } finally {
      setLoading(false)
    }
  }

  if (initializing) return <div className="grid min-h-[60vh] place-items-center bg-white"><Loader2 className="animate-spin text-teal-700" /></div>

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between"><Link to="/empresa" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft size={14} /> Salir y continuar después</Link><span className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Registro empresarial</span></div>
        <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside>
            <h1 className="text-2xl font-black tracking-[-.035em] text-[#081f2c]">Configura tu empresa</h1>
            <p className="mt-2 text-xs leading-5 text-slate-500">La información fiscal y los documentos permanecen privados.</p>
            <ol className="mt-7 space-y-2">{STEPS.map((label, index) => <li key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold ${index === step ? 'bg-teal-50 text-teal-900' : index < step ? 'text-teal-700' : 'text-slate-400'}`}><span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] ${index <= step ? 'border-teal-700' : 'border-slate-200'}`}>{index < step ? <Check size={12} /> : index + 1}</span>{label}</li>)}</ol>
          </aside>

          <section className="rounded-3xl border border-slate-200 p-5 shadow-[0_16px_50px_rgba(8,31,44,.06)] sm:p-8">
            {step === 0 && <Step title="Identidad de la empresa" text="Comienza con la información que aparecerá en tu espacio empresarial."><Select label="Tipo de empresa" value={form.company_type} onChange={(value) => setField('company_type', value)} options={COMPANY_TYPES} /><Field label="Razón social" value={form.legal_name} onChange={(value) => setField('legal_name', value)} /><Field label="Nombre comercial" value={form.trade_name} onChange={(value) => setField('trade_name', value)} /></Step>}
            {step === 1 && <Step title="Información fiscal" text="Estos datos se utilizan para validación y nunca aparecen completos en el directorio."><div className="grid gap-4 sm:grid-cols-2"><Field label="RFC" value={form.tax_id} onChange={(value) => setField('tax_id', value.toUpperCase())} maxLength={13} /><Field label="Régimen fiscal" value={form.tax_regime} onChange={(value) => setField('tax_regime', value)} /><Field label="Año de constitución" type="number" value={form.founded_year} onChange={(value) => setField('founded_year', value)} /><Field label="Dirección fiscal" value={form.fiscal_address} onChange={(value) => setField('fiscal_address', value)} /></div></Step>}
            {step === 2 && <Step title="Contacto responsable" text="Usaremos estos datos para comunicaciones de cuenta y validación."><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre del responsable" value={form.responsible_name} onChange={(value) => setField('responsible_name', value)} /><Field label="Puesto" value={form.responsible_title} onChange={(value) => setField('responsible_title', value)} /><Field label="Correo empresarial" type="email" value={form.business_email} onChange={(value) => setField('business_email', value)} /><Field label="Teléfono" value={form.phone} onChange={(value) => setField('phone', value)} /><Field label="WhatsApp" value={form.whatsapp} onChange={(value) => setField('whatsapp', value)} /><Field label="Sitio web" type="url" value={form.website} onChange={(value) => setField('website', value)} /></div></Step>}
            {step === 3 && <Step title="Información comercial" text="Ayuda a clientes y aliados a entender qué hace tu empresa."><Field label="Descripción" textarea value={form.description} onChange={(value) => setField('description', value)} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Servicios (separados por coma)" value={form.services} onChange={(value) => setField('services', value)} /><Field label="Cobertura" value={form.coverage} onChange={(value) => setField('coverage', value)} /><Field label="Puertos atendidos" value={form.ports_served} onChange={(value) => setField('ports_served', value)} /><Field label="Estados atendidos" value={form.states_served} onChange={(value) => setField('states_served', value)} /><Field label="Horario general" value={form.business_hours} onChange={(value) => setField('business_hours', value)} /></div></Step>}
            {step === 4 && <Step title="Documentación privada" text="PDF, JPG, PNG o WebP. Máximo 10 MB por archivo. Solo el equipo autorizado de validación puede consultarlos."><div className="space-y-3">{[['tax_certificate', 'Constancia de situación fiscal'], ['legal_representative_id', 'Identidad del responsable'], ['company_document', 'Documento empresarial']].map(([type, label]) => <DocumentUpload key={type} label={label} uploaded={documents.find((item) => item.type === type)} disabled={loading} onFile={(file) => uploadDocument(type, file)} />)}</div><p className="mt-4 text-[11px] leading-5 text-slate-500">Los requisitos definitivos dependen del tipo de empresa. El envío será revisado administrativamente; Faro no usa la palabra “certificada”.</p></Step>}
            {step === 5 && <Step title="Selecciona un plan" text="Los precios y límites provienen de la base de datos y pueden administrarse sin cambiar código."><div className="mb-5 inline-flex rounded-xl border border-slate-200 p-1">{['monthly', 'annual'].map((period) => <button key={period} onClick={() => setBillingPeriod(period)} className={`rounded-lg px-4 py-2 text-xs font-bold ${billingPeriod === period ? 'bg-[#0d4f4b] text-white' : 'text-slate-500'}`}>{period === 'monthly' ? 'Mensual' : 'Anual'}</button>)}</div><div className="grid gap-3 md:grid-cols-2">{plans.map((plan) => <button key={plan.code} onClick={() => setPlanCode(plan.code)} className={`rounded-2xl border p-5 text-left ${planCode === plan.code ? 'border-teal-700 ring-4 ring-teal-50' : 'border-slate-200'}`}><p className="font-black">{plan.name}</p><p className="mt-2 text-2xl font-black text-[#081f2c]">${Number(billingPeriod === 'annual' ? plan.annual_price : plan.monthly_price).toLocaleString('es-MX')} <span className="text-xs font-semibold text-slate-400">MXN</span></p><p className="mt-2 text-xs leading-5 text-slate-500">{plan.description || 'Límites configurables desde administración.'}</p></button>)}</div></Step>}
            {step === 6 && <Step title="Revisión y envío" text="Tu empresa quedará pendiente de validación. Podrás atender correcciones desde el panel."><div className="rounded-2xl border border-slate-200 p-5"><Building2 className="text-teal-700" /><h3 className="mt-4 font-black">{form.trade_name}</h3><p className="mt-1 text-xs text-slate-500">{form.legal_name} · {COMPANY_TYPES.find(([value]) => value === form.company_type)?.[1]}</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-600"><FileCheck2 size={15} /> {documents.length} documentos cargados</div><div className="mt-2 flex items-center gap-2 text-xs text-slate-600"><ShieldCheck size={15} /> Revisión administrativa pendiente</div></div><label className="mt-5 flex items-start gap-3 text-xs leading-5 text-slate-600"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1" />Acepto los términos, el aviso de privacidad, las reglas de publicación y la responsabilidad sobre la información proporcionada.</label></Step>}

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6"><button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || loading} className="text-xs font-bold text-slate-500 disabled:opacity-30">Anterior</button>{step < 6 ? <button onClick={saveStep} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0d4f4b] px-5 text-xs font-extrabold text-white disabled:opacity-50">{loading && <Loader2 size={14} className="animate-spin" />} Guardar y continuar <ArrowRight size={14} /></button> : <button onClick={submit} disabled={loading || !accepted} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0d4f4b] px-5 text-xs font-extrabold text-white disabled:opacity-40">Enviar a validación <ArrowRight size={14} /></button>}</div>
          </section>
        </div>
      </div>
    </main>
  )
}

function Step({ title, text, children }) { return <div><h2 className="text-2xl font-black tracking-tight text-[#081f2c]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p><div className="mt-7">{children}</div></div> }
function Field({ label, value, onChange, textarea, type = 'text', maxLength = 500 }) { const classes = 'w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-700'; return <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">{label}</span>{textarea ? <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} rows="4" className={`${classes} py-3`} /> : <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} className={`${classes} h-12`} />}</label> }
function Select({ label, value, onChange, options }) { return <label className="mb-4 block"><span className="mb-2 block text-xs font-extrabold text-slate-700">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-700"><option value="">Selecciona una opción</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label> }
function DocumentUpload({ label, uploaded, onFile, disabled }) { return <label className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 ${uploaded ? 'border-teal-200 bg-teal-50/50' : 'border-slate-200'}`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">{uploaded ? <Check size={18} /> : <Upload size={18} />}</div><div className="min-w-0 flex-1"><p className="text-xs font-extrabold">{label}</p><p className="mt-1 truncate text-[10px] text-slate-500">{uploaded?.name || 'Seleccionar archivo privado'}</p></div><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={disabled} className="sr-only" onChange={(event) => onFile(event.target.files?.[0])} /></label> }
