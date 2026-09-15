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
  const activeVendorId = typeof window !== 'undefined' ? localStorage.getItem('active_vendor_id') : null;
  const baseUrl = getApiBaseUrl();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeVendorId ? { 'x-vendor-id': activeVendorId } : {}),
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


  // Handle 401 Unauthorized for admin and vendor portals
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
    if (
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/vendor') &&
      window.location.pathname !== '/vendor/login'
    ) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/vendor/login';
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

export const getDocumentStreamUrl = (fileUrl?: string | null, download: boolean = false): string => {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('data:')) return fileUrl;
  if (fileUrl.startsWith('blob:')) return fileUrl;

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const baseUrl = getApiBaseUrl(); // returns "http://localhost:5000/api/v1"

  let fullUrl: string;
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    fullUrl = fileUrl;
  } else {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    if (cleanBase.endsWith('/api/v1') && fileUrl.startsWith('/api/v1')) {
      const origin = cleanBase.slice(0, -7);
      fullUrl = `${origin}${fileUrl}`;
    } else {
      fullUrl = `${cleanBase}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    }
  }

  try {
    const parsed = new URL(fullUrl);
    if (token) parsed.searchParams.set('token', token);
    if (download) parsed.searchParams.set('download', 'true');
    return parsed.toString();
  } catch {
    const separator = fullUrl.includes('?') ? '&' : '?';
    let res = fullUrl;
    if (token) res += `${separator}token=${encodeURIComponent(token)}`;
    if (download) res += `&download=true`;
    return res;
  }
};

export const isImageDocument = (docType?: string, fileName?: string, fileUrl?: string): boolean => {
  if (docType === 'REPRESENTATIVE_PHOTO') return true;
  if (fileUrl && fileUrl.startsWith('data:image/')) return true;
  const target = (fileName || fileUrl || '').toLowerCase();
  return target.endsWith('.jpg') || target.endsWith('.jpeg') || target.endsWith('.png') || target.endsWith('.webp');
};
