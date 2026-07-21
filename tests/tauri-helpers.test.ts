import { describe, it, expect } from 'vitest'
import * as helpers from '../src/services/tauri-helpers'

describe('tauri-helpers', () => {
  it('detectTauriDialog returns undefined dialog when tauri absent', async () => {
    // Ensure TAURI internals not present
    // @ts-ignore
    delete (globalThis as any).__TAURI_INTERNALS__
    const res = await helpers.detectTauriDialog()
    expect(res.info.tauriPresent).toBe(false)
    expect(res.dialog).toBeUndefined()
  })

  it('invokeSafely throws when tauri absent', async () => {
    // @ts-ignore
    delete (globalThis as any).__TAURI_INTERNALS__
    await expect(helpers.invokeSafely('nope')).rejects.toThrow('Tauri bridge not available')
  })
})
