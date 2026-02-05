import Phaser from 'phaser';

/**
 * WeatherSystem - Manages weather conditions and seasonal effects in 16th century Goa
 * 
 * Historical context: Goa experiences distinct monsoon seasons (June-September)
 * which dramatically affected trade - ships could not safely navigate during
 * monsoon, making it a critical gameplay element.
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
    // Update weather duration
    this.elapsedWeatherTime += delta / 1000 / 60; // Convert to game minutes
    
    // Check if weather should change
    if (this.weatherDuration > 0 && this.elapsedWeatherTime >= this.weatherDuration * 60) {
      this.transitionToRandomWeather();
    }

    // Update visual effects
    this.updateWeatherEffects(delta);
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

  public setWeather(state: WeatherState, intensity: number = 0.5, durationHours: number = 4): void {
    const previousWeather = this.currentWeather;
    this.currentWeather = state;
    this.weatherIntensity = Math.max(0, Math.min(1, intensity));
    this.weatherDuration = durationHours;
    this.elapsedWeatherTime = 0;

    // Update particle effects
    this.updateParticleEmitters();

    // Emit weather change event
    this.scene.events.emit('weatherChange', {
      previous: previousWeather,
      current: state,
      intensity: this.weatherIntensity,
      season: this.currentSeason,
    });

    // Log for debugging
    console.log(`Weather changed: ${previousWeather} -> ${state} (intensity: ${intensity})`);
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

  // Cleanup
  public destroy(): void {
    if (this.rainEmitter) {
      this.rainEmitter.destroy();
    }
    if (this.dustEmitter) {
      this.dustEmitter.destroy();
    }
    if (this.weatherOverlay) {
      this.weatherOverlay.destroy();
    }
    if (this.fogOverlay) {
      this.fogOverlay.destroy();
    }
    if (this.heatHazeEffect) {
      this.heatHazeEffect.destroy();
    }
  }
}
