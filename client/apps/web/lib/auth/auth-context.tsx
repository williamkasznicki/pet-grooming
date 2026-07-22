"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { api, authApi } from "../api/client"
import { can, Permissions } from "../permissions"

export type AuthUser = {
  id: string
  email: string
  name: string
  roles: string[]
  permissions: string[]
}

type AuthContextValue = {
  user: AuthUser | null
  /** true until the initial session probe finishes */
  loading: boolean
  can: (permission: Permissions) => boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (input: { email: string; password: string; name: string; phone?: string }) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<AuthUser>("/auth/me")
      setUser(res.data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      can: (permission) => (user ? can(user.permissions, permission) : false),
      login: async (email, password) => {
        const res = await authApi.post<{ user: AuthUser }>("/login", { email, password })
        setUser(res.data.user)
        return res.data.user
      },
      register: async (input) => {
        const res = await authApi.post<{ user: AuthUser }>("/register", input)
        setUser(res.data.user)
        return res.data.user
      },
      logout: async () => {
        await authApi.post("/logout")
        setUser(null)
      },
      refreshUser,
    }),
    [user, loading, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/** Convenience: const { can } = usePermissions(); can(Permissions.MANAGE_STAFF) */
export function usePermissions(): Pick<AuthContextValue, "can"> & { permissions: string[] } {
  const { can: check, user } = useAuth()
  return { can: check, permissions: user?.permissions ?? [] }
}
