import axios, { AxiosInstance, AxiosError } from 'axios';
import { CONFIG } from './config';

export class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenSetAt: number = 0;

  // Agent sets this so the client can re-authenticate on 401 when refresh token is gone
  public reloginFn: (() => Promise<boolean>) | null = null;

  constructor(public agentName: string) {
    this.client = axios.create({
      baseURL: `${CONFIG.BASE_URL}/api`,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on HTTP errors
    });
  }

  hasToken(): boolean {
    return this.accessToken !== null;
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    this.tokenSetAt = Date.now();
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  isTokenStale(): boolean {
    return this.tokenSetAt > 0 && Date.now() - this.tokenSetAt > 12 * 60 * 1000;
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await axios.post(`${CONFIG.BASE_URL}/api/auth/refresh`, {
        refreshToken: this.refreshToken,
      });
      const data = res.data?.data ?? res.data;
      if (data?.accessToken) {
        this.accessToken = data.accessToken;
        if (data.refreshToken) this.refreshToken = data.refreshToken;
        this.tokenSetAt = Date.now();
        return true;
      }
    } catch {
      // refresh failed
    }
    return false;
  }

  private async recoverAuth(): Promise<boolean> {
    // Try token refresh first
    if (this.refreshToken) {
      const ok = await this.refreshAccessToken();
      if (ok) return true;
    }
    // Fall back to full re-login
    if (this.reloginFn) {
      return this.reloginFn();
    }
    return false;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.accessToken) h['Authorization'] = `Bearer ${this.accessToken}`;
    return h;
  }

  async get(path: string, params?: Record<string, unknown>) {
    return this.requestWithRetry(() =>
      this.client.get(path, { headers: this.headers(), params })
    );
  }

  async post(path: string, data?: unknown, config?: { headers?: Record<string, string> }) {
    return this.requestWithRetry(() =>
      this.client.post(path, data, {
        headers: { ...this.headers(), ...config?.headers },
      })
    );
  }

  async put(path: string, data?: unknown) {
    return this.requestWithRetry(() =>
      this.client.put(path, data, { headers: this.headers() })
    );
  }

  async patch(path: string, data?: unknown) {
    return this.requestWithRetry(() =>
      this.client.patch(path, data, { headers: this.headers() })
    );
  }

  async delete(path: string) {
    return this.requestWithRetry(() =>
      this.client.delete(path, { headers: this.headers() })
    );
  }

  // Post multipart form data (for photo uploads)
  async postForm(path: string, formData: FormData) {
    return this.requestWithRetry(() =>
      this.client.post(path, formData, {
        headers: {
          ...this.headers(),
          // axios sets Content-Type with boundary automatically for FormData
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      })
    );
  }

  private async requestWithRetry(fn: () => Promise<any>): Promise<any> {
    let lastErr: any;
    for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        const res = await fn();
        // On 401, try to recover auth (refresh token or full re-login) once
        if (res.status === 401 && attempt === 0) {
          const recovered = await this.recoverAuth();
          if (recovered) {
            return fn(); // retry with new token
          }
        }
        return res;
      } catch (err) {
        lastErr = err;
        if (attempt < CONFIG.MAX_RETRIES) {
          await sleep(CONFIG.RETRY_DELAY_MS);
        }
      }
    }
    throw lastErr;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
