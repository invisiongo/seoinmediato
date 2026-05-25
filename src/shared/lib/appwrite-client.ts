import { Client, Account, Databases } from 'appwrite'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!

let _client: Client | null = null
let _account: Account | null = null
let _databases: Databases | null = null

export function getClient(): Client {
  if (!_client) {
    _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID)
  }
  return _client
}

export function getAccount(): Account {
  if (!_account) _account = new Account(getClient())
  return _account
}

export function getDatabases(): Databases {
  if (!_databases) _databases = new Databases(getClient())
  return _databases
}
