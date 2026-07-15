import { supabase } from './supabase.js'
const BASE=import.meta.env.VITE_API_URL||''
async function request(path,options={}){const {data:{session}}=await supabase.auth.getSession();const response=await fetch(`${BASE}${path}`,{...options,headers:{'Content-Type':'application/json',...(session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{})}});const data=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(data.error||'No fue posible completar la operación');error.code=data.code;error.details=data;throw error}return data}
export const freightsApi={
  publicList:(filters={})=>request(`/api/freights?${new URLSearchParams(Object.entries(filters).filter(([,value])=>value))}`),
  context:()=>request('/api/freights/context'),
  mine:(companyId)=>request(`/api/freights/companies/${companyId}`),
  create:(companyId,body)=>request(`/api/freights/companies/${companyId}`,{method:'POST',body:JSON.stringify(body)}),
  status:(companyId,freightId,status)=>request(`/api/freights/companies/${companyId}/${freightId}/status`,{method:'PATCH',body:JSON.stringify({status})}),
  request:(freightId,body)=>request(`/api/freights/${freightId}/requests`,{method:'POST',body:JSON.stringify(body)}),
  checkout:(companyId)=>request('/api/pagos/freight-membership/checkout',{method:'POST',body:JSON.stringify({company_id:companyId})}),
}
