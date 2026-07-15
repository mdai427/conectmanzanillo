import ResourceCatalog from '../components/resources/ResourceCatalog.jsx'

export default function ResourceLibrary() {
  return <ResourceCatalog
    library="templates"
    eyebrow="Plantillas profesionales"
    title="Documentos que tu empresa puede usar hoy."
    description="Descarga formatos de Excel y Word realmente editables para controlar unidades, viajes, mantenimiento, Carta Porte, incidentes y entregas. Personalízalos con los datos y procesos de tu empresa."
    benefits={[
      'Archivos editables, sin marcas de agua y listos para personalizar.',
      'Fórmulas, listas y controles incluidos en las plantillas Excel.',
      'Formatos Word diseñados para impresión, firma y evidencia.',
    ]}
    note="Las plantillas apoyan el control interno y deben adaptarse a cada empresa. No sustituyen CFDI, dictámenes, avisos, procedimientos obligatorios ni asesoría profesional."
  />
}
