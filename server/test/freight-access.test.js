import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateFreightAccess, FREIGHT_MEMBERSHIP_MONTHLY_MXN, requiredLegalDocuments } from '../src/services/freightAccessPolicy.js'

const physical = { status:'verified', legal_entity_type:'individual_business', tax_id:'XAXX010101000', business_email:'negocio@example.com' }
const physicalDocs = ['tax_certificate','official_id','proof_of_address']

test('la membresía de fletes cuesta exactamente 500 MXN al mes',()=>assert.equal(FREIGHT_MEMBERSHIP_MONTHLY_MXN,500))
test('persona física requiere expediente legal propio',()=>assert.deepEqual(requiredLegalDocuments('individual_business'),physicalDocs))
test('bloquea publicación sin verificación',()=>assert.equal(evaluateFreightAccess({company:{...physical,status:'pending_verification'},approvedDocuments:physicalDocs,membership:{id:'sub'},action:'publish'}).code,'VERIFICATION_REQUIRED'))
test('bloquea publicación si falta documentación aprobada',()=>assert.equal(evaluateFreightAccess({company:physical,approvedDocuments:['tax_certificate'],membership:{id:'sub'},action:'publish'}).code,'DOCUMENTS_NOT_APPROVED'))
test('bloquea publicación sin membresía pero permite solicitar con expediente verificado',()=>{
  assert.equal(evaluateFreightAccess({company:physical,approvedDocuments:physicalDocs,membership:null,action:'publish'}).code,'MEMBERSHIP_REQUIRED')
  assert.equal(evaluateFreightAccess({company:physical,approvedDocuments:physicalDocs,membership:null,action:'request'}).allowed,true)
})
