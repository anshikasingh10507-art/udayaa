const TOKEN_KEY = 'udaya_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data as T;
}

export function formatINR(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return 'Not yet confirmed';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export const CITIES_LIST = [
  'Pune',
  'Pimpri-Chinchwad',
  'Mumbai',
  'Navi Mumbai',
  'Thane',
  'Nashik',
  'Nagpur',
  'Bengaluru',
  'Hyderabad',
  'Ahmedabad',
  'Surat',
  'Chennai',
  'Delhi NCR',
  'Gurugram',
  'Noida',
  'Jaipur',
  'Indore',
  'Satara',
  'Kolhapur',
];
