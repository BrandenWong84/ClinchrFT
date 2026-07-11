import { invoke } from '@tauri-apps/api/tauri'
import type { Transaction, Account, Category } from '../types'

export async function getTransactions(): Promise<Transaction[]> {
  return invoke('get_transactions') as Promise<Transaction[]>
}

export async function getAccounts(): Promise<Account[]> {
  return invoke('get_accounts') as Promise<Account[]>
}

export async function getCategories(): Promise<Category[]> {
  return invoke('get_categories') as Promise<Category[]>
}
