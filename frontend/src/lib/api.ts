import { getToken } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

// ── In-memory cache (30s cho GET, không cache POST/PATCH/DELETE) ──
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL: Record<string, number> = {
  '/portfolio/summary':  30_000,
  '/portfolio/holdings': 30_000,
  '/prices/forex':       60_000 * 60, // tỷ giá cache 1 giờ
  '/binance/balance':    30_000,
  '/binance/dca-summary':60_000,      // DCA summary cache 1 phút
  '/binance/autoinvest': 60_000,
  '/savings':            15_000,
};

function getCacheTtl(path: string): number {
  for (const [key, ttl] of Object.entries(CACHE_TTL)) {
    if (path.startsWith(key)) return ttl;
  }
  return 0; // không cache mặc định
}

export function clearApiCache(pathPrefix?: string) {
  if (!pathPrefix) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pathPrefix)) cache.delete(key);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const method = init?.method?.toUpperCase() ?? 'GET';

  // Cache chỉ cho GET requests
  if (method === 'GET') {
    const cacheKey = `${token?.slice(-8) ?? ''}:${path}`;
    const ttl = getCacheTtl(path);
    if (ttl > 0) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < ttl) {
        return cached.data as T;
      }
    }

    const res = await fetch(`${BASE}/api${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Lỗi server' }));
      throw new Error(err.message ?? 'Lỗi không xác định');
    }
    const data = await res.json();
    if (ttl > 0) cache.set(cacheKey, { data, ts: Date.now() });
    return data as T;
  }

  // POST / PATCH / DELETE — không cache, và xoá cache liên quan
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Lỗi server' }));
    throw new Error(err.message ?? 'Lỗi không xác định');
  }
  // Xoá cache portfolio sau khi mutate
  clearApiCache('/portfolio');
  clearApiCache('/binance/balance');
  clearApiCache('/savings');
  return res.json();
}

// Auth
export const auth = {
  register: (email: string, password: string, name?: string) =>
    request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<any>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  updateAvatar: (avatar: string) =>
    request<any>('/auth/avatar', { method: 'PATCH', body: JSON.stringify({ avatar }) }),
  updateName: (name: string) =>
    request<any>('/auth/name', { method: 'PATCH', body: JSON.stringify({ name }) }),
};

// Portfolio
export const portfolio = {
  summary: () => request<any>('/portfolio/summary'),
  holdings: () => request<any[]>('/portfolio/holdings'),
  history: (period: '1mo' | '3mo' | '6mo' | '1y' = '6mo') =>
    request<{ date: string; value: number }[]>(`/portfolio/history?period=${period}`),
  createHolding: (data: any) =>
    request<any>('/portfolio/holdings', { method: 'POST', body: JSON.stringify(data) }),
  updateHolding: (id: string, data: any) =>
    request<any>(`/portfolio/holdings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteHolding: (id: string) =>
    request<any>(`/portfolio/holdings/${id}`, { method: 'DELETE' }),
  budgets: () => request<any[]>('/portfolio/budgets'),
  upsertBudget: (data: any) =>
    request<any>('/portfolio/budgets', { method: 'POST', body: JSON.stringify(data) }),
};

// Prices
export const prices = {
  quote: (ticker: string) => request<any>(`/prices/quote/${ticker}`),
  quotes: (tickers: string[]) => request<any[]>(`/prices/quotes?tickers=${tickers.join(',')}`),
  history: (ticker: string, period = '6mo') => request<any[]>(`/prices/history/${ticker}?period=${period}`),
  rsi: (ticker: string) => request<any[]>(`/prices/rsi/${ticker}`),
  macd: (ticker: string) => request<any[]>(`/prices/macd/${ticker}`),
  forexRate: () => request<{ rate: number }>('/prices/forex'),
};

// Binance
export const binance = {
  price: (symbol: string) => request<any>(`/binance/price/${symbol}`),
  balance: () => request<any>('/binance/balance'),
  sync: () => request<any>('/binance/sync', { method: 'POST' }),
  earnFlexible: () => request<any>('/binance/earn/flexible'),
  dividends: (limit = 50) => request<any>(`/binance/earn/dividends?limit=${limit}`),
  autoInvestPlans: () => request<any>('/binance/autoinvest/plans'),
  autoInvestHistory: (planId?: number, size = 100) =>
    request<any>(`/binance/autoinvest/history?size=${size}${planId ? `&planId=${planId}` : ''}`),
  avgBuyPrice: (symbol: string) => request<number | null>(`/binance/avgbuy/${symbol}`),
  dcaAvgPrice: (asset: string) => request<{ asset: string; avgBuyPrice: number | null }>(`/binance/dca-avgprice/${asset}`),
  dcaSummary: (startDate?: string) => request<any>(`/binance/dca-summary${startDate ? `?startDate=${startDate}` : ''}`),
  trades: (symbol: string, limit = 100) => request<any[]>(`/binance/trades/${symbol}?limit=${limit}`),
  convertHistory: (limit = 1000) => request<any>(`/binance/convert/history?limit=${limit}`),
  klines: (symbol: string, interval: '1h'|'4h'|'1d' = '1d', limit = 90) =>
    request<any[]>(`/binance/klines/${symbol}?interval=${interval}&limit=${limit}`),
};

// Agent
export const agent = {
  getConfig:       () => request<any>('/agent/config'),
  upsertConfig:    (data: any) => request<any>('/agent/config', { method: 'POST', body: JSON.stringify(data) }),
  getLogs:         (limit = 50) => request<any[]>(`/agent/logs?limit=${limit}`),
  runNow:          () => request<any>('/agent/run-now', { method: 'POST' }),
  testPermission:  () => request<{ ok: boolean; balance: number }>('/agent/test-permission'),
  getStatus:       () => request<any>('/agent/status'),
  forceTest:       () => request<any>('/agent/force-test', { method: 'POST' }),
  clearLogs:       (type: 'test' | 'all') => request<any>('/agent/clear-logs', { method: 'POST', body: JSON.stringify({ type }) }),
};

// Export
export const exportApi = {
  excel: async () => {
    const token = getToken();
    const res = await fetch(`${BASE}/api/export/excel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const date = new Date().toISOString().split('T')[0];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_${date}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  pdf: () => {
    window.open('/report', '_blank');
  },
};

// Savings
export const savings = {
  list: () => request<any[]>('/savings'),
  create: (data: any) => request<any>('/savings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/savings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/savings/${id}`, { method: 'DELETE' }),
  addDeposit: (id: string, data: { amount: number; depositedAt?: string; note?: string }) =>
    request<any>(`/savings/${id}/deposit`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDeposit: (depositId: string) => request<any>(`/savings/deposit/${depositId}`, { method: 'DELETE' }),
};

// DSIP
export const dsip = {
  plans: () => request<any[]>('/dsip/plans'),
  createPlan: (data: any) => request<any>('/dsip/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: any) => request<any>(`/dsip/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlan: (id: string) => request<any>(`/dsip/plans/${id}`, { method: 'DELETE' }),
  addRecord: (planId: string, data: any) => request<any>(`/dsip/plans/${planId}/records`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRecord: (id: string) => request<any>(`/dsip/records/${id}`, { method: 'DELETE' }),
};

// Telegram
export const telegram = {
  status: () => request<{ configured: boolean }>('/telegram/status'),
  test:   (chatId?: string) => request<{ ok: boolean; error?: string }>('/telegram/test', {
    method: 'POST', body: JSON.stringify({ chatId }),
  }),
};

// Analyze
export const analyze = {
  portfolio: (question?: string) =>
    request<{ analysis: string; tokensUsed: number }>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
};

