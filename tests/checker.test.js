import fs from 'fs'
import path from 'path'
import os from 'os'
import cp from 'child_process'
import { test, expect } from 'vitest'

test('checker detects frontend modules and rust commands', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clinchrft-test-'))
  const srcDir = path.join(tmp, 'src')
  const tauriSrcDir = path.join(tmp, 'src-tauri', 'src')
  fs.mkdirSync(srcDir, { recursive: true })
  fs.mkdirSync(tauriSrcDir, { recursive: true })

  fs.writeFileSync(path.join(srcDir, 'App.tsx'), `import { invoke } from '@tauri-apps/api/tauri';\ninvoke('get_transactions');\n`)

  const rust = `#[tauri::command]\npub fn get_transactions() {}\n#[tauri::command]\npub fn get_accounts() {}\n`
  fs.writeFileSync(path.join(tauriSrcDir, 'commands.rs'), rust)

  const tauriConf = { tauri: { allowlist: { all: false } } }
  fs.mkdirSync(path.join(tmp, 'src-tauri'), { recursive: true })
  fs.writeFileSync(path.join(tmp, 'src-tauri', 'tauri.conf.json'), JSON.stringify(tauriConf, null, 2))

  const script = path.join(__dirname, '..', 'scripts', 'tauri-allowlist-checker.js')
  cp.execFileSync(process.execPath, [script], { env: Object.assign({}, process.env, { CLINCHRFT_REPO_ROOT: tmp }), stdio: 'inherit' })

  const report = JSON.parse(fs.readFileSync(path.join(tmp, 'allowlist-report.json'), 'utf8'))

  expect(Array.isArray(report.frontendModulesMapped)).toBe(true)
  expect(report.frontendModulesMapped).toContain('invoke')
  expect(report.commandNames).toEqual(expect.arrayContaining(['get_transactions','get_accounts']))
})
