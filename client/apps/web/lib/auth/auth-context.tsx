"use client"

import { createContext, use, useContext, useMemo, useState } from "react"

import { api, authApi } from "../api/client"
import { can, Permissions } from "../permissions"

export type AuthUser = {
  id: string
  email: string
  name: string
  roles: string[]
  permissions: string[]
}

/** Login either signs in directly, or returns a 2FA challenge to complete. */
export type LoginOutcome =
  | { status: "authenticated"; user: AuthUser }
  | { status: "otp"; challengeId: string; devCode: string | null }

type AuthContextValue = {
  user: AuthUser | null
  can: (permission: Permissions) => boolean
  login: (email: string, password: string) => Promise<LoginOutcome>
  verifyLoginOtp: (challengeId: string, code: string) => Promise<AuthUser>
  register: (input: { email: string; password: string; name: string; phone: string }) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Session arrives as a promise from the server layout (Next streaming pattern)
 * and is read with React's `use` — no probe effect, no setState-in-effect.
 * State changes only happen in user-initiated actions afterwards.
 */
export function AuthProvider({
  sessionPromise,
  children,
}: {
  sessionPromise: Promise<AuthUser | null>
  children: React.ReactNode
}) {
  const initialUser = use(sessionPromise)
  const [user, setUser] = useState<AuthUser | null>(initialUser)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      can: (permission) => (user ? can(user.permissions, permission) : false),
      login: async (email, password) => {
        const res = await authApi.post<
          { user: AuthUser } | { requiresOtp: true; challengeId: string; devCode: string | null }
        >("/login", { email, password })
        if ("requiresOtp" in res.data) {
          return { status: "otp", challengeId: res.data.challengeId, devCode: res.data.devCode }
        }
        setUser(res.data.user)
        return { status: "authenticated", user: res.data.user }
      },
      verifyLoginOtp: async (challengeId, code) => {
        const res = await authApi.post<{ user: AuthUser }>("/login-verify", { challengeId, code })
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
      refreshUser: async () => {
        try {
          const res = await api.get<AuthUser>("/auth/me")
          setUser(res.data)
        } catch {
          setUser(null)
        }
      },
    }),
    [user],
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
