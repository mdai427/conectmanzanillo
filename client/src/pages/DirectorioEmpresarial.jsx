import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Search, Star, BadgeCheck, Crown,
  Phone, Globe, MessageCircle, MapPin, ChevronRight,
  Filter, X,
} from 'lucide-react'
import BannerRotativo from '../components/ui/BannerRotativo.jsx'

const API = import.meta.env.VITE_API_URL || ''

async function fetchCategorias() {
  const res = await fetch(`${API}/api/directorio/categorias`)
  return res.ok ? res.json() : []
}

async function fetchEmpresas({ categoria, q, page, tier }) {
  const params = new URLSearchParams({ page, limit: 24 })
  if (categoria && categoria !== 'todas') params.set('categoria', categoria)
  if (q) params.set('q', q)
  if (tier) params.set('tier', tier)
  const res = await fetch(`${API}/api/directorio?${params}`)
  return res.ok ? res.json() : { data: [], total: 0 }
}

function TierBadge({ empresa }) {
  if (empresa.es_premium)   return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700"><Crown size={9}/>Premium</span>
  if (empresa.es_destacado) return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700"><Star size={9}/>Destacado</span>
  if (empresa.es_verificado)return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700"><BadgeCheck size={9}/>Verificado</span>
  return null
}

function EmpresaCard({ empresa }) {
  const slug = empresa.slug || empresa.id

  return (
    <Link
      to={`/directorio-empresarial/${slug}`}
      className={`group flex flex-col bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all ${
        empresa.es_premium   ? 'border-amber-300 shadow-sm' :
        empresa.es_destacado ? 'border-blue-200' : 'border-gray-200'
      }`}
    >
      {/* Portada */}
      <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {empresa.portada_url ? (
          <img src={empresa.portada_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 size={32} className="text-slate-300" />
          </div>
        )}
        {/* Logo */}
        <div className="absolute -bottom-5 left-4">
          <div className="w-12 h-12 rounded-xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
            {empresa.logo_url
              ? <img src={empresa.logo_url} alt={empresa.nombre_comercial} className="w-full h-full object-cover" />
              : <Building2 size={20} className="text-slate-400" />
            }
          </div>
        </div>
        {/* Tier badge */}
        <div className="absolute top-2 right-2">
          <TierBadge empresa={empresa} />
        </div>
      </div>

      {/* Content */}
      <div className="pt-7 px-4 pb-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
          {empresa.nombre_comercial}
        </h3>

        {empresa.categoria_slug && (
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 uppercase tracking-wide">
            {empresa.categoria_slug.replace(/-/g, ' ')}
          </span>
        )}

        {empresa.descripcion && (
          <p className="text-gray-500 text-xs mt-2 leading-relaxed line-clamp-2">
            {empresa.descripcion}
          </p>
        )}

        {empresa.direccion && (
          <div className="flex items-center gap-1 mt-2 text-gray-400 text-xs">
            <MapPin size={10} />
            <span className="line-clamp-1">{empresa.direccion}</span>
          </div>
        )}

        {/* Contacto rápido */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          {empresa.whatsapp && (
            <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
              <MessageCircle size={12} className="text-green-600" />
            </div>
          )}
          {empresa.telefono && (
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
              <Phone size={12} className="text-blue-600" />
            </div>
          )}
          {empresa.sitio_web && (
            <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
              <Globe size={12} className="text-purple-600" />
            </div>
          )}
          <ChevronRight size={14} className="text-gray-300 ml-auto group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </Link>
  )
}

const TIERS = [
  { value: '', label: 'Todos' },
  { value: 'premium', label: '⭐ Premium' },
  { value: 'destacado', label: '🔵 Destacados' },
  { value: 'verificado', label: '✅ Verificados' },
]

export default function DirectorioEmpresarial() {
  const [categoria, setCategoria] = useState('todas')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('')
  const [page, setPage] = useState(1)
  const [showFiltros, setShowFiltros] = useState(false)

  const { data: categorias = [] } = useQuery({
    queryKey: ['directorio-categorias'],
    queryFn: fetchCategorias,
    staleTime: 10 * 60_000,
  })

  const { data: resultado = { data: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['directorio', categoria, search, page, tier],
    queryFn: () => fetchEmpresas({ categoria, q: search, page, tier }),
    staleTime: 60_000,
  })

  const totalPages = Math.ceil((resultado.total || 0) / 24)

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(q)
    setPage(1)
  }

  const resetFiltros = () => {
    setCategoria('todas')
    setTier('')
    setSearch('')
    setQ('')
    setPage(1)
  }

  const hayFiltros = categoria !== 'todas' || tier || search

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Directorio Empresarial</h1>
            <p className="text-gray-500 text-sm">Puerto de Manzanillo — empresas y servicios</p>
          </div>
        </div>
        {resultado.total > 0 && (
          <span className="text-sm text-gray-400">{resultado.total} empresas</span>
        )}
      </div>

      {/* Banner publicidad */}
      <BannerRotativo zona="directorio" className="h-24" />

      {/* Buscador */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar empresa..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>
        <button type="submit"
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Buscar
        </button>
        <button type="button" onClick={() => setShowFiltros(v => !v)}
          className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            showFiltros ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
          }`}>
          <Filter size={14} />
          Filtros
          {hayFiltros && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
        </button>
      </form>

      {/* Panel de filtros */}
      {showFiltros && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Filtrar por</p>
            {hayFiltros && (
              <button onClick={resetFiltros} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <X size={12} /> Limpiar
              </button>
            )}
          </div>

          {/* Tier */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-semibold">Tipo de membresía</p>
            <div className="flex flex-wrap gap-2">
              {TIERS.map(t => (
                <button key={t.value} onClick={() => { setTier(t.value); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    tier === t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categorías */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-semibold">Categoría</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setCategoria('todas'); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  categoria === 'todas' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}>
                Todas
              </button>
              {categorias.map(c => (
                <button key={c.slug} onClick={() => { setCategoria(c.slug); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    categoria === c.slug ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}>
                  {c.icono} {c.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categorías rápidas (horizontal scroll) */}
      {!showFiltros && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => { setCategoria('todas'); setPage(1) }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              categoria === 'todas' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            Todas
          </button>
          {categorias.map(c => (
            <button key={c.slug} onClick={() => { setCategoria(c.slug); setPage(1) }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                categoria === c.slug ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {c.icono} {c.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Grid de empresas */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 h-52 animate-pulse" />
          ))}
        </div>
      ) : resultado.data.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay empresas registradas en esta categoría</p>
          {hayFiltros && (
            <button onClick={resetFiltros} className="mt-3 text-blue-600 text-sm hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resultado.data.map(empresa => (
              <EmpresaCard key={empresa.id} empresa={empresa} />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:border-blue-300 transition-colors">
                Anterior
              </button>
              <span className="text-sm text-gray-500">Pág {page} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:border-blue-300 transition-colors">
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* CTA para empresas */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-center">
        <h3 className="text-white font-bold text-lg mb-1">¿Tu empresa no aparece?</h3>
        <p className="text-blue-100 text-sm mb-4">Regístrate y sé parte del directorio empresarial del Puerto de Manzanillo</p>
        <a href="https://whatsapp.com/channel/0029VbBN73rId7nJ3RTSsq3s" target="_blank" rel="noopener noreferrer"
          className="inline-block px-6 py-2.5 bg-white text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors">
          Registrar mi empresa
        </a>
      </div>
    </div>
  )
}
