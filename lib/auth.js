'use client'

export function clearAuth() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem('auth_token')
    window.localStorage.removeItem('auth_email')
    window.localStorage.removeItem('auth_user_id')
    window.sessionStorage.clear()
  } catch {}
}

export function getAuthToken() {
  return null
}
