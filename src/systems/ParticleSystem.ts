import Phaser from 'phaser';

/**
 * ParticleSystem - Atmospheric particles for visual immersion
 *
 * Creates ambient particle effects based on time of day:
 * - Daytime: Dust motes drifting slowly across the market
 * - Nighttime: Firefly-like oil lamp flickers
 *
 * Uses simple 1-2 pixel sprites with alpha fade animations
 * for minimal performance impact.
 */

interface DustParticle {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  alphaDir: number;
  size: number;
  lifetime: number;
  maxLifetime: number;
}

interface FireflyParticle {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  phase: number;
  pulseSpeed: number;
  wanderAngle: number;
  brightness: number;
  color: number;
}

export interface ParticleConfig {
  /** Enable dust particles */
  enableDust: boolean;
  /** Enable firefly/lamp particles */
  enableFireflies: boolean;
  /** Maximum dust particles */
  maxDustParticles: number;
  /** Maximum firefly particles */
  maxFireflyParticles: number;
  /** Dust particle spawn rate (per second) */
  dustSpawnRate: number;
  /** Base dust drift speed */
  dustSpeed: number;
  /** Wind influence on dust (0-1) */
  windInfluence: number;
}

const DEFAULT_CONFIG: ParticleConfig = {
  enableDust: true,
  enableFireflies: true,
  maxDustParticles: 30,
  maxFireflyParticles: 15,
  dustSpawnRate: 2,
  dustSpeed: 8,
  windInfluence: 0.5,
};

export class ParticleSystem {
  private scene: Phaser.Scene;
  private config: ParticleConfig;

  private dustParticles: DustParticle[] = [];
  private fireflyParticles: FireflyParticle[] = [];

  private dustContainer!: Phaser.GameObjects.Container;
  private fireflyContainer!: Phaser.GameObjects.Container;

  private spawnTimer: number = 0;
  private currentHour: number = 12;
  private windX: number = 0.3;
  private windY: number = 0.1;

  // Screen bounds
  private screenWidth: number;
  private screenHeight: number;

  constructor(scene: Phaser.Scene, config?: Partial<ParticleConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.screenWidth = scene.cameras.main.width;
    this.screenHeight = scene.cameras.main.height;

    this.createContainers();
    this.setupEventListeners();
  }

  private createContainers(): void {
    // Dust container - rendered above tiles, below UI
    this.dustContainer = this.scene.add.container(0, 0);
    this.dustContainer.setDepth(500);

    // Firefly container - rendered above most elements
    this.fireflyContainer = this.scene.add.container(0, 0);
    this.fireflyContainer.setDepth(800);
  }

  private setupEventListeners(): void {
    // Listen for time changes
    this.scene.events.on('hourChange', (data: { hour: number }) => {
      this.currentHour = data.hour;
      this.onTimeChange();
    });

    // Listen for wind changes
    this.scene.events.on('windUpdate', (data: { direction: number; speed: number }) => {
      // Convert wind direction to x/y components
      const radians = (data.direction * Math.PI) / 180;
      this.windX = Math.cos(radians) * data.speed * 0.1;
      this.windY = Math.sin(radians) * data.speed * 0.05;
    });
  }

  private onTimeChange(): void {
    const isDaytime = this.currentHour >= 6 && this.currentHour < 19;

    // Transition particles based on time
    if (isDaytime) {
      // Fade out fireflies during day
      this.fadeOutFireflies();
    } else {
      // Spawn fireflies at night if not enough
      if (this.fireflyParticles.length < this.config.maxFireflyParticles) {
        this.spawnFireflies();
      }
    }
  }

  /**
   * Spawn a dust particle
   */
  private spawnDustParticle(): void {
    if (this.dustParticles.length >= this.config.maxDustParticles) return;

    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Random size 1-2 pixels
    const size = Math.random() > 0.7 ? 2 : 1;

    // Dust colors - warm tan/brown tones
    const dustColors = [0xd4c4a8, 0xc8b898, 0xe0d0b8, 0xb8a888];
    const color = dustColors[Math.floor(Math.random() * dustColors.length)];

    graphics.fillStyle(color, 1);
    if (size === 1) {
      graphics.fillRect(0, 0, 1, 1);
    } else {
      graphics.fillRect(0, 0, 2, 1);
      graphics.fillRect(0, 1, 1, 1);
    }

    // Spawn from edges of screen, biased toward left (wind direction)
    const camera = this.scene.cameras.main;
    let x: number, y: number;

    if (Math.random() > 0.3) {
      // Spawn from left edge
      x = camera.scrollX - 20;
      y = camera.scrollY + Math.random() * this.screenHeight;
    } else {
      // Spawn from top
      x = camera.scrollX + Math.random() * this.screenWidth;
      y = camera.scrollY - 20;
    }

    const particle: DustParticle = {
      sprite: graphics,
      x,
      y,
      vx: this.config.dustSpeed + Math.random() * 5,
      vy: (Math.random() - 0.3) * 2,
      alpha: 0,
      alphaDir: 1,
      size,
      lifetime: 0,
      maxLifetime: 8000 + Math.random() * 4000,
    };

    graphics.setPosition(x, y);
    graphics.setAlpha(0);
    this.dustContainer.add(graphics);
    this.dustParticles.push(particle);
  }

  /**
   * Spawn firefly particles for nighttime
   */
  private spawnFireflies(): void {
    const camera = this.scene.cameras.main;
    const toSpawn = Math.min(
      5,
      this.config.maxFireflyParticles - this.fireflyParticles.length
    );

    for (let i = 0; i < toSpawn; i++) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });

      // Firefly/lamp colors - warm yellows and oranges
      const colors = [0xffdd66, 0xffcc44, 0xffaa33, 0xff9922];
      const color = colors[Math.floor(Math.random() * colors.length)];

      // Draw a soft glowing point
      graphics.fillStyle(color, 1);
      graphics.fillCircle(1, 1, 1);

      // Add a softer outer glow
      graphics.fillStyle(color, 0.3);
      graphics.fillCircle(1, 1, 2);

      const x = camera.scrollX + 100 + Math.random() * (this.screenWidth - 200);
      const y = camera.scrollY + 100 + Math.random() * (this.screenHeight - 250);

      const firefly: FireflyParticle = {
        sprite: graphics,
        x,
        y,
        baseX: x,
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 1.5,
        wanderAngle: Math.random() * Math.PI * 2,
        brightness: 0,
        color,
      };

      graphics.setPosition(x, y);
      graphics.setAlpha(0);
      this.fireflyContainer.add(graphics);
      this.fireflyParticles.push(firefly);
    }
  }

  /**
   * Fade out fireflies during daytime
   */
  private fadeOutFireflies(): void {
    // Fireflies will naturally fade out in update loop
  }

  /**
   * Update dust particles
   */
  private updateDust(delta: number): void {
    const camera = this.scene.cameras.main;
    const deltaSeconds = delta / 1000;

    // Spawn new particles
    this.spawnTimer += deltaSeconds;
    const spawnInterval = 1 / this.config.dustSpawnRate;

    while (this.spawnTimer >= spawnInterval) {
      this.spawnTimer -= spawnInterval;

      // Only spawn during visible daylight hours with less at dawn/dusk
      const isDaytime = this.currentHour >= 6 && this.currentHour < 19;
      const spawnChance = isDaytime ? 0.8 : 0.1;

      if (Math.random() < spawnChance) {
        this.spawnDustParticle();
      }
    }

    // Update existing particles
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];

      // Update lifetime
      p.lifetime += delta;

      // Calculate alpha based on lifetime (fade in, stay, fade out)
      const lifeRatio = p.lifetime / p.maxLifetime;
      if (lifeRatio < 0.1) {
        // Fade in
        p.alpha = lifeRatio / 0.1 * 0.4;
      } else if (lifeRatio > 0.8) {
        // Fade out
        p.alpha = (1 - (lifeRatio - 0.8) / 0.2) * 0.4;
      } else {
        // Slight alpha variation
        p.alpha = 0.3 + Math.sin(p.lifetime * 0.002) * 0.1;
      }

      // Apply wind influence
      const windFactor = this.config.windInfluence;
      p.vx += this.windX * windFactor * deltaSeconds * 10;
      p.vy += this.windY * windFactor * deltaSeconds * 10;

      // Add slight vertical drift (dust settling)
      p.vy += 0.5 * deltaSeconds;

      // Dampen velocity
      p.vx *= 0.99;
      p.vy *= 0.99;

      // Update position
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;

      // Update sprite
      p.sprite.setPosition(p.x, p.y);
      p.sprite.setAlpha(p.alpha);

      // Remove if off-screen or expired
      const offScreen =
        p.x > camera.scrollX + this.screenWidth + 50 ||
        p.x < camera.scrollX - 50 ||
        p.y > camera.scrollY + this.screenHeight + 50 ||
        p.y < camera.scrollY - 50;

      if (offScreen || p.lifetime > p.maxLifetime) {
        p.sprite.destroy();
        this.dustParticles.splice(i, 1);
      }
    }
  }

  /**
   * Update firefly particles
   */
  private updateFireflies(delta: number): void {
    const deltaSeconds = delta / 1000;
    const isNight = this.currentHour < 6 || this.currentHour >= 19;

    for (let i = this.fireflyParticles.length - 1; i >= 0; i--) {
      const f = this.fireflyParticles[i];

      // Update phase
      f.phase += f.pulseSpeed * deltaSeconds;

      // Pulse brightness
      const targetBrightness = isNight ?
        0.4 + Math.sin(f.phase) * 0.4 + Math.sin(f.phase * 2.7) * 0.2 :
        0; // Fade to 0 during day

      // Smooth brightness transition
      f.brightness += (targetBrightness - f.brightness) * deltaSeconds * 2;

      // Wander movement
      f.wanderAngle += (Math.random() - 0.5) * deltaSeconds * 2;
      const wanderRadius = 30;
      const targetX = f.baseX + Math.cos(f.wanderAngle) * wanderRadius * Math.sin(f.phase * 0.3);
      const targetY = f.baseY + Math.sin(f.wanderAngle) * wanderRadius * 0.5 * Math.cos(f.phase * 0.2);

      // Smooth position
      f.x += (targetX - f.x) * deltaSeconds * 0.5;
      f.y += (targetY - f.y) * deltaSeconds * 0.5;

      // Update sprite
      f.sprite.setPosition(f.x, f.y);
      f.sprite.setAlpha(Math.max(0, f.brightness));

      // Scale slightly with brightness for glow effect
      const scale = 0.8 + f.brightness * 0.4;
      f.sprite.setScale(scale);

      // Remove if fully faded during day
      if (!isNight && f.brightness < 0.01) {
        f.sprite.destroy();
        this.fireflyParticles.splice(i, 1);
      }
    }

    // Spawn new fireflies at night if needed
    if (isNight && this.fireflyParticles.length < this.config.maxFireflyParticles) {
      if (Math.random() < deltaSeconds * 0.5) {
        this.spawnFireflies();
      }
    }
  }

  /**
   * Main update loop - call from scene update
   */
  public update(delta: number): void {
    if (this.config.enableDust) {
      this.updateDust(delta);
    }

    if (this.config.enableFireflies) {
      this.updateFireflies(delta);
    }

    // Update container positions (containers don't follow camera, they use world coords)
    this.dustContainer.setPosition(0, 0);
    this.fireflyContainer.setPosition(0, 0);
  }

  /**
   * Set current hour (for external time system integration)
   */
  public setHour(hour: number): void {
    this.currentHour = hour;
    this.onTimeChange();
  }

  /**
   * Set wind parameters
   */
  public setWind(directionDegrees: number, speed: number): void {
    const radians = (directionDegrees * Math.PI) / 180;
    this.windX = Math.cos(radians) * speed * 0.1;
    this.windY = Math.sin(radians) * speed * 0.05;
  }

  /**
   * Set configuration
   */
  public setConfig(config: Partial<ParticleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clean up all particles
   */
  public destroy(): void {
    for (const p of this.dustParticles) {
      p.sprite.destroy();
    }
    for (const f of this.fireflyParticles) {
      f.sprite.destroy();
    }

    this.dustParticles = [];
    this.fireflyParticles = [];

    this.dustContainer.destroy();
    this.fireflyContainer.destroy();

    this.scene.events.off('hourChange');
    this.scene.events.off('windUpdate');
  }
}

/**
 * Factory function to create a ParticleSystem
 */
export function createParticleSystem(
  scene: Phaser.Scene,
  config?: Partial<ParticleConfig>
): ParticleSystem {
  return new ParticleSystem(scene, config);
}
