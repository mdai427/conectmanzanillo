import ResourceCatalog from '../components/resources/ResourceCatalog.jsx'

export default function TrainingLibrary() {
  return <ResourceCatalog
    library="training"
    eyebrow="Centro de capacitación"
    title="Capacitación práctica para quienes mueven la logística."
    description="Guías descargables con casos, checklists y fuentes oficiales para transportistas, operadores, agentes aduanales, freight forwarders, almacenes y maniobristas."
    benefits={[
      'Ocho módulos sectoriales con identidad Faro Portuario.',
      'Referencias oficiales del DOF, SAT, ANAM y VUCEM.',
      'Caso práctico, evaluación y compromiso de aplicación.',
    ]}
    note="Estos materiales son educativos: no constituyen certificación, constancia de competencias, dictamen ni capacitación obligatoria. Verifica siempre la norma o disposición vigente."
  />
}
