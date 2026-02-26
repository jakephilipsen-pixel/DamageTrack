import { faker } from '@faker-js/faker';
import { CONFIG, ActionType, AgentPersona } from './config';
import { ApiClient } from './api-client';
import { Reporter } from './reporter';
import { CachedEntity, ActionMetric } from './types';
import { login, logout } from './actions/auth';
import { createDamageReport, listDamages, getDamageDetail, transitionStatus, addComment } from './actions/damages';
import { uploadPhotos } from './actions/photos';
import { listCustomers, searchCustomers } from './actions/customers';
import { listProducts, searchProducts } from './actions/products';
import { getDashboardStats, getMonthlyTrend } from './actions/dashboard';
import { listLocations, searchLocations } from './actions/locations';
import { generateDamagePayload } from './generators/fake-damage';
import { generateComment } from './generators/fake-comment';

export class Agent {
  private client: ApiClient;
  private customers: CachedEntity[] = [];
  private products: CachedEntity[] = [];
  private locations: CachedEntity[] = [];
  private createdReportIds: string[] = [];
  private allReportIds: string[] = [];
  private consecutiveErrors = 0;
  private stopped = false;
  private password: string;

  constructor(
    public persona: AgentPersona,
    private reporter: Reporter
  ) {
    this.client = new ApiClient(persona.name);
    this.password = 'Test1234pass';
  }

  async setup() {
    // Register re-login callback so api-client can recover from 401s
    this.client.reloginFn = () => this.relogin();

    // Login
    await login(this.client, this.persona.name, this.password);

    // Cache reference data
    try {
      const custRes = await listCustomers(this.client);
      this.customers = (custRes.data || []).map((c: any) => ({ id: c.id, name: c.name, code: c.code }));
    } catch {
      console.warn(`[${this.persona.name}] Failed to fetch customers`);
    }

    try {
      const prodRes = await listProducts(this.client);
      this.products = (prodRes.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku }));
    } catch {
      console.warn(`[${this.persona.name}] Failed to fetch products`);
    }

    try {
      const locRes = await listLocations(this.client);
      this.locations = (locRes.data || []).map((l: any) => ({ id: l.id, code: l.code }));
    } catch {
      console.warn(`[${this.persona.name}] Failed to fetch locations`);
    }

    // Seed the known reports list
    try {
      const dmgRes = await listDamages(this.client, { limit: 50 });
      this.allReportIds = (dmgRes.data || []).map((d: any) => d.id);
    } catch {
      // ok
    }

    if (this.customers.length === 0 || this.products.length === 0) {
      console.warn(`[${this.persona.name}] Warning: No customers (${this.customers.length}) or products (${this.products.length}) available`);
    }
  }

  async run(endTime: number) {
    this.reporter.registerAgent(this.persona.name);

    while (Date.now() < endTime && !this.stopped) {
      // Refresh token if stale
      if (this.client.isTokenStale()) {
        try {
          await this.client.refreshAccessToken();
        } catch {
          // Re-login if refresh fails
          try {
            await login(this.client, this.persona.name, this.password);
          } catch {
            this.consecutiveErrors++;
          }
        }
      }

      const action = this.pickAction();
      const start = Date.now();
      let success = true;
      let httpStatus = 200;
      let errorMessage: string | undefined;

      try {
        await this.executeAction(action);
        this.consecutiveErrors = 0;
      } catch (err: any) {
        success = false;
        httpStatus = err.response?.status || 0;
        errorMessage = err.message || 'Unknown error';
        this.consecutiveErrors++;

        // On auth errors, try to re-establish session before giving up
        if (this.consecutiveErrors >= 2 && (httpStatus === 401 || !this.client.hasToken())) {
          await this.relogin();
        }

        // Back-off on consecutive errors
        if (this.consecutiveErrors >= 20) {
          console.error(`[${this.persona.name}] CRITICAL: 20 consecutive errors — stopping agent`);
          this.stopped = true;
          break;
        }
        if (this.consecutiveErrors >= 5) {
          await sleep(10000);
        }
      }

      const metric: ActionMetric = {
        agent: this.persona.name,
        action,
        timestamp: start,
        durationMs: Date.now() - start,
        httpStatus,
        success,
        errorMessage,
      };
      this.reporter.record(metric);

      // Wait between actions (adjusted by pace style)
      const delayMultiplier = this.persona.style === 'fast' ? 0.5 : this.persona.style === 'slow' ? 2.0 : 1.0;
      const delay = randomBetween(
        CONFIG.MIN_ACTION_DELAY_MS * delayMultiplier,
        CONFIG.MAX_ACTION_DELAY_MS * delayMultiplier
      );
      await sleep(delay);
    }

    // Teardown
    try {
      await logout(this.client);
    } catch {
      // ok
    }
    this.reporter.deregisterAgent(this.persona.name);
  }

  private pickAction(): ActionType {
    const weights = { ...CONFIG.ACTION_WEIGHTS };

    // Apply persona bias (2x weight for biased action)
    if (weights[this.persona.bias] !== undefined) {
      weights[this.persona.bias] *= 2;
    }

    // WAREHOUSE_USER can't view dashboard/reports
    if (this.persona.role === 'WAREHOUSE_USER') {
      weights.VIEW_DASHBOARD = 0;
    }

    // If no customers/products, can't create damage reports or upload photos
    if (this.customers.length === 0 || this.products.length === 0) {
      weights.CREATE_DAMAGE_REPORT = 0;
      weights.UPLOAD_PHOTOS = 0;
    }

    // If no known reports, reduce actions that need them
    if (this.allReportIds.length === 0) {
      weights.VIEW_DAMAGE_DETAIL = 0;
      weights.TRANSITION_STATUS = 0;
      weights.ADD_COMMENT = 0;
      weights.UPLOAD_PHOTOS = 0;
    }

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;

    for (const [action, weight] of Object.entries(weights)) {
      rand -= weight;
      if (rand <= 0) return action as ActionType;
    }

    return 'VIEW_DAMAGE_LIST';
  }

  private async executeAction(action: ActionType) {
    switch (action) {
      case 'CREATE_DAMAGE_REPORT': {
        const payload = generateDamagePayload(this.customers, this.products, this.locations);
        const report = await createDamageReport(this.client, payload);
        if (report?.id) {
          this.createdReportIds.push(report.id);
          this.allReportIds.push(report.id);

          // 70% chance to immediately upload photos
          if (Math.random() < 0.7) {
            const count = randomBetween(CONFIG.PHOTOS_PER_UPLOAD_MIN, CONFIG.PHOTOS_PER_UPLOAD_MAX);
            try {
              await uploadPhotos(this.client, report.id, count, this.persona.name);
            } catch {
              // photo upload failure is non-critical
            }
          }
        }
        break;
      }

      case 'UPLOAD_PHOTOS': {
        const id = this.randomReportId();
        if (!id) break;
        const count = randomBetween(CONFIG.PHOTOS_PER_UPLOAD_MIN, CONFIG.PHOTOS_PER_UPLOAD_MAX);
        await uploadPhotos(this.client, id, count, this.persona.name);
        break;
      }

      case 'VIEW_DAMAGE_LIST': {
        const params: Record<string, unknown> = { limit: 20 };
        // Random filters
        if (Math.random() > 0.5) {
          params.status = faker.helpers.arrayElement(['OPEN', 'CUSTOMER_NOTIFIED', 'DESTROY_STOCK', 'REP_COLLECT', 'CLOSED']);
        }
        if (Math.random() > 0.7 && this.customers.length > 0) {
          params.customerId = this.customers[Math.floor(Math.random() * this.customers.length)].id;
        }
        if (Math.random() > 0.6) {
          params.page = faker.number.int({ min: 1, max: 3 });
        }
        const result = await listDamages(this.client, params);
        // Update known reports
        if (result.data?.length > 0) {
          for (const d of result.data) {
            if (!this.allReportIds.includes(d.id)) {
              this.allReportIds.push(d.id);
            }
          }
        }
        break;
      }

      case 'VIEW_DAMAGE_DETAIL': {
        const id = this.randomReportId();
        if (!id) break;
        await getDamageDetail(this.client, id);
        break;
      }

      case 'TRANSITION_STATUS': {
        // Fetch a random report to get current status
        const id = this.randomReportId();
        if (!id) break;
        const detail = await getDamageDetail(this.client, id);
        if (detail && detail.status !== 'CLOSED') {
          // WAREHOUSE_USER can only do OPEN → CUSTOMER_NOTIFIED via status change
          // But the API enforces RBAC, so we just try
          const note = faker.lorem.sentence();
          await transitionStatus(this.client, id, detail.status, note);
        }
        break;
      }

      case 'ADD_COMMENT': {
        const id = this.randomReportId();
        if (!id) break;
        const content = generateComment();
        await addComment(this.client, id, content);
        break;
      }

      case 'SEARCH_CUSTOMERS': {
        if (this.customers.length > 0) {
          const name = this.customers[Math.floor(Math.random() * this.customers.length)].name || 'a';
          const partial = name.slice(0, Math.max(2, Math.floor(name.length / 2)));
          await searchCustomers(this.client, partial);
        } else {
          await listCustomers(this.client);
        }
        break;
      }

      case 'SEARCH_PRODUCTS': {
        if (this.products.length > 0) {
          const name = this.products[Math.floor(Math.random() * this.products.length)].name || 'a';
          const partial = name.slice(0, Math.max(2, Math.floor(name.length / 2)));
          await searchProducts(this.client, partial);
        } else {
          await listProducts(this.client);
        }
        break;
      }

      case 'VIEW_DASHBOARD': {
        await getDashboardStats(this.client);
        if (Math.random() > 0.5) {
          await getMonthlyTrend(this.client);
        }
        break;
      }

      case 'BROWSE_LOCATIONS': {
        if (this.locations.length > 0 && Math.random() > 0.5) {
          const code = this.locations[Math.floor(Math.random() * this.locations.length)].code || 'A';
          await searchLocations(this.client, code.slice(0, 2));
        } else {
          await listLocations(this.client);
        }
        break;
      }

      case 'LOGOUT_LOGIN': {
        await logout(this.client);
        await sleep(randomBetween(1000, 2000));
        // Retry login with backoff to handle 429 rate limiting
        let loggedIn = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await login(this.client, this.persona.name, this.password);
            loggedIn = true;
            break;
          } catch (err: any) {
            if (err.message?.includes('429') && attempt < 2) {
              // Rate limited — wait longer before retrying
              await sleep(5000 * (attempt + 1));
            } else if (attempt < 2) {
              await sleep(2000);
            } else {
              throw err;
            }
          }
        }
        break;
      }
    }
  }

  private async relogin(): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await login(this.client, this.persona.name, this.password);
        return true;
      } catch (err: any) {
        if (err.message?.includes('429')) {
          // Rate limited — wait before retrying
          await sleep(5000 * (attempt + 1));
        } else {
          await sleep(2000);
        }
      }
    }
    return false;
  }

  private randomReportId(): string | null {
    if (this.allReportIds.length === 0) return null;
    return this.allReportIds[Math.floor(Math.random() * this.allReportIds.length)];
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}
