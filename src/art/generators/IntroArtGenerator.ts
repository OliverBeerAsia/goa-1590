import Phaser from 'phaser';
import { WATER_HARBOR, GOLD, WOOD_DARK } from '../palette';

/**
 * IntroArtGenerator - Generates period-style artwork for the intro sequence
 *
 * Inspired by historical sources:
 * - Linschoten's Itinerario (1596) - Engravings of ships, maps, Goa cityscape
 * - Codice Casanatense (c.1540) - Watercolor illustrations of Portuguese India
 */
export class IntroArtGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Generates a Portuguese carrack ship silhouette
   * The carrack was the main ship type used in the Carreira da Índia
   */
  generatePortugueseCarrack(width: number, height: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const silhouetteColor = 0x1a0a05; // Very dark wood
    const highlightColor = 0x2c1810;

    const cx = width / 2;
    const waterLine = height * 0.7;
    const scale = Math.min(width, height) / 200;

    // Hull - characteristic high stern and forecastle
    g.fillStyle(silhouetteColor, 1);
    g.beginPath();
    // Bow (front) - starts low, rises
    g.moveTo(cx - 70 * scale, waterLine);
    g.lineTo(cx - 80 * scale, waterLine - 10 * scale);
    g.lineTo(cx - 85 * scale, waterLine - 20 * scale);
    // Forecastle
    g.lineTo(cx - 75 * scale, waterLine - 35 * scale);
    g.lineTo(cx - 60 * scale, waterLine - 40 * scale);
    // Main deck slopes down
    g.lineTo(cx - 30 * scale, waterLine - 25 * scale);
    g.lineTo(cx + 10 * scale, waterLine - 25 * scale);
    // Stern castle rises high
    g.lineTo(cx + 40 * scale, waterLine - 30 * scale);
    g.lineTo(cx + 60 * scale, waterLine - 50 * scale);
    g.lineTo(cx + 70 * scale, waterLine - 60 * scale);
    g.lineTo(cx + 75 * scale, waterLine - 55 * scale);
    // Back of stern
    g.lineTo(cx + 80 * scale, waterLine - 40 * scale);
    g.lineTo(cx + 75 * scale, waterLine - 10 * scale);
    g.lineTo(cx + 70 * scale, waterLine);
    // Bottom of hull
    g.lineTo(cx + 40 * scale, waterLine + 15 * scale);
    g.lineTo(cx - 30 * scale, waterLine + 15 * scale);
    g.closePath();
    g.fillPath();

    // Main mast
    g.fillRect(cx - 5 * scale, waterLine - 110 * scale, 6 * scale, 90 * scale);

    // Crow's nest on main mast
    g.fillRect(cx - 10 * scale, waterLine - 90 * scale, 16 * scale, 6 * scale);

    // Main yard (horizontal spar)
    g.fillRect(cx - 45 * scale, waterLine - 80 * scale, 86 * scale, 4 * scale);

    // Main sail (furled/simplified silhouette)
    g.fillStyle(highlightColor, 1);
    g.beginPath();
    g.moveTo(cx - 40 * scale, waterLine - 78 * scale);
    g.lineTo(cx + 40 * scale, waterLine - 78 * scale);
    g.lineTo(cx + 35 * scale, waterLine - 35 * scale);
    g.lineTo(cx - 35 * scale, waterLine - 35 * scale);
    g.closePath();
    g.fillPath();

    // Portuguese cross on sail
    g.fillStyle(silhouetteColor, 1);
    g.fillRect(cx - 3 * scale, waterLine - 70 * scale, 6 * scale, 30 * scale);
    g.fillRect(cx - 12 * scale, waterLine - 60 * scale, 24 * scale, 6 * scale);

    // Fore mast (shorter)
    g.fillStyle(silhouetteColor, 1);
    g.fillRect(cx - 55 * scale, waterLine - 75 * scale, 5 * scale, 55 * scale);
    g.fillRect(cx - 75 * scale, waterLine - 55 * scale, 40 * scale, 3 * scale);

    // Fore sail
    g.fillStyle(highlightColor, 1);
    g.beginPath();
    g.moveTo(cx - 72 * scale, waterLine - 53 * scale);
    g.lineTo(cx - 38 * scale, waterLine - 53 * scale);
    g.lineTo(cx - 40 * scale, waterLine - 30 * scale);
    g.lineTo(cx - 70 * scale, waterLine - 30 * scale);
    g.closePath();
    g.fillPath();

    // Mizzen mast (lateen sail - triangular)
    g.fillStyle(silhouetteColor, 1);
    g.fillRect(cx + 50 * scale, waterLine - 85 * scale, 4 * scale, 50 * scale);

    // Lateen yard (diagonal)
    g.lineStyle(3 * scale, silhouetteColor, 1);
    g.lineBetween(cx + 35 * scale, waterLine - 80 * scale, cx + 80 * scale, waterLine - 45 * scale);

    // Lateen sail
    g.fillStyle(highlightColor, 1);
    g.beginPath();
    g.moveTo(cx + 52 * scale, waterLine - 75 * scale);
    g.lineTo(cx + 78 * scale, waterLine - 47 * scale);
    g.lineTo(cx + 52 * scale, waterLine - 38 * scale);
    g.closePath();
    g.fillPath();

    // Bowsprit
    g.fillStyle(silhouetteColor, 1);
    g.lineStyle(4 * scale, silhouetteColor, 1);
    g.lineBetween(cx - 75 * scale, waterLine - 35 * scale, cx - 100 * scale, waterLine - 50 * scale);

    // Rigging lines (decorative)
    g.lineStyle(1, silhouetteColor, 0.6);
    g.lineBetween(cx - 100 * scale, waterLine - 50 * scale, cx - 3 * scale, waterLine - 108 * scale);
    g.lineBetween(cx + 3 * scale, waterLine - 108 * scale, cx + 52 * scale, waterLine - 83 * scale);

    // Flags
    g.fillStyle(0xa02020, 1);
    g.beginPath();
    g.moveTo(cx, waterLine - 110 * scale);
    g.lineTo(cx + 15 * scale, waterLine - 105 * scale);
    g.lineTo(cx, waterLine - 100 * scale);
    g.closePath();
    g.fillPath();

    return g;
  }

  /**
   * Generates a Goa cityscape silhouette with churches and palm trees
   */
  generateGoaCityscape(width: number, height: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const silhouetteColor = 0x1a0a05;
    const midColor = 0x2c1810;
    const hillColor = 0x3c2818;

    const groundY = height * 0.85;
    const scale = Math.min(width, height) / 400;

    // Distant hills (lightest)
    g.fillStyle(hillColor, 0.6);
    g.beginPath();
    g.moveTo(0, groundY);
    for (let x = 0; x <= width; x += 20) {
      const hillHeight = Math.sin(x * 0.01) * 30 * scale + Math.sin(x * 0.005) * 20 * scale;
      g.lineTo(x, groundY - 40 * scale - hillHeight);
    }
    g.lineTo(width, groundY);
    g.closePath();
    g.fillPath();

    // Middle layer - buildings
    g.fillStyle(midColor, 0.8);

    // Se Cathedral (largest church, center-left)
    const cathedralX = width * 0.35;
    this.drawChurchSilhouette(g, cathedralX, groundY, 80 * scale, 120 * scale, true);

    // Church of St. Francis (right side)
    const francisX = width * 0.65;
    this.drawChurchSilhouette(g, francisX, groundY, 60 * scale, 90 * scale, false);

    // Small chapel (far left)
    this.drawChurchSilhouette(g, width * 0.15, groundY, 40 * scale, 55 * scale, false);

    // Building clusters
    g.fillStyle(silhouetteColor, 1);

    // Left cluster
    this.drawBuildingCluster(g, width * 0.08, groundY, 5, scale);

    // Center-left cluster
    this.drawBuildingCluster(g, width * 0.25, groundY, 4, scale);

    // Center-right cluster
    this.drawBuildingCluster(g, width * 0.55, groundY, 6, scale);

    // Right cluster
    this.drawBuildingCluster(g, width * 0.8, groundY, 4, scale);

    // Palm trees in foreground
    g.fillStyle(silhouetteColor, 1);
    this.drawPalmTreeSilhouette(g, width * 0.05, groundY, 70 * scale);
    this.drawPalmTreeSilhouette(g, width * 0.12, groundY, 55 * scale);
    this.drawPalmTreeSilhouette(g, width * 0.88, groundY, 65 * scale);
    this.drawPalmTreeSilhouette(g, width * 0.95, groundY, 50 * scale);
    this.drawPalmTreeSilhouette(g, width * 0.45, groundY, 45 * scale);

    // Ground line
    g.fillStyle(silhouetteColor, 1);
    g.fillRect(0, groundY, width, height - groundY);

    return g;
  }

  /**
   * Draws a church silhouette with optional twin towers
   */
  private drawChurchSilhouette(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    hasTwinTowers: boolean
  ): void {
    const hw = width / 2;

    if (hasTwinTowers) {
      // Main facade
      g.fillRect(x - hw, y - height * 0.6, width, height * 0.6);

      // Twin towers
      const towerWidth = width * 0.25;
      const towerHeight = height * 0.35;
      g.fillRect(x - hw, y - height * 0.6 - towerHeight, towerWidth, towerHeight);
      g.fillRect(x + hw - towerWidth, y - height * 0.6 - towerHeight, towerWidth, towerHeight);

      // Tower caps (domed)
      g.beginPath();
      g.moveTo(x - hw, y - height * 0.95);
      g.lineTo(x - hw + towerWidth / 2, y - height);
      g.lineTo(x - hw + towerWidth, y - height * 0.95);
      g.closePath();
      g.fillPath();

      g.beginPath();
      g.moveTo(x + hw - towerWidth, y - height * 0.95);
      g.lineTo(x + hw - towerWidth / 2, y - height);
      g.lineTo(x + hw, y - height * 0.95);
      g.closePath();
      g.fillPath();

      // Crosses on towers
      g.fillRect(x - hw + towerWidth / 2 - 2, y - height - 12, 4, 15);
      g.fillRect(x - hw + towerWidth / 2 - 6, y - height - 8, 12, 4);
      g.fillRect(x + hw - towerWidth / 2 - 2, y - height - 12, 4, 15);
      g.fillRect(x + hw - towerWidth / 2 - 6, y - height - 8, 12, 4);

      // Central pediment
      g.beginPath();
      g.moveTo(x - hw + towerWidth, y - height * 0.6);
      g.lineTo(x, y - height * 0.75);
      g.lineTo(x + hw - towerWidth, y - height * 0.6);
      g.closePath();
      g.fillPath();
    } else {
      // Simple church with single tower
      g.fillRect(x - hw, y - height * 0.5, width, height * 0.5);

      // Bell tower
      const towerWidth = width * 0.4;
      g.fillRect(x - towerWidth / 2, y - height * 0.8, towerWidth, height * 0.3);

      // Pointed roof
      g.beginPath();
      g.moveTo(x - towerWidth / 2, y - height * 0.8);
      g.lineTo(x, y - height);
      g.lineTo(x + towerWidth / 2, y - height * 0.8);
      g.closePath();
      g.fillPath();

      // Cross
      g.fillRect(x - 2, y - height - 10, 4, 12);
      g.fillRect(x - 5, y - height - 6, 10, 3);
    }
  }

  /**
   * Draws a cluster of buildings
   */
  private drawBuildingCluster(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    count: number,
    scale: number
  ): void {
    for (let i = 0; i < count; i++) {
      const bx = x + (i - count / 2) * 25 * scale + (Math.random() - 0.5) * 10 * scale;
      const bWidth = 18 * scale + Math.random() * 15 * scale;
      const bHeight = 25 * scale + Math.random() * 35 * scale;

      g.fillRect(bx - bWidth / 2, y - bHeight, bWidth, bHeight);

      // Occasional window
      if (Math.random() > 0.5) {
        g.fillStyle(0x3c2818, 0.5);
        g.fillRect(bx - 3 * scale, y - bHeight * 0.6, 6 * scale, 8 * scale);
        g.fillStyle(0x1a0a05, 1);
      }
    }
  }

  /**
   * Draws a palm tree silhouette
   */
  private drawPalmTreeSilhouette(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    height: number
  ): void {
    const trunkWidth = height * 0.08;

    // Trunk (slightly curved)
    g.beginPath();
    g.moveTo(x - trunkWidth / 2, y);
    g.lineTo(x - trunkWidth / 3, y - height * 0.7);
    g.lineTo(x, y - height * 0.85);
    g.lineTo(x + trunkWidth / 3, y - height * 0.7);
    g.lineTo(x + trunkWidth / 2, y);
    g.closePath();
    g.fillPath();

    // Fronds (radiating from top)
    const frondLength = height * 0.5;
    const frondAngles = [-150, -120, -90, -60, -30, 30, 60, 90, 120, 150];

    for (const angle of frondAngles) {
      const radians = (angle * Math.PI) / 180;
      const endX = x + Math.cos(radians) * frondLength;
      const endY = y - height * 0.85 + Math.sin(radians) * frondLength * 0.4;

      // Draw curved frond using multiple line segments (since Phaser Graphics doesn't have quadraticCurveTo)
      g.lineStyle(3, 0x1a0a05, 1);
      g.beginPath();
      const startX = x;
      const startY = y - height * 0.85;
      const ctrlX = x + Math.cos(radians) * frondLength * 0.5;
      const ctrlY = y - height * 0.85 + Math.sin(radians) * frondLength * 0.15 - 10;
      g.moveTo(startX, startY);

      // Approximate quadratic curve with line segments
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const px = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX;
        const py = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY;
        g.lineTo(px, py);
      }
      g.strokePath();
    }
  }

  /**
   * Generates waves pattern for water
   */
  generateWavesPattern(width: number, height: number, frame: number = 0): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const frameOffset = (frame / 60) * Math.PI * 2;

    // Gradient from deep to surface
    const layers = 8;
    for (let i = 0; i < layers; i++) {
      const ratio = i / layers;
      const layerY = height * ratio;
      const layerHeight = height / layers + 2;

      // Interpolate colors
      const alpha = 0.3 + ratio * 0.4;
      const color = this.lerpColor(WATER_HARBOR.deep, WATER_HARBOR.highlight, ratio);

      g.fillStyle(color, alpha);

      // Draw wavy layer
      g.beginPath();
      g.moveTo(0, layerY);

      for (let x = 0; x <= width; x += 10) {
        const waveOffset = Math.sin((x * 0.02) + frameOffset + i * 0.5) * 3;
        const y = layerY + waveOffset;
        g.lineTo(x, y);
      }

      g.lineTo(width, layerY + layerHeight);
      g.lineTo(0, layerY + layerHeight);
      g.closePath();
      g.fillPath();
    }

    // Highlight ripples on top
    g.lineStyle(1, WATER_HARBOR.highlight, 0.3);
    for (let i = 0; i < 5; i++) {
      const startY = height * 0.1 + i * (height * 0.15);
      g.beginPath();
      g.moveTo(0, startY);
      for (let x = 0; x <= width; x += 5) {
        const waveY = startY + Math.sin((x * 0.03) + frameOffset * 2 + i) * 2;
        g.lineTo(x, waveY);
      }
      g.strokePath();
    }

    return g;
  }

  /**
   * Generates an ornate map cartouche (decorative frame with title)
   */
  generateMapCartouche(width: number, height: number, _text: string): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const padding = 20;
    const cornerRadius = 15;

    // Parchment fill
    g.fillStyle(0xf4e4bc, 0.95);
    g.fillRoundedRect(padding, padding, width - padding * 2, height - padding * 2, cornerRadius);

    // Dark border
    g.lineStyle(4, WOOD_DARK.deep, 1);
    g.strokeRoundedRect(padding, padding, width - padding * 2, height - padding * 2, cornerRadius);

    // Gold inner border
    g.lineStyle(2, GOLD.shadow, 0.8);
    g.strokeRoundedRect(padding + 8, padding + 8, width - padding * 2 - 16, height - padding * 2 - 16, cornerRadius - 4);

    // Corner flourishes
    this.drawCornerFlourish(g, padding + 10, padding + 10, 1, 1);
    this.drawCornerFlourish(g, width - padding - 10, padding + 10, -1, 1);
    this.drawCornerFlourish(g, padding + 10, height - padding - 10, 1, -1);
    this.drawCornerFlourish(g, width - padding - 10, height - padding - 10, -1, -1);

    return g;
  }

  /**
   * Draws a decorative corner flourish
   */
  private drawCornerFlourish(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    flipX: number,
    flipY: number
  ): void {
    g.fillStyle(GOLD.shadow, 0.9);

    // L-shape base
    g.fillRect(x, y, flipX * 25, flipY * 4);
    g.fillRect(x, y, flipX * 4, flipY * 25);

    // Inner accent
    g.fillRect(x + flipX * 8, y + flipY * 8, flipX * 12, flipY * 2);
    g.fillRect(x + flipX * 8, y + flipY * 8, flipX * 2, flipY * 12);

    // Dot
    g.fillCircle(x + flipX * 12, y + flipY * 12, 3);
  }

  /**
   * Generates an ornate gothic/mannerist frame
   */
  generateOrnateFrame(width: number, height: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const frameWidth = 12;

    // Outer dark wood frame
    g.fillStyle(WOOD_DARK.deep, 1);
    g.fillRect(0, 0, width, frameWidth);
    g.fillRect(0, height - frameWidth, width, frameWidth);
    g.fillRect(0, 0, frameWidth, height);
    g.fillRect(width - frameWidth, 0, frameWidth, height);

    // Gold inlay line
    g.lineStyle(2, GOLD.base, 0.8);
    const inset = frameWidth + 4;
    g.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

    // Corner ornaments
    const cornerSize = 35;
    this.drawGothicCorner(g, 0, 0, cornerSize, 1, 1);
    this.drawGothicCorner(g, width, 0, cornerSize, -1, 1);
    this.drawGothicCorner(g, 0, height, cornerSize, 1, -1);
    this.drawGothicCorner(g, width, height, cornerSize, -1, -1);

    // Side ornaments (at 1/4 and 3/4 positions)
    this.drawTorchBracket(g, width * 0.25, frameWidth / 2);
    this.drawTorchBracket(g, width * 0.75, frameWidth / 2);

    return g;
  }

  /**
   * Draws a gothic corner ornament
   */
  private drawGothicCorner(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    flipX: number,
    flipY: number
  ): void {
    g.fillStyle(GOLD.shadow, 1);

    // Main corner piece
    g.fillRect(x, y, flipX * size, flipY * 6);
    g.fillRect(x, y, flipX * 6, flipY * size);

    // Decorative curves (simplified)
    g.fillStyle(GOLD.base, 0.9);
    g.fillRect(x + flipX * 10, y + flipY * 10, flipX * 18, flipY * 3);
    g.fillRect(x + flipX * 10, y + flipY * 10, flipX * 3, flipY * 18);

    // Central medallion
    g.fillCircle(x + flipX * 16, y + flipY * 16, 5);
    g.fillStyle(WOOD_DARK.base, 1);
    g.fillCircle(x + flipX * 16, y + flipY * 16, 2);
  }

  /**
   * Draws a torch bracket for the frame
   */
  private drawTorchBracket(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // Bracket base
    g.fillStyle(GOLD.shadow, 1);
    g.fillRect(x - 8, y - 3, 16, 6);

    // Bracket arm
    g.fillRect(x - 3, y, 6, 15);

    // Torch cup
    g.fillStyle(0x3a3a3a, 1);
    g.beginPath();
    g.moveTo(x - 6, y + 12);
    g.lineTo(x + 6, y + 12);
    g.lineTo(x + 4, y + 20);
    g.lineTo(x - 4, y + 20);
    g.closePath();
    g.fillPath();
  }

  /**
   * Generates dust particles effect (returns particle emitter config)
   */
  generateDustParticles(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      x: { min: 0, max: this.scene.scale.width },
      y: { min: 0, max: this.scene.scale.height },
      lifespan: 8000,
      speedX: { min: -5, max: 5 },
      speedY: { min: -3, max: 3 },
      scale: { start: 0.3, end: 0.1 },
      alpha: { start: 0.3, end: 0 },
      frequency: 200,
      blendMode: Phaser.BlendModes.ADD,
    };
  }

  /**
   * Helper function to linearly interpolate between two hex colors
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
}
