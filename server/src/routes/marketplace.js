import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { publicCommercePlans } from '../services/commercePlans.js'

const router = Router()
const safe = (value, max = 300) => String(value || '').trim().slice(0, max)

router.get('/plans', (_req, res) => res.json({ plans: publicCommercePlans('marketplace') }))

router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 60)
  const { data, error } = await supabaseAdmin.from('marketplace_products')
    .select('id,title,description,category,listing_type,price,currency,price_includes_vat,city,state,image_urls,contact_whatsapp,created_at,companies(trade_name,status,slug)')
    .eq('status','published').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(limit)
  if (error && /marketplace_products|schema cache|PGRST205/i.test(error.message)) return res.json({ items:[], plans:publicCommercePlans('marketplace') })
  if (error) return res.status(503).json({ error:'No fue posible cargar el marketplace' })
  res.json({ items:data || [], plans:publicCommercePlans('marketplace') })
})

router.get('/context', requireAuth, async (req, res) => {
  const { data: memberships, error } = await supabaseAdmin.from('company_members')
    .select('member_role,companies(id,trade_name,status)').eq('user_id',req.user.id).eq('status','active')
  if (error) return res.status(500).json({ error:'No fue posible cargar tus empresas' })
  const companies = []
  for (const membership of memberships || []) {
    const company = membership.companies
    const { data: subscription } = await supabaseAdmin.from('subscriptions').select('id,tipo,estatus,expires_at,monto').eq('company_id',company.id).eq('estatus','activa').in('tipo',['marketplace_starter','marketplace_growth','marketplace_scale']).order('created_at',{ascending:false}).limit(1).maybeSingle()
    const { count } = await supabaseAdmin.from('marketplace_products').select('id',{count:'exact',head:true}).eq('company_id',company.id).in('status',['draft','published'])
    companies.push({ ...company, member_role:membership.member_role, subscription:subscription || null, product_count:count || 0 })
  }
  res.json({ companies, plans:publicCommercePlans('marketplace') })
})

router.post('/companies/:companyId', requireAuth, async (req, res) => {
  const { data: membership } = await supabaseAdmin.from('company_members').select('member_role,companies(status)').eq('company_id',req.params.companyId).eq('user_id',req.user.id).eq('status','active').maybeSingle()
  if (!membership || !['owner','admin'].includes(membership.member_role)) return res.status(403).json({ error:'No tienes permiso para publicar por esta empresa' })
  if (membership.companies?.status !== 'verified') return res.status(403).json({ error:'La empresa o persona física debe estar verificada para vender', code:'VERIFICATION_REQUIRED' })
  const { data: subscription } = await supabaseAdmin.from('subscriptions').select('tipo,estatus,expires_at').eq('company_id',req.params.companyId).eq('estatus','activa').in('tipo',['marketplace_starter','marketplace_growth','marketplace_scale']).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if (!subscription || (subscription.expires_at && Date.parse(subscription.expires_at) <= Date.now())) return res.status(402).json({ error:'Contrata una membresía de Marketplace para publicar', code:'MEMBERSHIP_REQUIRED' })
  const limits = { marketplace_starter:3, marketplace_growth:10, marketplace_scale:null }
  const { count } = await supabaseAdmin.from('marketplace_products').select('id',{count:'exact',head:true}).eq('company_id',req.params.companyId).in('status',['draft','published'])
  const max = limits[subscription.tipo]
  if (max != null && Number(count || 0) >= max) return res.status(409).json({ error:`Tu plan permite hasta ${max} productos. Cambia de membresía para publicar más.`, code:'PRODUCT_LIMIT_REACHED' })
  const body = req.body || {}
  if (safe(body.title,120).length < 4 || safe(body.description,2000).length < 10) return res.status(400).json({ error:'Completa el título y la descripción del producto' })
  const price = body.price === '' || body.price == null ? null : Number(body.price)
  if (price != null && (!Number.isFinite(price) || price < 0)) return res.status(400).json({ error:'Precio inválido' })
  const payload = { company_id:req.params.companyId,created_by:req.user.id,title:safe(body.title,120),description:safe(body.description,2000),category:safe(body.category,60)||'otros',listing_type:['sale','rent','service'].includes(body.listing_type)?body.listing_type:'sale',price,currency:'MXN',price_includes_vat:Boolean(body.price_includes_vat),city:safe(body.city,80)||'Manzanillo',state:safe(body.state,80)||'Colima',image_urls:Array.isArray(body.image_urls)?body.image_urls.filter(url=>/^https:\/\//.test(url)).slice(0,4):[],contact_phone:safe(body.contact_phone,30),contact_whatsapp:safe(body.contact_whatsapp,30),status:'published',published_at:new Date().toISOString() }
  const { data, error } = await supabaseAdmin.from('marketplace_products').insert(payload).select('id,title,status,created_at').single()
  if (error) return res.status(400).json({ error:error.message })
  res.status(201).json(data)
})

export default router
