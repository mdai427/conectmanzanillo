import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { signIn } from '../hooks/useAuth.js'
import Logo from '../components/ui/Logo.jsx'

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A1628' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">Iniciar sesión</h1>
          <p className="text-sm mt-1" style={{ color: '#8BA4C4' }}>Accede para reportar el estado del puerto</p>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#0F1F3D', border: '1px solid #1E3A6E' }}>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#8BA4C4' }}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-[#3D5A80] focus:outline-none transition-colors"
              style={{ background: '#0A1628', border: '1px solid #1E3A6E' }}
              onFocus={e => e.target.style.borderColor = '#0099E6'}
              onBlur={e => e.target.style.borderColor = '#1E3A6E'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#8BA4C4' }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-[#3D5A80] focus:outline-none transition-colors"
              style={{ background: '#0A1628', border: '1px solid #1E3A6E' }}
              onFocus={e => e.target.style.borderColor = '#0099E6'}
              onBlur={e => e.target.style.borderColor = '#1E3A6E'}
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-sm text-white disabled:opacity-40 active:scale-95 transition-all min-h-[48px]"
            style={{ background: 'linear-gradient(135deg, #0099E6, #00C2FF)' }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: '#8BA4C4' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" style={{ color: '#0099E6' }} className="hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
