import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requireCompanyAccess } from '../middleware/auth.js'
import { evaluateFreightAccess } from '../services/freightAccessPolicy.js'

const router = Router()
const clean = (value,max=180)=>String(value??'').trim().slice(0,max)
const numberOrNull = (value)=>value===''||value==null?null:Number(value)
const CARGO_TYPES = new Set(['container','general','refrigerated','hazardous','bulk','oversized','vehicles','other'])
const STATUSES = new Set(['published','paused','assigned','completed','cancelled'])

async function activeFreightMembership(companyId){
  const { data } = await supabaseAdmin.from('subscriptions').select('id,estatus,starts_at,expires_at,plans!inner(code,name,monthly_price)').eq('company_id',companyId).eq('estatus','activa').eq('plans.code','freight_membership').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at',{ascending:false}).limit(1).maybeSingle()
  return data?.plans?.code==='freight_membership'?data:null
}

router.get('/',async(req,res)=>{
  let query=supabaseAdmin.from('freight_posts').select('id,title,origin_city,origin_state,destination_city,destination_state,pickup_date,delivery_date,cargo_type,cargo_description,weight_kg,volume_m3,equipment_type,container_type,hazardous,target_temperature_c,offered_price,currency,price_includes_vat,loading_included,unloading_included,status,published_at,expires_at,companies(trade_name,status,trust_level)').eq('status','published').eq('visibility','public').gt('expires_at',new Date().toISOString()).order('published_at',{ascending:false}).limit(100)
  if(req.query.origin_state)query=query.eq('origin_state',clean(req.query.origin_state,80))
  if(req.query.destination_state)query=query.eq('destination_state',clean(req.query.destination_state,80))
  if(req.query.cargo_type&&CARGO_TYPES.has(req.query.cargo_type))query=query.eq('cargo_type',req.query.cargo_type)
  const {data,error}=await query
  if(error)return res.status(500).json({error:'No fue posible cargar los fletes'})
  res.json({data:data||[],generated_at:new Date().toISOString()})
})

router.get('/context',requireAuth,async(req,res)=>{
  const {data,error}=await supabaseAdmin.from('company_members').select('company_id,member_role,companies(id,trade_name,legal_name,company_type,status,legal_entity_type,tax_id,business_email,responsible_name,phone,whatsapp)').eq('user_id',req.user.id).eq('status','active')
  if(error)return res.status(500).json({error:'No fue posible cargar tus empresas'})
  const companies=await Promise.all((data||[]).map(async row=>({...row.companies,member_role:row.member_role,membership:await activeFreightMembership(row.company_id)})))
  res.json({companies,monthly_price:500,currency:'MXN'})
})

router.get('/companies/:companyId',requireAuth,requireCompanyAccess('freight.create'),async(req,res)=>{
  const {data,error}=await supabaseAdmin.from('freight_posts').select('*').eq('company_id',req.companyId).order('created_at',{ascending:false}).limit(100)
  if(error)return res.status(500).json({error:error.message})
  res.json({data:data||[]})
})

router.post('/companies/:companyId',requireAuth,requireCompanyAccess('freight.create'),async(req,res)=>{
  const [{data:company},membership,{data:documents}]=await Promise.all([supabaseAdmin.from('companies').select('id,status,legal_entity_type,tax_id,business_email').eq('id',req.companyId).single(),activeFreightMembership(req.companyId),supabaseAdmin.from('company_documents').select('document_type').eq('company_id',req.companyId).eq('status','approved').is('deleted_at',null)])
  const access=evaluateFreightAccess({company,approvedDocuments:documents||[],membership,action:'publish'})
  if(!access.allowed){const messages={MEMBERSHIP_REQUIRED:'Necesitas una membresía activa de $500 MXN al mes para publicar fletes',VERIFICATION_REQUIRED:'La empresa o persona física debe estar verificada para publicar',COMPANY_PROFILE_INCOMPLETE:'Completa la identidad fiscal y el correo comercial',DOCUMENTS_NOT_APPROVED:'La documentación legal debe estar aprobada'};return res.status(access.code==='MEMBERSHIP_REQUIRED'?402:403).json({error:messages[access.code],code:access.code,missing_fields:access.missing})}
  const cargoType=CARGO_TYPES.has(req.body.cargo_type)?req.body.cargo_type:null
  if(!clean(req.body.title)||!clean(req.body.origin_city)||!clean(req.body.origin_state)||!clean(req.body.destination_city)||!clean(req.body.destination_state)||!req.body.pickup_date||!cargoType||!clean(req.body.cargo_description)||!clean(req.body.equipment_type)||!clean(req.body.service_contact_name)||!clean(req.body.service_contact_phone))return res.status(400).json({error:'Completa título, ruta, fecha, carga, equipo y contacto responsable'})
  if(req.body.hazardous&&!clean(req.body.un_number,20))return res.status(400).json({error:'La carga peligrosa requiere número UN'})
  const contactPhone=clean(req.body.service_contact_phone,30),contactWhatsapp=clean(req.body.service_contact_whatsapp,30)
  if(contactPhone.replace(/\D/g,'').length<10)return res.status(400).json({error:'Captura un teléfono de contacto válido, con al menos 10 dígitos'})
  if(contactWhatsapp&&contactWhatsapp.replace(/\D/g,'').length<10)return res.status(400).json({error:'Captura un WhatsApp válido, con al menos 10 dígitos'})
  const publish=req.body.publish!==false
  const payload={company_id:req.companyId,created_by:req.user.id,title:clean(req.body.title),origin_city:clean(req.body.origin_city,100),origin_state:clean(req.body.origin_state,80),origin_postal_code:clean(req.body.origin_postal_code,10)||null,destination_city:clean(req.body.destination_city,100),destination_state:clean(req.body.destination_state,80),destination_postal_code:clean(req.body.destination_postal_code,10)||null,pickup_date:req.body.pickup_date,pickup_window_start:req.body.pickup_window_start||null,pickup_window_end:req.body.pickup_window_end||null,delivery_date:req.body.delivery_date||null,cargo_type:cargoType,cargo_description:clean(req.body.cargo_description,1200),weight_kg:numberOrNull(req.body.weight_kg),volume_m3:numberOrNull(req.body.volume_m3),package_count:numberOrNull(req.body.package_count),equipment_type:clean(req.body.equipment_type,100),container_type:clean(req.body.container_type,60)||null,container_number:clean(req.body.container_number,30)||null,hazardous:Boolean(req.body.hazardous),un_number:clean(req.body.un_number,20)||null,target_temperature_c:numberOrNull(req.body.target_temperature_c),offered_price:numberOrNull(req.body.offered_price),currency:'MXN',price_includes_vat:Boolean(req.body.price_includes_vat),payment_terms:clean(req.body.payment_terms,300)||null,loading_included:Boolean(req.body.loading_included),unloading_included:Boolean(req.body.unloading_included),special_requirements:clean(req.body.special_requirements,1200)||null,service_contact_name:clean(req.body.service_contact_name,120),service_contact_phone:contactPhone,service_contact_whatsapp:contactWhatsapp||null,visibility:req.body.visibility==='members_only'?'members_only':'public',contact_preference:['platform','phone','whatsapp','email'].includes(req.body.contact_preference)?req.body.contact_preference:'platform',status:publish?'published':'draft',published_at:publish?new Date().toISOString():null,expires_at:req.body.expires_at||new Date(Date.now()+30*86400000).toISOString()}
  const {data,error}=await supabaseAdmin.from('freight_posts').insert(payload).select('*').single()
  if(error)return res.status(400).json({error:error.message})
  await Promise.all([supabaseAdmin.from('freight_status_history').insert({freight_id:data.id,previous_status:null,new_status:data.status,changed_by:req.user.id}),supabaseAdmin.from('audit_logs').insert({actor_user_id:req.user.id,action:'freight.create',entity_type:'freight_post',entity_id:data.id,new_state:{status:data.status,company_id:req.companyId}})])
  res.status(201).json(data)
})

router.patch('/companies/:companyId/:freightId/status',requireAuth,requireCompanyAccess('freight.create'),async(req,res)=>{
  const next=clean(req.body.status,30)
  if(!STATUSES.has(next))return res.status(400).json({error:'Estado inválido'})
  if(next==='published'){
    const [{data:company},membership,{data:documents}]=await Promise.all([supabaseAdmin.from('companies').select('id,status,legal_entity_type,tax_id,business_email').eq('id',req.companyId).single(),activeFreightMembership(req.companyId),supabaseAdmin.from('company_documents').select('document_type').eq('company_id',req.companyId).eq('status','approved').is('deleted_at',null)])
    const access=evaluateFreightAccess({company,approvedDocuments:documents||[],membership,action:'publish'})
    if(!access.allowed)return res.status(access.code==='MEMBERSHIP_REQUIRED'?402:403).json({error:'La verificación legal y la membresía deben estar activas para publicar',code:access.code,missing_fields:access.missing})
  }
  const {data:current}=await supabaseAdmin.from('freight_posts').select('id,status').eq('id',req.params.freightId).eq('company_id',req.companyId).single()
  if(!current)return res.status(404).json({error:'Flete no encontrado'})
  const updates={status:next,updated_at:new Date().toISOString(),...(next==='published'?{published_at:new Date().toISOString()}:{})}
  const {data,error}=await supabaseAdmin.from('freight_posts').update(updates).eq('id',current.id).select('*').single()
  if(error)return res.status(400).json({error:error.message})
  await supabaseAdmin.from('freight_status_history').insert({freight_id:data.id,previous_status:current.status,new_status:next,changed_by:req.user.id,reason:clean(req.body.reason,300)||null})
  res.json(data)
})

router.post('/:freightId/requests',requireAuth,async(req,res)=>{
  const requesterCompanyId=clean(req.body.requester_company_id,60)
  const [{data:member},{data:requesterDocuments}]=await Promise.all([supabaseAdmin.from('company_members').select('member_role,companies(id,status,trade_name,legal_entity_type,tax_id,business_email)').eq('company_id',requesterCompanyId).eq('user_id',req.user.id).eq('status','active').maybeSingle(),supabaseAdmin.from('company_documents').select('document_type').eq('company_id',requesterCompanyId).eq('status','approved').is('deleted_at',null)])
  if(!member)return res.status(403).json({error:'Selecciona una empresa o perfil empresarial propio'})
  const requesterAccess=evaluateFreightAccess({company:member.companies,approvedDocuments:requesterDocuments||[],membership:null,action:'request'})
  if(!requesterAccess.allowed)return res.status(403).json({error:'La identidad y documentación deben estar verificadas para solicitar un flete',code:requesterAccess.code,missing_fields:requesterAccess.missing})
  const {data:freight}=await supabaseAdmin.from('freight_posts').select('id,company_id,status,service_contact_name,service_contact_phone,service_contact_whatsapp,contact_preference').eq('id',req.params.freightId).eq('status','published').gt('expires_at',new Date().toISOString()).single()
  if(!freight)return res.status(404).json({error:'El flete ya no está disponible'})
  if(freight.company_id===requesterCompanyId)return res.status(409).json({error:'No puedes solicitar tu propio flete'})
  const {data,error}=await supabaseAdmin.from('freight_interest_requests').upsert({freight_id:freight.id,requester_company_id:requesterCompanyId,requested_by:req.user.id,message:clean(req.body.message,800)||null,status:'sent',contact_revealed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'freight_id,requester_company_id'}).select('id,status,created_at').single()
  if(error)return res.status(400).json({error:error.message})
  res.status(201).json({request:data,contact:{name:freight.service_contact_name,phone:freight.service_contact_phone,whatsapp:freight.service_contact_whatsapp,preference:freight.contact_preference}})
})

export default router
