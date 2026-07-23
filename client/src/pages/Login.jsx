import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, Phone, ShieldCheck } from 'lucide-react'
import { resetPasswordWithOtp, sendOtp, signInWithPhonePassword } from '../hooks/useAuth.js'
import Reveal from '../components/ui/Reveal.jsx'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedReturn = searchParams.get('returnTo')
  const returnTo = requestedReturn?.startsWith('/') && !requestedReturn.startsWith('//') ? requestedReturn : '/'
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState('login')
  const [recoveryStep, setRecoveryStep] = useState(1)
  const [sentPhone, setSentPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitLogin(event) {
    event.preventDefault()
    if (phone.length !== 10 || !password) return toast.error('Ingresa tu teléfono y contraseña')
    setLoading(true)
    try {
      await signInWithPhonePassword(phone, password)
      toast.success('Bienvenido a Faro Portuario')
      navigate(returnTo)
    } catch (error) { toast.error(error.message) } finally { setLoading(false) }
  }

  async function sendRecoveryCode() {
    if (phone.length !== 10) return toast.error('Ingresa tu número de 10 dígitos')
    setLoading(true)
    try {
      const data = await sendOtp(phone, 'reset_password')
      setSentPhone(data.phone); setRecoveryStep(2)
      toast.success('Código de seguridad enviado')
    } catch (error) { toast.error(error.message) } finally { setLoading(false) }
  }

  async function resetPassword(event) {
    event.preventDefault()
    if (code.length < 4) return toast.error('Ingresa el código completo')
    if (newPassword.length < 8 || !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(newPassword) || !/\d/.test(newPassword)) return toast.error('Usa al menos 8 caracteres, con letras y números')
    setLoading(true)
    try {
      await resetPasswordWithOtp({ phone: sentPhone, code, password: newPassword })
      setPassword(newPassword); setMode('login'); setRecoveryStep(1); setCode(''); setNewPassword('')
      toast.success('Contraseña actualizada. Ya puedes ingresar.')
    } catch (error) { toast.error(error.message) } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-[#f4f7f6] px-4 py-10 text-slate-950 sm:py-16">
    <Reveal className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(8,31,44,.1)] lg:grid-cols-[.9fr_1.1fr]">
      <section className="hidden bg-[#082f35] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div><Link to="/" className="text-xs font-black uppercase tracking-[.2em] text-teal-300">Faro Portuario</Link><h1 className="mt-8 text-4xl font-black tracking-[-.05em]">Tu operación logística en un solo lugar.</h1><p className="mt-5 text-sm leading-7 text-slate-300">Accede a fletes, talento, empresas verificadas y herramientas especializadas.</p></div>
        <div className="space-y-4">{[['Teléfono verificado','Cada cuenta confirma que tiene acceso al número registrado.'],['Acceso protegido','Tu contraseña no se guarda en Faro Portuario; la administra el sistema seguro de autenticación.'],['Alertas bajo tu control','Las notificaciones por SMS o WhatsApp requieren tu consentimiento.']].map(([title,text])=><div key={title} className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-teal-300"/><div><p className="text-xs font-black">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></div></div>)}</div>
      </section>

      <section className="p-6 sm:p-10 lg:p-12">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 lg:hidden"><ArrowLeft size={14}/>Volver</Link>
        {mode === 'login' ? <>
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-teal-700">Acceso seguro</p><h2 className="mt-3 text-3xl font-black tracking-tight">Iniciar sesión</h2><p className="mt-2 text-sm text-slate-500">Usa el celular con el que te registraste.</p></div>
          <form onSubmit={submitLogin} className="mt-8 space-y-5">
            <PhoneInput phone={phone} setPhone={setPhone}/>
            <PasswordInput label="Contraseña" value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} autoComplete="current-password"/>
            <div className="flex justify-end"><button type="button" onClick={()=>setMode('recovery')} className="text-xs font-extrabold text-teal-800 hover:underline">Olvidé o aún no tengo contraseña</button></div>
            <button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] text-sm font-extrabold text-white disabled:opacity-50"><LockKeyhole size={16}/>{loading?'Ingresando…':'Ingresar'}</button>
          </form>
          <p className="mt-7 text-center text-xs text-slate-500">¿No tienes cuenta? <Link to={`/register?returnTo=${encodeURIComponent(returnTo)}`} className="font-extrabold text-teal-800">Crear cuenta</Link></p>
        </> : <>
          <button onClick={()=>{setMode('login');setRecoveryStep(1)}} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft size={14}/>Volver al acceso</button>
          <div className="mt-7"><p className="text-xs font-black uppercase tracking-[.16em] text-teal-700">Recuperación segura</p><h2 className="mt-3 text-3xl font-black tracking-tight">{recoveryStep===1?'Crea una nueva contraseña':'Confirma tu número'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{recoveryStep===1?'Te enviaremos un código SMS al teléfono verificado de tu cuenta.':`Enviamos un código a ${sentPhone}. Expira aproximadamente en 10 minutos.`}</p></div>
          {recoveryStep===1?<div className="mt-8 space-y-5"><PhoneInput phone={phone} setPhone={setPhone}/><button onClick={sendRecoveryCode} disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] text-sm font-extrabold text-white disabled:opacity-50"><Phone size={16}/>{loading?'Enviando…':'Enviar código SMS'}</button></div>:<form onSubmit={resetPassword} className="mt-8 space-y-5"><label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">Código de verificación</span><input value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-14 w-full rounded-xl border border-slate-200 text-center font-mono text-xl tracking-[.35em] outline-none focus:border-teal-700"/></label><PasswordInput label="Nueva contraseña" value={newPassword} setValue={setNewPassword} show={showPassword} setShow={setShowPassword} autoComplete="new-password"/><p className="text-[10px] leading-5 text-slate-400">Mínimo 8 caracteres, incluyendo letras y números.</p><button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] text-sm font-extrabold text-white disabled:opacity-50"><KeyRound size={16}/>{loading?'Actualizando…':'Guardar contraseña'}</button><button type="button" onClick={sendRecoveryCode} disabled={loading} className="w-full text-xs font-bold text-slate-500">Reenviar código</button></form>}
        </>}
      </section>
    </Reveal>
  </main>
}

function PhoneInput({phone,setPhone}){return <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">Número de celular</span><div className="flex h-12 overflow-hidden rounded-xl border border-slate-200 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-50"><span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">🇲🇽 +52</span><input required type="tel" value={phone} onChange={event=>setPhone(event.target.value.replace(/\D/g,'').slice(0,10))} inputMode="numeric" autoComplete="tel" placeholder="10 dígitos" className="min-w-0 flex-1 px-3 text-sm outline-none"/></div></label>}
function PasswordInput({label,value,setValue,show,setShow,autoComplete}){return <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">{label}</span><div className="flex h-12 rounded-xl border border-slate-200 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-50"><input required type={show?'text':'password'} value={value} onChange={event=>setValue(event.target.value)} autoComplete={autoComplete} className="min-w-0 flex-1 rounded-l-xl px-4 text-sm outline-none"/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'Ocultar contraseña':'Mostrar contraseña'} className="grid w-12 place-items-center text-slate-400">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
