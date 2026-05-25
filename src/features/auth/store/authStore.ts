import { create } from 'zustand'
import type { AuthUser } from '../types'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  mfaChallengeId: string | null
  needsMfa: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setMfaChallenge: (challengeId: string | null) => void
  setNeedsMfa: (needs: boolean) => void
  reset: () => void
}

const initialState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  mfaChallengeId: null,
  needsMfa: false,
}

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setMfaChallenge: (mfaChallengeId) => set({ mfaChallengeId }),

  setNeedsMfa: (needsMfa) => set({ needsMfa }),

  reset: () => set(initialState),
}))
