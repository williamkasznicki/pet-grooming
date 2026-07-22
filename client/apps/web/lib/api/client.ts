import axios from "axios"

/**
 * Browser → BFF axios instance (the only HTTP client in browser code —
 * docs/DESIGN.md "axios only"). All backend resources are reached via
 * /api/proxy/<nest-path>; auth flows via /api/auth/<action>.
 * Cookies ride along automatically (same origin).
 */
export const api = axios.create( {
  baseURL: "/api/proxy",
  timeout: 20_000,
} )

/**
 * The backend's verdict is authoritative: when a data call comes back 401
 * (session expired mid-visit — the BFF already tried one refresh), send the
 * user to login and bring them back afterwards. /auth/me is exempt: it is the
 * AuthProvider's session probe, where 401 just means "not logged in".
 */
api.interceptors.response.use(
  ( response ) => response,
  ( error: unknown ) => {
    if (
      typeof window !== "undefined" &&
      axios.isAxiosError( error ) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes( "/auth/me" )
    ) {
      window.location.assign( `/login?next=${ encodeURIComponent( window.location.pathname ) }` )
    }
    return Promise.reject( error instanceof Error ? error : new Error( String( error ) ) )
  },
)

export const authApi = axios.create( {
  baseURL: "/api/auth",
  timeout: 20_000,
} )

/** Backend error envelope → single user-facing message. */
export function apiErrorMessage ( error: unknown, fallback: string ): string {
  if ( axios.isAxiosError( error ) ) {
    const message: unknown = ( error.response?.data as { message?: unknown } | undefined )?.message
    if ( typeof message === "string" ) return message
    if ( Array.isArray( message ) ) return message.join( "\n" )
  }
  return fallback
}
