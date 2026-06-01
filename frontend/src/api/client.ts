import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retries?: number;
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // For FormData, delete Content-Type so the browser sets it with the correct
  // multipart boundary. Explicit 'multipart/form-data' without a boundary
  // causes Spring to reject the request as non-multipart.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // Don't retry deliberately cancelled requests
    if (axios.isCancel(error)) return Promise.reject(error);

    const retries = config?._retries ?? 0;
    // Only retry GET requests — POSTs/PATCHes risk duplicate side effects
    const isGet = config?.method === 'get';
    const isNetworkError = !error.response;

    if (config && isGet && isNetworkError && retries < 3) {
      config._retries = retries + 1;
      const delay = Math.min(1_000 * 2 ** retries + Math.random() * 500, 10_000);
      await new Promise<void>(r => setTimeout(r, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
