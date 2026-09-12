import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  inactivityTimeoutSeconds: number;
  inactivityWarningSeconds: number;
}

const defaults: AppConfig = {
  inactivityTimeoutSeconds: 120,
  inactivityWarningSeconds: 15,
};

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig = defaults;

  constructor(private readonly http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const remote = await firstValueFrom(this.http.get<AppConfig>('assets/config.json'));
      this.config = {
        inactivityTimeoutSeconds: Number(remote.inactivityTimeoutSeconds ?? defaults.inactivityTimeoutSeconds),
        inactivityWarningSeconds: Number(remote.inactivityWarningSeconds ?? defaults.inactivityWarningSeconds),
      };
    } catch {
      this.config = defaults;
    }
  }

  get(): AppConfig {
    return this.config;
  }
}