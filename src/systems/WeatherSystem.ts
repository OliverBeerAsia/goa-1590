import Phaser from 'phaser';
import { WindSystem, Season as WindSeason } from './WindSystem';

/**
 * WeatherSystem - Manages weather conditions and seasonal effects in 16th century Goa
 *
 * Historical context: Goa experiences distinct monsoon seasons (June-September)
 * which dramatically affected trade - ships could not safely navigate during
 * monsoon, making it a critical gameplay element.
 *
 * Enhanced features:
 * - Smooth 3-second transitions between weather states
 * - Lightning system during heavy rain
 * - Wind system integration
 * - Ground wetness tracking
 */

export type WeatherState = 'clear' | 'overcast' | 'rain' | 'heavyRain' | 'heatHaze' | 'fog';
export type Season = 'dry' | 'preMonsoon' | 'monsoon' | 'postMonsoon';

interface WeatherConfig {
  state: WeatherState;
  intensity: number; // 0-1
  duration: number; // in game hours
  particleCount: number;
  visibility: number; // 0-1, affects draw distance/fade
  soundKey?: string;
}

interface TransitionState {
  fromWeather: WeatherState;
  toWeather: WeatherState;
  fromIntensity: number;
  toIntensity: number;
  progress: number; // 0 to 1
  active: boolean;
}

interface SeasonConfig {
  name: Season;
  months: number[]; // 1-12
  weatherProbabilities: { [key in WeatherState]: number };
  description: string;
  tradeModifier: number; // Affects ship arrivals
}

export class WeatherSystem {
  private scene: Phaser.Scene;
  private currentWeather: WeatherState = 'clear';
  private currentSeason: Season = 'dry';
  private weatherIntensity = 0;
  private weatherDuration = 0;
  private elapsedWeatherTime = 0;

  // Particle emitters for weather effects
  private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fogOverlay: Phaser.GameObjects.Graphics | null = null;
  private heatHazeEffect: Phaser.GameObjects.Graphics | null = null;

  // Visual overlays
  private weatherOverlay: Phaser.GameObjects.Graphics | null = null;

  // Lightning system
  private lightningOverlay: Phaser.GameObjects.Graphics | null = null;
  private lightningTimer: number = 0;
  private lightningActive: boolean = false;
  private thunderDelay: number = 0;

  // Smooth weather transitions
  private transition: TransitionState = {
    fromWeather: 'clear',
    toWeather: 'clear',
    fromIntensity: 0,
    toIntensity: 0,
    progress: 1,
    active: false
  };
  private transitionTween: Phaser.Tweens.Tween | null = null;

  // Ground wetness (0 to 1)
  private groundWetness: number = 0;
  private readonly WETNESS_INCREASE_RATE = 0.001; // Per frame during heavy rain
  private readonly WETNESS_DECREASE_RATE = 0.0002; // Per frame when not raining

  // Wind system integration
  private windSystem: WindSystem | null = null;
  
  // Season definitions based on Goan climate
  private readonly seasons: SeasonConfig[] = [
    {
      name: 'dry',
      months: [11, 12, 1, 2, 3, 4, 5],
      weatherProbabilities: { clear: 0.7, overcast: 0.15, rain: 0.05, heavyRain: 0, heatHaze: 0.1, fog: 0 },
      description: 'Dry season - clear skies, busy trade',
      tradeModifier: 1.0,
    },
    {
      name: 'preMonsoon',
      months: [5, 6],
      weatherProbabilities: { clear: 0.3, overcast: 0.4, rain: 0.2, heavyRain: 0.05, heatHaze: 0.05, fog: 0 },
      description: 'Pre-monsoon - building humidity, uncertain weather',
      tradeModifier: 0.7,
    },
    {
      name: 'monsoon',
      months: [6, 7, 8, 9],
      weatherProbabilities: { clear: 0.1, overcast: 0.2, rain: 0.4, heavyRain: 0.25, heatHaze: 0, fog: 0.05 },
      description: 'Monsoon - heavy rains, ships cannot dock',
      tradeModifier: 0.1, // Almost no ship arrivals
    },
    {
      name: 'postMonsoon',
      months: [9, 10, 11],
      weatherProbabilities: { clear: 0.4, overcast: 0.3, rain: 0.2, heavyRain: 0.05, heatHaze: 0, fog: 0.05 },
      description: 'Post-monsoon - clearing skies, trade resuming',
      tradeModifier: 0.8,
    },
  ];

  // Weather visual configurations
  private readonly weatherConfigs: { [key in WeatherState]: Partial<WeatherConfig> } = {
    clear: { particleCount: 0, visibility: 1.0 },
    overcast: { particleCount: 0, visibility: 0.85 },
    rain: { particleCount: 100, visibility: 0.7 },
    heavyRain: { particleCount: 300, visibility: 0.5 },
    heatHaze: { particleCount: 20, visibility: 0.9 },
    fog: { particleCount: 0, visibility: 0.4 },
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
    this.createWeatherAssets();
    this.initializeWeather();

    // Initialize wind system
    this.windSystem = new WindSystem(scene);
  }

  /**
   * Get the WindSystem for external access
   */
  public getWindSystem(): WindSystem | null {
    return this.windSystem;
  }

  private setupEventListeners(): void {
    // Listen for time changes to potentially change weather
    this.scene.events.on('hourChange', () => {
      this.checkWeatherChange();
    });

    // Listen for new day to update season
    this.scene.events.on('newDay', (data: { dayCount: number }) => {
      this.updateSeason(data.dayCount);
    });

    // Listen for period changes to apply heat haze during afternoon
    this.scene.events.on('periodChange', (data: { current: string }) => {
      if (data.current === 'Afternoon' && this.currentWeather === 'clear') {
        // Chance of heat haze during hot afternoons in dry season
        if (this.currentSeason === 'dry' && Math.random() < 0.3) {
          this.setWeather('heatHaze', 0.6, 3);
        }
      }
    });
  }

  private createWeatherAssets(): void {
    // Create rain particle texture
    this.createRainTexture();

    // Create dust particle texture
    this.createDustTexture();

    // Create weather overlay for fog/darkness
    this.weatherOverlay = this.scene.add.graphics();
    this.weatherOverlay.setScrollFactor(0);
    this.weatherOverlay.setDepth(9000);

    // Create lightning overlay
    this.lightningOverlay = this.scene.add.graphics();
    this.lightningOverlay.setScrollFactor(0);
    this.lightningOverlay.setDepth(9800);
    this.lightningOverlay.setAlpha(0);
  }

  private createRainTexture(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    
    // Rain drop - elongated white/blue streak
    graphics.fillStyle(0xaaccff, 0.6);
    graphics.fillRect(0, 0, 2, 8);
    
    graphics.generateTexture('rain_drop', 2, 8);
    graphics.destroy();
  }

  private createDustTexture(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    
    // Dust mote - small yellowish circle
    graphics.fillStyle(0xd4a574, 0.4);
    graphics.fillCircle(2, 2, 2);
    
    graphics.generateTexture('dust_mote', 4, 4);
    graphics.destroy();
  }

  private initializeWeather(): void {
    // Start with clear weather
    this.setWeather('clear', 0, 24);
  }

  public update(delta: number): void {
    // Update wind system
    if (this.windSystem) {
      this.windSystem.update(delta);
    }

    // Update weather duration
    this.elapsedWeatherTime += delta / 1000 / 60; // Convert to game minutes

    // Check if weather should change
    if (this.weatherDuration > 0 && this.elapsedWeatherTime >= this.weatherDuration * 60) {
      this.transitionToRandomWeather();
    }

    // Update visual effects
    this.updateWeatherEffects(delta);

    // Update lightning
    this.updateLightning(delta);

    // Update ground wetness
    this.updateGroundWetness(delta);

    // Update rain angle based on wind
    this.updateRainWithWind();
  }

  /**
   * Update lightning effects during storms
   */
  private updateLightning(delta: number): void {
    // Only lightning during heavy rain or monsoon storms
    const canLightning = this.currentWeather === 'heavyRain' ||
      (this.currentWeather === 'rain' && this.weatherIntensity > 0.7 && this.currentSeason === 'monsoon');

    if (!canLightning) {
      this.lightningActive = false;
      return;
    }

    this.lightningTimer += delta;

    // Random chance for lightning (2% per frame during storms)
    if (!this.lightningActive && Math.random() < 0.02 * (delta / 16.67)) {
      this.triggerLightning();
    }
  }

  /**
   * Trigger a lightning flash
   */
  private triggerLightning(): void {
    if (!this.lightningOverlay) return;

    this.lightningActive = true;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Draw full-screen flash
    this.lightningOverlay.clear();
    this.lightningOverlay.fillStyle(0xFFFFFF, 0.8);
    this.lightningOverlay.fillRect(0, 0, width, height);

    // Fade out the flash
    this.scene.tweens.add({
      targets: this.lightningOverlay,
      alpha: { from: 0.8, to: 0 },
      duration: 150,
      ease: 'Expo.easeOut',
      onComplete: () => {
        this.lightningActive = false;
      }
    });

    // Calculate thunder delay based on "distance" (500-3000ms)
    this.thunderDelay = 500 + Math.random() * 2500;

    // Emit lightning event for sound system
    this.scene.events.emit('lightning', {
      intensity: 0.8 + Math.random() * 0.2,
      thunderDelay: this.thunderDelay
    });

    // Schedule thunder sound event
    this.scene.time.delayedCall(this.thunderDelay, () => {
      this.scene.events.emit('thunder', {
        volume: 0.5 + Math.random() * 0.5,
        distance: this.thunderDelay / 1000 // Rough distance in km
      });
    });
  }

  /**
   * Update ground wetness based on weather
   */
  private updateGroundWetness(_delta: number): void {
    const isRaining = this.currentWeather === 'rain' || this.currentWeather === 'heavyRain';

    if (isRaining) {
      // Increase wetness
      const rate = this.currentWeather === 'heavyRain'
        ? this.WETNESS_INCREASE_RATE
        : this.WETNESS_INCREASE_RATE * 0.5;
      this.groundWetness = Math.min(1, this.groundWetness + rate);
    } else {
      // Decrease wetness (slower in monsoon season)
      const dryRate = this.currentSeason === 'monsoon'
        ? this.WETNESS_DECREASE_RATE * 0.5
        : this.WETNESS_DECREASE_RATE;
      this.groundWetness = Math.max(0, this.groundWetness - dryRate);
    }

    // Emit wetness change for tile rendering
    if (this.groundWetness > 0.01) {
      this.scene.events.emit('groundWetnessChange', {
        wetness: this.groundWetness,
        darkening: this.groundWetness * 0.2 // 20% max darkening
      });
    }
  }

  /**
   * Update rain particle angle based on wind
   */
  private updateRainWithWind(): void {
    if (!this.rainEmitter || !this.windSystem) return;

    const windVector = this.windSystem.getWindVector();

    // Adjust rain speed based on wind
    const baseSpeedX = -50; // Base slant
    const windSpeedX = windVector.x * 100;

    // Update emitter speedX config
    (this.rainEmitter as Phaser.GameObjects.Particles.ParticleEmitter).speedX = {
      min: baseSpeedX + windSpeedX - 20,
      max: baseSpeedX + windSpeedX + 20
    };
  }

  private updateWeatherEffects(_delta: number): void {
    // Update overlay based on current weather - subtle effects only
    if (this.weatherOverlay) {
      this.weatherOverlay.clear();
      
      const width = this.scene.cameras.main.width;
      const height = this.scene.cameras.main.height;
      
      // Only apply overlays for non-clear weather, and keep them subtle
      switch (this.currentWeather) {
        case 'overcast':
          this.weatherOverlay.fillStyle(0x8888aa, 0.08);
          this.weatherOverlay.fillRect(0, 0, width, height);
          break;
          
        case 'rain':
          this.weatherOverlay.fillStyle(0x667788, 0.1);
          this.weatherOverlay.fillRect(0, 0, width, height);
          break;
          
        case 'heavyRain':
          this.weatherOverlay.fillStyle(0x556677, 0.15 + this.weatherIntensity * 0.1);
          this.weatherOverlay.fillRect(0, 0, width, height);
          break;
          
        case 'fog':
          this.weatherOverlay.fillStyle(0xdddddd, 0.15 + this.weatherIntensity * 0.15);
          this.weatherOverlay.fillRect(0, 0, width, height);
          break;
          
        case 'heatHaze':
          // Very subtle warm tint
          this.weatherOverlay.fillStyle(0xffeecc, 0.05);
          this.weatherOverlay.fillRect(0, 0, width, height);
          break;
          
        case 'clear':
        default:
          // No overlay for clear weather
          break;
      }
    }
  }

  /**
   * Set weather with smooth transition
   * @param state Target weather state
   * @param intensity Target intensity (0-1)
   * @param durationHours How long this weather should last
   * @param instant If true, skip the smooth transition
   */
  public setWeather(state: WeatherState, intensity: number = 0.5, durationHours: number = 4, instant: boolean = false): void {
    const previousWeather = this.currentWeather;
    const previousIntensity = this.weatherIntensity;

    // Cancel any existing transition
    if (this.transitionTween) {
      this.transitionTween.stop();
      this.transitionTween = null;
    }

    this.weatherDuration = durationHours;
    this.elapsedWeatherTime = 0;

    if (instant || previousWeather === state) {
      // Instant change
      this.currentWeather = state;
      this.weatherIntensity = Math.max(0, Math.min(1, intensity));
      this.transition.active = false;
      this.updateParticleEmitters();
      this.emitWeatherChange(previousWeather, state, intensity);
    } else {
      // Smooth 3-second transition
      this.startWeatherTransition(previousWeather, previousIntensity, state, intensity);
    }

    // Log for debugging
    console.log(`Weather ${instant ? 'set' : 'transitioning'}: ${previousWeather} -> ${state} (intensity: ${intensity})`);
  }

  /**
   * Start a smooth weather transition
   */
  private startWeatherTransition(
    fromWeather: WeatherState,
    fromIntensity: number,
    toWeather: WeatherState,
    toIntensity: number
  ): void {
    // Setup transition state
    this.transition = {
      fromWeather,
      toWeather,
      fromIntensity,
      toIntensity,
      progress: 0,
      active: true
    };

    // Prepare particle emitters for new weather (but don't fully activate yet)
    this.prepareParticleEmittersForTransition(toWeather);

    // Create smooth transition tween
    this.transitionTween = this.scene.tweens.add({
      targets: this.transition,
      progress: 1,
      duration: 3000, // 3 second transition
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.updateWeatherTransition();
      },
      onComplete: () => {
        // Finalize the transition
        this.currentWeather = toWeather;
        this.weatherIntensity = toIntensity;
        this.transition.active = false;
        this.updateParticleEmitters();
        this.emitWeatherChange(fromWeather, toWeather, toIntensity);
      }
    });
  }

  /**
   * Update visual effects during transition
   */
  private updateWeatherTransition(): void {
    if (!this.transition.active) return;

    const t = this.transition.progress;

    // Interpolate intensity
    this.weatherIntensity = Phaser.Math.Linear(
      this.transition.fromIntensity,
      this.transition.toIntensity,
      t
    );

    // Update particle alpha based on transition
    if (this.rainEmitter) {
      const isRainFrom = this.transition.fromWeather === 'rain' || this.transition.fromWeather === 'heavyRain';
      const isRainTo = this.transition.toWeather === 'rain' || this.transition.toWeather === 'heavyRain';

      if (isRainFrom && !isRainTo) {
        // Fading out rain
        this.rainEmitter.setParticleAlpha({ start: 0.6 * (1 - t), end: 0.2 * (1 - t) });
      } else if (!isRainFrom && isRainTo) {
        // Fading in rain
        this.rainEmitter.setParticleAlpha({ start: 0.6 * t, end: 0.2 * t });
      }
    }

    // Cross-fade weather overlays
    this.updateWeatherEffectsForTransition(t);
  }

  /**
   * Update visual overlays during transition
   */
  private updateWeatherEffectsForTransition(t: number): void {
    if (!this.weatherOverlay) return;

    this.weatherOverlay.clear();

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Get overlay configs for both states
    const fromOverlay = this.getOverlayConfig(this.transition.fromWeather, this.transition.fromIntensity);
    const toOverlay = this.getOverlayConfig(this.transition.toWeather, this.transition.toIntensity);

    // Blend the two overlays
    const blendedColor = this.lerpColor(fromOverlay.color, toOverlay.color, t);
    const blendedAlpha = Phaser.Math.Linear(fromOverlay.alpha, toOverlay.alpha, t);

    if (blendedAlpha > 0) {
      this.weatherOverlay.fillStyle(blendedColor, blendedAlpha);
      this.weatherOverlay.fillRect(0, 0, width, height);
    }
  }

  /**
   * Get overlay configuration for a weather state
   */
  private getOverlayConfig(weather: WeatherState, intensity: number): { color: number; alpha: number } {
    switch (weather) {
      case 'overcast':
        return { color: 0x8888aa, alpha: 0.08 };
      case 'rain':
        return { color: 0x667788, alpha: 0.1 };
      case 'heavyRain':
        return { color: 0x556677, alpha: 0.15 + intensity * 0.1 };
      case 'fog':
        return { color: 0xdddddd, alpha: 0.15 + intensity * 0.15 };
      case 'heatHaze':
        return { color: 0xffeecc, alpha: 0.05 };
      case 'clear':
      default:
        return { color: 0x000000, alpha: 0 };
    }
  }

  /**
   * Lerp between two colors
   */
  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(Phaser.Math.Linear(r1, r2, t));
    const g = Math.round(Phaser.Math.Linear(g1, g2, t));
    const b = Math.round(Phaser.Math.Linear(b1, b2, t));

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Prepare particle emitters for incoming weather
   */
  private prepareParticleEmittersForTransition(targetWeather: WeatherState): void {
    const config = this.weatherConfigs[targetWeather];

    // Start rain emitter with 0 alpha if transitioning to rain
    if (targetWeather === 'rain' || targetWeather === 'heavyRain') {
      if (this.rainEmitter === null) {
        this.createRainEffect(config.particleCount || 100);
      }
      // Set initial alpha to 0 for fade-in after creation
      if (this.rainEmitter !== null) {
        this.rainEmitter.setParticleAlpha({ start: 0, end: 0 });
      }
    }
  }

  /**
   * Emit weather change event
   */
  private emitWeatherChange(previous: WeatherState, current: WeatherState, intensity: number): void {
    this.scene.events.emit('weatherChange', {
      previous,
      current,
      intensity,
      season: this.currentSeason,
    });
  }

  private updateParticleEmitters(): void {
    const config = this.weatherConfigs[this.currentWeather];
    
    // Stop existing emitters
    if (this.rainEmitter) {
      this.rainEmitter.stop();
    }
    if (this.dustEmitter) {
      this.dustEmitter.stop();
    }

    // Create new emitters based on weather
    if (this.currentWeather === 'rain' || this.currentWeather === 'heavyRain') {
      this.createRainEffect(config.particleCount || 100);
    } else if (this.currentWeather === 'heatHaze') {
      this.createDustEffect(config.particleCount || 20);
    }
  }

  private createRainEffect(count: number): void {
    const width = this.scene.cameras.main.width;
    
    // Create particle emitter for rain
    const particles = this.scene.add.particles(0, -50, 'rain_drop', {
      x: { min: 0, max: width * 2 },
      y: -50,
      lifespan: 1000,
      speedY: { min: 300, max: 500 },
      speedX: { min: -50, max: -100 }, // Wind effect
      scale: { start: 1, end: 0.5 },
      quantity: Math.floor(count / 10),
      frequency: 50,
      alpha: { start: 0.6, end: 0.2 },
    });
    
    particles.setScrollFactor(0);
    particles.setDepth(8500);
    this.rainEmitter = particles;
  }

  private createDustEffect(_count: number): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    // Create floating dust motes for heat haze
    const particles = this.scene.add.particles(0, 0, 'dust_mote', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: 4000,
      speedY: { min: -10, max: 10 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.5, end: 1 },
      quantity: 1,
      frequency: 200,
      alpha: { start: 0, end: 0.4, ease: 'Sine.easeInOut' },
    });
    
    particles.setScrollFactor(0);
    particles.setDepth(8000);
    this.dustEmitter = particles;
  }

  private checkWeatherChange(): void {
    // Random chance to change weather each hour
    if (Math.random() < 0.1) {
      this.transitionToRandomWeather();
    }
  }

  private transitionToRandomWeather(): void {
    const seasonConfig = this.seasons.find(s => s.name === this.currentSeason);
    if (!seasonConfig) return;

    // Pick weather based on season probabilities
    const roll = Math.random();
    let cumulative = 0;
    
    for (const [weather, probability] of Object.entries(seasonConfig.weatherProbabilities)) {
      cumulative += probability;
      if (roll <= cumulative) {
        const duration = 2 + Math.random() * 6; // 2-8 hours
        const intensity = 0.3 + Math.random() * 0.7;
        this.setWeather(weather as WeatherState, intensity, duration);
        return;
      }
    }
    
    // Default to clear
    this.setWeather('clear', 0, 4);
  }

  private updateSeason(dayCount: number): void {
    // Simple month calculation (30 days per month for simplicity)
    const month = ((Math.floor(dayCount / 30) % 12) + 1);
    
    for (const season of this.seasons) {
      if (season.months.includes(month)) {
        if (this.currentSeason !== season.name) {
          const previousSeason = this.currentSeason;
          this.currentSeason = season.name;
          
          this.scene.events.emit('seasonChange', {
            previous: previousSeason,
            current: season.name,
            description: season.description,
            tradeModifier: season.tradeModifier,
          });
          
          console.log(`Season changed: ${previousSeason} -> ${season.name}`);
        }
        break;
      }
    }
  }

  // Public getters
  public getCurrentWeather(): WeatherState {
    return this.currentWeather;
  }

  public getWeatherIntensity(): number {
    return this.weatherIntensity;
  }

  public getCurrentSeason(): Season {
    return this.currentSeason;
  }

  public getSeasonConfig(): SeasonConfig | undefined {
    return this.seasons.find(s => s.name === this.currentSeason);
  }

  public getTradeModifier(): number {
    const config = this.getSeasonConfig();
    return config ? config.tradeModifier : 1.0;
  }

  public getVisibility(): number {
    return this.weatherConfigs[this.currentWeather].visibility || 1.0;
  }

  public isOutdoorMarketAffected(): boolean {
    // Heavy rain or fog closes outdoor markets
    return this.currentWeather === 'heavyRain' || 
           (this.currentWeather === 'rain' && this.weatherIntensity > 0.7);
  }

  public getWeatherDescription(): string {
    const descriptions: { [key in WeatherState]: string } = {
      clear: 'Clear skies',
      overcast: 'Cloudy skies',
      rain: 'Light rain',
      heavyRain: 'Heavy monsoon rain',
      heatHaze: 'Oppressive heat',
      fog: 'Morning mist',
    };
    return descriptions[this.currentWeather];
  }

  /**
   * Get current ground wetness (0-1)
   */
  public getGroundWetness(): number {
    return this.groundWetness;
  }

  /**
   * Check if currently transitioning between weather states
   */
  public isTransitioning(): boolean {
    return this.transition.active;
  }

  /**
   * Force instant weather change (for loading saves)
   */
  public setWeatherInstant(state: WeatherState, intensity: number = 0.5): void {
    this.setWeather(state, intensity, 4, true);
  }

  /**
   * Get save data
   */
  public getSaveData(): object {
    return {
      currentWeather: this.currentWeather,
      currentSeason: this.currentSeason,
      weatherIntensity: this.weatherIntensity,
      weatherDuration: this.weatherDuration,
      elapsedWeatherTime: this.elapsedWeatherTime,
      groundWetness: this.groundWetness,
      windData: this.windSystem?.getSaveData()
    };
  }

  /**
   * Load save data
   */
  public loadSaveData(data: {
    currentWeather: WeatherState;
    currentSeason: Season;
    weatherIntensity: number;
    weatherDuration: number;
    elapsedWeatherTime: number;
    groundWetness: number;
    windData?: object;
  }): void {
    this.currentSeason = data.currentSeason;
    this.weatherDuration = data.weatherDuration;
    this.elapsedWeatherTime = data.elapsedWeatherTime;
    this.groundWetness = data.groundWetness;

    // Set weather instantly (no transition when loading)
    this.setWeatherInstant(data.currentWeather, data.weatherIntensity);

    // Load wind data if present
    if (data.windData && this.windSystem) {
      this.windSystem.loadSaveData(data.windData as { currentSeason: WindSeason; currentWind: { direction: number; speed: number; gustiness: number }; noiseTime: number });
    }
  }

  // Cleanup
  public destroy(): void {
    // Remove event listeners
    this.scene.events.off('hourChange');
    this.scene.events.off('newDay');
    this.scene.events.off('periodChange');

    if (this.transitionTween) {
      this.transitionTween.stop();
    }
    if (this.windSystem) {
      this.windSystem.destroy();
    }
    if (this.rainEmitter) {
      this.rainEmitter.destroy();
    }
    if (this.dustEmitter) {
      this.dustEmitter.destroy();
    }
    if (this.weatherOverlay) {
      this.weatherOverlay.destroy();
    }
    if (this.lightningOverlay) {
      this.lightningOverlay.destroy();
    }
    if (this.fogOverlay) {
      this.fogOverlay.destroy();
    }
    if (this.heatHazeEffect) {
      this.heatHazeEffect.destroy();
    }
  }
}
