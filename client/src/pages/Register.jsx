import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Truck, Building2, HelpCircle, CheckCircle2 } from 'lucide-react'
import { signUp } from '../hooks/useAuth.js'

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
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [tipo, setTipo]           = useState('')
  const [loading, setLoading]     = useState(false)
  const navigate = useNavigate()

  const handleRegister = async () => {
    if (!fullName.trim())   return toast.error('Ingresa tu nombre')
    if (!email.trim())      return toast.error('Ingresa tu correo')
    if (!password)          return toast.error('Ingresa una contraseña')
    if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')
    if (!tipo)              return toast.error('Selecciona tu tipo de usuario')

    setLoading(true)
    try {
      await signUp(email, password, fullName, tipo)
      toast.success('Cuenta creada. Revisa tu correo para confirmar.')
      navigate('/login')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse" />
            <span className="font-bold text-white">ConectManzanillo</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="text-[#8B949E] text-sm mt-2">Únete a la comunidad del puerto</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-5">

          {/* Datos básicos */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8B949E] mb-2">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8B949E] mb-2">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8B949E] mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF] transition-colors"
              />
            </div>
          </div>

          {/* Tipo de usuario */}
          <div>
            <label className="block text-sm font-medium text-[#8B949E] mb-3">
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
                      : { background: '#0D1117', borderColor: '#30363D' }
                    }
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
            onClick={handleRegister}
            disabled={loading || !tipo}
            className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all min-h-[48px]"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </div>

        <p className="text-center text-sm text-[#8B949E] mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#00C2FF] hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
