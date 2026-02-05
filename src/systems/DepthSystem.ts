import Phaser from 'phaser';

/**
 * DepthSystem - Manages depth of field simulation for visual hierarchy
 *
 * Phase 2: Creates a cinematic depth effect by applying subtle tinting
 * and saturation changes based on sprite depth. Objects further from
 * the camera appear slightly desaturated and blue-tinted, while near
 * objects remain vivid and sharp.
 *
 * Three depth planes:
 * - Near plane: Full color, sharp (depth 0-100)
 * - Mid plane: 95% saturation (depth 100-500)
 * - Far plane: 85% saturation, slight blue tint (depth 500+)
 */

export interface DepthConfig {
  /** Enable depth of field effects */
  enabled: boolean;
  /** Depth threshold for mid plane (default: 100) */
  midPlaneThreshold: number;
  /** Depth threshold for far plane (default: 500) */
  farPlaneThreshold: number;
  /** Saturation for mid plane (0-1, default: 0.95) */
  midPlaneSaturation: number;
  /** Saturation for far plane (0-1, default: 0.85) */
  farPlaneSaturation: number;
  /** Blue tint intensity for far plane (0-1, default: 0.1) */
  farPlaneBlueTint: number;
  /** Whether to apply atmospheric haze to far objects */
  useAtmosphericHaze: boolean;
}

/** Default depth configuration */
const DEFAULT_DEPTH_CONFIG: DepthConfig = {
  enabled: true,
  midPlaneThreshold: 100,
  farPlaneThreshold: 500,
  midPlaneSaturation: 0.95,
  farPlaneSaturation: 0.85,
  farPlaneBlueTint: 0.08,
  useAtmosphericHaze: true,
};

/** Depth plane enumeration */
export enum DepthPlane {
  NEAR = 'near',
  MID = 'mid',
  FAR = 'far',
}

/**
 * DepthSystem class for managing depth of field effects
 */
export class DepthSystem {
  private scene: Phaser.Scene;
  private config: DepthConfig;

  // Tracked sprites for depth tinting
  private trackedSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  // Cached tint values for performance
  private nearTint: number = 0xffffff;
  private midTint: number = 0xf8f8ff;
  private farTint: number = 0xe8f0ff;

  constructor(scene: Phaser.Scene, config?: Partial<DepthConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_DEPTH_CONFIG, ...config };

    this.calculateTintValues();
    this.setupEventListeners();
  }

  /**
   * Set depth configuration
   */
  public setConfig(config: Partial<DepthConfig>): void {
    this.config = { ...this.config, ...config };
    this.calculateTintValues();
    this.updateAllSprites();
  }

  /**
   * Enable or disable depth of field
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      // Reset all sprites to normal tint
      this.trackedSprites.forEach(sprite => {
        sprite.clearTint();
      });
    } else {
      this.updateAllSprites();
    }
  }

  /**
   * Calculate tint values based on configuration
   */
  private calculateTintValues(): void {
    // Near plane: Full color (white tint = no change)
    this.nearTint = 0xffffff;

    // Mid plane: Slight desaturation
    const midSat = this.config.midPlaneSaturation;
    const midGray = Math.round(255 * (1 - midSat));
    this.midTint = this.blendTowardGray(0xffffff, midGray);

    // Far plane: Desaturation + blue tint
    const farSat = this.config.farPlaneSaturation;
    const farGray = Math.round(255 * (1 - farSat));
    const baseFar = this.blendTowardGray(0xffffff, farGray);

    // Add blue tint for atmospheric perspective
    if (this.config.useAtmosphericHaze) {
      const blueTint = this.config.farPlaneBlueTint;
      this.farTint = this.blendWithBlue(baseFar, blueTint);
    } else {
      this.farTint = baseFar;
    }
  }

  /**
   * Blend a color toward gray (desaturate)
   */
  private blendTowardGray(color: number, grayAmount: number): number {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const gray = Math.round((r + g + b) / 3);
    const blendedR = Math.round(r + (gray - r) * (grayAmount / 255));
    const blendedG = Math.round(g + (gray - g) * (grayAmount / 255));
    const blendedB = Math.round(b + (gray - b) * (grayAmount / 255));

    return (blendedR << 16) | (blendedG << 8) | blendedB;
  }

  /**
   * Add blue tint for atmospheric perspective
   */
  private blendWithBlue(color: number, intensity: number): number {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    // Blue atmospheric haze: reduce red/green, keep blue
    const blueColor = 0xe8f4ff; // Light atmospheric blue
    const blueR = (blueColor >> 16) & 0xff;
    const blueG = (blueColor >> 8) & 0xff;
    const blueB = blueColor & 0xff;

    const blendedR = Math.round(r * (1 - intensity) + blueR * intensity);
    const blendedG = Math.round(g * (1 - intensity) + blueG * intensity);
    const blendedB = Math.round(b * (1 - intensity) + blueB * intensity);

    return (blendedR << 16) | (blendedG << 8) | blendedB;
  }

  /**
   * Register a sprite for depth-based tinting
   * @param id Unique identifier for the sprite
   * @param sprite The Phaser sprite to track
   */
  public trackSprite(id: string, sprite: Phaser.GameObjects.Sprite): void {
    this.trackedSprites.set(id, sprite);
    this.updateSpriteDepthTint(sprite);
  }

  /**
   * Unregister a sprite from depth tracking
   */
  public untrackSprite(id: string): void {
    const sprite = this.trackedSprites.get(id);
    if (sprite) {
      sprite.clearTint();
      this.trackedSprites.delete(id);
    }
  }

  /**
   * Determine which depth plane a sprite is on
   */
  public getDepthPlane(depth: number): DepthPlane {
    if (depth < this.config.midPlaneThreshold) {
      return DepthPlane.NEAR;
    } else if (depth < this.config.farPlaneThreshold) {
      return DepthPlane.MID;
    } else {
      return DepthPlane.FAR;
    }
  }

  /**
   * Get the tint color for a specific depth value
   * Provides smooth interpolation between planes
   */
  public getTintForDepth(depth: number): number {
    if (!this.config.enabled) return 0xffffff;

    const plane = this.getDepthPlane(depth);

    if (plane === DepthPlane.NEAR) {
      return this.nearTint;
    } else if (plane === DepthPlane.MID) {
      // Interpolate between near and mid
      const t = (depth - this.config.midPlaneThreshold) /
                (this.config.farPlaneThreshold - this.config.midPlaneThreshold);
      return this.lerpColor(this.nearTint, this.midTint, Math.min(1, Math.max(0, t)));
    } else {
      // Interpolate toward far (with a max so it doesn't get too extreme)
      const farRange = this.config.farPlaneThreshold * 2;
      const t = Math.min(1, (depth - this.config.farPlaneThreshold) / farRange);
      return this.lerpColor(this.midTint, this.farTint, t);
    }
  }

  /**
   * Apply depth tinting to a sprite based on its current depth
   */
  public applyDepthTinting(sprite: Phaser.GameObjects.Sprite, depth?: number): void {
    if (!this.config.enabled) {
      sprite.clearTint();
      return;
    }

    const spriteDepth = depth ?? sprite.depth;
    const tint = this.getTintForDepth(spriteDepth);

    sprite.setTint(tint);
  }

  /**
   * Update depth tinting for a single sprite
   */
  private updateSpriteDepthTint(sprite: Phaser.GameObjects.Sprite): void {
    this.applyDepthTinting(sprite, sprite.depth);
  }

  /**
   * Update all tracked sprites
   */
  private updateAllSprites(): void {
    this.trackedSprites.forEach(sprite => {
      this.updateSpriteDepthTint(sprite);
    });
  }

  /**
   * Linear interpolation between two colors
   */
  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for depth changes to update tinting
    this.scene.events.on('depthUpdate', (data: { id: string; depth: number }) => {
      const sprite = this.trackedSprites.get(data.id);
      if (sprite) {
        sprite.setDepth(data.depth);
        this.updateSpriteDepthTint(sprite);
      }
    });

    // Listen for color grade changes from AtmosphereSystem
    // to adjust depth tinting based on location
    this.scene.events.on('colorGradeChange', (_data: { location: string }) => {
      // Could adjust depth colors based on location atmosphere
      // For now, just update all sprites in case base colors changed
      this.updateAllSprites();
    });
  }

  /**
   * Update method called each frame
   * Updates depth tinting for all tracked sprites based on their current depth
   */
  public update(_delta: number): void {
    if (!this.config.enabled) return;

    // Update all tracked sprites (they may have moved or changed depth)
    this.trackedSprites.forEach(sprite => {
      if (sprite.active) {
        this.updateSpriteDepthTint(sprite);
      }
    });
  }

  /**
   * Get current configuration
   */
  public getConfig(): DepthConfig {
    return { ...this.config };
  }

  /**
   * Get tint values for debugging/visualization
   */
  public getTintValues(): { near: number; mid: number; far: number } {
    return {
      near: this.nearTint,
      mid: this.midTint,
      far: this.farTint,
    };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.trackedSprites.clear();
    this.scene.events.off('depthUpdate');
    this.scene.events.off('colorGradeChange');
  }
}

/**
 * Factory function to create a DepthSystem
 */
export function createDepthSystem(scene: Phaser.Scene, config?: Partial<DepthConfig>): DepthSystem {
  return new DepthSystem(scene, config);
}
