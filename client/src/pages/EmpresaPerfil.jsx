import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Phone, Globe, MessageCircle, MapPin, Mail,
  BadgeCheck, Crown, Star, Clock, ArrowLeft, Facebook,
  Instagram, Linkedin, ExternalLink, Briefcase, ChevronRight,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

async function fetchEmpresa(slug) {
  const res = await fetch(`${API}/api/directorio/${slug}`)
  if (!res.ok) throw new Error('No encontrado')
  return res.json()
}

async function registrarEvento(id, tipo) {
  await fetch(`${API}/api/directorio/${id}/evento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo }),
  })
}

function TierBadge({ empresa }) {
  if (empresa.es_premium)    return <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700"><Crown size={11}/>Premium</span>
  if (empresa.es_destacado)  return <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700"><Star size={11}/>Destacado</span>
  return null
}

export default function EmpresaPerfil() {
  const { slug } = useParams()

  const { data: empresa, isLoading, isError } = useQuery({
    queryKey: ['empresa', slug],
    queryFn: () => fetchEmpresa(slug),
  })

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="h-48 bg-gray-100 rounded-2xl animate-pulse mb-6" />
      <div className="h-8 bg-gray-100 rounded-xl w-1/2 animate-pulse mb-3" />
      <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
    </div>
  )

  if (isError || !empresa) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Empresa no encontrada</p>
      <Link to="/directorio-empresarial" className="mt-4 inline-block text-blue-600 text-sm hover:underline">
        ← Volver al directorio
      </Link>
    </div>
  )

  const waLink = empresa.whatsapp
    ? `https://wa.me/${empresa.whatsapp.replace(/\D/g, '')}`
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Link to="/directorio-empresarial" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
        <ArrowLeft size={14} /> Directorio
      </Link>

      {/* Header con portada */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Portada */}
        <div className="relative h-40 sm:h-52 bg-gradient-to-br from-slate-100 to-slate-200">
          {empresa.portada_url && (
            <img src={empresa.portada_url} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <TierBadge empresa={empresa} />
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${empresa.es_verificado ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}><BadgeCheck size={11}/>{empresa.es_verificado ? 'Verificada' : 'No verificada'}</span>
          </div>
        </div>

        {/* Info principal */}
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-lg overflow-hidden flex items-center justify-center shrink-0">
              {empresa.logo_url
                ? <img src={empresa.logo_url} alt={empresa.nombre_comercial} className="w-full h-full object-cover" />
                : <Building2 size={28} className="text-slate-400" />
              }
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold text-gray-900">{empresa.nombre_comercial}</h1>
              {empresa.categoria_slug && (
                <span className="text-sm text-blue-600 font-semibold capitalize">
                  {empresa.categoria_slug.replace(/-/g, ' ')}
                </span>
              )}
            </div>
          </div>

          {empresa.descripcion && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{empresa.descripcion}</p>
          )}

          {/* Contacto */}
          <div className="flex flex-wrap gap-2">
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                onClick={() => registrarEvento(empresa.id, 'clic_whatsapp')}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors">
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            {empresa.telefono && (
              <a href={`tel:${empresa.telefono}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
                <Phone size={15} /> Llamar
              </a>
            )}
            {empresa.sitio_web && (
              <a href={empresa.sitio_web} target="_blank" rel="noopener noreferrer"
                onClick={() => registrarEvento(empresa.id, 'clic_web')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 text-sm font-semibold rounded-xl transition-colors">
                <Globe size={15} /> Sitio web
              </a>
            )}
            {empresa.email && (
              <a href={`mailto:${empresa.email}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 text-sm font-semibold rounded-xl transition-colors">
                <Mail size={15} /> Email
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Servicios */}
          {empresa.servicios?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3 text-sm">Servicios</h2>
              <div className="flex flex-wrap gap-2">
                {empresa.servicios.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Especialidades */}
          {empresa.especialidades?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3 text-sm">Especialidades</h2>
              <div className="flex flex-wrap gap-2">
                {empresa.especialidades.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certificaciones */}
          {empresa.certificaciones?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <BadgeCheck size={15} className="text-green-600" /> Certificaciones
              </h2>
              <div className="flex flex-wrap gap-2">
                {empresa.certificaciones.map((c, i) => (
                  <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Vacantes activas */}
          {empresa.vacantes?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <Briefcase size={15} className="text-blue-600" /> Vacantes activas
              </h2>
              <div className="space-y-2">
                {empresa.vacantes.map(v => (
                  <Link key={v.id} to="/vacantes"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{v.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{v.tipo_contrato}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Fotos */}
          {empresa.fotos_urls?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3 text-sm">Fotografías</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {empresa.fotos_urls.map((url, i) => (
                  <img key={i} src={url} alt=""
                    className="w-full h-28 object-cover rounded-xl bg-gray-100" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">
          {/* Info de contacto */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Información</h2>

            {empresa.direccion && (
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-600 leading-relaxed">{empresa.direccion}</p>
              </div>
            )}

            {empresa.horarios && (
              <div className="flex items-start gap-2.5">
                <Clock size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="text-xs text-gray-600 space-y-0.5">
                  {Object.entries(empresa.horarios).map(([dia, hrs]) => (
                    <div key={dia} className="flex gap-2">
                      <span className="capitalize text-gray-500 w-8">{dia}</span>
                      <span>{hrs}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Redes sociales */}
            <div className="flex gap-2 pt-1">
              {empresa.facebook_url && (
                <a href={empresa.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                  <Facebook size={14} className="text-blue-600" />
                </a>
              )}
              {empresa.instagram_url && (
                <a href={empresa.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition-colors">
                  <Instagram size={14} className="text-pink-600" />
                </a>
              )}
              {empresa.linkedin_url && (
                <a href={empresa.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                  <Linkedin size={14} className="text-blue-700" />
                </a>
              )}
              {empresa.sitio_web && (
                <a href={empresa.sitio_web} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <ExternalLink size={14} className="text-gray-600" />
                </a>
              )}
            </div>
          </div>

          {/* Estadísticas (visibles solo si es premium/verificado) */}
          {(empresa.es_premium || empresa.es_verificado) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-3">Estadísticas</h2>
              <div className="space-y-2">
                {[
                  { label: 'Visitas', value: empresa.visitas_total || 0 },
                  { label: 'Clics WhatsApp', value: empresa.clics_whatsapp || 0 },
                  { label: 'Clics Web', value: empresa.clics_web || 0 },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className="text-sm font-bold text-gray-900">{s.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contactar */}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              onClick={() => registrarEvento(empresa.id, 'consulta')}
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition-colors">
              <MessageCircle size={16} /> Contactar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
