import { isTauriAvailable } from './tauri-api'

export type TauriDialogProbe = {
  typeOf?: string
  keys?: string[]
  ownProps?: string[]
  hasDefault?: boolean
  hasDialog?: boolean
  defaultDialog?: boolean
  tauriPresent?: boolean
}

export async function detectTauriDialog(): Promise<{ dialog?: any; info: TauriDialogProbe }> {
  const info: TauriDialogProbe = { tauriPresent: false }
  if (!isTauriAvailable()) return { dialog: undefined, info }

  info.tauriPresent = true
  try {
    // dynamic import of package root
    // @ts-ignore
    const api = await import('@tauri-apps/api')
    try {
      info.typeOf = typeof api
      info.keys = Object.keys(api)
      info.ownProps = Object.getOwnPropertyNames(api)
      info.hasDefault = !!(api && (api as any).default)
      info.hasDialog = !!((api as any).dialog)
      info.defaultDialog = api && (api as any).default ? !!((api as any).default.dialog) : false
    } catch (e) {
      // ignore probing errors
    }

    let dialog = (api as any).dialog ?? (api as any).default?.dialog ?? (api as any).window?.dialog ?? (api as any).webview?.dialog ?? (api as any).core?.dialog ?? (window as any).__TAURI__?.dialog ?? (window as any).__TAURI__?.dialog
    if (!dialog || typeof dialog.save !== 'function') {
      try {
        // avoid bundler static analysis
        // @ts-ignore
        const mod = await (new Function('m', 'return import(m)'))('@tauri-apps/api/dialog')
        dialog = (mod as any).dialog ?? (mod as any).default?.dialog ?? (mod as any).default ?? (mod as any)
        if (dialog) info.hasDialog = true
      } catch (e) {
        // swallow
      }
    }

    return { dialog, info }
  } catch (e) {
    return { dialog: undefined, info }
  }
}

export async function invokeSafely(command: string, payload?: any): Promise<any> {
  if (!isTauriAvailable()) throw new Error('Tauri bridge not available')
  try {
    // @ts-ignore
    const core = await import('@tauri-apps/api/core')
    if (typeof payload === 'undefined') return core.invoke(command)
    return core.invoke(command, payload)
  } catch (e: any) {
    // Normalise error message
    const msg = e && e.message ? e.message : String(e)
    throw new Error(`invokeSafely failed: ${msg}`)
  }
}

export default { detectTauriDialog, invokeSafely }
