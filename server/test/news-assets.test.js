import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const newsDir = path.join(root, 'client/public/news')
const individualAssets = [
  'puerto-volumen-1.jpg', 'puerto-volumen-2.jpg', 'puerto-volumen-3.jpg',
  'accesos-transporte.jpg', 'aduana-inspeccion.jpg', 'clima-operacion.jpg',
]

test('noticias usa fotografías individuales versionadas', () => {
  for (const asset of individualAssets) {
    const file = path.join(newsDir, asset)
    assert.equal(existsSync(file), true, `${asset} debe existir`)
    assert.ok(readFileSync(file).length > 50_000, `${asset} debe contener una fotografía real`)
  }
})

test('las noticias portuarias rotan tres escenas distintas', () => {
  const source = readFileSync(path.join(root, 'client/src/pages/Noticias.jsx'), 'utf8')
  for (const asset of individualAssets.slice(0, 3)) assert.match(source, new RegExp(asset.replace('.', '\\.')))
  assert.doesNotMatch(source, /\/news\/puerto\.jpg/)
})
