import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { signIn } from '../hooks/useAuth.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Bienvenido de vuelta')
      navigate('/')
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
          <h1 className="text-2xl font-bold text-white">Iniciar sesión</h1>
          <p className="text-[#8B949E] text-sm mt-2">Accede para reportar el estado del puerto</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-4">
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
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF] transition-colors"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all min-h-[48px]"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>

        <p className="text-center text-sm text-[#8B949E] mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-[#00C2FF] hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
