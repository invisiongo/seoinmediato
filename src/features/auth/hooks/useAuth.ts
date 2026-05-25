'use client'

import * as authService from '../services/authService'
import { useAuthStore } from '../store/authStore'
import type { LoginCredentials, RegisterCredentials } from '../types'

interface AppwriteError {
  type?: string
  message?: string
  code?: number
}

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    mfaChallengeId,
    needsMfa,
    setUser,
    setLoading,
    setMfaChallenge,
    setNeedsMfa,
    reset,
  } = useAuthStore()

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setLoading(true)
    try {
      await authService.login(credentials.email, credentials.password)
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      setNeedsMfa(false)
      setMfaChallenge(null)
    } catch (error) {
      const appwriteError = error as AppwriteError
      if (appwriteError?.type === 'user_more_factors_required') {
        const challenge = await authService.createMfaChallenge()
        setMfaChallenge(challenge.$id)
        setNeedsMfa(true)
      } else {
        throw error
      }
    } finally {
      setLoading(false)
    }
  }

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    setLoading(true)
    try {
      await authService.register(
        credentials.name,
        credentials.email,
        credentials.password,
      )
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } finally {
      setLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    setLoading(true)
    try {
      await authService.logout()
      reset()
    } finally {
      setLoading(false)
    }
  }

  const checkAuth = async (): Promise<void> => {
    setLoading(true)
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } finally {
      setLoading(false)
    }
  }

  const setupMfa = async (): Promise<{ secret: string; uri: string }> => {
    setLoading(true)
    try {
      return await authService.setupMfa()
    } finally {
      setLoading(false)
    }
  }

  const verifyMfa = async (otp: string): Promise<void> => {
    setLoading(true)
    try {
      await authService.verifyMfa(otp)
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } finally {
      setLoading(false)
    }
  }

  const confirmMfaLogin = async (otp: string): Promise<void> => {
    if (!mfaChallengeId) throw new Error('No hay un desafio MFA activo')
    setLoading(true)
    try {
      await authService.confirmMfaLogin(mfaChallengeId, otp)
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      setNeedsMfa(false)
      setMfaChallenge(null)
    } finally {
      setLoading(false)
    }
  }

  const disableMfa = async (): Promise<void> => {
    setLoading(true)
    try {
      await authService.disableMfa()
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    needsMfa,
    mfaChallengeId,
    login,
    register,
    logout,
    checkAuth,
    setupMfa,
    verifyMfa,
    confirmMfaLogin,
    disableMfa,
  }
}
