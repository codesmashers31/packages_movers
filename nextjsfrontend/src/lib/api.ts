export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:5000/api/v1`;
  }
  return 'http://localhost:5000/api/v1';
};

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const baseUrl = getApiBaseUrl();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response: Response | undefined;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      // If backend reports 503 (database connecting / transient handshake), retry once after 800ms
      if (response.status === 503 && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      break;
    } catch (netErr: any) {
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      throw new Error(
        `Unable to reach backend API at ${baseUrl}. Please ensure the backend server is running and accessible.`
      );
    }
  }

  if (!response) {
    throw new Error(`Unable to reach backend API at ${baseUrl}.`);
  }


  // Handle 401 Unauthorized for admin portal
  if (response.status === 401) {
    if (
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/admin') &&
      window.location.pathname !== '/admin/login'
    ) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/admin/login';
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `API error (${response.status})`);
  }

  return data as T;
}
