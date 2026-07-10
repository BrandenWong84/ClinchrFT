export function centsToDollars(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remainder = (abs % 100).toString().padStart(2, '0')
  return `${sign}${dollars}.${remainder}`
}

export function dollarsToCents(amount: string): number {
  // simple parser: expects `123.45` or `123` or `-12.34`
  const normalized = amount.trim()
  if (!normalized) throw new Error('empty amount')
  const negative = normalized.startsWith('-')
  const parts = normalized.replace('-', '').split('.')
  const dollars = parseInt(parts[0] || '0', 10)
  const cents = parts[1] ? parts[1].padEnd(2, '0').slice(0,2) : '00'
  return (negative ? -1 : 1) * (dollars * 100 + parseInt(cents, 10))
}
