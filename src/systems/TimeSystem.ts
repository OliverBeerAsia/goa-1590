import Phaser from 'phaser';

/**
 * TimeSystem - Manages the day/night cycle in 16th century Goa
 * 
 * Historical note: According to Linschoten, the market operated only
 * from 7-9 AM due to the intense afternoon heat. This system reflects
 * that reality with gameplay implications.
 */
export class TimeSystem {
  private scene: Phaser.Scene;
  private currentHour = 7; // Start at 7 AM (market opening)
  private currentMinute = 0;
  private dayCount = 1;
  private timeScale = 60; // 1 real second = 1 game minute
  private elapsedTime = 0;
  private isPaused = false;

  // Time periods with their characteristics
  private readonly periods = {
    EARLY_MORNING: { start: 5, end: 7, name: 'Early Morning', marketOpen: false },
    MARKET_HOURS: { start: 7, end: 9, name: 'Market Hours', marketOpen: true },
    MORNING: { start: 9, end: 12, name: 'Morning', marketOpen: true },
    AFTERNOON: { start: 12, end: 17, name: 'Afternoon', marketOpen: false }, // Too hot!
    EVENING: { start: 17, end: 20, name: 'Evening', marketOpen: true },
    NIGHT: { start: 20, end: 5, name: 'Night', marketOpen: false },
  };

  // Lighting colors for each period (will be applied as tint)
  private readonly lightingColors = {
    'Early Morning': 0x9999cc, // Pre-dawn blue
    'Market Hours': 0xffffee, // Warm morning light
    'Morning': 0xffffff, // Full daylight
    'Afternoon': 0xffeecc, // Hot afternoon (orange tint)
    'Evening': 0xffcc88, // Golden hour
    'Night': 0x4444aa, // Night blue
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public update(delta: number): void {
    if (this.isPaused) return;

    this.elapsedTime += delta;

    // Check if a game minute has passed
    const minuteMs = 1000 / this.timeScale * 60;
    if (this.elapsedTime >= minuteMs) {
      this.elapsedTime -= minuteMs;
      this.advanceMinute();
    }
  }

  private advanceMinute(): void {
    this.currentMinute++;
    
    if (this.currentMinute >= 60) {
      this.currentMinute = 0;
      this.advanceHour();
    }
  }

  private advanceHour(): void {
    const previousPeriod = this.getCurrentPeriod();
    this.currentHour++;

    if (this.currentHour >= 24) {
      this.currentHour = 0;
      this.advanceDay();
    }

    const newPeriod = this.getCurrentPeriod();
    
    // Emit events on period change
    if (previousPeriod !== newPeriod) {
      this.scene.events.emit('periodChange', {
        previous: previousPeriod,
        current: newPeriod,
        isMarketOpen: this.isMarketOpen(),
      });

      // Apply lighting change
      this.applyLighting(newPeriod);
    }

    // Emit hourly update
    this.scene.events.emit('hourChange', this.getTimeData());
  }

  private advanceDay(): void {
    this.dayCount++;
    this.scene.events.emit('newDay', { dayCount: this.dayCount });
  }

  public getCurrentPeriod(): string {
    for (const [, period] of Object.entries(this.periods)) {
      if (period.start <= period.end) {
        // Normal range (e.g., 7-9)
        if (this.currentHour >= period.start && this.currentHour < period.end) {
          return period.name;
        }
      } else {
        // Wrapping range (e.g., 20-5 for night)
        if (this.currentHour >= period.start || this.currentHour < period.end) {
          return period.name;
        }
      }
    }
    return 'Day';
  }

  public isMarketOpen(): boolean {
    const hour = this.currentHour;
    
    // Market hours: 7-9 AM (peak) and reduced activity 9 AM - 12 PM, 5-8 PM
    if (hour >= 7 && hour < 9) return true; // Peak market hours
    if (hour >= 9 && hour < 12) return true; // Extended morning
    if (hour >= 17 && hour < 20) return true; // Evening trading
    
    return false;
  }

  public getMarketActivity(): number {
    // Returns a multiplier for market activity (affects NPC spawns, prices, etc.)
    const hour = this.currentHour;
    
    if (hour >= 7 && hour < 9) return 1.0; // Peak
    if (hour >= 9 && hour < 12) return 0.7; // Declining
    if (hour >= 12 && hour < 17) return 0.1; // Siesta
    if (hour >= 17 && hour < 20) return 0.5; // Evening revival
    if (hour >= 20 || hour < 5) return 0.0; // Night
    if (hour >= 5 && hour < 7) return 0.2; // Early morning prep
    
    return 0.5;
  }

  private applyLighting(period: string): void {
    const color = this.lightingColors[period as keyof typeof this.lightingColors] || 0xffffff;
    
    // Emit lighting change event for other systems to respond
    this.scene.events.emit('lightingChange', { period, color });

    // Apply camera tint effect
    // Note: Full implementation would use a lighting layer or shader
    this.scene.cameras.main.setBackgroundColor(
      this.adjustBackgroundForPeriod(period)
    );
  }

  private adjustBackgroundForPeriod(period: string): number {
    switch (period) {
      case 'Early Morning':
        return 0x1a2a4e; // Dark blue
      case 'Market Hours':
        return 0x1e3a5f; // Portuguese blue (base)
      case 'Morning':
        return 0x1e3a5f;
      case 'Afternoon':
        return 0x2a4a6f; // Slightly lighter
      case 'Evening':
        return 0x2a3a4f; // Warm evening
      case 'Night':
        return 0x0a1a2e; // Very dark
      default:
        return 0x1e3a5f;
    }
  }

  public getTimeData(): { hour: number; minute: number; period: string; dayCount: number; isMarketOpen: boolean } {
    return {
      hour: this.currentHour,
      minute: this.currentMinute,
      period: this.getCurrentPeriod(),
      dayCount: this.dayCount,
      isMarketOpen: this.isMarketOpen(),
    };
  }

  public setTime(hour: number, minute: number = 0): void {
    this.currentHour = hour % 24;
    this.currentMinute = minute % 60;
    this.applyLighting(this.getCurrentPeriod());
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(1, scale);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }

  public getDayCount(): number {
    return this.dayCount;
  }

  public getFormattedTime(): string {
    const minuteStr = this.currentMinute.toString().padStart(2, '0');
    const ampm = this.currentHour >= 12 ? 'PM' : 'AM';
    const displayHour = this.currentHour > 12 ? this.currentHour - 12 : (this.currentHour === 0 ? 12 : this.currentHour);

    return `${displayHour}:${minuteStr} ${ampm}`;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.isPaused = true;
  }
}
