import { Injectable, signal } from '@angular/core';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class InactivityService {
  readonly warningVisible = signal(false);
  readonly warningCountdown = signal(0);

  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private countdownTimer: ReturnType<typeof setInterval> | undefined;
  private onTimeout: () => void = () => {};
  private listener: (() => void) | undefined = undefined;

  constructor(private readonly config: ConfigService) {}

  start(onTimeout: () => void): void {
    this.onTimeout = onTimeout;
    this.listener = () => this.markActive();
    for (const event of ['pointerdown', 'pointermove', 'keydown', 'touchstart'] as const) {
      document.addEventListener(event, this.listener);
    }
    this.markActive();
  }

  continue(): void {
    this.markActive();
  }

  destroy(): void {
    this.clearTimers();
    if (this.listener) {
      for (const event of ['pointerdown', 'pointermove', 'keydown', 'touchstart'] as const) {
        document.removeEventListener(event, this.listener);
      }
      this.listener = undefined;
    }
  }

  private markActive(): void {
    this.clearTimers();
    this.warningVisible.set(false);
    const { inactivityTimeoutSeconds, inactivityWarningSeconds } = this.config.get();
    this.idleTimer = setTimeout(() => {
      this.startWarning(inactivityWarningSeconds);
    }, inactivityTimeoutSeconds * 1000);
  }

  private startWarning(seconds: number): void {
    this.warningCountdown.set(seconds);
    this.warningVisible.set(true);
    this.countdownTimer = setInterval(() => {
      const next = this.warningCountdown() - 1;
      if (next <= 0) {
        this.clearTimers();
        this.warningVisible.set(false);
        this.onTimeout();
      } else {
        this.warningCountdown.set(next);
      }
    }, 1000);
  }

  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }
}