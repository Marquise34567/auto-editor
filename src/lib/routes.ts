export const EDITOR_ROUTE = '/editor'
export const LOGIN_ROUTE = '/login'
export const SIGNUP_ROUTE = '/signup'

export const isSafeReturnPath = (path: string | null | undefined) => {
  if (!path) return false
  if (!path.startsWith('/')) return false
  // prevent protocol-relative or domain-including paths
  if (path.startsWith('//')) return false
  return true
}
