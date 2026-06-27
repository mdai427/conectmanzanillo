import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Truck, Building2, HelpCircle, CheckCircle2, Phone, KeyRound, ArrowLeft } from 'lucide-react'
import { sendOtp, verifyOtp } from '../hooks/useAuth.js'

const TIPOS = [
  {
    id: 'operador',
    label: 'Operador',
    desc: 'Soy chofer, tractorista o transportista. Reporto el estado de las zonas del puerto.',
    icon: Truck,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    id: 'empresa',
    label: 'Empresa',
    desc: 'Represento una empresa transportista, agencia aduanal, terminal o patio. Gestiono una flota.',
    icon: Building2,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    id: 'otro',
    label: 'Otro',
    desc: 'Consulto información del puerto. Cliente logístico, importador, exportador u otra función.',
    icon: HelpCircle,
    color: '#10b981',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
]

export default function Register() {
  const [step, setStep]         = useState(1)   // 1 = datos, 2 = OTP
  const [fullName, setFullName] = useState('')
  const [phone, setPhone]       = useState('')
  const [tipo, setTipo]         = useState('')
  const [code, setCode]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [sentPhone, setSentPhone] = useState('')
  const navigate = useNavigate()

  const handleSend = async () => {
    if (!fullName.trim()) return toast.error('Ingresa tu nombre')
    if (!phone.trim())    return toast.error('Ingresa tu número de celular')
    if (phone.replace(/\D/g, '').length < 10) return toast.error('Número inválido (10 dígitos)')
    if (!tipo)            return toast.error('Selecciona tu tipo de usuario')

    setLoading(true)
    try {
      const res = await sendOtp(phone)
      setSentPhone(res.phone)
      setStep(2)
      toast.success(`Código enviado al ${res.phone}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length < 4) return toast.error('Ingresa el código')
    setLoading(true)
    try {
      await verifyOtp({ phone: sentPhone, code, fullName, tipo })
      toast.success('¡Cuenta creada! Bienvenido.')
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse" />
            <span className="font-bold text-gray-800">ConectManzanillo</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mt-2">Únete a la comunidad del puerto</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">

          {step === 1 ? (
            <>
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Nombre completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#00C2FF] transition-colors"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Número de celular</label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#00C2FF] transition-colors">
                  <div className="flex items-center gap-1.5 px-3 border-r border-gray-200 shrink-0">
                    <span className="text-lg">🇲🇽</span>
                    <span className="text-gray-500 text-sm">+52</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="10 dígitos"
                    className="flex-1 bg-transparent px-3 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Recibirás un código SMS para verificar tu número</p>
              </div>

              {/* Tipo de usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-3">
                  ¿Cómo usarás ConectManzanillo? <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {TIPOS.map(({ id, label, desc, icon: Icon, color, bg, border }) => {
                    const selected = tipo === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTipo(id)}
                        className="w-full text-left rounded-xl px-4 py-3 border-2 transition-all flex items-start gap-3"
                        style={selected
                          ? { background: bg, borderColor: color }
                          : { background: '#0D1117', borderColor: '#30363D' }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                             style={{ background: selected ? color : '#1f2937' }}>
                          <Icon size={15} style={{ color: selected ? 'white' : '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold" style={{ color: selected ? color : '#e2e8f0' }}>
                              {label}
                            </p>
                            {selected && <CheckCircle2 size={13} style={{ color }} />}
                          </div>
                          <p className="text-[11px] mt-0.5" style={{ color: selected ? '#475569' : '#4B5563' }}>
                            {desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={loading || !tipo}
                className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Phone size={16} />
                {loading ? 'Enviando código…' : 'Enviar código SMS'}
              </button>
            </>
          ) : (
            <>
              {/* Step 2: OTP */}
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm transition-colors"
              >
                <ArrowLeft size={14} /> Cambiar número
              </button>

              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-[#00C2FF]/10 flex items-center justify-center mx-auto mb-3">
                  <KeyRound size={22} className="text-[#00C2FF]" />
                </div>
                <p className="text-gray-900 font-semibold">Ingresa tu código</p>
                <p className="text-gray-500 text-sm mt-1">
                  Enviamos un SMS a <span className="text-gray-900 font-semibold">{sentPhone}</span>
                </p>
              </div>

              <div>
                <input
                  type="tel"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-center text-2xl tracking-[0.5em] font-mono placeholder-gray-400 focus:outline-none focus:border-[#00C2FF] transition-colors"
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || code.length < 4}
                className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all min-h-[48px]"
              >
                {loading ? 'Verificando…' : 'Verificar y crear cuenta'}
              </button>

              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full text-gray-500 text-sm hover:text-gray-900 transition-colors"
              >
                ¿No llegó? Reenviar código
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#00C2FF] hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
