import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { signUp } from '../hooks/useAuth.js'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async () => {
    if (!fullName || !email || !password) { toast.error('Completa todos los campos'); return }
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      await signUp(email, password, fullName)
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
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse" />
            <span className="font-bold text-white">ConectManzanillo</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="text-[#8B949E] text-sm mt-2">Únete a la comunidad del puerto</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-4">
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
          <button
            onClick={handleRegister}
            disabled={loading}
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
