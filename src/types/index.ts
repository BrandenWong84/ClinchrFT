export interface Transaction {
  id: string
  accountId: string
  categoryId?: string
  amountCents: number
  memo?: string
  date: string // ISO date
}

export interface Account {
  id: string
  name: string
}

export interface Category {
  id: string
  name: string
}
