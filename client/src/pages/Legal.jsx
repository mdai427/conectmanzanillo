import { useState } from 'react'
import { Shield, FileText, AlertTriangle, Mail } from 'lucide-react'

const TABS = [
  { id: 'privacidad', label: 'Aviso de Privacidad', icon: Shield },
  { id: 'terminos',   label: 'Términos y Condiciones', icon: FileText },
  { id: 'reportes',   label: 'Política de Reportes', icon: AlertTriangle },
  { id: 'contacto',   label: 'Contacto', icon: Mail },
]

export default function Legal() {
  const [tab, setTab] = useState('privacidad')

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-black text-slate-800 mb-1">Información Legal</h1>
          <p className="text-sm text-slate-500">ConectManzanillo · Puerto de Manzanillo, Colima, México</p>
        </div>
        <div className="max-w-3xl mx-auto px-4 flex overflow-x-auto scrollbar-none gap-1 pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                tab === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Disclaimer siempre visible */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Importante:</strong> La información mostrada en ConectManzanillo es colaborativa, referencial y puede variar.
            ConectManzanillo no sustituye instrucciones oficiales de autoridades, terminales, patios, aduanas,
            dependencias del gobierno ni de ninguna entidad del Puerto de Manzanillo.
          </p>
        </div>

        {tab === 'privacidad' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 text-sm text-slate-600">
            <div>
              <h2 className="text-lg font-black text-slate-800 mb-1">Aviso de Privacidad</h2>
              <p className="text-xs text-slate-400">Última actualización: Junio 2025</p>
            </div>

            {[
              {
                titulo: '1. Responsable del tratamiento de datos',
                contenido: 'ConectManzanillo es una plataforma de monitoreo colaborativo del Puerto de Manzanillo, Colima, México. El responsable del tratamiento de datos personales es el operador de la plataforma (en adelante "ConectManzanillo" o "nosotros").',
              },
              {
                titulo: '2. Datos personales que recopilamos',
                contenido: 'Recopilamos: nombre de usuario, correo electrónico, contraseña (encriptada), historial de reportes enviados, puntos de reputación, y preferencias de la plataforma. No recopilamos datos bancarios, identificaciones oficiales ni información sensible.',
              },
              {
                titulo: '3. Finalidades del tratamiento',
                contenido: 'Sus datos se utilizan para: (a) autenticar su cuenta en la plataforma, (b) mostrar su historial de reportes, (c) calcular su nivel de reputación en la comunidad, (d) enviarle notificaciones relacionadas con el servicio, (e) mejorar la plataforma.',
              },
              {
                titulo: '4. Seguridad de los datos',
                contenido: 'Utilizamos infraestructura Supabase (PostgreSQL) con cifrado en tránsito y en reposo. Las contraseñas se almacenan con hash bcrypt. El acceso a datos está controlado por políticas de seguridad a nivel de fila (RLS).',
              },
              {
                titulo: '5. Derechos ARCO',
                contenido: 'Tiene derecho a Acceder, Rectificar, Cancelar y Oponerse al tratamiento de sus datos. Para ejercer estos derechos, contáctenos vía WhatsApp al número indicado en la sección de contacto o a través de la plataforma.',
              },
              {
                titulo: '6. Datos de terceros',
                contenido: 'Los reportes enviados por usuarios son de carácter comunitario y pueden ser visibles para otros usuarios de la plataforma. Al enviar un reporte, acepta que su nombre de usuario sea asociado a dicho reporte.',
              },
              {
                titulo: '7. Cookies',
                contenido: 'Utilizamos cookies de sesión estrictamente necesarias para el funcionamiento de la plataforma. No utilizamos cookies publicitarias ni de seguimiento de terceros.',
              },
            ].map(({ titulo, contenido }) => (
              <div key={titulo} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <h3 className="text-sm font-black text-slate-800 mb-2">{titulo}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{contenido}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'terminos' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 text-sm text-slate-600">
            <div>
              <h2 className="text-lg font-black text-slate-800 mb-1">Términos y Condiciones de Uso</h2>
              <p className="text-xs text-slate-400">Última actualización: Junio 2025</p>
            </div>

            {[
              {
                titulo: '1. Naturaleza del servicio',
                contenido: 'ConectManzanillo es una plataforma colaborativa de monitoreo del Puerto de Manzanillo. La información generada por los usuarios es de carácter orientativo y no constituye una fuente oficial de información portuaria.',
              },
              {
                titulo: '2. Uso del servicio',
                contenido: 'El usuario se compromete a: (a) proporcionar información verídica en sus reportes, (b) no publicar información falsa, engañosa o maliciosa, (c) no usar la plataforma para fines ilegales, (d) respetar a los demás usuarios de la comunidad.',
              },
              {
                titulo: '3. Exención de responsabilidad',
                contenido: 'ConectManzanillo no garantiza la exactitud, completitud ni vigencia de la información publicada por los usuarios. El uso de la información es bajo la responsabilidad exclusiva del usuario. ConectManzanillo no es responsable por decisiones operativas tomadas con base en la información de la plataforma.',
              },
              {
                titulo: '4. Contenido de usuarios',
                contenido: 'Los reportes, comentarios e información publicada por los usuarios son responsabilidad de cada usuario. ConectManzanillo se reserva el derecho de eliminar contenido que viole estos términos o sea reportado por la comunidad como falso.',
              },
              {
                titulo: '5. Propiedad intelectual',
                contenido: 'La plataforma, su diseño, código y contenido editorial son propiedad de ConectManzanillo. Los reportes enviados por usuarios pertenecen a la comunidad y pueden ser utilizados para mejorar el servicio de forma anónima y agregada.',
              },
              {
                titulo: '6. Planes y pagos',
                contenido: 'Los planes de pago se cobran mensualmente. No hay contratos anuales obligatorios. Los pagos no son reembolsables salvo en casos de error de facturación comprobable. ConectManzanillo puede modificar los precios con 30 días de anticipación.',
              },
              {
                titulo: '7. Modificaciones',
                contenido: 'ConectManzanillo puede modificar estos términos en cualquier momento. Los cambios entrarán en vigor al ser publicados en la plataforma. El uso continuado del servicio implica aceptación de los nuevos términos.',
              },
              {
                titulo: '8. Legislación aplicable',
                contenido: 'Estos términos se rigen por las leyes de los Estados Unidos Mexicanos, particularmente la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Para cualquier controversia, las partes se someten a los tribunales competentes de Manzanillo, Colima.',
              },
            ].map(({ titulo, contenido }) => (
              <div key={titulo} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <h3 className="text-sm font-black text-slate-800 mb-2">{titulo}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{contenido}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'reportes' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-800 mb-1">Política de Reportes</h2>
              <p className="text-xs text-slate-400">Comunidad ConectManzanillo</p>
            </div>

            {[
              {
                titulo: '¿Qué puedo reportar?',
                contenido: 'Estado de flujo vehicular en zonas del puerto, filas en terminales o patios, cierres temporales, operativos de revisión, accidentes, saturación detectada, reapertura de zonas.',
                icon: '✅',
              },
              {
                titulo: '¿Qué no debo reportar?',
                contenido: 'Información falsa o especulativa, datos personales de otros, contenido político o ajeno al puerto, información confidencial de operaciones, datos que comprometan la seguridad portuaria.',
                icon: '❌',
              },
              {
                titulo: 'Sistema de confirmación',
                contenido: 'La comunidad puede confirmar o contradecir un reporte. Los reportes con más confirmaciones tienen mayor peso en el cálculo del estado de una zona. Los reportes con muchas contradicciones son ponderados con menos peso.',
                icon: '👍',
              },
              {
                titulo: 'Moderación',
                contenido: 'ConectManzanillo puede eliminar reportes que sean: claramente falsos, ofensivos, irrelevantes o que violen los términos de uso. Los usuarios con historial de reportes falsos pueden ver su cuenta suspendida.',
                icon: '🛡️',
              },
              {
                titulo: 'Vigencia de reportes',
                contenido: 'Los reportes tienen una vigencia de 3 horas por defecto. Pasado ese tiempo, el sistema los marca como expirados y ya no influyen en el estado de la zona. Esto garantiza que la información esté actualizada.',
                icon: '⏱️',
              },
              {
                titulo: 'Reputación y puntos',
                contenido: 'Por cada reporte enviado: +5 puntos. Si tu reporte es confirmado por la comunidad: +10 puntos adicionales. Los reportes con alta precisión acumulan +15 puntos. Tu reputación refleja la confiabilidad de tu información.',
                icon: '⭐',
              },
            ].map(({ titulo, contenido, icon }) => (
              <div key={titulo} className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <span className="text-xl shrink-0">{icon}</span>
                <div>
                  <h3 className="text-sm font-black text-slate-800 mb-1">{titulo}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{contenido}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'contacto' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-800 mb-4">Contacto</h2>
              <div className="space-y-4">
                {[
                  {
                    tipo: 'Soporte y dudas generales',
                    desc: 'Para preguntas sobre la plataforma, reportes o tu cuenta.',
                    cta: 'Contactar por WhatsApp',
                    href: 'https://wa.me/525566834948?text=Hola, tengo una duda sobre ConectManzanillo',
                    color: '#25D366',
                  },
                  {
                    tipo: 'Planes y facturación',
                    desc: 'Para solicitar plan empresa, cotizaciones o temas de pago.',
                    cta: 'Solicitar por WhatsApp',
                    href: 'https://wa.me/525566834948?text=Hola, quiero información sobre planes de ConectManzanillo',
                    color: '#1d4ed8',
                  },
                  {
                    tipo: 'Publicidad',
                    desc: 'Para anunciar tu empresa en ConectManzanillo.',
                    cta: 'Solicitar información',
                    href: 'https://wa.me/525566834948?text=Hola, quiero anunciarme en ConectManzanillo',
                    color: '#d97706',
                  },
                  {
                    tipo: 'Reportar contenido',
                    desc: 'Si encontraste contenido falso, inapropiado o que viola nuestros términos.',
                    cta: 'Reportar por WhatsApp',
                    href: 'https://wa.me/525566834948?text=Hola, quiero reportar contenido inadecuado en ConectManzanillo',
                    color: '#dc2626',
                  },
                ].map(({ tipo, desc, cta, href, color }) => (
                  <div key={tipo} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{tipo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <a href={href} target="_blank" rel="noopener noreferrer"
                       className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                       style={{ background: color }}>
                      {cta}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-100 rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">
                ConectManzanillo · Puerto de Manzanillo, Colima, México<br />
                Plataforma de monitoreo colaborativo portuario
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
