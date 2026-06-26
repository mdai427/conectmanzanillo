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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="ConectManzanillo" className="h-20 mx-auto mb-4 drop-shadow"
            onError={e => { e.target.style.display = 'none' }} />
          <h1 className="text-2xl font-black text-slate-800">Iniciar sesión</h1>
          <p className="text-slate-500 text-sm mt-1">Accede para reportar el estado del puerto</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-xl px-4 py-3 text-slate-800 text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-slate-800 text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-400"
            />
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3.5 rounded-xl font-black text-sm text-white disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>

        <p className="text-center text-sm mt-5 text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-blue-600 font-bold hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
