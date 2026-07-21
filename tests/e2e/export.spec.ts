import { test, expect } from '@playwright/test'

test('export flow uses browser save when available and skips backend export', async ({ page }) => {
  // Ensure mock is injected before the page scripts run
  await page.addInitScript(() => {
    // @ts-ignore
    window.__mockExportData = async function() { return 'col1,col2\n1,2' }
  })

  // Start from local dev server
  await page.goto('http://localhost:5173')

  // Stub showSaveFilePicker to simulate a handle with a createWritable
  await page.evaluate(() => {
    // @ts-ignore
    (window as any).showSaveFilePicker = async function() {
      return {
        createWritable: async function() {
          return {
            write: async function(data: any) { (window as any).__lastWrite = data },
            close: async function() { return }
          }
        }
      }
    }
  })

  // Navigate to Transactions page
  await page.click('text=Transactions')

  // Click Export
  await page.click('text=Export')

  // Wait for write to be recorded
  await page.waitForFunction(() => typeof (window as any).__lastWrite !== 'undefined')
  const last = await page.evaluate(() => (window as any).__lastWrite)
  expect(last).toBe('col1,col2\n1,2')
})
