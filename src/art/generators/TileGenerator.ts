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
  RGBA,
  COBBLESTONE,
  DIRT,
  SAND,
  GRASS,
  WATER_HARBOR,
  WATER_RIVER,
  WATER_SOFT,
  WATER_FOAM,
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
  // Extended ramps for 5-level shading
  EXTENDED_RAMPS,
  // Pattern generators
  generateStonePattern,
  generateWaterRipplePattern,
  generateLateritePattern,
  generateCalcadaPattern,
  // Dithering utilities
  ditherPixel,
  colorToInt,
  hexToRGBA,
  rgbaToHex,
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

// New tile types for Goa historical accuracy
export type LateriteVariant = 'standard' | 'rocky' | 'dusty' | 'worn';
export type CalcadaVariant = 'wave' | 'checkerboard' | 'border';
export type WaterVariant = 'harbor' | 'river' | 'shallow';
export type ShorelineEdge = 'north' | 'south' | 'east' | 'west' | 'ne' | 'nw' | 'se' | 'sw';

// Water animation frame count (Phase 2: expanded from 4 to 8 for smoother animation)
const WATER_ANIMATION_FRAMES = 8;
// Legacy frame count for low quality
const WATER_ANIMATION_FRAMES_LOW = 4;

/**
 * Quality configuration for tile generation
 */
export interface TileQualityConfig {
  /** Use pattern textures from palette.ts (stone, water ripples) */
  usePatternTextures: boolean;
  /** Use Bayer dithering for transitions */
  useDithering: boolean;
  /** Apply ambient occlusion to tile edges */
  useAmbientOcclusion: boolean;
  /** Use 5-level extended color ramps */
  use5LevelShading: boolean;
  /** Number of water animation frames (4 low/medium, 8 high) */
  waterAnimationFrames: number;
  /** Enable shoreline foam effects */
  useShorelineFoam: boolean;
  /** Enable sky reflection on water */
  useSkyReflection: boolean;
  /** Use soft muted water palette (more realistic) */
  useSoftWaterPalette: boolean;
  /** Enable tile variation to reduce repetition */
  useTileVariation: boolean;
  /** Number of variations per tile type (2-4) */
  tileVariationCount: number;
  /** Enable color noise for subtle per-pixel variation */
  useColorNoise: boolean;
}

/** Default quality configs */
const TILE_QUALITY_PRESETS: Record<'low' | 'medium' | 'high', TileQualityConfig> = {
  low: {
    usePatternTextures: false,
    useDithering: false,
    useAmbientOcclusion: false,
    use5LevelShading: false,
    waterAnimationFrames: WATER_ANIMATION_FRAMES_LOW,
    useShorelineFoam: false,
    useSkyReflection: false,
    useSoftWaterPalette: false,
    useTileVariation: false,
    tileVariationCount: 2,
    useColorNoise: false,
  },
  medium: {
    usePatternTextures: true,
    useDithering: false,
    useAmbientOcclusion: true,
    use5LevelShading: true,
    waterAnimationFrames: 6, // Medium gets 6 frames
    useShorelineFoam: true,
    useSkyReflection: false,
    useSoftWaterPalette: true,
    useTileVariation: true,
    tileVariationCount: 3,
    useColorNoise: false,
  },
  high: {
    usePatternTextures: true,
    useDithering: true,
    useAmbientOcclusion: true,
    use5LevelShading: true,
    waterAnimationFrames: WATER_ANIMATION_FRAMES, // Full 8 frames
    useShorelineFoam: true,
    useSkyReflection: true,
    useSoftWaterPalette: true,
    useTileVariation: true,
    tileVariationCount: 4,
    useColorNoise: true,
  },
};

/**
 * Main TileGenerator class
 * Generates procedural isometric tiles and adds them to Phaser's texture manager
 */
export class TileGenerator {
  private scene: Phaser.Scene;
  private noise: SimpleNoise;
  private seed: number;
  private qualityConfig: TileQualityConfig;

  constructor(scene: Phaser.Scene, seed: number = 12345, quality: 'low' | 'medium' | 'high' = 'high') {
    this.scene = scene;
    this.noise = new SimpleNoise(seed);
    this.seed = seed;
    this.qualityConfig = TILE_QUALITY_PRESETS[quality];
  }

  /**
   * Set quality configuration
   */
  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.qualityConfig = TILE_QUALITY_PRESETS[quality];
  }

  /**
   * Set custom quality configuration
   */
  setQualityConfig(config: Partial<TileQualityConfig>): void {
    this.qualityConfig = { ...this.qualityConfig, ...config };
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

    // New Goa-specific ground tiles
    this.generateLaterite('standard');
    this.generateLaterite('rocky');
    this.generateLaterite('dusty');
    this.generateLaterite('worn');
    this.generateCalcadaPortuguesa('wave');
    this.generateCalcadaPortuguesa('checkerboard');
    this.generateCalcadaPortuguesa('border');

    // Water tiles (animated) - now with soft water option
    this.generateHarborWater();
    this.generateRiverWater();
    this.generateSoftWater(); // New softer water
    this.generatePuddles();

    // Transition tiles
    this.generateGroundToWaterEdge('cobble');
    this.generateGroundToWaterEdge('dirt');
    this.generateGroundToWaterEdge('sand');
    this.generateGroundToWaterEdge('laterite'); // New
    this.generateCobbleToDirtTransition();
    this.generateSandToGrassTransition();
    this.generateDirtToGrassTransition();
    this.generateShadowOverlay();

    // Shoreline tiles with proper water-ground blending
    this.generateShorelineTiles();

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
    if (this.qualityConfig.usePatternTextures) {
      // Use sophisticated stone pattern generator for high quality
      this.drawPatternCobblestones(graphics);
    } else {
      // Legacy fallback for low quality
      this.drawLegacyCobblestones(graphics);
    }
  }

  /**
   * High-quality cobblestones using generateStonePattern()
   */
  private drawPatternCobblestones(graphics: Phaser.GameObjects.Graphics): void {
    // Generate stone pattern
    const pattern = generateStonePattern({
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      scale: 6, // Slightly smaller stones for worn appearance
      variation: 0.25,
      seed: this.seed,
    });

    // Apply pattern within isometric bounds
    for (let y = 0; y < TILE_HEIGHT; y++) {
      for (let x = 0; x < TILE_WIDTH; x++) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const pixel = pattern[y][x];
        const color = colorToInt(pixel);

        // Apply subtle worn effect - lighten and reduce saturation
        const noiseVal = this.noise.noise2D(x * 0.2, y * 0.2);
        const wornAmount = 0.15 + noiseVal * 0.1;

        // Draw pixel with slight transparency for worn look
        graphics.fillStyle(color, 0.85 - wornAmount * 0.2);
        graphics.fillRect(x, y, 1, 1);
      }
    }

    // Add worn highlights where stones are polished smooth
    const highlightPositions = [
      { x: 10, y: 6, size: 3 },
      { x: 18, y: 8, size: 2.5 },
      { x: 24, y: 7, size: 2 },
    ];

    for (const pos of highlightPositions) {
      if (this.isInIsometricBounds(pos.x, pos.y)) {
        graphics.fillStyle(EXTENDED_RAMPS.STONE.highlight.rgb.r << 16 |
                          EXTENDED_RAMPS.STONE.highlight.rgb.g << 8 |
                          EXTENDED_RAMPS.STONE.highlight.rgb.b, 0.2);
        graphics.fillEllipse(pos.x, pos.y, pos.size, pos.size * 0.5);
      }
    }
  }

  /**
   * Legacy cobblestone rendering for low quality
   */
  private drawLegacyCobblestones(graphics: Phaser.GameObjects.Graphics): void {
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
  // GOA-SPECIFIC GROUND TILES
  // ============================================

  /**
   * Generate Red Laterite Soil tile - historically accurate for Goa
   * The distinctive red earth of the Konkan coast
   */
  generateLaterite(variant: LateriteVariant): void {
    const key = `tile_laterite_${variant}`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Laterite color ramp (red-brown Goan soil)
    const lateriteColors: ColorRamp = {
      highlight: 0xc86840,  // Sunlit red
      base: 0xa05030,       // Standard laterite red
      shadow: 0x803820,     // Shaded earth
      deep: 0x602810,       // Deep shadow
    };

    // Base isometric diamond
    this.drawIsometricBase(graphics, lateriteColors);

    if (this.qualityConfig.usePatternTextures) {
      // Use sophisticated laterite pattern
      this.drawPatternLaterite(graphics, variant);
    } else {
      // Simple fallback
      this.drawSimpleLaterite(graphics, variant);
    }

    this.drawIsometricEdges(graphics, lateriteColors);

    // Apply ambient occlusion for depth
    if (this.qualityConfig.useAmbientOcclusion) {
      this.applyTileAmbientOcclusion(graphics, lateriteColors);
    }

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * High-quality laterite rendering using pattern generator
   */
  private drawPatternLaterite(graphics: Phaser.GameObjects.Graphics, variant: LateriteVariant): void {
    // Generate laterite pattern
    const pattern = generateLateritePattern({
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      scale: variant === 'rocky' ? 4 : 3,
      variation: variant === 'dusty' ? 0.3 : 0.2,
      seed: this.seed + (variant === 'worn' ? 1000 : 0),
    });

    // Apply pattern within isometric bounds
    for (let y = 0; y < TILE_HEIGHT; y++) {
      for (let x = 0; x < TILE_WIDTH; x++) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const pixel = pattern[y][x];
        let color = colorToInt(pixel);

        // Variant-specific modifications
        if (variant === 'dusty') {
          // Add dusty overlay
          const dustNoise = this.noise.noise2D(x * 0.3, y * 0.3);
          if (dustNoise > 0.2) {
            graphics.fillStyle(color, 1);
            graphics.fillRect(x, y, 1, 1);
            graphics.fillStyle(0xd4a574, dustNoise * 0.3); // Sand dust
            graphics.fillRect(x, y, 1, 1);
            continue;
          }
        } else if (variant === 'worn') {
          // Add worn/polished spots
          const wornNoise = this.noise.fbm(x * 0.2, y * 0.2, 2);
          if (wornNoise > 0.3) {
            graphics.fillStyle(color, 0.85);
            graphics.fillRect(x, y, 1, 1);
            continue;
          }
        }

        // Add subtle color noise for variation
        if (this.qualityConfig.useColorNoise) {
          const noiseVal = this.noise.noise2D(x * 0.5, y * 0.5) * 0.08;
          const r = Math.max(0, Math.min(255, pixel.r + Math.round(noiseVal * 40)));
          const g = Math.max(0, Math.min(255, pixel.g + Math.round(noiseVal * 30)));
          const b = Math.max(0, Math.min(255, pixel.b + Math.round(noiseVal * 20)));
          color = (r << 16) | (g << 8) | b;
        }

        graphics.fillStyle(color, 1);
        graphics.fillRect(x, y, 1, 1);
      }
    }

    // Add small rocks for 'rocky' variant
    if (variant === 'rocky') {
      const rockPositions = [
        { x: 10, y: 6, size: 2 },
        { x: 22, y: 8, size: 1.5 },
        { x: 14, y: 10, size: 2.5 },
      ];
      for (const rock of rockPositions) {
        if (this.isInIsometricBounds(rock.x, rock.y)) {
          graphics.fillStyle(0x704028, 0.7);
          graphics.fillEllipse(rock.x, rock.y, rock.size * 2, rock.size);
          graphics.fillStyle(0x906040, 0.4);
          graphics.fillEllipse(rock.x - 0.5, rock.y - 0.3, rock.size, rock.size * 0.5);
        }
      }
    }
  }

  /**
   * Simple laterite rendering for low quality
   */
  private drawSimpleLaterite(graphics: Phaser.GameObjects.Graphics, _variant: LateriteVariant): void {
    // Draw basic texture
    for (let x = 4; x < TILE_WIDTH - 4; x += 3) {
      for (let y = 2; y < TILE_HEIGHT - 2; y += 2) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const noiseVal = this.noise.noise2D(x * 0.3, y * 0.3);
        const color = lerpColor(0x803820, 0xa05030, 0.5 + noiseVal * 0.3);
        graphics.fillStyle(color, 0.5);
        graphics.fillCircle(x, y, 1 + noiseVal * 0.5);
      }
    }
  }

  /**
   * Generate Calçada Portuguesa (Portuguese Cobblestone) tile
   * The iconic black and white wave patterns of Portuguese pavement
   */
  generateCalcadaPortuguesa(variant: CalcadaVariant): void {
    const key = `tile_calcada_${variant}`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Base with neutral stone
    const baseColors: ColorRamp = {
      highlight: 0xf0ebe0,
      base: 0xe0d8c8,
      shadow: 0xc8c0b0,
      deep: 0xa8a090,
    };

    this.drawIsometricBase(graphics, baseColors);

    if (this.qualityConfig.usePatternTextures) {
      this.drawPatternCalcada(graphics, variant);
    } else {
      this.drawSimpleCalcada(graphics, variant);
    }

    this.drawIsometricEdges(graphics, baseColors);

    if (this.qualityConfig.useAmbientOcclusion) {
      this.applyTileAmbientOcclusion(graphics, baseColors);
    }

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * High-quality Calçada pattern
   */
  private drawPatternCalcada(graphics: Phaser.GameObjects.Graphics, variant: CalcadaVariant): void {
    const useWavePattern = variant === 'wave';
    const pattern = generateCalcadaPattern({
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      scale: variant === 'border' ? 3 : 4,
      variation: 0.1,
      seed: this.seed,
    }, useWavePattern);

    // Apply pattern
    for (let y = 0; y < TILE_HEIGHT; y++) {
      for (let x = 0; x < TILE_WIDTH; x++) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const pixel = pattern[y][x];
        let color = colorToInt(pixel);

        // Add subtle wear
        if (this.qualityConfig.useColorNoise) {
          const wearNoise = this.noise.noise2D(x * 0.4, y * 0.4);
          if (wearNoise > 0.4) {
            const wearAmount = (wearNoise - 0.4) * 0.2;
            const r = Math.min(255, pixel.r + Math.round(wearAmount * 30));
            const g = Math.min(255, pixel.g + Math.round(wearAmount * 25));
            const b = Math.min(255, pixel.b + Math.round(wearAmount * 20));
            color = (r << 16) | (g << 8) | b;
          }
        }

        graphics.fillStyle(color, 1);
        graphics.fillRect(x, y, 1, 1);
      }
    }

    // Border variant gets decorative edge
    if (variant === 'border') {
      graphics.lineStyle(1, 0x303030, 0.4);
      graphics.beginPath();
      graphics.moveTo(16, 2);
      graphics.lineTo(28, 8);
      graphics.lineTo(16, 14);
      graphics.lineTo(4, 8);
      graphics.closePath();
      graphics.strokePath();
    }
  }

  /**
   * Simple Calçada for low quality
   */
  private drawSimpleCalcada(graphics: Phaser.GameObjects.Graphics, variant: CalcadaVariant): void {
    const useWave = variant === 'wave';

    // Draw simple checkerboard or wave pattern
    for (let x = 2; x < TILE_WIDTH - 2; x += 4) {
      for (let y = 1; y < TILE_HEIGHT - 1; y += 4) {
        if (!this.isInIsometricBounds(x + 2, y + 2)) continue;

        const gridX = Math.floor(x / 4);
        const gridY = Math.floor(y / 4);

        let isBlack: boolean;
        if (useWave) {
          const waveVal = Math.sin(gridX * 0.8 + Math.sin(gridY * 0.5) * 2);
          isBlack = waveVal > 0;
        } else {
          isBlack = (gridX + gridY) % 2 === 0;
        }

        graphics.fillStyle(isBlack ? 0x303030 : 0xf0f0e8, 0.7);
        graphics.fillRect(x, y, 3, 3);
      }
    }
  }

  // ============================================
  // WATER TILES (ANIMATED)
  // ============================================

  /**
   * Generate animated harbor water (4-8 frames based on quality)
   */
  generateHarborWater(): void {
    const frameCount = this.qualityConfig.waterAnimationFrames;
    for (let frame = 0; frame < frameCount; frame++) {
      const key = `tile_harbor_water_${frame}`;
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });

      this.drawWaterTile(graphics, WATER_HARBOR, frame, 'harbor', frameCount);

      graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
      graphics.destroy();
    }
  }

  /**
   * Generate animated river water (4-8 frames based on quality)
   */
  generateRiverWater(): void {
    const frameCount = this.qualityConfig.waterAnimationFrames;
    for (let frame = 0; frame < frameCount; frame++) {
      const key = `tile_river_water_${frame}`;
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });

      this.drawWaterTile(graphics, WATER_RIVER, frame, 'river', frameCount);

      graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
      graphics.destroy();
    }
  }

  private drawWaterTile(
    graphics: Phaser.GameObjects.Graphics,
    colors: ColorRamp,
    frame: number,
    type: 'harbor' | 'river',
    totalFrames: number = WATER_ANIMATION_FRAMES
  ): void {
    if (this.qualityConfig.usePatternTextures) {
      // Use sophisticated water ripple pattern for high quality
      this.drawPatternWater(graphics, colors, frame, type, totalFrames);
    } else {
      // Legacy fallback for low quality
      this.drawLegacyWater(graphics, colors, frame, type, totalFrames);
    }
  }

  /**
   * High-quality water using generateWaterRipplePattern()
   * Phase 2: Expanded to 8 frames with wave crest/trough cycles
   */
  private drawPatternWater(
    graphics: Phaser.GameObjects.Graphics,
    colors: ColorRamp,
    frame: number,
    type: 'harbor' | 'river',
    totalFrames: number = WATER_ANIMATION_FRAMES
  ): void {
    // Phase 2: Calculate wave cycle phase
    // Frames 0-3: Ripple pattern (base animation)
    // Frames 4-7: Wave crest and trough cycle (adds height variation)
    const isWaveCycle = frame >= 4 && totalFrames === 8;
    const waveFrame = isWaveCycle ? frame - 4 : frame;
    const wavePhase = (waveFrame / 4) * Math.PI * 2;

    // Generate water pattern with animation frame
    const pattern = generateWaterRipplePattern(
      {
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        scale: type === 'river' ? 3 : 4, // Smaller ripples for river
        seed: this.seed + (frame % 4) * 1000, // Different seed per frame for variation
      },
      frame % 4
    );

    // Apply pattern within isometric bounds
    for (let y = 0; y < TILE_HEIGHT; y++) {
      for (let x = 0; x < TILE_WIDTH; x++) {
        if (!this.isInIsometricBounds(x, y)) continue;

        const pixel = pattern[y][x];
        let color = colorToInt(pixel);

        // Phase 2: Wave crest/trough effect for frames 4-7
        if (isWaveCycle) {
          // Calculate wave height variation based on position
          const normalizedX = x / TILE_WIDTH;
          const waveHeight = Math.sin(wavePhase + normalizedX * Math.PI * 2);

          // Crest (lighter) or trough (darker)
          if (waveHeight > 0.3) {
            // Crest - lighten the pixel
            graphics.fillStyle(color, 1);
            graphics.fillRect(x, y, 1, 1);
            graphics.fillStyle(colors.highlight, waveHeight * 0.3);
            graphics.fillRect(x, y, 1, 1);
            continue;
          } else if (waveHeight < -0.3) {
            // Trough - darken the pixel
            graphics.fillStyle(color, 1);
            graphics.fillRect(x, y, 1, 1);
            graphics.fillStyle(colors.deep, Math.abs(waveHeight) * 0.25);
            graphics.fillRect(x, y, 1, 1);
            continue;
          }
        }

        // River flows faster - add directional shift (visual variation in pattern already handles this)
        if (type === 'river') {
          // Flow effect already incorporated in the pattern seed variation per frame
        }

        graphics.fillStyle(color, 1);
        graphics.fillRect(x, y, 1, 1);
      }
    }

    // Phase 2: Sky reflection effect
    if (this.qualityConfig.useSkyReflection) {
      // Default to neutral blue-white sky reflection
      // In actual gameplay, this would be tinted by AtmosphereSystem's getCurrentSkyColor()
      const skyReflectionColor = 0x87CEEB; // Light sky blue
      const skyReflectionAlpha = 0.08 + Math.sin(wavePhase) * 0.02;

      graphics.fillStyle(skyReflectionColor, skyReflectionAlpha);
      graphics.beginPath();
      graphics.moveTo(16, 4);
      graphics.lineTo(24, 8);
      graphics.lineTo(16, 10);
      graphics.lineTo(8, 8);
      graphics.closePath();
      graphics.fillPath();
    }

    // Add depth gradient in center
    if (this.qualityConfig.useAmbientOcclusion) {
      graphics.fillStyle(colors.deep, 0.25);
      graphics.beginPath();
      graphics.moveTo(16, 5);
      graphics.lineTo(24, 8);
      graphics.lineTo(16, 11);
      graphics.lineTo(8, 8);
      graphics.closePath();
      graphics.fillPath();
    }

    // Add animated sparkles
    const sparklePhase = (frame / totalFrames) * Math.PI * 2;
    const sparkleCount = totalFrames >= 8 ? 4 : 3; // More sparkles for 8-frame animation
    for (let i = 0; i < sparkleCount; i++) {
      const sx = 6 + i * 6 + Math.cos(sparklePhase + i * 1.2) * 3;
      const sy = 4 + i * 2.5 + Math.sin(sparklePhase + i * 0.8) * 1.5;

      if (this.isInIsometricBounds(sx, sy)) {
        const alpha = 0.4 + Math.abs(Math.sin(sparklePhase + i * 0.7)) * 0.5;
        graphics.fillStyle(0xffffff, alpha);
        graphics.fillCircle(sx, sy, 0.8 + Math.sin(sparklePhase) * 0.3);
      }
    }

    // Phase 2: Enhanced shoreline foam for harbor
    if (type === 'harbor' && this.qualityConfig.useShorelineFoam) {
      this.drawShorelineFoam(graphics, frame, totalFrames);
    } else if (type === 'harbor') {
      // Basic foam for lower quality settings
      const foamAlpha = 0.15 + Math.sin(sparklePhase) * 0.05;
      graphics.fillStyle(0xffffff, foamAlpha);
      graphics.fillEllipse(6, 8, 3 + Math.sin(sparklePhase) * 0.5, 1);
      graphics.fillEllipse(26, 8, 3 + Math.cos(sparklePhase) * 0.5, 1);
    }
  }

  /**
   * Phase 2: Draw enhanced shoreline foam sprites
   * Creates realistic foam accumulation at water edges
   */
  private drawShorelineFoam(
    graphics: Phaser.GameObjects.Graphics,
    frame: number,
    totalFrames: number
  ): void {
    const foamPhase = (frame / totalFrames) * Math.PI * 2;

    // Multiple foam patches at varying positions
    const foamPatches = [
      { x: 5, y: 8, baseSize: 3, offset: 0 },
      { x: 8, y: 8.5, baseSize: 2.5, offset: 0.5 },
      { x: 24, y: 8, baseSize: 3, offset: Math.PI * 0.5 },
      { x: 27, y: 8.5, baseSize: 2, offset: Math.PI * 0.7 },
    ];

    for (const patch of foamPatches) {
      const animatedSize = patch.baseSize + Math.sin(foamPhase + patch.offset) * 0.8;
      const animatedY = patch.y + Math.cos(foamPhase + patch.offset) * 0.5;

      // Outer foam (more transparent)
      const outerAlpha = 0.1 + Math.sin(foamPhase + patch.offset) * 0.03;
      graphics.fillStyle(0xffffff, outerAlpha);
      graphics.fillEllipse(patch.x, animatedY, animatedSize * 1.3, 1.2);

      // Inner foam (more opaque)
      const innerAlpha = 0.2 + Math.sin(foamPhase + patch.offset + 0.3) * 0.08;
      graphics.fillStyle(0xffffff, innerAlpha);
      graphics.fillEllipse(patch.x, animatedY, animatedSize * 0.8, 0.8);

      // Foam bubbles (small bright spots)
      if (frame % 2 === 0) {
        graphics.fillStyle(0xffffff, 0.35);
        graphics.fillCircle(patch.x + Math.cos(foamPhase) * 1.5, animatedY - 0.3, 0.5);
      }
    }
  }

  /**
   * Legacy water rendering for low quality
   */
  private drawLegacyWater(
    graphics: Phaser.GameObjects.Graphics,
    colors: ColorRamp,
    frame: number,
    type: 'harbor' | 'river',
    totalFrames: number = WATER_ANIMATION_FRAMES_LOW
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
    const waveOffset = (frame / totalFrames) * Math.PI * 2;
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

  /**
   * Generate soft, muted water tiles - more realistic harbor water
   * Uses a desaturated blue-gray palette with subtle transparency
   */
  generateSoftWater(): void {
    const frameCount = this.qualityConfig.waterAnimationFrames;
    const colors = this.qualityConfig.useSoftWaterPalette ? WATER_SOFT : WATER_HARBOR;

    for (let frame = 0; frame < frameCount; frame++) {
      const key = `tile_soft_water_${frame}`;
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });

      this.drawSoftWaterTile(graphics, colors, frame, frameCount);

      graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
      graphics.destroy();
    }
  }

  /**
   * Draw soft water with muted colors and subtle animation
   */
  private drawSoftWaterTile(
    graphics: Phaser.GameObjects.Graphics,
    colors: ColorRamp,
    frame: number,
    totalFrames: number
  ): void {
    const wavePhase = (frame / totalFrames) * Math.PI * 2;

    // Base water - slightly transparent for soft look
    graphics.fillStyle(colors.base, 0.92);
    this.drawIsometricDiamond(graphics);
    graphics.fillPath();

    // Depth gradient - darker center, lighter edges
    graphics.fillStyle(colors.deep, 0.35);
    graphics.beginPath();
    graphics.moveTo(16, 5);
    graphics.lineTo(24, 8);
    graphics.lineTo(16, 11);
    graphics.lineTo(8, 8);
    graphics.closePath();
    graphics.fillPath();

    // Subtle wave patterns - softer than regular water
    for (let i = 0; i < 4; i++) {
      const phase = wavePhase + i * 0.6;
      const x = 7 + i * 6 + Math.sin(phase) * 1.5;
      const y = 4 + i * 2 + Math.cos(phase * 0.8) * 0.8;

      if (this.isInIsometricBounds(x, y)) {
        // Soft highlight lines - very subtle
        graphics.lineStyle(1, colors.highlight, 0.2 + Math.sin(phase) * 0.1);
        graphics.lineBetween(x - 2, y, x + 2, y + 0.3);
      }
    }

    // Very subtle sparkles - fewer and softer than regular water
    const sparkleCount = 2;
    for (let i = 0; i < sparkleCount; i++) {
      const sx = 10 + i * 10 + Math.cos(wavePhase + i) * 2;
      const sy = 5 + i * 3 + Math.sin(wavePhase + i * 0.5) * 1;

      if (this.isInIsometricBounds(sx, sy)) {
        const alpha = 0.15 + Math.abs(Math.sin(wavePhase + i)) * 0.2;
        graphics.fillStyle(0xffffff, alpha);
        graphics.fillCircle(sx, sy, 0.6);
      }
    }

    // Sky reflection - subtle blue tint
    if (this.qualityConfig.useSkyReflection) {
      const reflectionAlpha = 0.04 + Math.sin(wavePhase * 0.5) * 0.01;
      graphics.fillStyle(0xa8c8d8, reflectionAlpha);
      graphics.beginPath();
      graphics.moveTo(16, 4);
      graphics.lineTo(22, 8);
      graphics.lineTo(16, 10);
      graphics.lineTo(10, 8);
      graphics.closePath();
      graphics.fillPath();
    }
  }

  /**
   * Generate all shoreline transition tiles
   * Creates proper water-ground blending for natural-looking edges
   */
  generateShorelineTiles(): void {
    // Generate shoreline tiles for each edge direction
    const edges: ShorelineEdge[] = ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw'];

    for (const edge of edges) {
      this.generateShorelineEdge(edge);
    }
  }

  /**
   * Generate a single shoreline edge tile
   */
  private generateShorelineEdge(edge: ShorelineEdge): void {
    const key = `tile_shoreline_${edge}`;
    const frameCount = this.qualityConfig.waterAnimationFrames;

    // Generate animated frames for each shoreline edge
    for (let frame = 0; frame < frameCount; frame++) {
      const frameKey = `${key}_${frame}`;
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });

      this.drawShorelineEdgeTile(graphics, edge, frame, frameCount);

      graphics.generateTexture(frameKey, TILE_WIDTH, TILE_HEIGHT);
      graphics.destroy();
    }
  }

  /**
   * Draw shoreline edge tile with proper water-ground blending
   */
  private drawShorelineEdgeTile(
    graphics: Phaser.GameObjects.Graphics,
    edge: ShorelineEdge,
    frame: number,
    totalFrames: number
  ): void {
    const wavePhase = (frame / totalFrames) * Math.PI * 2;
    const waterColors = this.qualityConfig.useSoftWaterPalette ? WATER_SOFT : WATER_HARBOR;

    // Laterite ground color (historically accurate for Goa)
    const groundColor = 0xa05030;
    const groundShadow = 0x803820;
    const sandColor = 0xd4b896; // Sandy transition

    // First, draw full ground base
    graphics.fillStyle(groundColor, 1);
    this.drawIsometricDiamond(graphics);
    graphics.fillPath();

    // Calculate water coverage based on edge direction
    let waterMask: { startX: number; startY: number; endX: number; endY: number };

    switch (edge) {
      case 'north':
        waterMask = { startX: 0, startY: 0, endX: 32, endY: 6 };
        break;
      case 'south':
        waterMask = { startX: 0, startY: 10, endX: 32, endY: 16 };
        break;
      case 'east':
        waterMask = { startX: 20, startY: 0, endX: 32, endY: 16 };
        break;
      case 'west':
        waterMask = { startX: 0, startY: 0, endX: 12, endY: 16 };
        break;
      case 'ne':
        waterMask = { startX: 16, startY: 0, endX: 32, endY: 8 };
        break;
      case 'nw':
        waterMask = { startX: 0, startY: 0, endX: 16, endY: 8 };
        break;
      case 'se':
        waterMask = { startX: 16, startY: 8, endX: 32, endY: 16 };
        break;
      case 'sw':
        waterMask = { startX: 0, startY: 8, endX: 16, endY: 16 };
        break;
    }

    // Draw water in the masked area
    for (let y = waterMask.startY; y < waterMask.endY; y++) {
      for (let x = waterMask.startX; x < waterMask.endX; x++) {
        if (!this.isInIsometricBounds(x, y)) continue;

        // Calculate distance from shore line for blending
        let distanceFromShore = 0;
        switch (edge) {
          case 'north': distanceFromShore = y / 6; break;
          case 'south': distanceFromShore = (16 - y) / 6; break;
          case 'east': distanceFromShore = (32 - x) / 12; break;
          case 'west': distanceFromShore = x / 12; break;
          case 'ne': distanceFromShore = Math.min((32 - x) / 16, y / 8); break;
          case 'nw': distanceFromShore = Math.min(x / 16, y / 8); break;
          case 'se': distanceFromShore = Math.min((32 - x) / 16, (16 - y) / 8); break;
          case 'sw': distanceFromShore = Math.min(x / 16, (16 - y) / 8); break;
        }

        distanceFromShore = Math.max(0, Math.min(1, distanceFromShore));

        // At the shore edge, draw sand/foam transition
        if (distanceFromShore < 0.3) {
          // Sandy/foam zone
          const foamNoise = this.noise.noise2D(x * 0.4 + wavePhase, y * 0.4);
          const foamIntensity = (0.3 - distanceFromShore) / 0.3 * (0.5 + foamNoise * 0.3);

          if (foamIntensity > 0.3) {
            // Foam/sand
            graphics.fillStyle(sandColor, 0.7 + foamIntensity * 0.3);
            graphics.fillRect(x, y, 1, 1);

            // White foam
            if (foamNoise > 0.2 && this.qualityConfig.useShorelineFoam) {
              const foamAlpha = 0.2 + Math.sin(wavePhase + x * 0.3) * 0.1;
              graphics.fillStyle(0xffffff, foamAlpha);
              graphics.fillRect(x, y, 1, 1);
            }
            continue;
          }
        }

        // Deep water
        const waveEffect = Math.sin(wavePhase + x * 0.15 + y * 0.1) * 0.1;
        const waterDepth = distanceFromShore + waveEffect;

        const waterColor = lerpColor(
          waterColors.shadow,
          waterColors.deep,
          Math.min(1, waterDepth)
        );

        graphics.fillStyle(waterColor, 0.85 + distanceFromShore * 0.15);
        graphics.fillRect(x, y, 1, 1);
      }
    }

    // Draw animated wave lap at shoreline
    if (this.qualityConfig.useShorelineFoam) {
      const waveOffset = Math.sin(wavePhase) * 1.5;

      graphics.fillStyle(WATER_FOAM.base, 0.25);
      switch (edge) {
        case 'north':
          graphics.fillEllipse(16, 5 + waveOffset, 10, 1.5);
          break;
        case 'south':
          graphics.fillEllipse(16, 11 - waveOffset, 10, 1.5);
          break;
        case 'west':
          graphics.fillEllipse(10 + waveOffset, 8, 2, 5);
          break;
        case 'east':
          graphics.fillEllipse(22 - waveOffset, 8, 2, 5);
          break;
        // Corner cases simplified
        case 'nw':
        case 'ne':
        case 'sw':
        case 'se':
          // Diagonal wave lap - simplified
          break;
      }
    }

    // Add edge shadow for depth
    if (this.qualityConfig.useAmbientOcclusion) {
      graphics.fillStyle(groundShadow, 0.2);
      switch (edge) {
        case 'south':
        case 'se':
        case 'sw':
          graphics.fillRect(6, 9, 20, 2);
          break;
      }
    }
  }

  // ============================================
  // TRANSITION TILES
  // ============================================

  /**
   * Generate ground-to-water edge transition
   */
  generateGroundToWaterEdge(groundType: 'cobble' | 'dirt' | 'sand' | 'laterite'): void {
    const key = `tile_${groundType}_water_edge`;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Laterite colors
    const lateriteColors: ColorRamp = {
      highlight: 0xc86840,
      base: 0xa05030,
      shadow: 0x803820,
      deep: 0x602810,
    };

    const groundColors =
      groundType === 'cobble' ? COBBLESTONE :
      groundType === 'dirt' ? DIRT :
      groundType === 'laterite' ? lateriteColors : SAND;

    const waterColors = this.qualityConfig.useSoftWaterPalette ? WATER_SOFT : WATER_HARBOR;

    // Water half (bottom-right)
    graphics.fillStyle(waterColors.base, 0.95);
    graphics.beginPath();
    graphics.moveTo(16, 8);
    graphics.lineTo(32, 16);
    graphics.lineTo(16, 16);
    graphics.lineTo(0, 16);
    graphics.closePath();
    graphics.fillPath();

    // Deeper water
    graphics.fillStyle(waterColors.shadow, 0.3);
    graphics.beginPath();
    graphics.moveTo(16, 10);
    graphics.lineTo(28, 14);
    graphics.lineTo(16, 16);
    graphics.lineTo(4, 14);
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

    // Add sandy transition zone between ground and water
    const sandColor = groundType === 'laterite' ? 0xc08060 : 0xd4b896;
    graphics.fillStyle(sandColor, 0.6);
    graphics.beginPath();
    graphics.moveTo(8, 7);
    graphics.lineTo(24, 7);
    graphics.lineTo(28, 9);
    graphics.lineTo(4, 9);
    graphics.closePath();
    graphics.fillPath();

    // Shore line details - darker edge
    graphics.lineStyle(1, groundColors.shadow, 0.5);
    graphics.lineBetween(4, 8, 28, 8);

    // Foam/splash at edge
    if (this.qualityConfig.useShorelineFoam) {
      graphics.fillStyle(0xffffff, 0.25);
      graphics.fillEllipse(10, 9, 4, 1.2);
      graphics.fillEllipse(22, 9, 3.5, 1);
      graphics.fillStyle(0xffffff, 0.15);
      graphics.fillEllipse(16, 9.5, 8, 1.5);
    }

    // Water depth near edge
    graphics.fillStyle(waterColors.deep, 0.25);
    graphics.fillEllipse(16, 13, 10, 2.5);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * Generate cobble-to-dirt transition
   */
  generateCobbleToDirtTransition(): void {
    const key = 'tile_cobble_dirt_transition';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    if (this.qualityConfig.useDithering) {
      // High-quality dithered transition
      this.drawDitheredTransition(graphics, 'cobble', 'dirt');
    } else {
      // Legacy transition
      this.drawLegacyCobbleDirtTransition(graphics);
    }

    this.drawIsometricEdges(graphics, DIRT);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * High-quality dithered transition between two ground types
   */
  private drawDitheredTransition(
    graphics: Phaser.GameObjects.Graphics,
    fromType: 'cobble' | 'dirt' | 'sand' | 'grass',
    toType: 'cobble' | 'dirt' | 'sand' | 'grass'
  ): void {
    const colorMaps: Record<string, { base: RGBA; shadow: RGBA; highlight: RGBA }> = {
      cobble: {
        base: this.qualityConfig.use5LevelShading
          ? EXTENDED_RAMPS.STONE.mid.rgb
          : hexToRGBA(rgbaToHex({ r: (COBBLESTONE.base >> 16) & 0xff, g: (COBBLESTONE.base >> 8) & 0xff, b: COBBLESTONE.base & 0xff, a: 255 })),
        shadow: this.qualityConfig.use5LevelShading
          ? EXTENDED_RAMPS.STONE.shadow.rgb
          : hexToRGBA(rgbaToHex({ r: (COBBLESTONE.shadow >> 16) & 0xff, g: (COBBLESTONE.shadow >> 8) & 0xff, b: COBBLESTONE.shadow & 0xff, a: 255 })),
        highlight: this.qualityConfig.use5LevelShading
          ? EXTENDED_RAMPS.STONE.highlight.rgb
          : hexToRGBA(rgbaToHex({ r: (COBBLESTONE.highlight >> 16) & 0xff, g: (COBBLESTONE.highlight >> 8) & 0xff, b: COBBLESTONE.highlight & 0xff, a: 255 })),
      },
      dirt: {
        base: { r: (DIRT.base >> 16) & 0xff, g: (DIRT.base >> 8) & 0xff, b: DIRT.base & 0xff, a: 255 },
        shadow: { r: (DIRT.shadow >> 16) & 0xff, g: (DIRT.shadow >> 8) & 0xff, b: DIRT.shadow & 0xff, a: 255 },
        highlight: { r: (DIRT.highlight >> 16) & 0xff, g: (DIRT.highlight >> 8) & 0xff, b: DIRT.highlight & 0xff, a: 255 },
      },
      sand: {
        base: { r: (SAND.base >> 16) & 0xff, g: (SAND.base >> 8) & 0xff, b: SAND.base & 0xff, a: 255 },
        shadow: { r: (SAND.shadow >> 16) & 0xff, g: (SAND.shadow >> 8) & 0xff, b: SAND.shadow & 0xff, a: 255 },
        highlight: { r: (SAND.highlight >> 16) & 0xff, g: (SAND.highlight >> 8) & 0xff, b: SAND.highlight & 0xff, a: 255 },
      },
      grass: {
        base: this.qualityConfig.use5LevelShading
          ? EXTENDED_RAMPS.GREEN.mid.rgb
          : { r: (GRASS.base >> 16) & 0xff, g: (GRASS.base >> 8) & 0xff, b: GRASS.base & 0xff, a: 255 },
        shadow: this.qualityConfig.use5LevelShading
          ? EXTENDED_RAMPS.GREEN.shadow.rgb
          : { r: (GRASS.shadow >> 16) & 0xff, g: (GRASS.shadow >> 8) & 0xff, b: GRASS.shadow & 0xff, a: 255 },
        highlight: this.qualityConfig.use5LevelShading
          ? EXTENDED_RAMPS.GREEN.highlight.rgb
          : { r: (GRASS.highlight >> 16) & 0xff, g: (GRASS.highlight >> 8) & 0xff, b: GRASS.highlight & 0xff, a: 255 },
      },
    };

    const fromColors = colorMaps[fromType];
    const toColors = colorMaps[toType];

    // Draw dithered transition
    for (let y = 0; y < TILE_HEIGHT; y++) {
      for (let x = 0; x < TILE_WIDTH; x++) {
        if (!this.isInIsometricBounds(x, y)) continue;

        // Calculate transition ratio based on position (diagonal gradient)
        // From type is top-left, to type is bottom-right
        const normalizedX = x / TILE_WIDTH;
        const normalizedY = y / TILE_HEIGHT;
        const ratio = (normalizedX + normalizedY) / 2;

        // Add some noise to the transition
        const noiseVal = this.noise.noise2D(x * 0.3, y * 0.3) * 0.15;
        const finalRatio = Math.max(0, Math.min(1, ratio + noiseVal));

        // Use Bayer dithering to select color
        const ditheredColor = ditherPixel(x, y, finalRatio, fromColors.base, toColors.base, 'bayer4x4');
        const color = colorToInt(ditheredColor);

        graphics.fillStyle(color, 1);
        graphics.fillRect(x, y, 1, 1);
      }
    }
  }

  /**
   * Legacy cobble-to-dirt transition
   */
  private drawLegacyCobbleDirtTransition(graphics: Phaser.GameObjects.Graphics): void {
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
  }

  /**
   * Generate sand-to-grass transition with dithering
   */
  generateSandToGrassTransition(): void {
    const key = 'tile_sand_grass_transition';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    if (this.qualityConfig.useDithering) {
      this.drawDitheredTransition(graphics, 'sand', 'grass');
    } else {
      // Legacy: sand base with grass patches
      this.drawIsometricBase(graphics, SAND);

      // Grass patches encroaching on sand
      for (let x = 4; x < TILE_WIDTH - 4; x += 3) {
        for (let y = 2; y < TILE_HEIGHT - 2; y += 2) {
          if (!this.isInIsometricBounds(x, y)) continue;

          const noiseVal = this.noise.fbm(x * 0.3, y * 0.3, 2);
          // Grass appears more toward bottom-right
          const positionBias = (x / TILE_WIDTH + y / TILE_HEIGHT) / 2;

          if (noiseVal + positionBias > 0.5) {
            const color = lerpColor(GRASS.shadow, GRASS.base, 0.5 + noiseVal * 0.3);
            graphics.fillStyle(color, 0.6);
            graphics.fillRect(x, y - 1.5, 1, 1.5);
          }
        }
      }
    }

    this.drawIsometricEdges(graphics, SAND);

    graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
    graphics.destroy();
  }

  /**
   * Generate dirt-to-grass transition with dithering
   */
  generateDirtToGrassTransition(): void {
    const key = 'tile_dirt_grass_transition';
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    if (this.qualityConfig.useDithering) {
      this.drawDitheredTransition(graphics, 'dirt', 'grass');
    } else {
      // Legacy: dirt base with grass patches
      this.drawIsometricBase(graphics, DIRT);

      // Grass patches growing on dirt
      for (let x = 4; x < TILE_WIDTH - 4; x += 2) {
        for (let y = 2; y < TILE_HEIGHT - 2; y += 2) {
          if (!this.isInIsometricBounds(x, y)) continue;

          const noiseVal = this.noise.fbm(x * 0.25, y * 0.25, 3);
          // Grass appears more toward bottom-right
          const positionBias = (x / TILE_WIDTH + y / TILE_HEIGHT) / 2;

          if (noiseVal + positionBias > 0.45) {
            const bladeHeight = 1.5 + noiseVal;
            const color = lerpColor(GRASS.shadow, GRASS.highlight, 0.4 + noiseVal * 0.4);
            graphics.fillStyle(color, 0.7);
            graphics.fillRect(x, y - bladeHeight, 1, bladeHeight);
          }
        }
      }
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

    // Apply ambient occlusion to edges for depth
    if (this.qualityConfig.useAmbientOcclusion) {
      this.applyTileAmbientOcclusion(graphics, colors);
    }
  }

  /**
   * Apply ambient occlusion darkening to tile edges for depth illusion
   */
  private applyTileAmbientOcclusion(graphics: Phaser.GameObjects.Graphics, colors: ColorRamp): void {
    // Bottom-right edge darkening (simulates ground-level shadow)
    graphics.fillStyle(colors.deep, 0.2);

    // Right edge shadow
    graphics.beginPath();
    graphics.moveTo(TILE_WIDTH / 2, TILE_HEIGHT / 2);
    graphics.lineTo(TILE_WIDTH - 2, TILE_HEIGHT / 2);
    graphics.lineTo(TILE_WIDTH / 2, TILE_HEIGHT - 1);
    graphics.closePath();
    graphics.fillPath();

    // Bottom edge shadow
    graphics.beginPath();
    graphics.moveTo(TILE_WIDTH / 2, TILE_HEIGHT / 2);
    graphics.lineTo(2, TILE_HEIGHT / 2);
    graphics.lineTo(TILE_WIDTH / 2, TILE_HEIGHT - 1);
    graphics.closePath();
    graphics.fillPath();

    // Inner corners get extra darkening
    graphics.fillStyle(colors.shadow, 0.15);
    graphics.fillEllipse(TILE_WIDTH / 2, TILE_HEIGHT - 3, 6, 2);
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
   * Returns keys based on current quality setting's frame count
   */
  getWaterAnimationKeys(type: 'harbor' | 'river' | 'soft'): string[] {
    const keys: string[] = [];
    const frameCount = this.qualityConfig.waterAnimationFrames;
    for (let i = 0; i < frameCount; i++) {
      keys.push(`tile_${type}_water_${i}`);
    }
    return keys;
  }

  /**
   * Get animation keys for shoreline tiles
   */
  getShorelineAnimationKeys(edge: ShorelineEdge): string[] {
    const keys: string[] = [];
    const frameCount = this.qualityConfig.waterAnimationFrames;
    for (let i = 0; i < frameCount; i++) {
      keys.push(`tile_shoreline_${edge}_${i}`);
    }
    return keys;
  }

  /**
   * Get the number of water animation frames for current quality
   */
  getWaterFrameCount(): number {
    return this.qualityConfig.waterAnimationFrames;
  }

  /**
   * Get all available laterite tile variants
   */
  getLateriteTileKeys(): string[] {
    return ['tile_laterite_standard', 'tile_laterite_rocky', 'tile_laterite_dusty', 'tile_laterite_worn'];
  }

  /**
   * Get all available Calçada tile variants
   */
  getCalcadaTileKeys(): string[] {
    return ['tile_calcada_wave', 'tile_calcada_checkerboard', 'tile_calcada_border'];
  }

  /**
   * Select a tile variant based on position for natural variation
   * Uses seeded randomness to ensure consistent selection
   */
  selectTileVariant(tileType: string, tileX: number, tileY: number): string {
    if (!this.qualityConfig.useTileVariation) {
      // Return first variant
      switch (tileType) {
        case 'laterite': return 'tile_laterite_standard';
        case 'calcada': return 'tile_calcada_wave';
        case 'cobble': return 'tile_cobble_worn';
        case 'dirt': return 'tile_dirt_packed';
        case 'sand': return 'tile_sand_beach';
        case 'grass': return 'tile_grass_lush';
        default: return `tile_${tileType}`;
      }
    }

    // Use position-based seeded selection for consistency
    const hash = (tileX * 73856093) ^ (tileY * 19349663);
    const index = Math.abs(hash) % this.qualityConfig.tileVariationCount;

    switch (tileType) {
      case 'laterite':
        const lateriteVariants = ['standard', 'rocky', 'dusty', 'worn'];
        return `tile_laterite_${lateriteVariants[index % lateriteVariants.length]}`;
      case 'calcada':
        const calcadaVariants = ['wave', 'checkerboard', 'border'];
        return `tile_calcada_${calcadaVariants[index % calcadaVariants.length]}`;
      case 'cobble':
        const cobbleVariants = ['worn', 'new', 'mossy'];
        return `tile_cobble_${cobbleVariants[index % cobbleVariants.length]}`;
      case 'dirt':
        const dirtVariants = ['packed', 'loose', 'muddy'];
        return `tile_dirt_${dirtVariants[index % dirtVariants.length]}`;
      case 'sand':
        const sandVariants = ['beach', 'dusty', 'wet'];
        return `tile_sand_${sandVariants[index % sandVariants.length]}`;
      case 'grass':
        const grassVariants = ['lush', 'dry', 'patchy'];
        return `tile_grass_${grassVariants[index % grassVariants.length]}`;
      default:
        return `tile_${tileType}`;
    }
  }
}

/**
 * Helper function to create and initialize a tile generator
 */
export function createTileGenerator(scene: Phaser.Scene, seed?: number): TileGenerator {
  const generator = new TileGenerator(scene, seed);
  return generator;
}
