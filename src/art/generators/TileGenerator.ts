/**
 * TileGenerator - Procedural Isometric Tile Generator for Goa 1590
 *
 * Generates beautiful isometric tiles using procedural techniques:
 * - Noise-based variation for natural appearance
 * - Proper isometric perspective (2:1 ratio)
 * - Pixel-perfect edges with clean outlines
 * - Subtle shading for depth
 * - Animation frames for water
 *
 * Tile dimensions: 32x16 pixels (isometric diamond)
 * All tiles use the period-accurate Goa 1590 color palette.
 */

import Phaser from 'phaser';
import {
  ColorRamp,
  COBBLESTONE,
  DIRT,
  SAND,
  GRASS,
  WATER_HARBOR,
  WATER_RIVER,
  WHITEWASH,
  WOOD_DARK,
  WOOD_LIGHT,
  STONE,
  MOSS,
  MARKET_TILE_LIGHT,
  MARKET_TILE_DARK,
  MARKET_TILE_ACCENT,
  SHADOW_COLOR,
  SHADOW_ALPHA,
  PALM_FROND,
  FABRIC_RED,
  FABRIC_BLUE,
  FABRIC_GREEN,
  SILK_GOLD,
  lerpColor,
  getRampColor,
} from '../palette';

// Tile dimensions (standard isometric 2:1 ratio)
const TILE_WIDTH = 32;
const TILE_HEIGHT = 16;

// Simple noise generator for procedural variation
class SimpleNoise {
  private permutation: number[];

  constructor(seed: number = 12345) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const perm: number[] = [];
    for (let i = 0; i < 256; i++) {
      perm[i] = i;
    }
    // Fisher-Yates shuffle with seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return [...perm, ...perm];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.permutation[this.permutation[X] + Y];
    const ab = this.permutation[this.permutation[X] + Y + 1];
    const ba = this.permutation[this.permutation[X + 1] + Y];
    const bb = this.permutation[this.permutation[X + 1] + Y + 1];

    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  // Fractal Brownian Motion for more natural noise
  fbm(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

// Ground tile variant types
export type CobblestoneVariant = 'worn' | 'new' | 'mossy';
export type DirtVariant = 'packed' | 'loose' | 'muddy';
export type SandVariant = 'beach' | 'dusty' | 'wet';
export type GrassVariant = 'lush' | 'dry' | 'patchy';
export type MarketFloorVariant = 'checkered' | 'diamond' | 'ornate';

// Water animation frame count
const WATER_ANIMATION_FRAMES = 4;

/**
 * Main TileGenerator class
 * Generates procedural isometric tiles and adds them to Phaser's texture manager
 */
export class TileGenerator {
  private scene: Phaser.Scene;
  private noise: SimpleNoise;

  constructor(scene: Phaser.Scene, seed: number = 12345) {
    this.scene = scene;
    this.noise = new SimpleNoise(seed);
  }

  /**
   * Generate all tile types and add to texture manager
   */
  generateAllTiles(): void {
    // Ground tiles
    this.generateCobblestone('worn');
    this.generateCobblestone('new');
    this.generateCobblestone('mossy');
    this.generateDirt('packed');
    this.generateDirt('loose');
    this.generateDirt('muddy');
    this.generateSand('beach');
    this.generateSand('dusty');
    this.generateSand('wet');
    this.generateGrass('lush');
    this.generateGrass('dry');
    this.generateGrass('patchy');
    this.generateMarketFloor('checkered');
    this.generateMarketFloor('diamond');
    this.generateMarketFloor('ornate');

    // Water tiles (animated)
    this.generateHarborWater();
    this.generateRiverWater();
    this.generatePuddles();

    // Transition tiles
    this.generateGroundToWaterEdge('cobble');
    this.generateGroundToWaterEdge('dirt');
    this.generateGroundToWaterEdge('sand');
    this.generateCobbleToDirtTransition();
    this.generateShadowOverlay();

    // Decoration tiles
    this.generateMarketStallBase('red');
    this.generateMarketStallBase('blue');
    this.generateMarketStallBase('green');
    this.generateMarketStallBase('gold');
    this.generateCrates();
    this.generateBarrels();
    this.generateSmallPlants();
    this.generatePalmShadow();
  }

  // ============================================
  // GROUND TILES
  // ============================================

  /**
   * Generate cobblestone tile with variant
   */
  generateCobblestone(variant: CobblestoneVariant): void {
    const key = `tile_cobble_${variant}`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Base isometric diamond
    this.drawIsometricBase(graphics, COBBLESTONE);

    // Add cobblestone pattern based on variant
    switch (variant) {
      case 'worn':
        this.drawWornCobblestones(graphics);
        break;
      case 'new':
        this.drawNewCobblestones(graphics);
        break;
      case 'mossy':
        this.drawMossyCobblestones(graphics);
        break;
    }

    // Add isometric edge highlights
    this.drawIsometricEdges(graphics, COBBLESTONE);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  private drawWornCobblestones(graphics: Phaser.GameObjects.Graphics): void {
    // Large, smooth worn stones with subtle variation
    const stonePositions = [
      { x: 8, y: 5, size: 4 },
      { x: 16, y: 4, size: 5 },
      { x: 24, y: 6, size: 4 },
      { x: 12, y: 9, size: 4 },
      { x: 20, y: 10, size: 5 },
      { x: 6, y: 10, size: 3 },
      { x: 26, y: 10, size: 3 },
    ];

    for (const stone of stonePositions) {
      const noiseVal = this.noise.noise2D(stone.x * 0.3, stone.y * 0.3);

      // Stone shadow
      graphics.fillStyle(COBBLESTONE.shadow, 0.4);
      graphics.fillEllipse(stone.x + 1, stone.y + 1, stone.size * 2, stone.size);

      // Stone body
      const baseColor = lerpColor(COBBLESTONE.shadow, COBBLESTONE.base, 0.5 + noiseVal * 0.3);
      graphics.fillStyle(baseColor, 0.6);
      graphics.fillEllipse(stone.x, stone.y, stone.size * 2, stone.size);

      // Highlight
      graphics.fillStyle(COBBLESTONE.highlight, 0.3 + noiseVal * 0.1);
      graphics.fillEllipse(stone.x - 1, stone.y - 0.5, stone.size, stone.size * 0.5);
    }

    // Worn edges and cracks
    graphics.lineStyle(1, COBBLESTONE.deep, 0.3);
    graphics.lineBetween(10, 6, 14, 10);
    graphics.lineBetween(20, 5, 22, 9);
  }

  private drawNewCobblestones(graphics: Phaser.GameObjects.Graphics): void {
    // Crisp, well-defined rectangular stones
    const stonePositions = [
      { x: 6, y: 4, w: 6, h: 3 },
      { x: 14, y: 3, w: 5, h: 3 },
      { x: 21, y: 4, w: 6, h: 3 },
      { x: 9, y: 8, w: 5, h: 3 },
      { x: 16, y: 8, w: 6, h: 3 },
      { x: 24, y: 9, w: 4, h: 3 },
      { x: 4, y: 9, w: 4, h: 2 },
    ];

    for (const stone of stonePositions) {
      const noiseVal = this.noise.noise2D(stone.x * 0.2, stone.y * 0.2);

      // Stone with clear outline
      const baseColor = lerpColor(COBBLESTONE.base, COBBLESTONE.highlight, 0.3 + noiseVal * 0.2);
      graphics.fillStyle(baseColor, 0.8);

      // Draw isometric-ish stone shape
      graphics.beginPath();
      graphics.moveTo(stone.x + stone.w / 2, stone.y);
      graphics.lineTo(stone.x + stone.w, stone.y + stone.h / 2);
      graphics.lineTo(stone.x + stone.w / 2, stone.y + stone.h);
      graphics.lineTo(stone.x, stone.y + stone.h / 2);
      graphics.closePath();
      graphics.fillPath();

      // Clean outline
      graphics.lineStyle(1, COBBLESTONE.deep, 0.4);
      graphics.strokePath();

      // Top highlight
      graphics.fillStyle(COBBLESTONE.highlight, 0.25);
      graphics.fillRect(stone.x + 1, stone.y, stone.w - 2, 1);
    }
  }

  private drawMossyCobblestones(graphics: Phaser.GameObjects.Graphics): void {
    // First draw worn cobblestones
    this.drawWornCobblestones(graphics);

    // Add moss patches using noise
    for (let x = 4; x < TILE_WIDTH - 4; x += 3) {
      for (let y = 2; y < TILE_HEIGHT - 2; y += 2) {
        // Check if point is within isometric bounds
        if (!this.isInIsometricBounds(x, y)) continue;

        const noiseVal = this.noise.fbm(x * 0.4, y * 0.4, 2);
        if (noiseVal > 0.2) {
          const mossColor = lerpColor(MOSS.shadow, MOSS.base, noiseVal);
          graphics.fillStyle(mossColor, 0.5 + noiseVal * 0.3);
          graphics.fillCircle(x, y, 1 + Math.random());
        }
      }
    }

    // Moss in crevices
    graphics.fillStyle(MOSS.shadow, 0.6);
    graphics.fillEllipse(12, 7, 3, 1.5);
    graphics.fillEllipse(20, 9, 2.5, 1);
  }

  /**
   * Generate dirt/packed earth tile
   */
  generateDirt(variant: DirtVariant): void {
    const key = `tile_dirt_${variant}`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Base with dirt colors
    this.drawIsometricBase(graphics, DIRT);

    switch (variant) {
      case 'packed':
        this.drawPackedDirt(graphics);
        break;
      case 'loose':
        this.drawLooseDirt(graphics);
        break;
      case 'muddy':
        this.drawMuddyDirt(graphics);
        break;
    }

    this.drawIsometricEdges(graphics, DIRT);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  private drawPackedDirt(graphics: Phaser.GameObjects.Graphics): void {
    // Smooth surface with subtle variation
    for (let x = 2; x < TILE_WIDTH - 2; x += 2) {
      for (let y = 1; y < TILE_HEIGHT - 1; y += 2) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const noiseVal = this.noise.fbm(x * 0.3, y * 0.3, 2);
        if (noiseVal > 0.1) {
          const color = lerpColor(DIRT.shadow, DIRT.base, 0.5 + noiseVal * 0.3);
          graphics.fillStyle(color, 0.4);
          graphics.fillCircle(x, y, 1);
        }
      }
    }

    // Occasional footprint indentations
    graphics.fillStyle(DIRT.shadow, 0.3);
    graphics.fillEllipse(10, 7, 3, 1.5);
    graphics.fillEllipse(22, 9, 2.5, 1.5);
  }

  private drawLooseDirt(graphics: Phaser.GameObjects.Graphics): void {
    // Scattered particles
    for (let i = 0; i < 20; i++) {
      const x = 4 + Math.random() * 24;
      const y = 2 + Math.random() * 12;

      if (!this.isInIsometricBounds(x, y)) continue;

      const noiseVal = this.noise.noise2D(x * 0.5, y * 0.5);
      const color = getRampColor(DIRT, 0.4 + noiseVal * 0.4);
      graphics.fillStyle(color, 0.6);
      graphics.fillCircle(x, y, 0.5 + Math.random() * 1.5);
    }

    // Small pebbles
    graphics.fillStyle(COBBLESTONE.shadow, 0.5);
    graphics.fillCircle(8, 6, 1);
    graphics.fillCircle(20, 5, 1.2);
    graphics.fillCircle(14, 10, 0.8);
  }

  private drawMuddyDirt(graphics: Phaser.GameObjects.Graphics): void {
    // Darker, wet-looking patches
    for (let x = 3; x < TILE_WIDTH - 3; x += 4) {
      for (let y = 2; y < TILE_HEIGHT - 2; y += 3) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const noiseVal = this.noise.fbm(x * 0.2, y * 0.2, 3);
        if (noiseVal > -0.2) {
          graphics.fillStyle(DIRT.deep, 0.4 + noiseVal * 0.2);
          graphics.fillEllipse(x, y, 3 + noiseVal * 2, 1.5 + noiseVal);
        }
      }
    }

    // Water shimmer
    graphics.fillStyle(WATER_HARBOR.highlight, 0.15);
    graphics.fillEllipse(16, 8, 6, 3);
  }

  /**
   * Generate sand tile
   */
  generateSand(variant: SandVariant): void {
    const key = `tile_sand_${variant}`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    this.drawIsometricBase(graphics, SAND);

    switch (variant) {
      case 'beach':
        this.drawBeachSand(graphics);
        break;
      case 'dusty':
        this.drawDustySand(graphics);
        break;
      case 'wet':
        this.drawWetSand(graphics);
        break;
    }

    this.drawIsometricEdges(graphics, SAND);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  private drawBeachSand(graphics: Phaser.GameObjects.Graphics): void {
    // Fine sand texture with shells
    for (let x = 3; x < TILE_WIDTH - 3; x += 2) {
      for (let y = 2; y < TILE_HEIGHT - 2; y += 2) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const noiseVal = this.noise.noise2D(x * 0.5, y * 0.5);
        if (noiseVal > 0) {
          const color = lerpColor(SAND.shadow, SAND.highlight, 0.5 + noiseVal * 0.3);
          graphics.fillStyle(color, 0.3);
          graphics.fillCircle(x, y, 0.5);
        }
      }
    }

    // Shell fragments
    graphics.fillStyle(WHITEWASH.base, 0.6);
    graphics.fillEllipse(9, 6, 2, 1);
    graphics.fillEllipse(22, 8, 1.5, 0.8);
    graphics.fillCircle(15, 10, 0.8);
  }

  private drawDustySand(graphics: Phaser.GameObjects.Graphics): void {
    // Coarser, dusty texture
    for (let i = 0; i < 30; i++) {
      const x = 4 + Math.random() * 24;
      const y = 2 + Math.random() * 12;

      if (!this.isInIsometricBounds(x, y)) continue;

      const color = getRampColor(SAND, 0.3 + Math.random() * 0.4);
      graphics.fillStyle(color, 0.4);
      graphics.fillCircle(x, y, 0.3 + Math.random() * 0.7);
    }

    // Dust drift lines
    graphics.lineStyle(1, SAND.highlight, 0.2);
    graphics.lineBetween(6, 6, 14, 10);
    graphics.lineBetween(18, 5, 26, 9);
  }

  private drawWetSand(graphics: Phaser.GameObjects.Graphics): void {
    // Darker base where wet
    graphics.fillStyle(SAND.shadow, 0.4);
    graphics.fillEllipse(16, 8, 14, 6);

    // Water reflection
    graphics.fillStyle(WATER_HARBOR.highlight, 0.2);
    graphics.fillEllipse(16, 8, 10, 4);

    // Ripple marks
    graphics.lineStyle(1, SAND.deep, 0.2);
    for (let i = 0; i < 4; i++) {
      const y = 5 + i * 2;
      graphics.lineBetween(8 + i * 2, y, 24 - i * 2, y + 1);
    }
  }

  /**
   * Generate grass tile
   */
  generateGrass(variant: GrassVariant): void {
    const key = `tile_grass_${variant}`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    this.drawIsometricBase(graphics, GRASS);

    switch (variant) {
      case 'lush':
        this.drawLushGrass(graphics);
        break;
      case 'dry':
        this.drawDryGrass(graphics);
        break;
      case 'patchy':
        this.drawPatchyGrass(graphics);
        break;
    }

    this.drawIsometricEdges(graphics, GRASS);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  private drawLushGrass(graphics: Phaser.GameObjects.Graphics): void {
    // Dense grass blades
    for (let x = 3; x < TILE_WIDTH - 3; x += 2) {
      for (let y = 2; y < TILE_HEIGHT - 2; y += 2) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const noiseVal = this.noise.noise2D(x * 0.4, y * 0.4);
        const bladeHeight = 2 + noiseVal * 1.5;
        const color = lerpColor(GRASS.shadow, GRASS.highlight, 0.5 + noiseVal * 0.3);

        graphics.fillStyle(color, 0.7);
        graphics.fillRect(x, y - bladeHeight, 1, bladeHeight);

        // Blade tip
        graphics.fillStyle(GRASS.highlight, 0.4);
        graphics.fillRect(x, y - bladeHeight, 1, 1);
      }
    }
  }

  private drawDryGrass(graphics: Phaser.GameObjects.Graphics): void {
    const dryGrass: ColorRamp = {
      highlight: 0x9a8a50,
      base: 0x7a6a40,
      shadow: 0x5a4a30,
      deep: 0x3a3020,
    };

    // Sparse, yellowed grass
    for (let x = 4; x < TILE_WIDTH - 4; x += 3) {
      for (let y = 2; y < TILE_HEIGHT - 2; y += 3) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const noiseVal = this.noise.noise2D(x * 0.3, y * 0.3);
        if (noiseVal > -0.3) {
          const color = lerpColor(dryGrass.shadow, dryGrass.highlight, 0.5 + noiseVal * 0.3);
          graphics.fillStyle(color, 0.6);
          graphics.fillRect(x, y - 1.5, 1, 1.5);
        }
      }
    }

    // Exposed dirt
    graphics.fillStyle(DIRT.base, 0.3);
    graphics.fillEllipse(12, 7, 4, 2);
    graphics.fillEllipse(22, 10, 3, 1.5);
  }

  private drawPatchyGrass(graphics: Phaser.GameObjects.Graphics): void {
    // Mix of grass and dirt
    // Dirt base patches
    graphics.fillStyle(DIRT.base, 0.4);
    graphics.fillEllipse(10, 6, 5, 2.5);
    graphics.fillEllipse(24, 9, 4, 2);

    // Grass patches
    for (let x = 4; x < TILE_WIDTH - 4; x += 2) {
      for (let y = 2; y < TILE_HEIGHT - 2; y += 2) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const noiseVal = this.noise.fbm(x * 0.3, y * 0.3, 2);
        if (noiseVal > 0.1) {
          const color = lerpColor(GRASS.shadow, GRASS.base, 0.5 + noiseVal * 0.3);
          graphics.fillStyle(color, 0.6);
          graphics.fillRect(x, y - 1.5, 1, 1.5);
        }
      }
    }
  }

  /**
   * Generate decorated market floor tile
   */
  generateMarketFloor(variant: MarketFloorVariant): void {
    const key = `tile_market_${variant}`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Stone base
    this.drawIsometricBase(graphics, COBBLESTONE);

    switch (variant) {
      case 'checkered':
        this.drawCheckeredFloor(graphics);
        break;
      case 'diamond':
        this.drawDiamondFloor(graphics);
        break;
      case 'ornate':
        this.drawOrnateFloor(graphics);
        break;
    }

    this.drawIsometricEdges(graphics, COBBLESTONE);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  private drawCheckeredFloor(graphics: Phaser.GameObjects.Graphics): void {
    // Alternating light and dark tiles
    const tileSize = 4;
    for (let tx = 0; tx < 4; tx++) {
      for (let ty = 0; ty < 2; ty++) {
        const isLight = (tx + ty) % 2 === 0;
        const color = isLight ? MARKET_TILE_LIGHT : MARKET_TILE_DARK;
        const x = 8 + tx * tileSize;
        const y = 3 + ty * tileSize;

        if (this.isInIsometricBounds(x + tileSize / 2, y + tileSize / 2)) {
          graphics.fillStyle(color, 0.7);
          graphics.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    // Grout lines
    graphics.lineStyle(1, COBBLESTONE.deep, 0.3);
    for (let i = 0; i <= 4; i++) {
      graphics.lineBetween(8 + i * 4, 3, 8 + i * 4, 11);
    }
    graphics.lineBetween(8, 7, 24, 7);
  }

  private drawDiamondFloor(graphics: Phaser.GameObjects.Graphics): void {
    // Central diamond pattern
    graphics.fillStyle(MARKET_TILE_ACCENT, 0.6);
    graphics.beginPath();
    graphics.moveTo(16, 3);
    graphics.lineTo(24, 8);
    graphics.lineTo(16, 13);
    graphics.lineTo(8, 8);
    graphics.closePath();
    graphics.fillPath();

    // Inner diamond
    graphics.fillStyle(MARKET_TILE_LIGHT, 0.7);
    graphics.beginPath();
    graphics.moveTo(16, 5);
    graphics.lineTo(20, 8);
    graphics.lineTo(16, 11);
    graphics.lineTo(12, 8);
    graphics.closePath();
    graphics.fillPath();

    // Outline
    graphics.lineStyle(1, COBBLESTONE.deep, 0.4);
    graphics.strokePath();
  }

  private drawOrnateFloor(graphics: Phaser.GameObjects.Graphics): void {
    // Decorative border
    graphics.lineStyle(1, MARKET_TILE_ACCENT, 0.6);
    graphics.beginPath();
    graphics.moveTo(16, 2);
    graphics.lineTo(28, 8);
    graphics.lineTo(16, 14);
    graphics.lineTo(4, 8);
    graphics.closePath();
    graphics.strokePath();

    // Inner pattern - star-like
    graphics.fillStyle(MARKET_TILE_LIGHT, 0.5);
    graphics.fillCircle(16, 8, 3);

    // Corner accents
    graphics.fillStyle(MARKET_TILE_ACCENT, 0.4);
    graphics.fillCircle(8, 8, 1.5);
    graphics.fillCircle(24, 8, 1.5);
    graphics.fillCircle(16, 4, 1.5);
    graphics.fillCircle(16, 12, 1.5);

    // Connecting lines
    graphics.lineStyle(1, MARKET_TILE_DARK, 0.3);
    graphics.lineBetween(9.5, 8, 14.5, 8);
    graphics.lineBetween(17.5, 8, 22.5, 8);
    graphics.lineBetween(16, 5.5, 16, 6.5);
    graphics.lineBetween(16, 9.5, 16, 10.5);
  }

  // ============================================
  // WATER TILES (ANIMATED)
  // ============================================

  /**
   * Generate animated harbor water (4 frames)
   */
  generateHarborWater(): void {
    for (let frame = 0; frame < WATER_ANIMATION_FRAMES; frame++) {
      const key = `tile_harbor_water_${frame}`;
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });

      this.drawWaterTile(graphics, WATER_HARBOR, frame, 'harbor');

      graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
      graphics.destroy();
    }
  }

  /**
   * Generate animated river water (4 frames)
   */
  generateRiverWater(): void {
    for (let frame = 0; frame < WATER_ANIMATION_FRAMES; frame++) {
      const key = `tile_river_water_${frame}`;
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });

      this.drawWaterTile(graphics, WATER_RIVER, frame, 'river');

      graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
      graphics.destroy();
    }
  }

  private drawWaterTile(
    graphics: Phaser.GameObjects.Graphics,
    colors: ColorRamp,
    frame: number,
    type: 'harbor' | 'river'
  ): void {
    // Base water
    graphics.fillStyle(colors.base, 1);
    this.drawIsometricDiamond(graphics);
    graphics.fillPath();

    // Depth gradient
    graphics.fillStyle(colors.deep, 0.5);
    graphics.beginPath();
    graphics.moveTo(16, 4);
    graphics.lineTo(26, 8);
    graphics.lineTo(16, 12);
    graphics.lineTo(6, 8);
    graphics.closePath();
    graphics.fillPath();

    // Animated wave offset
    const waveOffset = (frame / WATER_ANIMATION_FRAMES) * Math.PI * 2;
    const flowSpeed = type === 'river' ? 1.5 : 1;

    // Wave highlights
    for (let i = 0; i < 3; i++) {
      const phase = waveOffset + i * 0.8;
      const x = 8 + i * 8 + Math.sin(phase) * 2;
      const y = 5 + i * 2 + Math.cos(phase * flowSpeed) * 1;

      if (this.isInIsometricBounds(x, y)) {
        graphics.lineStyle(1, colors.highlight, 0.4 + Math.sin(phase) * 0.2);
        graphics.lineBetween(x - 3, y, x + 3, y + 0.5);
      }
    }

    // Sparkle effects
    const sparklePhase = waveOffset * 2;
    for (let i = 0; i < 2; i++) {
      const sx = 10 + i * 12 + Math.cos(sparklePhase + i) * 2;
      const sy = 6 + i * 3 + Math.sin(sparklePhase + i) * 1;

      if (this.isInIsometricBounds(sx, sy)) {
        const alpha = 0.3 + Math.abs(Math.sin(sparklePhase + i * 0.5)) * 0.4;
        graphics.fillStyle(0xffffff, alpha);
        graphics.fillCircle(sx, sy, 0.8);
      }
    }

    // Foam edges (for harbor water)
    if (type === 'harbor' && frame % 2 === 0) {
      graphics.fillStyle(0xffffff, 0.15);
      graphics.fillEllipse(8, 8, 3, 1);
      graphics.fillEllipse(24, 8, 3, 1);
    }
  }

  /**
   * Generate puddle tiles
   */
  generatePuddles(): void {
    const key = 'tile_puddle';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Transparent base (puddle on existing ground)
    graphics.fillStyle(0x000000, 0);
    this.drawIsometricDiamond(graphics);
    graphics.fillPath();

    // Puddle shape
    graphics.fillStyle(WATER_HARBOR.shadow, 0.6);
    graphics.fillEllipse(16, 8, 10, 5);

    // Water surface
    graphics.fillStyle(WATER_HARBOR.base, 0.5);
    graphics.fillEllipse(16, 8, 8, 4);

    // Reflection
    graphics.fillStyle(WATER_HARBOR.highlight, 0.3);
    graphics.fillEllipse(14, 7, 4, 2);

    // Edge
    graphics.lineStyle(1, WATER_HARBOR.deep, 0.3);
    graphics.strokeEllipse(16, 8, 10, 5);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  // ============================================
  // TRANSITION TILES
  // ============================================

  /**
   * Generate ground-to-water edge transition
   */
  generateGroundToWaterEdge(groundType: 'cobble' | 'dirt' | 'sand'): void {
    const key = `tile_${groundType}_water_edge`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    const groundColors =
      groundType === 'cobble' ? COBBLESTONE : groundType === 'dirt' ? DIRT : SAND;

    // Water half (bottom-right)
    graphics.fillStyle(WATER_HARBOR.base, 1);
    graphics.beginPath();
    graphics.moveTo(16, 8);
    graphics.lineTo(32, 16);
    graphics.lineTo(16, 16);
    graphics.lineTo(0, 16);
    graphics.closePath();
    graphics.fillPath();

    // Ground half (top-left)
    graphics.fillStyle(groundColors.base, 1);
    graphics.beginPath();
    graphics.moveTo(16, 0);
    graphics.lineTo(32, 8);
    graphics.lineTo(16, 8);
    graphics.lineTo(0, 8);
    graphics.closePath();
    graphics.fillPath();

    // Shore line details
    graphics.lineStyle(1, groundColors.shadow, 0.6);
    graphics.lineBetween(4, 8, 28, 8);

    // Foam/splash at edge
    graphics.fillStyle(0xffffff, 0.2);
    graphics.fillEllipse(10, 9, 4, 1);
    graphics.fillEllipse(22, 9, 3, 1);

    // Water depth near edge
    graphics.fillStyle(WATER_HARBOR.shadow, 0.3);
    graphics.fillEllipse(16, 12, 12, 3);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * Generate cobble-to-dirt transition
   */
  generateCobbleToDirtTransition(): void {
    const key = 'tile_cobble_dirt_transition';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Dirt base
    this.drawIsometricBase(graphics, DIRT);

    // Cobble patches fading into dirt
    const cobblePatches = [
      { x: 6, y: 5, size: 3, alpha: 0.8 },
      { x: 12, y: 4, size: 3.5, alpha: 0.6 },
      { x: 20, y: 6, size: 2.5, alpha: 0.4 },
      { x: 8, y: 9, size: 2, alpha: 0.3 },
    ];

    for (const patch of cobblePatches) {
      graphics.fillStyle(COBBLESTONE.shadow, patch.alpha * 0.4);
      graphics.fillEllipse(patch.x + 0.5, patch.y + 0.5, patch.size * 2, patch.size);

      graphics.fillStyle(COBBLESTONE.base, patch.alpha * 0.6);
      graphics.fillEllipse(patch.x, patch.y, patch.size * 2, patch.size);

      graphics.fillStyle(COBBLESTONE.highlight, patch.alpha * 0.3);
      graphics.fillEllipse(patch.x - 0.5, patch.y - 0.3, patch.size, patch.size * 0.5);
    }

    this.drawIsometricEdges(graphics, DIRT);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * Generate shadow overlay tile
   */
  generateShadowOverlay(): void {
    const key = 'tile_shadow_overlay';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Transparent base with shadow gradient
    graphics.fillStyle(SHADOW_COLOR, SHADOW_ALPHA);
    this.drawIsometricDiamond(graphics);
    graphics.fillPath();

    // Darker center
    graphics.fillStyle(SHADOW_COLOR, SHADOW_ALPHA * 0.5);
    graphics.beginPath();
    graphics.moveTo(16, 4);
    graphics.lineTo(24, 8);
    graphics.lineTo(16, 12);
    graphics.lineTo(8, 8);
    graphics.closePath();
    graphics.fillPath();

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  // ============================================
  // DECORATION TILES
  // ============================================

  /**
   * Generate market stall base
   */
  generateMarketStallBase(color: 'red' | 'blue' | 'green' | 'gold'): void {
    const key = `tile_stall_base_${color}`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    const fabricColors: Record<string, ColorRamp> = {
      red: FABRIC_RED,
      blue: FABRIC_BLUE,
      green: FABRIC_GREEN,
      gold: SILK_GOLD,
    };

    const fabric = fabricColors[color];

    // Ground base
    this.drawIsometricBase(graphics, COBBLESTONE);

    // Awning fabric (striped)
    for (let i = 0; i < 4; i++) {
      const x = 4 + i * 7;
      const isAccent = i % 2 === 0;
      const stripeColor = isAccent ? fabric.base : WHITEWASH.base;

      graphics.fillStyle(stripeColor, 0.8);
      graphics.fillRect(x, 2, 6, 12);

      // Fabric fold shadow
      graphics.fillStyle(isAccent ? fabric.shadow : WHITEWASH.shadow, 0.3);
      graphics.fillRect(x + 4, 2, 2, 12);
    }

    // Awning edge shadow
    graphics.fillStyle(SHADOW_COLOR, 0.2);
    graphics.fillRect(4, 10, 24, 4);

    this.drawIsometricEdges(graphics, COBBLESTONE);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * Generate crate decoration
   */
  generateCrates(): void {
    const key = 'tile_crates';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Shadow
    graphics.fillStyle(SHADOW_COLOR, 0.25);
    graphics.fillEllipse(16, 14, 16, 4);

    // Back crate
    graphics.fillStyle(WOOD_LIGHT.base, 1);
    graphics.fillRect(10, 4, 10, 8);
    graphics.fillStyle(WOOD_LIGHT.highlight, 0.4);
    graphics.fillRect(10, 4, 3, 8);
    graphics.lineStyle(1, WOOD_LIGHT.deep, 0.6);
    graphics.strokeRect(10, 4, 10, 8);
    graphics.lineBetween(15, 4, 15, 12);

    // Front crate
    graphics.fillStyle(WOOD_DARK.base, 1);
    graphics.fillRect(6, 7, 12, 9);
    graphics.fillStyle(WOOD_DARK.highlight, 0.4);
    graphics.fillRect(6, 7, 4, 9);
    graphics.lineStyle(1, WOOD_DARK.deep, 0.7);
    graphics.strokeRect(6, 7, 12, 9);
    graphics.lineBetween(12, 7, 12, 16);

    // Side small crate
    graphics.fillStyle(WOOD_LIGHT.shadow, 1);
    graphics.fillRect(20, 8, 6, 8);
    graphics.lineStyle(1, WOOD_LIGHT.deep, 0.5);
    graphics.strokeRect(20, 8, 6, 8);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * Generate barrel decoration
   */
  generateBarrels(): void {
    const key = 'tile_barrels';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Shadow
    graphics.fillStyle(SHADOW_COLOR, 0.2);
    graphics.fillEllipse(16, 14, 12, 4);

    // Barrel body
    graphics.fillStyle(WOOD_DARK.base, 1);
    graphics.fillEllipse(16, 8, 10, 14);
    graphics.fillStyle(WOOD_DARK.highlight, 0.3);
    graphics.fillEllipse(13, 7, 5, 12);

    // Metal bands
    graphics.fillStyle(STONE.shadow, 1);
    graphics.fillRect(8, 4, 16, 2);
    graphics.fillRect(8, 10, 16, 2);
    graphics.fillStyle(STONE.base, 0.5);
    graphics.fillRect(8, 4, 16, 1);

    // Wood grain
    graphics.lineStyle(1, WOOD_DARK.shadow, 0.4);
    graphics.lineBetween(12, 2, 12, 14);
    graphics.lineBetween(16, 2, 16, 14);
    graphics.lineBetween(20, 2, 20, 14);

    // Top
    graphics.fillStyle(WOOD_DARK.shadow, 1);
    graphics.fillEllipse(16, 2, 8, 3);
    graphics.fillStyle(WOOD_DARK.base, 0.6);
    graphics.fillEllipse(15, 1, 5, 2);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * Generate small plants/vegetation
   */
  generateSmallPlants(): void {
    const key = 'tile_small_plants';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Transparent base
    // Plant cluster 1
    this.drawSmallPlant(graphics, 8, 10, 0.8);
    this.drawSmallPlant(graphics, 14, 8, 1.0);
    this.drawSmallPlant(graphics, 20, 11, 0.6);

    // Fallen leaves
    graphics.fillStyle(PALM_FROND.shadow, 0.4);
    graphics.fillEllipse(24, 13, 2, 1);
    graphics.fillStyle(GRASS.shadow, 0.5);
    graphics.fillEllipse(6, 12, 1.5, 0.8);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  private drawSmallPlant(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number
  ): void {
    // Stem
    graphics.fillStyle(GRASS.shadow, 0.8);
    graphics.fillRect(x - 0.5 * scale, y - 4 * scale, 1 * scale, 4 * scale);

    // Leaves
    graphics.fillStyle(GRASS.base, 0.7);
    graphics.fillEllipse(x - 2 * scale, y - 3 * scale, 2 * scale, 1 * scale);
    graphics.fillEllipse(x + 2 * scale, y - 2 * scale, 2 * scale, 1 * scale);

    // Tip
    graphics.fillStyle(GRASS.highlight, 0.6);
    graphics.fillCircle(x, y - 4 * scale, 1.5 * scale);
  }

  /**
   * Generate palm tree shadow
   */
  generatePalmShadow(): void {
    const key = 'tile_palm_shadow';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Palm frond shadows cast on ground
    graphics.fillStyle(SHADOW_COLOR, SHADOW_ALPHA * 0.6);

    // Multiple frond shadows
    graphics.beginPath();
    graphics.moveTo(16, 6);
    graphics.lineTo(4, 10);
    graphics.lineTo(8, 8);
    graphics.lineTo(16, 4);
    graphics.closePath();
    graphics.fillPath();

    graphics.beginPath();
    graphics.moveTo(16, 6);
    graphics.lineTo(28, 10);
    graphics.lineTo(24, 8);
    graphics.lineTo(16, 4);
    graphics.closePath();
    graphics.fillPath();

    // Trunk shadow
    graphics.fillStyle(SHADOW_COLOR, SHADOW_ALPHA * 0.8);
    graphics.fillEllipse(16, 12, 4, 2);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Draw the basic isometric diamond shape
   */
  private drawIsometricDiamond(graphics: Phaser.GameObjects.Graphics): void {
    graphics.beginPath();
    graphics.moveTo(TILE_WIDTH / 2, 0); // Top
    graphics.lineTo(TILE_WIDTH, TILE_HEIGHT / 2); // Right
    graphics.lineTo(TILE_WIDTH / 2, TILE_HEIGHT); // Bottom
    graphics.lineTo(0, TILE_HEIGHT / 2); // Left
    graphics.closePath();
  }

  /**
   * Draw base isometric tile with color ramp
   */
  private drawIsometricBase(graphics: Phaser.GameObjects.Graphics, colors: ColorRamp): void {
    graphics.fillStyle(colors.base, 1);
    this.drawIsometricDiamond(graphics);
    graphics.fillPath();

    // Top-left highlight gradient
    graphics.fillStyle(colors.highlight, 0.3);
    graphics.beginPath();
    graphics.moveTo(TILE_WIDTH / 2, 0);
    graphics.lineTo(TILE_WIDTH / 2 + 4, TILE_HEIGHT / 4);
    graphics.lineTo(TILE_WIDTH / 2, TILE_HEIGHT / 2);
    graphics.lineTo(TILE_WIDTH / 2 - 4, TILE_HEIGHT / 4);
    graphics.closePath();
    graphics.fillPath();
  }

  /**
   * Draw isometric edge highlights and shadows
   */
  private drawIsometricEdges(graphics: Phaser.GameObjects.Graphics, colors: ColorRamp): void {
    // Light edge (top-left)
    graphics.lineStyle(1, 0xffffff, 0.15);
    graphics.beginPath();
    graphics.moveTo(TILE_WIDTH / 2, 1);
    graphics.lineTo(1, TILE_HEIGHT / 2);
    graphics.strokePath();

    // Shadow edge (bottom-right)
    graphics.lineStyle(1, colors.deep, 0.4);
    graphics.beginPath();
    graphics.moveTo(TILE_WIDTH - 1, TILE_HEIGHT / 2);
    graphics.lineTo(TILE_WIDTH / 2, TILE_HEIGHT - 1);
    graphics.strokePath();
  }

  /**
   * Check if a point is within the isometric tile bounds
   */
  private isInIsometricBounds(x: number, y: number): boolean {
    // Convert to tile-relative coordinates
    const relX = x - TILE_WIDTH / 2;
    const relY = y - TILE_HEIGHT / 2;

    // Check if point is inside the isometric diamond
    // The diamond equation: |x/w| + |y/h| <= 0.5
    const normalizedX = Math.abs(relX) / TILE_WIDTH;
    const normalizedY = Math.abs(relY) / TILE_HEIGHT;

    return normalizedX + normalizedY <= 0.5;
  }

  /**
   * Create a spritesheet key for animated water tiles
   */
  getWaterAnimationKeys(type: 'harbor' | 'river'): string[] {
    const keys: string[] = [];
    for (let i = 0; i < WATER_ANIMATION_FRAMES; i++) {
      keys.push(`tile_${type}_water_${i}`);
    }
    return keys;
  }
}

/**
 * Helper function to create and initialize a tile generator
 */
export function createTileGenerator(scene: Phaser.Scene, seed?: number): TileGenerator {
  const generator = new TileGenerator(scene, seed);
  return generator;
}
