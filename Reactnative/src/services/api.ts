// Set API host (for Android emulator use 10.0.2.2, for physical device use LAN IP)
const API_URL = 'http://localhost:5000/api/v1';

export const apiClient = {
  get: async (endpoint: string, token?: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.json();
  },
  post: async (endpoint: string, body: any, token?: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};
