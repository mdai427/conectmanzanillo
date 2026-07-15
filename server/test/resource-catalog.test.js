import test from 'node:test'
import assert from 'node:assert/strict'
import { access } from 'fs/promises'
import { constants } from 'fs'
import path from 'path'
import {
  RESOURCE_CATALOG,
  RESOURCE_ROOT,
  absoluteResourcePath,
  publicResource,
} from '../src/services/resourceCatalog.js'

test('resource catalog has unique safe identifiers and expected libraries', () => {
  assert.equal(RESOURCE_CATALOG.length, 15)
  assert.equal(new Set(RESOURCE_CATALOG.map((item) => item.id)).size, RESOURCE_CATALOG.length)

  for (const resource of RESOURCE_CATALOG) {
    assert.match(resource.id, /^[a-z0-9-]+$/)
    assert.ok(['templates', 'training'].includes(resource.library))
    assert.ok(['XLSX', 'DOCX', 'PDF'].includes(resource.format))
    assert.equal(resource.access, 'registered')
    assert.equal(resource.price, 0)
  }
})

test('every catalog file exists inside the private resource directory', async () => {
  for (const resource of RESOURCE_CATALOG) {
    const filePath = absoluteResourcePath(resource)
    assert.ok(filePath.startsWith(`${RESOURCE_ROOT}${path.sep}`))
    await access(filePath, constants.R_OK)
  }
})

test('public catalog never exposes internal file paths or mime configuration', () => {
  for (const resource of RESOURCE_CATALOG) {
    const safe = publicResource(resource)
    assert.equal('file' in safe, false)
    assert.equal('mime' in safe, false)
    assert.ok(safe.downloadName)
  }
})

test('path traversal is rejected', () => {
  assert.throws(() => absoluteResourcePath({ file: '../secret.txt' }), /inválida/)
})
