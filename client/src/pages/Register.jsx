import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, KeyRound, Phone, UserRound } from 'lucide-react'
import { sendOtp, verifyOtp } from '../hooks/useAuth.js'

const PERSON_TYPES = [
  ['candidate', 'Candidato'], ['operator', 'Operador'], ['traffic_executive', 'Ejecutivo de tráfico'],
  ['documenter', 'Documentador'], ['customs_reviewer', 'Glosador'], ['sales_executive', 'Ejecutivo comercial'],
  ['rigger', 'Maniobrista'], ['mechanic', 'Mecánico'], ['technician', 'Técnico'],
  ['warehouse_staff', 'Personal de almacén'], ['independent_professional', 'Profesional independiente'],
  ['other_logistics_profile', 'Otro perfil logístico'],
]

const COMPANY_TYPES = [
  ['carrier', 'Transportista'], ['owner_operator', 'Hombre-camión'], ['customs_broker', 'Agente aduanal'],
  ['freight_forwarder', 'Freight forwarder'], ['importer', 'Importador'], ['exporter', 'Exportador'],
  ['logistics_operator', 'Operador logístico'], ['warehouse', 'Almacén'], ['yard', 'Patio'],
  ['rigging_company', 'Empresa de maniobras'], ['shipping_line', 'Naviera'], ['bonded_warehouse', 'Recinto fiscalizado'],
  ['supplier', 'Proveedor'], ['workshop', 'Taller'], ['tire_shop', 'Llantera'], ['crane_company', 'Grúas'],
  ['gps_company', 'Empresa de GPS'], ['security_company', 'Seguridad o custodia'], ['insurer', 'Aseguradora'],
  ['financial_company', 'Financiera'], ['training_center', 'Centro de capacitación'],
  ['trading_company', 'Comercializadora'], ['other_logistics_provider', 'Otro proveedor logístico'],
]

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedReturn = searchParams.get('returnTo')
  const returnTo = requestedReturn?.startsWith('/') && !requestedReturn.startsWith('//') ? requestedReturn : ''
  const [step, setStep] = useState(1)
  const [accountKind, setAccountKind] = useState('')
  const [accountType, setAccountType] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [sentPhone, setSentPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const types = useMemo(() => accountKind === 'company' ? COMPANY_TYPES : PERSON_TYPES, [accountKind])

  const chooseKind = (kind) => {
    setAccountKind(kind)
    setAccountType('')
  }

  const goToDetails = () => {
    if (!accountKind || !accountType) return toast.error('Selecciona el tipo de cuenta')
    setStep(2)
  }

  const handleSend = async () => {
    if (!fullName.trim()) return toast.error(accountKind === 'company' ? 'Ingresa el nombre del responsable' : 'Ingresa tu nombre')
    if (phone.replace(/\D/g, '').length !== 10) return toast.error('Ingresa un número de 10 dígitos')
    if (password.length < 8 || !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) return toast.error('La contraseña debe tener 8 caracteres, con letras y números')
    if (password !== passwordConfirmation) return toast.error('Las contraseñas no coinciden')
    setLoading(true)
    try {
      const response = await sendOtp(phone, 'register')
      setSentPhone(response.phone)
      setStep(3)
      toast.success('Código enviado')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length < 4) return toast.error('Ingresa el código completo')
    setLoading(true)
    try {
      await verifyOtp({ phone: sentPhone, code, fullName, accountKind, accountType, password, smsNotificationsEnabled })
      toast.success('Cuenta validada. Continuemos con tu perfil.')
      navigate(returnTo || (accountKind === 'company' ? '/empresa/onboarding' : '/perfil?onboarding=1'))
    } catch (error) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <Link to="/" className="text-xs font-black uppercase tracking-[.18em] text-teal-700">Faro Portuario</Link>
          <h1 className="mt-4 text-3xl font-black tracking-[-.04em] text-[#081f2c] sm:text-4xl">Crea el espacio correcto para ti</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Tu tipo de cuenta define el perfil, los permisos y las herramientas disponibles. Podrás completar la información después.</p>
          <div className="mx-auto mt-7 flex max-w-sm items-center gap-2" aria-label={`Paso ${step} de 3`}>
            {[1, 2, 3].map((item) => <div key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? 'bg-teal-700' : 'bg-slate-100'}`} />)}
          </div>
        </header>

        <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(8,31,44,.07)] sm:p-8">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-black">¿Qué tipo de cuenta necesitas?</h2>
              <p className="mt-1 text-xs text-slate-500">Selecciona un grupo y después tu actividad principal.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <AccountKind selected={accountKind === 'person'} icon={UserRound} title="Persona" text="Busco empleo, quiero mostrar mi experiencia o participar como profesional." onClick={() => chooseKind('person')} />
                <AccountKind selected={accountKind === 'company'} icon={Building2} title="Empresa o persona física" text="Tengo actividad empresarial y quiero publicar o solicitar fletes, contratar o anunciarme." onClick={() => chooseKind('company')} />
              </div>
              {accountKind && <label className="mt-6 block"><span className="mb-2 block text-xs font-extrabold text-slate-700">Actividad principal</span><select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-700"><option value="">Selecciona una opción</option>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
              <button onClick={goToDetails} disabled={!accountType} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">Continuar <ArrowRight size={16} /></button>
            </div>
          )}

          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft size={14} /> Cambiar tipo de cuenta</button>
              <h2 className="mt-6 text-lg font-black">Datos de acceso</h2>
              <p className="mt-1 text-xs text-slate-500">Validaremos tu teléfono. Esto corresponde al nivel “Cuenta validada”, no a una certificación empresarial.</p>
              <div className="mt-6 space-y-5">
                <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">{accountKind === 'company' ? 'Nombre del responsable' : 'Nombre completo'}</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={80} autoComplete="name" className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-teal-700" /></label>
                <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">Celular</span><div className="flex h-12 overflow-hidden rounded-xl border border-slate-200 focus-within:border-teal-700"><span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">+52</span><input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="tel" placeholder="10 dígitos" className="min-w-0 flex-1 px-3 text-sm outline-none" /></div></label>
                <RegisterPassword label="Contraseña" value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} />
                <RegisterPassword label="Confirmar contraseña" value={passwordConfirmation} setValue={setPasswordConfirmation} show={showPassword} setShow={setShowPassword} />
                <p className="text-[10px] leading-5 text-slate-400">Usa al menos 8 caracteres, incluyendo letras y números.</p>
                <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600"><input type="checkbox" checked={smsNotificationsEnabled} onChange={event=>setSmsNotificationsEnabled(event.target.checked)} className="mt-1 accent-teal-700"/><span><b className="text-slate-800">Quiero recibir alertas operativas importantes.</b><br/>Podremos enviarlas por SMS o WhatsApp. No autoriza publicidad y podrás desactivarlas.</span></label>
              </div>
              <button onClick={handleSend} disabled={loading} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] text-sm font-extrabold text-white disabled:opacity-50"><Phone size={16} />{loading ? 'Enviando…' : 'Validar teléfono'}</button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-800"><KeyRound size={20} /></div>
              <h2 className="mt-5 text-lg font-black">Ingresa el código</h2>
              <p className="mt-2 text-xs text-slate-500">Enviamos un SMS a {sentPhone}</p>
              <label className="mt-6 block"><span className="sr-only">Código de verificación</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(event) => event.key === 'Enter' && handleVerify()} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-16 w-full rounded-xl border border-slate-200 text-center font-mono text-2xl tracking-[.4em] outline-none focus:border-teal-700" /></label>
              <button onClick={handleVerify} disabled={loading || code.length < 4} className="mt-5 min-h-12 w-full rounded-xl bg-[#0d4f4b] text-sm font-extrabold text-white disabled:opacity-40">{loading ? 'Verificando…' : 'Crear cuenta'}</button>
              <button onClick={() => setStep(2)} className="mt-4 text-xs font-bold text-slate-500">Cambiar número</button>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="font-extrabold text-teal-800">Iniciar sesión</Link></p>
      </div>
    </main>
  )
}

function AccountKind({ selected, icon: Icon, title, text, onClick }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`relative rounded-2xl border p-5 text-left transition ${selected ? 'border-teal-700 ring-4 ring-teal-50' : 'border-slate-200 hover:border-slate-400'}`}><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? 'bg-teal-700 text-white' : 'bg-slate-50 text-slate-600'}`}><Icon size={19} /></div><h3 className="mt-5 font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>{selected && <Check className="absolute right-4 top-4 text-teal-700" size={17} />}</button>
}

function RegisterPassword({label,value,setValue,show,setShow}){return <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">{label}</span><div className="flex h-12 rounded-xl border border-slate-200 focus-within:border-teal-700"><input value={value} onChange={event=>setValue(event.target.value)} type={show?'text':'password'} autoComplete="new-password" className="min-w-0 flex-1 rounded-l-xl px-4 text-sm outline-none"/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'Ocultar contraseña':'Mostrar contraseña'} className="grid w-12 place-items-center text-slate-400">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
