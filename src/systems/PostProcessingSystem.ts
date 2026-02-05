import Phaser from 'phaser';

/**
 * PostProcessingSystem - Retro visual effects overlay
 *
 * Adds atmospheric post-processing effects:
 * - Subtle scanlines (CRT/retro feel)
 * - Vignette darkening at corners
 *
 * Uses Graphics objects rendered at UI depth to overlay
 * all game content.
 */

export interface PostProcessConfig {
  /** Enable scanline effect */
  enableScanlines: boolean;
  /** Scanline opacity (0-1, recommended: 0.03) */
  scanlineOpacity: number;
  /** Scanline spacing in pixels */
  scanlineSpacing: number;
  /** Enable vignette effect */
  enableVignette: boolean;
  /** Vignette intensity (0-1, recommended: 0.15) */
  vignetteIntensity: number;
  /** Vignette radius (0-1, portion of screen) */
  vignetteRadius: number;
}

const DEFAULT_CONFIG: PostProcessConfig = {
  enableScanlines: true,
  scanlineOpacity: 0.03,
  scanlineSpacing: 2,
  enableVignette: true,
  vignetteIntensity: 0.15,
  vignetteRadius: 0.7,
};

export class PostProcessingSystem {
  private scene: Phaser.Scene;
  private config: PostProcessConfig;

  private scanlineOverlay!: Phaser.GameObjects.Graphics;
  private vignetteOverlay!: Phaser.GameObjects.RenderTexture;

  private screenWidth: number;
  private screenHeight: number;

  constructor(scene: Phaser.Scene, config?: Partial<PostProcessConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.screenWidth = scene.cameras.main.width;
    this.screenHeight = scene.cameras.main.height;

    this.createOverlays();
  }

  private createOverlays(): void {
    // Create scanline overlay
    if (this.config.enableScanlines) {
      this.createScanlines();
    }

    // Create vignette overlay
    if (this.config.enableVignette) {
      this.createVignette();
    }
  }

  /**
   * Create scanline effect - horizontal dark lines every N pixels
   */
  private createScanlines(): void {
    this.scanlineOverlay = this.scene.add.graphics();
    this.scanlineOverlay.setScrollFactor(0); // Fixed to camera
    this.scanlineOverlay.setDepth(9998); // Just below UI

    this.drawScanlines();
  }

  private drawScanlines(): void {
    this.scanlineOverlay.clear();

    const { scanlineOpacity, scanlineSpacing } = this.config;

    // Draw horizontal lines every N pixels
    this.scanlineOverlay.lineStyle(1, 0x000000, scanlineOpacity);

    for (let y = 0; y < this.screenHeight; y += scanlineSpacing) {
      this.scanlineOverlay.lineBetween(0, y, this.screenWidth, y);
    }
  }

  /**
   * Create vignette effect - radial gradient darkening at edges
   */
  private createVignette(): void {
    // Create a render texture for the vignette
    this.vignetteOverlay = this.scene.add.renderTexture(
      this.screenWidth / 2,
      this.screenHeight / 2,
      this.screenWidth,
      this.screenHeight
    );
    this.vignetteOverlay.setOrigin(0.5, 0.5);
    this.vignetteOverlay.setScrollFactor(0);
    this.vignetteOverlay.setDepth(9997);

    this.drawVignette();
  }

  private drawVignette(): void {
    const { vignetteIntensity, vignetteRadius } = this.config;

    // Clear the render texture first
    this.vignetteOverlay.clear();

    // Create temporary graphics for drawing the vignette
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Draw corner shadows only (not full radial gradient)
    // This is simpler and less likely to over-darken
    const cornerSize = Math.min(this.screenWidth, this.screenHeight) * (1 - vignetteRadius);

    // Draw gradient rectangles at corners
    const steps = 15;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const alpha = t * t * vignetteIntensity; // Ease-in
      const size = cornerSize * (1 - t);

      graphics.fillStyle(0x000000, alpha);

      // Top-left corner
      graphics.fillTriangle(0, 0, size, 0, 0, size);
      // Top-right corner
      graphics.fillTriangle(this.screenWidth, 0, this.screenWidth - size, 0, this.screenWidth, size);
      // Bottom-left corner
      graphics.fillTriangle(0, this.screenHeight, size, this.screenHeight, 0, this.screenHeight - size);
      // Bottom-right corner
      graphics.fillTriangle(this.screenWidth, this.screenHeight, this.screenWidth - size, this.screenHeight, this.screenWidth, this.screenHeight - size);
    }

    // Draw subtle edge gradients
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const alpha = t * t * vignetteIntensity * 0.5; // Half intensity for edges
      const thickness = cornerSize * 0.3 * (1 - t);

      graphics.fillStyle(0x000000, alpha);
      // Top edge
      graphics.fillRect(cornerSize, 0, this.screenWidth - cornerSize * 2, thickness);
      // Bottom edge
      graphics.fillRect(cornerSize, this.screenHeight - thickness, this.screenWidth - cornerSize * 2, thickness);
      // Left edge
      graphics.fillRect(0, cornerSize, thickness, this.screenHeight - cornerSize * 2);
      // Right edge
      graphics.fillRect(this.screenWidth - thickness, cornerSize, thickness, this.screenHeight - cornerSize * 2);
    }

    // Draw to render texture
    this.vignetteOverlay.draw(graphics);
    graphics.destroy();
  }

  /**
   * Update configuration
   */
  public setConfig(config: Partial<PostProcessConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Recreate effects if needed
    if (config.enableScanlines !== undefined && config.enableScanlines !== oldConfig.enableScanlines) {
      if (config.enableScanlines) {
        this.createScanlines();
      } else if (this.scanlineOverlay) {
        this.scanlineOverlay.destroy();
      }
    } else if (
      this.scanlineOverlay &&
      (config.scanlineOpacity !== undefined || config.scanlineSpacing !== undefined)
    ) {
      this.drawScanlines();
    }

    if (config.enableVignette !== undefined && config.enableVignette !== oldConfig.enableVignette) {
      if (config.enableVignette) {
        this.createVignette();
      } else if (this.vignetteOverlay) {
        this.vignetteOverlay.destroy();
      }
    } else if (
      this.vignetteOverlay &&
      (config.vignetteIntensity !== undefined || config.vignetteRadius !== undefined)
    ) {
      this.drawVignette();
    }
  }

  /**
   * Toggle scanlines
   */
  public setScanlines(enabled: boolean): void {
    this.setConfig({ enableScanlines: enabled });
  }

  /**
   * Toggle vignette
   */
  public setVignette(enabled: boolean): void {
    this.setConfig({ enableVignette: enabled });
  }

  /**
   * Handle screen resize
   */
  public resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;

    if (this.scanlineOverlay) {
      this.drawScanlines();
    }

    if (this.vignetteOverlay) {
      this.vignetteOverlay.setPosition(width / 2, height / 2);
      this.vignetteOverlay.resize(width, height);
      this.drawVignette();
    }
  }

  /**
   * Clean up
   */
  public destroy(): void {
    if (this.scanlineOverlay) {
      this.scanlineOverlay.destroy();
    }
    if (this.vignetteOverlay) {
      this.vignetteOverlay.destroy();
    }
  }
}

/**
 * Factory function
 */
export function createPostProcessingSystem(
  scene: Phaser.Scene,
  config?: Partial<PostProcessConfig>
): PostProcessingSystem {
  return new PostProcessingSystem(scene, config);
}
