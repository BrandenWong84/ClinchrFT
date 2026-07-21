# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: export.spec.ts >> export flow uses browser save when available and skips backend export
- Location: tests\e2e\export.spec.ts:3:1

# Error details

```
Error: page.goto: Target page, context or browser has been closed
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test('export flow uses browser save when available and skips backend export', async ({ page }) => {
  4  |   // Start from local dev server
> 5  |   await page.goto('http://localhost:5173')
     |              ^ Error: page.goto: Target page, context or browser has been closed
  6  | 
  7  |   // Mock backend exportTransactionsCsvData via window.__mockExports for testability
  8  |   await page.addInitScript(() => {
  9  |     // @ts-ignore
  10 |     window.__mockExportData = async function() { return 'col1,col2\n1,2' }
  11 |   })
  12 | 
  13 |   // Stub showSaveFilePicker to simulate a handle with a createWritable
  14 |   await page.evaluate(() => {
  15 |     // @ts-ignore
  16 |     (window as any).showSaveFilePicker = async function() {
  17 |       return {
  18 |         createWritable: async function() {
  19 |           return {
  20 |             write: async function(data: any) { (window as any).__lastWrite = data },
  21 |             close: async function() { return }
  22 |           }
  23 |         }
  24 |       }
  25 |     }
  26 |   })
  27 | 
  28 |   // Navigate to Transactions page
  29 |   await page.click('text=Transactions')
  30 | 
  31 |   // Click Export
  32 |   await page.click('text=Export')
  33 | 
  34 |   // Wait for write to be recorded
  35 |   await page.waitForFunction(() => typeof (window as any).__lastWrite !== 'undefined')
  36 |   const last = await page.evaluate(() => (window as any).__lastWrite)
  37 |   expect(last).toBe('col1,col2\n1,2')
  38 | })
  39 | 
```