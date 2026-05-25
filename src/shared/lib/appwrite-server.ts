import { Client, Databases, Users } from 'node-appwrite'
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } from './constants'

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY)

export const serverDatabases = new Databases(client)
export const serverUsers = new Users(client)
export { client as serverClient }
