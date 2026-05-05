export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('invest_token');
}

export function setToken(token: string) {
  localStorage.setItem('invest_token', token);
}

export function clearToken() {
  localStorage.removeItem('invest_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
