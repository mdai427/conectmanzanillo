import { useEffect, useState } from 'react'
import { operationsApi } from '../lib/operationsApi.js'

export function useOperationalContext() {
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { operationsApi.context().then(({ companies: rows }) => { setCompanies(rows || []); setCompanyId(rows?.[0]?.id || '') }).catch((reason) => setError(reason.message)).finally(() => setLoading(false)) }, [])
  return { companies, companyId, setCompanyId, loading, error }
}
