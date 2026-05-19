import { createLogger } from '../logger/index.js';
import type { Logger } from '../logger/index.js';

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastSuccess: Date | null;
  lastError: Date | null;
  errorCountSinceSuccess: number;
}

const log: Logger = createLogger('HealthTracker');

export class HealthTracker {
  private readonly components = new Map<string, ComponentHealth>();

  private getOrCreate(component: string): ComponentHealth {
    let health = this.components.get(component);
    if (!health) {
      health = {
        status: 'down',
        lastSuccess: null,
        lastError: null,
        errorCountSinceSuccess: 0,
      };
      this.components.set(component, health);
    }
    return health;
  }

  recordSuccess(component: string): void {
    const health = this.getOrCreate(component);
    health.lastSuccess = new Date();
    health.errorCountSinceSuccess = 0;
    health.status = 'healthy';
    log.debug('component healthy', { component });
  }

  recordError(component: string, error: Error): void {
    const health = this.getOrCreate(component);
    health.lastError = new Date();
    health.errorCountSinceSuccess += 1;
    health.status = health.lastSuccess ? 'degraded' : 'down';
    log.warn('component error', {
      component,
      error: error.message,
      errorCountSinceSuccess: health.errorCountSinceSuccess,
      status: health.status,
    });
  }

  getStatus(component: string): ComponentHealth {
    return this.getOrCreate(component);
  }

  getAllStatuses(): Map<string, ComponentHealth> {
    return new Map(this.components);
  }
}
