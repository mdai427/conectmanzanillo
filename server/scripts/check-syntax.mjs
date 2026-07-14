import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? filesIn(path) : path.endsWith('.js') ? [path] : []
  })
}

const files = [...filesIn('src'), ...filesIn('test')]
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}
console.log(`Sintaxis validada: ${files.length} archivos`)
