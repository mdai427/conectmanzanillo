import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Phone, KeyRound, ArrowLeft } from 'lucide-react'
import { sendOtp, verifyOtp } from '../hooks/useAuth.js'

export default function Login() {
  const [step, setStep]     = useState(1)   // 1 = teléfono, 2 = OTP
  const [phone, setPhone]   = useState('')
  const [code, setCode]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sentPhone, setSentPhone] = useState('')
  const navigate = useNavigate()

  const handleSend = async () => {
    if (phone.replace(/\D/g, '').length < 10) return toast.error('Ingresa tu número de 10 dígitos')
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
      // Login — no enviar fullName/tipo (usuario ya existe)
      await verifyOtp({ phone: sentPhone, code })
      toast.success('Bienvenido de vuelta')
      navigate('/')
    } catch (err) {
      // Si el usuario no existe, mandarlo a registro
      if (err.message?.includes('Nombre requerido') || err.message?.includes('needsProfile')) {
        toast.error('No tienes cuenta. Regístrate primero.')
        navigate('/register')
      } else {
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse" />
            <span className="font-bold text-white">ConectManzanillo</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Iniciar sesión</h1>
          <p className="text-[#8B949E] text-sm mt-2">Accede para reportar el estado del puerto</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-5">

          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-2">Número de celular</label>
                <div className="flex items-center bg-[#0D1117] border border-[#30363D] rounded-xl overflow-hidden focus-within:border-[#00C2FF] transition-colors">
                  <div className="flex items-center gap-1.5 px-3 border-r border-[#30363D] shrink-0">
                    <span className="text-lg">🇲🇽</span>
                    <span className="text-[#8B949E] text-sm">+52</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="10 dígitos"
                    className="flex-1 bg-transparent px-3 py-3 text-white text-sm placeholder-[#4B5563] focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Phone size={16} />
                {loading ? 'Enviando código…' : 'Enviar código SMS'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-[#8B949E] hover:text-white text-sm transition-colors"
              >
                <ArrowLeft size={14} /> Cambiar número
              </button>

              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-[#00C2FF]/10 flex items-center justify-center mx-auto mb-3">
                  <KeyRound size={22} className="text-[#00C2FF]" />
                </div>
                <p className="text-white font-semibold">Ingresa tu código</p>
                <p className="text-[#8B949E] text-sm mt-1">
                  Enviamos un SMS a <span className="text-white">{sentPhone}</span>
                </p>
              </div>

              <input
                type="tel"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="000000"
                maxLength={6}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF] transition-colors"
              />

              <button
                onClick={handleVerify}
                disabled={loading || code.length < 4}
                className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all min-h-[48px]"
              >
                {loading ? 'Verificando…' : 'Entrar'}
              </button>

              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full text-[#8B949E] text-sm hover:text-white transition-colors"
              >
                ¿No llegó? Reenviar código
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-[#8B949E] mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-[#00C2FF] hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
