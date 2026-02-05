import Phaser from 'phaser';
import { LightingSystem } from './LightingSystem';

/**
 * AtmosphereSystem - Manages dynamic lighting, shadows, and visual atmosphere
 *
 * Creates the mood and feel of 16th century Goa through:
 * - Time-of-day lighting transitions with per-minute interpolation
 * - Enhanced golden hour effects
 * - Location-specific atmospheres
 * - Shadow casting based on sun position
 * - Interior/exterior lighting differences
 * - Integration with point light system
 */

export interface LightingConfig {
  ambientColor: number;
  ambientAlpha: number;
  shadowColor: number;
  shadowAlpha: number;
  shadowAngle: number; // Degrees, 0 = east, 90 = south
  shadowLength: number; // Multiplier
  sunIntensity: number; // 0-1
}

interface LocationAtmosphere {
  id: string;
  ambientTint: number;
  particleType?: 'dust' | 'incense' | 'smoke' | 'seaSpray';
  interiorDarkness: number; // How much darker interiors are
  description: string;
}

export class AtmosphereSystem {
  private scene: Phaser.Scene;

  // Lighting layers
  private ambientOverlay: Phaser.GameObjects.Graphics | null = null;
  private shadowLayer: Phaser.GameObjects.Graphics | null = null;
  private vignetteOverlay: Phaser.GameObjects.Graphics | null = null;

  // Point light system integration
  private lightingSystem: LightingSystem | null = null;

  // Particle emitters
  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private smokeEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private particleContainer: Phaser.GameObjects.Container | null = null;

  // Current state
  private currentHour = 7;
  private currentMinute = 0;
  private currentLighting: LightingConfig;
  private currentLocation = 'ribeira_grande';
  private isInterior = false;
  private currentParticleType: 'dust' | 'incense' | 'smoke' | 'seaSpray' | undefined;

  // Smooth transition tracking
  private isTransitioning = false;
  
  // Time-based lighting configurations
  // Enhanced Goa mood: Bright tropical days with dramatic Ultima 8 style shadows
  // Golden hours (6-7 and 17-18) feature dramatically warm amber tones and extended shadows
  private readonly lightingByHour: { [hour: number]: LightingConfig } = {
    0: { ambientColor: 0x0a1428, ambientAlpha: 0.5, shadowColor: 0x000022, shadowAlpha: 0.5, shadowAngle: 0, shadowLength: 0, sunIntensity: 0 },
    1: { ambientColor: 0x0a1428, ambientAlpha: 0.5, shadowColor: 0x000022, shadowAlpha: 0.5, shadowAngle: 0, shadowLength: 0, sunIntensity: 0 },
    2: { ambientColor: 0x0a1428, ambientAlpha: 0.5, shadowColor: 0x000022, shadowAlpha: 0.5, shadowAngle: 0, shadowLength: 0, sunIntensity: 0 },
    3: { ambientColor: 0x0a1428, ambientAlpha: 0.45, shadowColor: 0x000022, shadowAlpha: 0.4, shadowAngle: 0, shadowLength: 0, sunIntensity: 0 },
    4: { ambientColor: 0x1a2438, ambientAlpha: 0.4, shadowColor: 0x000022, shadowAlpha: 0.3, shadowAngle: 0, shadowLength: 0, sunIntensity: 0.1 },
    5: { ambientColor: 0x5a4860, ambientAlpha: 0.25, shadowColor: 0x2a1a30, shadowAlpha: 0.4, shadowAngle: 100, shadowLength: 3.5, sunIntensity: 0.3 }, // Pre-dawn
    // GOLDEN HOUR SUNRISE (6-7) - Dramatically warm amber, extended shadows
    6: { ambientColor: 0xffaa50, ambientAlpha: 0.18, shadowColor: 0x442210, shadowAlpha: 0.55, shadowAngle: 105, shadowLength: 3.5, sunIntensity: 0.45 }, // Sunrise golden hour start
    7: { ambientColor: 0xffc070, ambientAlpha: 0.12, shadowColor: 0x442a15, shadowAlpha: 0.5, shadowAngle: 115, shadowLength: 3.0, sunIntensity: 0.6 }, // Sunrise golden hour peak
    8: { ambientColor: 0xffeedd, ambientAlpha: 0.03, shadowColor: 0x443322, shadowAlpha: 0.4, shadowAngle: 135, shadowLength: 2, sunIntensity: 0.85 },
    9: { ambientColor: 0xffffff, ambientAlpha: 0, shadowColor: 0x443322, shadowAlpha: 0.35, shadowAngle: 150, shadowLength: 1.5, sunIntensity: 0.95 }, // Bright tropical
    10: { ambientColor: 0xffffff, ambientAlpha: 0, shadowColor: 0x443322, shadowAlpha: 0.3, shadowAngle: 165, shadowLength: 1.2, sunIntensity: 1 },
    11: { ambientColor: 0xffffff, ambientAlpha: 0, shadowColor: 0x443322, shadowAlpha: 0.25, shadowAngle: 180, shadowLength: 0.8, sunIntensity: 1 },
    12: { ambientColor: 0xffffee, ambientAlpha: 0.02, shadowColor: 0x443322, shadowAlpha: 0.2, shadowAngle: 180, shadowLength: 0.5, sunIntensity: 1 }, // Noon - harsh tropical sun
    13: { ambientColor: 0xffeecc, ambientAlpha: 0.03, shadowColor: 0x443322, shadowAlpha: 0.2, shadowAngle: 195, shadowLength: 0.7, sunIntensity: 1 }, // Hot afternoon
    14: { ambientColor: 0xffddaa, ambientAlpha: 0.04, shadowColor: 0x443322, shadowAlpha: 0.25, shadowAngle: 210, shadowLength: 1, sunIntensity: 0.95 },
    15: { ambientColor: 0xffddaa, ambientAlpha: 0.05, shadowColor: 0x443322, shadowAlpha: 0.3, shadowAngle: 225, shadowLength: 1.3, sunIntensity: 0.9 },
    16: { ambientColor: 0xffcc88, ambientAlpha: 0.06, shadowColor: 0x442a15, shadowAlpha: 0.35, shadowAngle: 240, shadowLength: 1.8, sunIntensity: 0.8 },
    // GOLDEN HOUR SUNSET (17-18) - Deep amber/orange, dramatically extended shadows
    17: { ambientColor: 0xffaa40, ambientAlpha: 0.15, shadowColor: 0x442210, shadowAlpha: 0.55, shadowAngle: 255, shadowLength: 3.0, sunIntensity: 0.55 }, // Sunset golden hour start
    18: { ambientColor: 0xff8820, ambientAlpha: 0.22, shadowColor: 0x331505, shadowAlpha: 0.6, shadowAngle: 265, shadowLength: 3.5, sunIntensity: 0.35 }, // Sunset golden hour peak
    19: { ambientColor: 0x6644aa, ambientAlpha: 0.25, shadowColor: 0x220a30, shadowAlpha: 0.45, shadowAngle: 270, shadowLength: 2.5, sunIntensity: 0.25 }, // Dusk
    20: { ambientColor: 0x2a2850, ambientAlpha: 0.35, shadowColor: 0x000022, shadowAlpha: 0.4, shadowAngle: 0, shadowLength: 0, sunIntensity: 0.1 }, // Night begins
    21: { ambientColor: 0x1a1840, ambientAlpha: 0.45, shadowColor: 0x000022, shadowAlpha: 0.45, shadowAngle: 0, shadowLength: 0, sunIntensity: 0 },
    22: { ambientColor: 0x0a1428, ambientAlpha: 0.5, shadowColor: 0x000022, shadowAlpha: 0.5, shadowAngle: 0, shadowLength: 0, sunIntensity: 0 },
    23: { ambientColor: 0x0a1428, ambientAlpha: 0.5, shadowColor: 0x000022, shadowAlpha: 0.5, shadowAngle: 0, shadowLength: 0, sunIntensity: 0 },
  };

  // Location-specific atmosphere settings
  // Balanced Goa mood: Warm tropical tints with vibrant colors
  private readonly locationAtmospheres: LocationAtmosphere[] = [
    { id: 'ribeira_grande', ambientTint: 0xfff5e6, particleType: 'dust', interiorDarkness: 0.25, description: 'Bustling waterfront market' },
    { id: 'se_cathedral', ambientTint: 0xf5f5ff, particleType: 'incense', interiorDarkness: 0.4, description: 'Solemn cathedral under construction' },
    { id: 'alfandega', ambientTint: 0xfff8f0, particleType: undefined, interiorDarkness: 0.35, description: 'Official customs house' },
    { id: 'tavern', ambientTint: 0xffe0a0, particleType: 'smoke', interiorDarkness: 0.4, description: 'Warm candlelit tavern' },
    { id: 'old_quarter', ambientTint: 0xfff0dd, particleType: 'smoke', interiorDarkness: 0.3, description: 'Narrow residential streets' },
    { id: 'warehouse', ambientTint: 0xf0e8d8, particleType: 'dust', interiorDarkness: 0.45, description: 'Dusty storage buildings' },
    { id: 'docks', ambientTint: 0xf0f8ff, particleType: 'seaSpray', interiorDarkness: 0.2, description: 'Salt air and creaking wood' },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.currentLighting = this.lightingByHour[7]; // Default to 7 AM

    this.createParticleTextures();
    this.createLightingLayers();
    this.createParticleEmitters();
    this.setupEventListeners();
    this.applyLighting();

    // Initialize point light system
    this.lightingSystem = new LightingSystem(scene);
  }

  /**
   * Get the LightingSystem for adding point lights
   */
  public getLightingSystem(): LightingSystem | null {
    return this.lightingSystem;
  }

  private createParticleTextures(): void {
    // Create dust mote texture
    if (!this.scene.textures.exists('dust_particle')) {
      const dustGraphics = this.scene.make.graphics({ x: 0, y: 0 });
      dustGraphics.fillStyle(0xd4a574, 0.6);
      dustGraphics.fillCircle(2, 2, 2);
      dustGraphics.fillStyle(0xffffff, 0.3);
      dustGraphics.fillCircle(1, 1, 1);
      dustGraphics.generateTexture('dust_particle', 4, 4);
      dustGraphics.destroy();
    }

    // Create smoke particle texture
    if (!this.scene.textures.exists('smoke_particle')) {
      const smokeGraphics = this.scene.make.graphics({ x: 0, y: 0 });
      smokeGraphics.fillStyle(0x888888, 0.4);
      smokeGraphics.fillCircle(4, 4, 4);
      smokeGraphics.fillStyle(0xaaaaaa, 0.2);
      smokeGraphics.fillCircle(3, 3, 2);
      smokeGraphics.generateTexture('smoke_particle', 8, 8);
      smokeGraphics.destroy();
    }
  }

  private createParticleEmitters(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Create dust emitter (floating motes)
    this.dustEmitter = this.scene.add.particles(0, 0, 'dust_particle', {
      x: { min: -width / 2, max: width * 1.5 },
      y: { min: -50, max: height + 50 },
      lifespan: { min: 4000, max: 8000 },
      speed: { min: 5, max: 20 },
      angle: { min: -30, max: 30 },
      scale: { start: 0.5, end: 1 },
      alpha: { start: 0.6, end: 0 },
      frequency: 200,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.dustEmitter.setScrollFactor(0.5); // Parallax effect
    this.dustEmitter.setDepth(9000);
    this.dustEmitter.stop(); // Start inactive

    // Create smoke emitter (rising wisps)
    this.smokeEmitter = this.scene.add.particles(0, 0, 'smoke_particle', {
      x: { min: 100, max: width - 100 },
      y: height + 20,
      lifespan: { min: 5000, max: 10000 },
      speed: { min: 15, max: 30 },
      angle: { min: -100, max: -80 },
      scale: { start: 0.3, end: 1.2 },
      alpha: { start: 0.4, end: 0 },
      frequency: 500,
      quantity: 1,
      blendMode: Phaser.BlendModes.NORMAL,
    });
    this.smokeEmitter.setScrollFactor(0.3);
    this.smokeEmitter.setDepth(8900);
    this.smokeEmitter.stop();
  }

  private createLightingLayers(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Ambient light overlay
    this.ambientOverlay = this.scene.add.graphics();
    this.ambientOverlay.setScrollFactor(0);
    this.ambientOverlay.setDepth(9500);
    this.ambientOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Vignette for depth
    this.vignetteOverlay = this.scene.add.graphics();
    this.vignetteOverlay.setScrollFactor(0);
    this.vignetteOverlay.setDepth(9600);
    this.createVignette(width, height);

    // Shadow layer (for dynamic shadows - follows camera)
    this.shadowLayer = this.scene.add.graphics();
    this.shadowLayer.setDepth(45); // Below sprites
    this.shadowLayer.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  /**
   * Render dynamic shadows for entities (player and NPCs)
   * Called from update with entity positions
   */
  public renderEntityShadows(entities: Array<{ x: number; y: number; width?: number; height?: number }>): void {
    if (!this.shadowLayer) return;
    
    this.shadowLayer.clear();
    
    // No shadows at night
    if (this.currentLighting.sunIntensity <= 0) return;
    
    const shadowAngleRad = (this.currentLighting.shadowAngle * Math.PI) / 180;
    const shadowLength = this.currentLighting.shadowLength * 12; // Base shadow length in pixels
    const shadowAlpha = this.currentLighting.shadowAlpha * 0.5; // Reduce intensity
    
    for (const entity of entities) {
      // Calculate shadow offset based on angle
      const shadowOffsetX = Math.cos(shadowAngleRad) * shadowLength;
      const shadowOffsetY = Math.sin(shadowAngleRad) * shadowLength * 0.5; // Flatten for isometric
      
      const entityWidth = entity.width || 12;
      const entityHeight = entity.height || 8;
      
      // Draw elliptical shadow
      this.shadowLayer.fillStyle(this.currentLighting.shadowColor, shadowAlpha);
      this.shadowLayer.fillEllipse(
        entity.x + shadowOffsetX,
        entity.y + 20 + shadowOffsetY, // Offset to feet position
        entityWidth * (1 + this.currentLighting.shadowLength * 0.3),
        entityHeight
      );
    }
  }

  private createVignette(width: number, height: number): void {
    if (!this.vignetteOverlay) return;

    this.vignetteOverlay.clear();
    
    // Subtle vignette - only at the very edges
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    
    // Draw only 5 rings with very subtle opacity at edges only
    for (let i = 0; i < 5; i++) {
      const radius = maxRadius * (1 - i / 5) * 0.3; // Only affect outer 30%
      const alpha = (i / 5) * 0.08; // Max 8% darkness at very edges
      
      this.vignetteOverlay.fillStyle(0x000000, alpha);
      this.vignetteOverlay.fillCircle(centerX, centerY, radius);
    }
  }

  private setupEventListeners(): void {
    // Listen for time changes (hour)
    this.scene.events.on('hourChange', (data: { hour: number }) => {
      this.updateLightingForHour(data.hour);
    });

    // Listen for time changes (minute) - for smooth per-minute interpolation
    this.scene.events.on('minuteChange', (data: { hour: number; minute: number }) => {
      this.updateLightingSmooth(data.hour, data.minute);
    });

    // Listen for location changes
    this.scene.events.on('locationChange', (data: { locationId: string, isInterior: boolean }) => {
      this.setLocation(data.locationId, data.isInterior);
    });

    // Listen for weather changes to adjust lighting
    this.scene.events.on('weatherChange', (data: { current: string, intensity: number }) => {
      this.adjustForWeather(data.current, data.intensity);
    });
  }

  private updateLightingForHour(hour: number): void {
    this.currentHour = hour;

    // Update point light system
    if (this.lightingSystem) {
      this.lightingSystem.setCurrentHour(hour);
    }

    // Get lighting config for current hour
    const config = this.lightingByHour[hour] || this.lightingByHour[12];

    // Smooth transition to new lighting
    this.transitionToLighting(config);
  }

  /**
   * Per-minute smooth lighting interpolation
   * Provides seamless transitions between hours without visible jumps
   */
  public updateLightingSmooth(hour: number, minute: number): void {
    this.currentHour = hour;
    this.currentMinute = minute;

    // Update point light system
    if (this.lightingSystem) {
      this.lightingSystem.setCurrentHour(hour);
    }

    // Don't interpolate if we're in a transition
    if (this.isTransitioning) return;

    // Get current and next hour configs
    const currentConfig = this.lightingByHour[hour] || this.lightingByHour[12];
    const nextHour = (hour + 1) % 24;
    const nextConfig = this.lightingByHour[nextHour] || this.lightingByHour[12];

    // Calculate interpolation factor (0 at minute 0, 1 at minute 59)
    const t = minute / 60;

    // Interpolate between current and next hour
    this.currentLighting = this.interpolateConfigs(currentConfig, nextConfig, t);

    // Apply the interpolated lighting immediately (no tween, since this is continuous)
    this.applyLighting();

    // Emit event for other systems that might want to react
    this.scene.events.emit('lightingUpdate', {
      hour,
      minute,
      lighting: this.currentLighting,
      isGoldenHour: this.isGoldenHour()
    });
  }

  /**
   * Interpolate between two lighting configurations
   */
  private interpolateConfigs(config1: LightingConfig, config2: LightingConfig, t: number): LightingConfig {
    return {
      ambientColor: this.lerpColor(config1.ambientColor, config2.ambientColor, t),
      ambientAlpha: Phaser.Math.Linear(config1.ambientAlpha, config2.ambientAlpha, t),
      shadowColor: this.lerpColor(config1.shadowColor, config2.shadowColor, t),
      shadowAlpha: Phaser.Math.Linear(config1.shadowAlpha, config2.shadowAlpha, t),
      shadowAngle: this.lerpAngle(config1.shadowAngle, config2.shadowAngle, t),
      shadowLength: Phaser.Math.Linear(config1.shadowLength, config2.shadowLength, t),
      sunIntensity: Phaser.Math.Linear(config1.sunIntensity, config2.sunIntensity, t),
    };
  }

  /**
   * Interpolate angles correctly handling the 0/360 wrap
   */
  private lerpAngle(angle1: number, angle2: number, t: number): number {
    // Handle the case where one angle is 0 (night) and the other is non-zero
    if (angle1 === 0 && angle2 !== 0) {
      // Transitioning from night to day - use the destination angle
      return angle2;
    }
    if (angle1 !== 0 && angle2 === 0) {
      // Transitioning from day to night - keep source angle until we reach night
      return t < 0.8 ? angle1 : 0;
    }

    // Normal interpolation
    let diff = angle2 - angle1;

    // Handle wrap-around (e.g., from 350 to 10)
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    return angle1 + diff * t;
  }

  /**
   * Set time directly with smooth interpolation
   * Use this when loading saves or jumping time
   */
  public setTime(hour: number, minute: number = 0): void {
    this.currentHour = hour;
    this.currentMinute = minute;

    // Update point light system
    if (this.lightingSystem) {
      this.lightingSystem.setCurrentHour(hour);
    }

    // Apply interpolated lighting
    this.updateLightingSmooth(hour, minute);
  }

  private transitionToLighting(targetConfig: LightingConfig): void {
    // Don't start a new transition if one is in progress
    if (this.isTransitioning) return;

    this.isTransitioning = true;

    // Create a smooth transition using tweens
    const startConfig = { ...this.currentLighting };
    const progress = { value: 0 };

    this.scene.tweens.add({
      targets: progress,
      value: 1,
      duration: 2000, // 2 second transition
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Interpolate all values
        this.currentLighting = this.interpolateConfigs(startConfig, targetConfig, progress.value);
        this.applyLighting();
      },
      onComplete: () => {
        this.isTransitioning = false;
      }
    });
  }

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

  private applyLighting(): void {
    if (!this.ambientOverlay) return;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.ambientOverlay.clear();

    // Apply subtle ambient color overlay - reduced opacity for clearer visuals
    if (this.currentLighting.ambientAlpha > 0) {
      // Reduce the alpha significantly to avoid muddy visuals
      const reducedAlpha = this.currentLighting.ambientAlpha * 0.3;
      this.ambientOverlay.fillStyle(
        this.currentLighting.ambientColor,
        reducedAlpha
      );
      this.ambientOverlay.fillRect(0, 0, width, height);
    }

    // Apply interior darkness if applicable (also reduced)
    if (this.isInterior) {
      const locationAtmosphere = this.locationAtmospheres.find(l => l.id === this.currentLocation);
      const darkness = (locationAtmosphere?.interiorDarkness || 0.3) * 0.5;
      
      this.ambientOverlay.fillStyle(0x000000, darkness);
      this.ambientOverlay.fillRect(0, 0, width, height);
    }
  }

  public setLocation(locationId: string, isInterior: boolean = false): void {
    this.currentLocation = locationId;
    this.isInterior = isInterior;
    
    // Apply location-specific atmosphere
    const atmosphere = this.locationAtmospheres.find(l => l.id === locationId);
    if (atmosphere) {
      this.scene.events.emit('atmosphereChange', {
        location: locationId,
        atmosphere: atmosphere,
      });
      
      // Update particle type
      this.setParticleType(atmosphere.particleType);
    }
    
    this.applyLighting();
  }

  private setParticleType(particleType: 'dust' | 'incense' | 'smoke' | 'seaSpray' | undefined): void {
    // Stop all emitters first
    if (this.dustEmitter) this.dustEmitter.stop();
    if (this.smokeEmitter) this.smokeEmitter.stop();
    
    this.currentParticleType = particleType;
    
    // Start the appropriate emitter
    if (particleType === 'dust' || particleType === 'seaSpray') {
      if (this.dustEmitter) {
        // Adjust color for sea spray
        if (particleType === 'seaSpray') {
          this.dustEmitter.setParticleTint(0xddeeff);
        } else {
          this.dustEmitter.setParticleTint(0xd4a574);
        }
        this.dustEmitter.start();
      }
    } else if (particleType === 'smoke' || particleType === 'incense') {
      if (this.smokeEmitter) {
        // Adjust color for incense
        if (particleType === 'incense') {
          this.smokeEmitter.setParticleTint(0xccccff);
        } else {
          this.smokeEmitter.setParticleTint(0x888888);
        }
        this.smokeEmitter.start();
      }
    }
  }

  private adjustForWeather(weather: string, intensity: number): void {
    // Darken for overcast/rain
    if (weather === 'overcast' || weather === 'rain' || weather === 'heavyRain') {
      const darkenAmount = 0.1 + intensity * 0.2;
      
      if (this.ambientOverlay) {
        this.ambientOverlay.fillStyle(0x445566, darkenAmount);
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        this.ambientOverlay.fillRect(0, 0, width, height);
      }
    }
  }

  public update(delta: number): void {
    // Update point light system for flicker effects
    if (this.lightingSystem) {
      this.lightingSystem.update(delta);
    }

    // Adjust particle intensity based on time of day and sun
    if (this.dustEmitter && this.currentParticleType === 'dust') {
      // Dust is more visible in sunlight
      const sunIntensity = this.currentLighting.sunIntensity;
      if (sunIntensity > 0.5) {
        this.dustEmitter.setFrequency(150);
        this.dustEmitter.setParticleAlpha({ start: 0.6 * sunIntensity, end: 0 });
      } else if (sunIntensity > 0) {
        this.dustEmitter.setFrequency(400);
        this.dustEmitter.setParticleAlpha({ start: 0.3, end: 0 });
      } else {
        // Night - minimal dust visibility
        this.dustEmitter.setFrequency(1000);
        this.dustEmitter.setParticleAlpha({ start: 0.1, end: 0 });
      }
    }

    // Smoke rises more slowly at night (cooler air)
    if (this.smokeEmitter && (this.currentParticleType === 'smoke' || this.currentParticleType === 'incense')) {
      if (this.isNightTime()) {
        this.smokeEmitter.setParticleSpeed(15); // Slower at night
      } else {
        this.smokeEmitter.setParticleSpeed(22); // Normal speed
      }
    }
  }

  /**
   * Get the current sky color for water reflections and other effects
   * Returns a color blended between ambient and a base sky blue
   */
  public getCurrentSkyColor(): number {
    // Base sky colors for different times
    const daySky = 0x87CEEB;  // Light sky blue
    const sunsetSky = 0xFF7744; // Orange sunset
    const nightSky = 0x1a1a40;  // Deep night blue

    const hour = this.currentHour;

    if (hour >= 6 && hour < 8) {
      // Sunrise - blend from night to day with orange
      const t = (hour - 6 + this.currentMinute / 60) / 2;
      const orangeBlend = this.lerpColor(nightSky, sunsetSky, Math.min(t * 2, 1));
      return this.lerpColor(orangeBlend, daySky, Math.max(0, (t - 0.5) * 2));
    } else if (hour >= 8 && hour < 17) {
      // Day
      return daySky;
    } else if (hour >= 17 && hour < 20) {
      // Sunset - blend from day through orange to night
      const t = (hour - 17 + this.currentMinute / 60) / 3;
      if (t < 0.5) {
        return this.lerpColor(daySky, sunsetSky, t * 2);
      } else {
        return this.lerpColor(sunsetSky, nightSky, (t - 0.5) * 2);
      }
    } else {
      // Night
      return nightSky;
    }
  }

  /**
   * Get current hour (for external systems)
   */
  public getCurrentHour(): number {
    return this.currentHour;
  }

  /**
   * Get current minute (for external systems)
   */
  public getCurrentMinute(): number {
    return this.currentMinute;
  }

  // Get current lighting state for other systems
  public getCurrentLighting(): LightingConfig {
    return this.currentLighting;
  }

  public getSunIntensity(): number {
    return this.currentLighting.sunIntensity;
  }

  public getShadowAngle(): number {
    return this.currentLighting.shadowAngle;
  }

  public getLocationAtmosphere(): LocationAtmosphere | undefined {
    return this.locationAtmospheres.find(l => l.id === this.currentLocation);
  }

  public isNightTime(): boolean {
    return this.currentHour >= 20 || this.currentHour < 6;
  }

  public isDaytime(): boolean {
    return this.currentHour >= 6 && this.currentHour < 20;
  }

  public isGoldenHour(): boolean {
    return (this.currentHour >= 6 && this.currentHour < 8) ||
           (this.currentHour >= 17 && this.currentHour < 19);
  }

  // Cleanup
  public destroy(): void {
    if (this.lightingSystem) {
      this.lightingSystem.destroy();
    }
    if (this.ambientOverlay) {
      this.ambientOverlay.destroy();
    }
    if (this.shadowLayer) {
      this.shadowLayer.destroy();
    }
    if (this.vignetteOverlay) {
      this.vignetteOverlay.destroy();
    }
    if (this.dustEmitter) {
      this.dustEmitter.destroy();
    }
    if (this.smokeEmitter) {
      this.smokeEmitter.destroy();
    }
    if (this.particleContainer) {
      this.particleContainer.destroy();
    }
  }

  /**
   * Add a torch light at the specified position
   */
  public addTorch(x: number, y: number, id?: string): string | null {
    return this.lightingSystem?.addTorch(x, y, id) || null;
  }

  /**
   * Add a lantern light at the specified position
   */
  public addLantern(x: number, y: number, id?: string): string | null {
    return this.lightingSystem?.addLantern(x, y, id) || null;
  }

  /**
   * Add a candle light at the specified position
   */
  public addCandle(x: number, y: number, id?: string): string | null {
    return this.lightingSystem?.addCandle(x, y, id) || null;
  }

  /**
   * Remove a point light
   */
  public removeLight(id: string): boolean {
    return this.lightingSystem?.removeLight(id) || false;
  }
}
