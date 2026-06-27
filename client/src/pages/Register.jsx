import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Truck, Building2, HelpCircle, CheckCircle2, Phone, KeyRound, ArrowLeft, MapPin } from 'lucide-react'
import { sendOtp, verifyOtp } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'
import EmpresaPolygonMap from '../components/ui/EmpresaPolygonMap.jsx'

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

// Pasos:
// 1 → datos (nombre, teléfono, tipo)
// 2 → código OTP
// 3 → mapa (solo empresas)

export default function Register() {
  const [step, setStep]               = useState(1)
  const [fullName, setFullName]       = useState('')
  const [phone, setPhone]             = useState('')
  const [tipo, setTipo]               = useState('')
  const [code, setCode]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [sentPhone, setSentPhone]     = useState('')
  const [userId, setUserId]           = useState(null)   // guardamos userId tras OTP para luego guardar polígono
  const [polygon, setPolygon]         = useState(null)
  const [empresaName, setEmpresaName] = useState('')
  const navigate = useNavigate()

  // ── Paso 1 → enviar OTP ───────────────────────────────────────────────────
  const handleSend = async () => {
    if (!fullName.trim()) return toast.error('Ingresa tu nombre')
    if (phone.replace(/\D/g, '').length < 10) return toast.error('Número inválido (10 dígitos)')
    if (!tipo) return toast.error('Selecciona tu tipo de usuario')

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

  // ── Paso 2 → verificar OTP ────────────────────────────────────────────────
  const handleVerify = async () => {
    if (code.length < 4) return toast.error('Ingresa el código')
    setLoading(true)
    try {
      const { session } = await verifyOtp({ phone: sentPhone, code, fullName, tipo })
      const uid = session?.user?.id
      setUserId(uid)

      if (tipo === 'empresa') {
        // Ir al paso del mapa
        setStep(3)
        setLoading(false)
      } else {
        toast.success('¡Cuenta creada! Bienvenido.')
        navigate('/')
      }
    } catch (err) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  // ── Paso 3 → guardar polígono y finalizar ─────────────────────────────────
  const handleFinish = async (skip = false) => {
    if (!skip && !polygon) return toast.error('Dibuja el polígono de tu empresa en el mapa')
    setLoading(true)
    try {
      if (!skip && polygon && userId) {
        await supabase.from('profiles').update({
          empresa_polygon: polygon,
          empresa_name:    empresaName.trim() || fullName.trim(),
        }).eq('id', userId)
      }
      toast.success('¡Bienvenido! Tu empresa está registrada.')
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onPolygonChange = useCallback((pts) => setPolygon(pts), [])

  // ── Render ─────────────────────────────────────────────────────────────────
  const isMapStep = step === 3

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className={`w-full ${isMapStep ? 'max-w-2xl' : 'max-w-md'}`}>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse" />
            <span className="font-bold text-gray-800">ConectManzanillo</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 3 ? 'Ubicación de tu empresa' : 'Crear cuenta'}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {step === 3
              ? 'Dibuja el área que ocupa tu empresa en el puerto'
              : 'Únete a la comunidad del puerto'}
          </p>
          {/* Indicador de pasos para empresa */}
          {tipo === 'empresa' && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-[#00C2FF] w-8' : 'bg-gray-200 w-4'
                }`} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">

          {/* ── PASO 1: Datos ──────────────────────────────────────────── */}
          {step === 1 && (
            <>
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
                          : { background: 'white', borderColor: '#e5e7eb' }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                             style={{ background: selected ? color : '#f3f4f6' }}>
                          <Icon size={15} style={{ color: selected ? 'white' : '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold" style={{ color: selected ? color : '#111827' }}>
                              {label}
                            </p>
                            {selected && <CheckCircle2 size={13} style={{ color }} />}
                          </div>
                          <p className="text-[11px] mt-0.5 text-gray-500">{desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {tipo === 'empresa' && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs">
                  <MapPin size={14} className="shrink-0 mt-0.5" />
                  <span>Como empresa, después de verificar tu número te pediremos marcar la ubicación de tu empresa en el mapa del puerto.</span>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={loading || !tipo}
                className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Phone size={16} />
                {loading ? 'Enviando código…' : 'Enviar código SMS'}
              </button>
            </>
          )}

          {/* ── PASO 2: OTP ────────────────────────────────────────────── */}
          {step === 2 && (
            <>
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

              <input
                type="tel"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="000000"
                maxLength={6}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-center text-2xl tracking-[0.5em] font-mono placeholder-gray-400 focus:outline-none focus:border-[#00C2FF] transition-colors"
              />

              <button
                onClick={handleVerify}
                disabled={loading || code.length < 4}
                className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all min-h-[48px]"
              >
                {loading ? 'Verificando…' : tipo === 'empresa' ? 'Verificar y continuar →' : 'Verificar y crear cuenta'}
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

          {/* ── PASO 3: Mapa (solo empresas) ───────────────────────────── */}
          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Nombre de tu empresa</label>
                <input
                  type="text"
                  value={empresaName}
                  onChange={e => setEmpresaName(e.target.value)}
                  placeholder={fullName}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#00C2FF] transition-colors"
                />
              </div>

              <EmpresaPolygonMap onChange={onPolygonChange} />

              <button
                onClick={() => handleFinish(false)}
                disabled={loading || !polygon}
                className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <CheckCircle2 size={16} />
                {loading ? 'Guardando…' : 'Guardar y entrar'}
              </button>

              <button
                onClick={() => handleFinish(true)}
                disabled={loading}
                className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors"
              >
                Omitir por ahora
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
