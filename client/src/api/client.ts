import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the backend's { data: ... } single-key envelope so callers get the payload directly.
    // Only unwrap when `data` is the sole key — paginated responses like { data, pagination }
    // must remain intact so callers can access both fields.
    if (
      response.data &&
      typeof response.data === 'object' &&
      !Array.isArray(response.data) &&
      Object.keys(response.data).length === 1 &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        // Unwrap envelope from raw axios call too
        const refreshData = res.data?.data ?? res.data;
        accessToken = refreshData.accessToken;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        accessToken = null;
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
