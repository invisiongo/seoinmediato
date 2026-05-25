export interface AuthUser {
  $id: string
  name: string
  email: string
  mfa: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}
