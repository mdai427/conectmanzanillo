export const COMMERCE_PLANS = Object.freeze({
  job_membership: { code:'job_membership', name:'Talento Faro', kind:'jobs', monthlyPrice:599, limit:null, description:'Publica vacantes ilimitadas y recibe candidatos durante 30 días.' },
  marketplace_starter: { code:'marketplace_starter', name:'Vitrina 3', kind:'marketplace', monthlyPrice:599, limit:3, description:'Para comenzar a vender o rentar hasta 3 productos.' },
  marketplace_growth: { code:'marketplace_growth', name:'Catálogo 10', kind:'marketplace', monthlyPrice:799, limit:10, description:'Publica de 4 a 10 productos con mayor capacidad comercial.' },
  marketplace_scale: { code:'marketplace_scale', name:'Escala', kind:'marketplace', monthlyPrice:1399, limit:null, description:'Publica desde 11 productos sin límite máximo.' },
})

export function publicCommercePlans(kind) {
  return Object.values(COMMERCE_PLANS).filter(plan => !kind || plan.kind === kind).map(plan => ({
    code:plan.code, name:plan.name, kind:plan.kind, monthly_price:plan.monthlyPrice,
    currency:'MXN', product_limit:plan.limit, description:plan.description,
  }))
}

export function commercePlan(code) { return COMMERCE_PLANS[code] || null }
