const fs = require('fs')
const path = require('path')

function readApiContracts() {
  const p = path.join(__dirname, '..', 'docs', 'api-contracts.md')
  if (!fs.existsSync(p)) return []
  const content = fs.readFileSync(p, 'utf8')
  // find occurrences of `command_name` at line starts
  const re = /- `([a-z0-9_]+)`/g
  const cmds = new Set()
  let m
  while ((m = re.exec(content)) !== null) cmds.add(m[1])
  return Array.from(cmds)
}

function findInvokes(dir) {
  const exts = ['.ts', '.tsx', '.js', '.jsx', '.cjs']
  const res = new Set()
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') continue
        walk(full)
      } else {
        if (!exts.includes(path.extname(e.name))) continue
        const txt = fs.readFileSync(full, 'utf8')
        const invRe = /invoke\(\s*['"]([a-z0-9_]+)['"]\s*(,|\))/g
        let m
        while ((m = invRe.exec(txt)) !== null) res.add(m[1])
      }
    }
  }
  walk(dir)
  return Array.from(res)
}

function main() {
  const docs = readApiContracts()
  const docSet = new Set(docs)
  const invokesSrc = findInvokes(path.join(__dirname, '..', 'src'))
  const invokesTauri = findInvokes(path.join(__dirname, '..', 'src-tauri'))
  const invokes = Array.from(new Set([...invokesSrc, ...invokesTauri]))
  const missing = invokes.filter(c => !docSet.has(c))
  if (missing.length > 0) {
    console.error('API contract check failed: found invoke calls not listed in docs/api-contracts.md:')
    missing.forEach(m => console.error('  -', m))
    console.error('\nPlease add the command(s) to docs/api-contracts.md or remove the invoke call.')
    process.exitCode = 2
    return
  }
  console.log('API contract check passed: all invoked commands are documented.')
}

main()
