# Procedural Pixel Art Generation System

## Architecture Document for Goa 1590

This document describes the comprehensive architecture for generating pixel art assets procedurally using the HTML5 Canvas API, designed to integrate seamlessly with Phaser 3 and the existing BootScene placeholder generation system.

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Color Palette System](#color-palette-system)
4. [Core Architecture](#core-architecture)
5. [Generator Modules](#generator-modules)
6. [Animation System](#animation-system)
7. [Integration with BootScene](#integration-with-bootscene)
8. [Generation Workflow](#generation-workflow)
9. [API Reference](#api-reference)

---

## Overview

### Design Goals

- **Pixel-Perfect Rendering**: Use HTML5 Canvas API with integer coordinates and no anti-aliasing
- **Historical Accuracy**: Implement the 16th century Portuguese Goa color palette
- **Modular Architecture**: Separate generators for tiles, characters, buildings, UI, and effects
- **Phaser Integration**: Output textures directly compatible with Phaser's texture manager
- **Variation Support**: Generate multiple variants of assets with seeded randomization
- **Animation Ready**: Support for spritesheet generation with animation frames

### Technology Stack

- **TypeScript**: Type-safe implementation with interfaces for all generators
- **HTML5 Canvas API**: Direct pixel manipulation via `CanvasRenderingContext2D`
- **Phaser 3**: Texture generation via `scene.textures.createCanvas()`
- **Deterministic RNG**: Seeded random number generator for reproducible variations

---

## File Structure

```
src/art/
├── README.md                    # This architecture document
├── index.ts                     # Public API exports
│
├── core/
│   ├── ArtGenerator.ts          # Base generator class
│   ├── Palette.ts               # Color palette constants and utilities
│   ├── PixelCanvas.ts           # Canvas wrapper with pixel-perfect drawing
│   ├── SeededRandom.ts          # Deterministic random number generator
│   └── TextureFactory.ts        # Phaser texture creation utilities
│
├── generators/
│   ├── tiles/
│   │   ├── TileGenerator.ts     # Base tile generator
│   │   ├── GroundTileGen.ts     # Ground tiles (cobble, dirt, sand, grass)
│   │   ├── WaterTileGen.ts      # Animated water tiles
│   │   ├── BuildingTileGen.ts   # Building wall tiles
│   │   ├── RoofTileGen.ts       # Terracotta roof tiles
│   │   ├── DockTileGen.ts       # Wooden dock tiles
│   │   └── TransitionGen.ts     # Edge/corner transition tiles
│   │
│   ├── characters/
│   │   ├── CharacterGenerator.ts # Base character generator
│   │   ├── PlayerGen.ts         # Player sprite generation
│   │   ├── MerchantGen.ts       # Merchant NPC variations
│   │   ├── LocalsGen.ts         # Local NPC types
│   │   ├── OfficialsGen.ts      # Officials and soldiers
│   │   └── SpriteSheetGen.ts    # Multi-direction spritesheet builder
│   │
│   ├── buildings/
│   │   ├── BuildingGenerator.ts # Base building generator
│   │   ├── HouseGen.ts          # Residential buildings
│   │   ├── ShopGen.ts           # Commercial buildings
│   │   ├── ChurchGen.ts         # Religious buildings
│   │   ├── WarehouseGen.ts      # Port/warehouse buildings
│   │   └── MarketStallGen.ts    # Market stall structures
│   │
│   ├── ui/
│   │   ├── UIGenerator.ts       # Base UI generator
│   │   ├── PanelGen.ts          # Trade/inventory panels
│   │   ├── ButtonGen.ts         # Button states
│   │   ├── IconGen.ts           # Trade goods and status icons
│   │   ├── DialogueGen.ts       # Dialogue box generation
│   │   └── FontGen.ts           # Bitmap font generation
│   │
│   └── effects/
│       ├── EffectGenerator.ts   # Base effect generator
│       ├── ParticleGen.ts       # Rain, dust, smoke particles
│       ├── WeatherGen.ts        # Weather overlay tiles
│       ├── LightingGen.ts       # Shadows and light effects
│       └── AnimationGen.ts      # Effect animation frames
│
├── styles/
│   ├── Ultima8Style.ts          # Ultima 8-inspired shading techniques
│   ├── OutlineStyle.ts          # Outline drawing utilities
│   └── DitherPatterns.ts        # Dithering pattern library
│
└── utils/
    ├── IsometricUtils.ts        # Isometric coordinate helpers
    ├── ColorUtils.ts            # Color manipulation functions
    └── ShapeUtils.ts            # Common shape drawing routines
```

---

## Color Palette System

### Historical Palette Constants

```typescript
// src/art/core/Palette.ts

/**
 * Goa 1590 Historical Color Palette
 * Derived from period sources: Linschoten engravings, Codice Casanatense
 */
export const GOA_PALETTE = {
  // Primary Colors
  DARK_WOOD: 0x2c1810,        // Shadows, dark timber, outlines
  TERRACOTTA: 0x8b4513,       // Roof tiles, pottery, brick
  OCHRE_SAND: 0xd4a574,       // Streets, desert tones, natural stone
  WHITEWASH: 0xf5e6d3,        // Building facades, walls, light areas
  PORTUGUESE_BLUE: 0x1e3a5f,  // Azulejo tiles, water, Portuguese elements
  TROPICAL_GREEN: 0x2d5016,   // Vegetation, palm trees, muted foliage
  PEPPER_SPICE: 0x4a1c1c,     // Dried goods, dark accents
  HEMP_FIBER: 0xc19a6b,       // Rope, baskets, natural textiles

  // Extended Palette (for shading)
  SHADOW_BLACK: 0x0a0a0a,
  DEEP_SHADOW: 0x1a0a05,
  HIGHLIGHT_WHITE: 0xffffff,
  GOLD_ACCENT: 0xffd700,
  CRIMSON: 0x8b0000,
} as const;

/**
 * Color Ramps for Ultima 8-style shading
 * Each ramp has 4 shades: highlight, base, shadow, deep
 */
export const COLOR_RAMPS = {
  SKIN: {
    highlight: 0xe8c8a0,
    base: 0xd4a574,
    shadow: 0xb08050,
    deep: 0x8a6040,
  },
  WOOD: {
    highlight: 0x4a3828,
    base: 0x3c2818,
    shadow: 0x2c1810,
    deep: 0x1a0a05,
  },
  STONE: {
    highlight: 0xa0a0a0,
    base: 0x7a7a7a,
    shadow: 0x5a5a5a,
    deep: 0x3a3a3a,
  },
  TERRACOTTA: {
    highlight: 0xd08050,
    base: 0xa85530,
    shadow: 0x8b4020,
    deep: 0x6a3018,
  },
  WATER: {
    highlight: 0x80c0e0,
    base: 0x4a8ab0,
    shadow: 0x2a6a8f,
    deep: 0x0a2840,
  },
  WALL: {
    highlight: 0xfffef8,
    base: 0xf8f0e0,
    shadow: 0xe0d4c0,
    deep: 0xc8b8a0,
  },
  VEGETATION: {
    highlight: 0x4a8030,
    base: 0x3d6020,
    shadow: 0x2d5016,
    deep: 0x1a3008,
  },
} as const;

export type ColorRamp = {
  highlight: number;
  base: number;
  shadow: number;
  deep: number;
};
```

### Color Utility Functions

```typescript
// src/art/utils/ColorUtils.ts

/**
 * Convert hex color to RGB components
 */
export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
}

/**
 * Convert RGB components to hex
 */
export function rgbToHex(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

/**
 * Blend two colors with alpha
 */
export function blendColors(base: number, overlay: number, alpha: number): number {
  const baseRgb = hexToRgb(base);
  const overlayRgb = hexToRgb(overlay);
  return rgbToHex(
    Math.round(baseRgb.r + (overlayRgb.r - baseRgb.r) * alpha),
    Math.round(baseRgb.g + (overlayRgb.g - baseRgb.g) * alpha),
    Math.round(baseRgb.b + (overlayRgb.b - baseRgb.b) * alpha)
  );
}

/**
 * Darken a color by a factor (0-1)
 */
export function darken(color: number, factor: number): number {
  const rgb = hexToRgb(color);
  return rgbToHex(
    Math.round(rgb.r * (1 - factor)),
    Math.round(rgb.g * (1 - factor)),
    Math.round(rgb.b * (1 - factor))
  );
}

/**
 * Lighten a color by a factor (0-1)
 */
export function lighten(color: number, factor: number): number {
  const rgb = hexToRgb(color);
  return rgbToHex(
    Math.round(rgb.r + (255 - rgb.r) * factor),
    Math.round(rgb.g + (255 - rgb.g) * factor),
    Math.round(rgb.b + (255 - rgb.b) * factor)
  );
}
```

---

## Core Architecture

### Base Art Generator

```typescript
// src/art/core/ArtGenerator.ts

import Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';
import { SeededRandom } from './SeededRandom';
import { GOA_PALETTE, COLOR_RAMPS, ColorRamp } from './Palette';

export interface GeneratorConfig {
  width: number;
  height: number;
  scale?: number;       // Default: 1 (use 2 for 2x scaling)
  seed?: number;        // Random seed for variations
}

export interface GeneratedAsset {
  key: string;
  width: number;
  height: number;
  frames?: number;      // For animated assets
}

/**
 * Base class for all art generators
 * Provides common utilities and Phaser integration
 */
export abstract class ArtGenerator {
  protected scene: Phaser.Scene;
  protected config: GeneratorConfig;
  protected rng: SeededRandom;
  protected palette = GOA_PALETTE;
  protected ramps = COLOR_RAMPS;

  constructor(scene: Phaser.Scene, config: GeneratorConfig) {
    this.scene = scene;
    this.config = {
      scale: 1,
      seed: Date.now(),
      ...config,
    };
    this.rng = new SeededRandom(this.config.seed!);
  }

  /**
   * Generate the asset and register with Phaser
   */
  abstract generate(key: string): GeneratedAsset;

  /**
   * Create a new pixel canvas for drawing
   */
  protected createCanvas(): PixelCanvas {
    const width = this.config.width * (this.config.scale || 1);
    const height = this.config.height * (this.config.scale || 1);
    return new PixelCanvas(width, height);
  }

  /**
   * Register the canvas as a Phaser texture
   */
  protected registerTexture(key: string, canvas: PixelCanvas): void {
    const canvasElement = canvas.getCanvas();
    this.scene.textures.addCanvas(key, canvasElement);
  }

  /**
   * Get a color ramp by name
   */
  protected getRamp(name: keyof typeof COLOR_RAMPS): ColorRamp {
    return this.ramps[name];
  }

  /**
   * Get a random variation within range
   */
  protected randomVariation(base: number, variance: number): number {
    return base + this.rng.range(-variance, variance);
  }
}
```

### Pixel Canvas Wrapper

```typescript
// src/art/core/PixelCanvas.ts

/**
 * Wrapper around HTML5 Canvas for pixel-perfect drawing
 * Disables anti-aliasing and provides integer-only coordinates
 */
export class PixelCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    // Disable anti-aliasing for pixel-perfect rendering
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Get the underlying canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the 2D rendering context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Clear the canvas with optional color
   */
  clear(color?: number): void {
    if (color !== undefined) {
      this.ctx.fillStyle = this.hexToStyle(color);
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Set a single pixel
   */
  setPixel(x: number, y: number, color: number, alpha: number = 1): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

    this.ctx.fillStyle = this.hexToStyle(color, alpha);
    this.ctx.fillRect(x, y, 1, 1);
  }

  /**
   * Draw a filled rectangle
   */
  fillRect(x: number, y: number, w: number, h: number, color: number, alpha: number = 1): void {
    this.ctx.fillStyle = this.hexToStyle(color, alpha);
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  /**
   * Draw a rectangle outline
   */
  strokeRect(x: number, y: number, w: number, h: number, color: number, lineWidth: number = 1): void {
    this.ctx.strokeStyle = this.hexToStyle(color);
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(w), Math.floor(h));
  }

  /**
   * Draw a filled circle
   */
  fillCircle(cx: number, cy: number, radius: number, color: number, alpha: number = 1): void {
    cx = Math.floor(cx);
    cy = Math.floor(cy);
    radius = Math.floor(radius);

    this.ctx.fillStyle = this.hexToStyle(color, alpha);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw a filled ellipse
   */
  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: number, alpha: number = 1): void {
    this.ctx.fillStyle = this.hexToStyle(color, alpha);
    this.ctx.beginPath();
    this.ctx.ellipse(Math.floor(cx), Math.floor(cy), Math.floor(rx), Math.floor(ry), 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw a line
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, color: number, lineWidth: number = 1): void {
    this.ctx.strokeStyle = this.hexToStyle(color);
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(Math.floor(x1), Math.floor(y1));
    this.ctx.lineTo(Math.floor(x2), Math.floor(y2));
    this.ctx.stroke();
  }

  /**
   * Draw an isometric diamond (for tiles)
   */
  fillIsoDiamond(x: number, y: number, width: number, height: number, color: number, alpha: number = 1): void {
    const hw = width / 2;
    const hh = height / 2;

    this.ctx.fillStyle = this.hexToStyle(color, alpha);
    this.ctx.beginPath();
    this.ctx.moveTo(x + hw, y);           // Top
    this.ctx.lineTo(x + width, y + hh);   // Right
    this.ctx.lineTo(x + hw, y + height);  // Bottom
    this.ctx.lineTo(x, y + hh);           // Left
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Draw a polygon from points
   */
  fillPolygon(points: { x: number; y: number }[], color: number, alpha: number = 1): void {
    if (points.length < 3) return;

    this.ctx.fillStyle = this.hexToStyle(color, alpha);
    this.ctx.beginPath();
    this.ctx.moveTo(Math.floor(points[0].x), Math.floor(points[0].y));
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(Math.floor(points[i].x), Math.floor(points[i].y));
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Convert hex color to CSS style string
   */
  private hexToStyle(color: number, alpha: number = 1): string {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
```

### Seeded Random Number Generator

```typescript
// src/art/core/SeededRandom.ts

/**
 * Mulberry32 seeded random number generator
 * Produces deterministic sequences for reproducible asset variations
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /**
   * Get next random float [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Get random integer in range [min, max]
   */
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get random float in range [min, max)
   */
  rangeFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Random boolean with optional probability
   */
  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.range(0, array.length - 1)];
  }

  /**
   * Shuffle array in place
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.range(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
```

### Texture Factory

```typescript
// src/art/core/TextureFactory.ts

import Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';

export interface SpritesheetConfig {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  columns?: number;  // Auto-calculated if not provided
}

/**
 * Factory for creating Phaser textures from pixel canvases
 */
export class TextureFactory {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a single texture from canvas
   */
  createTexture(key: string, canvas: PixelCanvas): void {
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    this.scene.textures.addCanvas(key, canvas.getCanvas());
  }

  /**
   * Create a spritesheet texture with frame data
   */
  createSpritesheet(key: string, canvas: PixelCanvas, config: SpritesheetConfig): void {
    const columns = config.columns || Math.ceil(config.frames / Math.ceil(config.frames / 8));

    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }

    const texture = this.scene.textures.addCanvas(key, canvas.getCanvas());

    // Add frame data for Phaser animations
    if (texture) {
      for (let i = 0; i < config.frames; i++) {
        const x = (i % columns) * config.frameWidth;
        const y = Math.floor(i / columns) * config.frameHeight;
        texture.add(i, 0, x, y, config.frameWidth, config.frameHeight);
      }
    }
  }

  /**
   * Combine multiple canvases into a texture atlas
   */
  createAtlas(key: string, canvases: Map<string, PixelCanvas>, padding: number = 1): void {
    // Calculate atlas dimensions (simple row packing)
    let totalWidth = 0;
    let maxHeight = 0;

    canvases.forEach((canvas) => {
      totalWidth += canvas.getCanvas().width + padding;
      maxHeight = Math.max(maxHeight, canvas.getCanvas().height);
    });

    // Create atlas canvas
    const atlasCanvas = new PixelCanvas(totalWidth, maxHeight);
    const ctx = atlasCanvas.getContext();

    const frames: { [key: string]: { x: number; y: number; w: number; h: number } } = {};
    let currentX = 0;

    canvases.forEach((canvas, frameName) => {
      const canvasEl = canvas.getCanvas();
      ctx.drawImage(canvasEl, currentX, 0);
      frames[frameName] = {
        x: currentX,
        y: 0,
        w: canvasEl.width,
        h: canvasEl.height,
      };
      currentX += canvasEl.width + padding;
    });

    // Register with Phaser
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }

    const texture = this.scene.textures.addCanvas(key, atlasCanvas.getCanvas());

    // Add named frames
    if (texture) {
      Object.entries(frames).forEach(([name, frame]) => {
        texture.add(name, 0, frame.x, frame.y, frame.w, frame.h);
      });
    }
  }
}
```

---

## Generator Modules

### Tile Generator (Base)

```typescript
// src/art/generators/tiles/TileGenerator.ts

import { ArtGenerator, GeneratorConfig, GeneratedAsset } from '../../core/ArtGenerator';
import { PixelCanvas } from '../../core/PixelCanvas';
import { ColorRamp } from '../../core/Palette';

export interface TileConfig extends GeneratorConfig {
  tileWidth: number;    // Logical tile width (default: 32)
  tileHeight: number;   // Logical tile height (default: 16 for isometric)
}

/**
 * Base class for tile generators
 * Handles isometric diamond rendering and edge shading
 */
export abstract class TileGenerator extends ArtGenerator {
  protected tileConfig: TileConfig;

  constructor(scene: Phaser.Scene, config: Partial<TileConfig> = {}) {
    const fullConfig: TileConfig = {
      width: 64,        // 2x scale default
      height: 32,
      tileWidth: 32,
      tileHeight: 16,
      scale: 2,
      ...config,
    };
    super(scene, fullConfig);
    this.tileConfig = fullConfig;
  }

  /**
   * Draw the base isometric diamond with standard edge shading
   */
  protected drawBaseDiamond(canvas: PixelCanvas, color: number): void {
    const w = this.config.width;
    const h = this.config.height;

    // Fill base color
    canvas.fillIsoDiamond(0, 0, w, h, color);
  }

  /**
   * Apply Ultima 8-style edge highlighting
   */
  protected applyEdgeShading(canvas: PixelCanvas, ramp: ColorRamp): void {
    const w = this.config.width;
    const h = this.config.height;
    const hw = w / 2;
    const hh = h / 2;

    // Light edge (top-left)
    canvas.drawLine(hw, 1, 1, hh, ramp.highlight, 2);

    // Shadow edge (bottom-right)
    canvas.drawLine(w - 1, hh, hw, h - 1, ramp.deep, 2);
  }

  /**
   * Draw individual stone/cobble with shading
   */
  protected drawStone(
    canvas: PixelCanvas,
    x: number,
    y: number,
    radius: number,
    ramp: ColorRamp
  ): void {
    // Shadow
    canvas.fillEllipse(x + 1, y + 1, radius * 2, radius, ramp.shadow, 0.5);
    // Base stone
    canvas.fillEllipse(x, y, radius * 2, radius, ramp.base, 0.6);
    // Highlight
    canvas.fillEllipse(x - 1, y - 1, radius, radius * 0.6, ramp.highlight, 0.4);
  }
}
```

### Ground Tile Generator

```typescript
// src/art/generators/tiles/GroundTileGen.ts

import Phaser from 'phaser';
import { TileGenerator, TileConfig } from './TileGenerator';
import { PixelCanvas } from '../../core/PixelCanvas';
import { GeneratedAsset } from '../../core/ArtGenerator';

export type GroundType = 'cobble' | 'dirt' | 'sand' | 'grass';

export interface GroundTileConfig extends Partial<TileConfig> {
  groundType: GroundType;
  variant?: number;      // 0-3 for different variations
  weathering?: number;   // 0-1 amount of wear/debris
}

/**
 * Generator for ground/floor tiles
 * Produces cobblestone, dirt, sand, and grass variations
 */
export class GroundTileGen extends TileGenerator {
  private groundConfig: GroundTileConfig;

  constructor(scene: Phaser.Scene, config: GroundTileConfig) {
    super(scene, config);
    this.groundConfig = {
      variant: 0,
      weathering: 0.3,
      ...config,
    };
  }

  generate(key: string): GeneratedAsset {
    const canvas = this.createCanvas();

    switch (this.groundConfig.groundType) {
      case 'cobble':
        this.generateCobble(canvas);
        break;
      case 'dirt':
        this.generateDirt(canvas);
        break;
      case 'sand':
        this.generateSand(canvas);
        break;
      case 'grass':
        this.generateGrass(canvas);
        break;
    }

    this.registerTexture(key, canvas);

    return {
      key,
      width: this.config.width,
      height: this.config.height,
    };
  }

  private generateCobble(canvas: PixelCanvas): void {
    const ramp = this.getRamp('SKIN'); // Ochre/sand colors for cobblestone

    // Base diamond
    this.drawBaseDiamond(canvas, ramp.base);

    // Gradient shading (lighter top-left)
    const w = this.config.width;
    const hw = w / 2;
    canvas.fillPolygon([
      { x: hw, y: 0 },
      { x: hw * 1.5, y: hw / 4 },
      { x: hw, y: hw / 2 },
      { x: hw / 2, y: hw / 4 },
    ], ramp.highlight, 0.4);

    // Apply edge shading
    this.applyEdgeShading(canvas, ramp);

    // Draw stones based on variant
    const variant = this.groundConfig.variant || 0;
    this.drawCobbleVariant(canvas, variant, ramp);
  }

  private drawCobbleVariant(canvas: PixelCanvas, variant: number, ramp: any): void {
    const w = this.config.width;

    switch (variant) {
      case 0: // Standard cobblestones
        this.drawStone(canvas, w * 0.25, w * 0.16, 6, ramp);
        this.drawStone(canvas, w * 0.5, w * 0.13, 5, ramp);
        this.drawStone(canvas, w * 0.75, w * 0.19, 5, ramp);
        this.drawStone(canvas, w * 0.375, w * 0.28, 5, ramp);
        this.drawStone(canvas, w * 0.625, w * 0.31, 6, ramp);
        break;

      case 1: // With crack
        this.drawStone(canvas, w * 0.28, w * 0.19, 5, ramp);
        this.drawStone(canvas, w * 0.66, w * 0.16, 5, ramp);
        this.drawStone(canvas, w * 0.47, w * 0.31, 5, ramp);
        // Crack detail
        canvas.drawLine(w * 0.375, w * 0.09, w * 0.44, w * 0.22, ramp.deep, 2);
        canvas.drawLine(w * 0.44, w * 0.22, w * 0.56, w * 0.28, ramp.deep, 2);
        canvas.drawLine(w * 0.56, w * 0.28, w * 0.66, w * 0.375, ramp.deep, 2);
        break;

      case 2: // With debris
        this.drawStone(canvas, w * 0.31, w * 0.16, 5, ramp);
        this.drawStone(canvas, w * 0.69, w * 0.22, 5, ramp);
        // Leaf debris
        canvas.fillEllipse(w * 0.22, w * 0.22, 4, 2, 0x3d6020, 0.7);
        canvas.fillEllipse(w * 0.59, w * 0.28, 3, 2, 0x4a7030, 0.6);
        break;

      case 3: // Worn smooth
        canvas.fillEllipse(w * 0.375, w * 0.19, 10, 6, ramp.highlight, 0.4);
        canvas.fillEllipse(w * 0.66, w * 0.28, 8, 5, ramp.highlight, 0.4);
        break;
    }
  }

  private generateDirt(canvas: PixelCanvas): void {
    const ramp = this.getRamp('TERRACOTTA');
    this.drawBaseDiamond(canvas, ramp.base);
    this.applyEdgeShading(canvas, ramp);

    // Dirt texture with random pebbles
    for (let i = 0; i < 8; i++) {
      const x = this.rng.range(8, this.config.width - 8);
      const y = this.rng.range(4, this.config.height - 4);
      canvas.fillCircle(x, y, this.rng.range(1, 3), ramp.shadow, 0.4);
    }
  }

  private generateSand(canvas: PixelCanvas): void {
    const ramp = this.getRamp('SKIN');
    this.drawBaseDiamond(canvas, ramp.highlight);
    this.applyEdgeShading(canvas, ramp);

    // Sand grains/ripples
    for (let i = 0; i < 5; i++) {
      const x = this.rng.range(10, this.config.width - 10);
      const y = this.rng.range(5, this.config.height - 5);
      canvas.setPixel(x, y, ramp.base, 0.5);
    }
  }

  private generateGrass(canvas: PixelCanvas): void {
    const ramp = this.getRamp('VEGETATION');
    this.drawBaseDiamond(canvas, ramp.base);
    this.applyEdgeShading(canvas, ramp);

    // Grass tufts
    for (let i = 0; i < 6; i++) {
      const x = this.rng.range(12, this.config.width - 12);
      const y = this.rng.range(6, this.config.height - 6);
      canvas.drawLine(x, y, x - 2, y - 4, ramp.highlight, 1);
      canvas.drawLine(x, y, x + 2, y - 4, ramp.highlight, 1);
    }
  }
}
```

### Character Generator (Base)

```typescript
// src/art/generators/characters/CharacterGenerator.ts

import { ArtGenerator, GeneratorConfig, GeneratedAsset } from '../../core/ArtGenerator';
import { PixelCanvas } from '../../core/PixelCanvas';
import { ColorRamp } from '../../core/Palette';

export type Direction = 'south' | 'west' | 'east' | 'north';
export type AnimationState = 'idle' | 'walk';

export interface CharacterConfig extends GeneratorConfig {
  directions?: Direction[];        // Which directions to generate
  idleFrames?: number;             // Frames per idle animation (default: 2)
  walkFrames?: number;             // Frames per walk animation (default: 6)
  includeAnimations?: boolean;     // Generate full spritesheet
}

/**
 * Base class for character sprite generators
 * Handles multi-direction spritesheets and animation frames
 */
export abstract class CharacterGenerator extends ArtGenerator {
  protected charConfig: CharacterConfig;

  constructor(scene: Phaser.Scene, config: Partial<CharacterConfig> = {}) {
    const fullConfig: CharacterConfig = {
      width: 64,           // 2x scale (32 * 2)
      height: 96,          // 2x scale (48 * 2)
      directions: ['south', 'west', 'east', 'north'],
      idleFrames: 2,
      walkFrames: 6,
      includeAnimations: true,
      scale: 2,
      ...config,
    };
    super(scene, fullConfig);
    this.charConfig = fullConfig;
  }

  /**
   * Generate a single static sprite
   */
  generateStatic(key: string): GeneratedAsset {
    const canvas = this.createCanvas();
    this.drawCharacter(canvas, 'south', 'idle', 0);
    this.registerTexture(key, canvas);
    return { key, width: this.config.width, height: this.config.height };
  }

  /**
   * Generate full spritesheet with all directions and animations
   */
  generateSpritesheet(key: string): GeneratedAsset {
    const directions = this.charConfig.directions!;
    const framesPerDir = this.charConfig.idleFrames! + this.charConfig.walkFrames!;
    const totalFrames = directions.length * framesPerDir;

    // Create spritesheet canvas
    const sheetWidth = this.config.width * framesPerDir;
    const sheetHeight = this.config.height * directions.length;
    const canvas = new PixelCanvas(sheetWidth, sheetHeight);
    const ctx = canvas.getContext();

    // Generate each direction row
    directions.forEach((dir, dirIndex) => {
      let frameX = 0;

      // Idle frames
      for (let i = 0; i < this.charConfig.idleFrames!; i++) {
        const frameCanvas = this.createCanvas();
        this.drawCharacter(frameCanvas, dir, 'idle', i);
        ctx.drawImage(
          frameCanvas.getCanvas(),
          frameX * this.config.width,
          dirIndex * this.config.height
        );
        frameX++;
      }

      // Walk frames
      for (let i = 0; i < this.charConfig.walkFrames!; i++) {
        const frameCanvas = this.createCanvas();
        this.drawCharacter(frameCanvas, dir, 'walk', i);
        ctx.drawImage(
          frameCanvas.getCanvas(),
          frameX * this.config.width,
          dirIndex * this.config.height
        );
        frameX++;
      }
    });

    this.registerTexture(key, canvas);
    return { key, width: sheetWidth, height: sheetHeight, frames: totalFrames };
  }

  /**
   * Draw character for a specific direction and animation frame
   * Must be implemented by subclasses
   */
  protected abstract drawCharacter(
    canvas: PixelCanvas,
    direction: Direction,
    state: AnimationState,
    frame: number
  ): void;

  /**
   * Draw ground shadow under character
   */
  protected drawShadow(canvas: PixelCanvas, y: number): void {
    canvas.fillEllipse(
      this.config.width / 2,
      y,
      this.config.width * 0.375,
      this.config.height * 0.08,
      0x000000,
      0.3
    );
  }

  /**
   * Draw a body part with Ultima 8-style shading
   */
  protected drawBodyPart(
    canvas: PixelCanvas,
    x: number,
    y: number,
    width: number,
    height: number,
    ramp: ColorRamp,
    lightDir: 'left' | 'right' = 'left'
  ): void {
    // Base
    canvas.fillRect(x, y, width, height, ramp.base);

    // Shadow side
    const shadowX = lightDir === 'left' ? x + width - width * 0.25 : x;
    canvas.fillRect(shadowX, y, width * 0.25, height, ramp.shadow, 0.6);

    // Highlight side
    const highlightX = lightDir === 'left' ? x : x + width - width * 0.25;
    canvas.fillRect(highlightX, y, width * 0.25, height, ramp.highlight, 0.4);
  }

  /**
   * Apply black outline (Ultima 8 characteristic)
   */
  protected drawOutline(canvas: PixelCanvas, x: number, y: number, w: number, h: number): void {
    canvas.strokeRect(x, y, w, h, 0x000000, 2);
  }
}
```

### UI Generator (Base)

```typescript
// src/art/generators/ui/UIGenerator.ts

import { ArtGenerator, GeneratorConfig, GeneratedAsset } from '../../core/ArtGenerator';
import { PixelCanvas } from '../../core/PixelCanvas';

export interface UIConfig extends GeneratorConfig {
  style?: 'parchment' | 'wood' | 'stone';
  borderWidth?: number;
}

/**
 * Base class for UI element generators
 * Handles parchment textures, borders, and button states
 */
export abstract class UIGenerator extends ArtGenerator {
  protected uiConfig: UIConfig;

  constructor(scene: Phaser.Scene, config: Partial<UIConfig> = {}) {
    const fullConfig: UIConfig = {
      width: 256,
      height: 192,
      style: 'parchment',
      borderWidth: 4,
      ...config,
    };
    super(scene, fullConfig);
    this.uiConfig = fullConfig;
  }

  /**
   * Draw parchment/paper texture background
   */
  protected drawParchmentBg(canvas: PixelCanvas): void {
    const { width, height } = this.config;

    // Base parchment color
    canvas.fillRect(0, 0, width, height, this.palette.WHITEWASH);

    // Aging texture (random darker spots)
    for (let i = 0; i < 20; i++) {
      const x = this.rng.range(0, width);
      const y = this.rng.range(0, height);
      const size = this.rng.range(2, 8);
      canvas.fillCircle(x, y, size, this.palette.OCHRE_SAND, 0.1);
    }

    // Edge darkening
    const edgeGradient = [0.15, 0.1, 0.05];
    edgeGradient.forEach((alpha, i) => {
      canvas.fillRect(0, i * 2, width, 2, this.palette.TERRACOTTA, alpha);
      canvas.fillRect(0, height - (i + 1) * 2, width, 2, this.palette.TERRACOTTA, alpha);
      canvas.fillRect(i * 2, 0, 2, height, this.palette.TERRACOTTA, alpha);
      canvas.fillRect(width - (i + 1) * 2, 0, 2, height, this.palette.TERRACOTTA, alpha);
    });
  }

  /**
   * Draw decorative border
   */
  protected drawBorder(canvas: PixelCanvas, style: 'simple' | 'ornate' = 'simple'): void {
    const { width, height } = this.config;
    const bw = this.uiConfig.borderWidth!;

    // Outer border
    canvas.strokeRect(bw / 2, bw / 2, width - bw, height - bw, this.palette.DARK_WOOD, bw);

    if (style === 'ornate') {
      // Corner flourishes
      const cornerSize = 12;
      const corners = [
        { x: bw, y: bw },
        { x: width - bw - cornerSize, y: bw },
        { x: bw, y: height - bw - cornerSize },
        { x: width - bw - cornerSize, y: height - bw - cornerSize },
      ];

      corners.forEach(({ x, y }) => {
        canvas.fillRect(x, y, cornerSize, cornerSize, this.palette.TERRACOTTA, 0.5);
      });
    }
  }
}
```

### Effect Generator (Base)

```typescript
// src/art/generators/effects/EffectGenerator.ts

import { ArtGenerator, GeneratorConfig, GeneratedAsset } from '../../core/ArtGenerator';
import { PixelCanvas } from '../../core/PixelCanvas';

export interface EffectConfig extends GeneratorConfig {
  frames: number;           // Animation frame count
  loop?: boolean;           // Whether animation loops
  particleCount?: number;   // For particle effects
}

/**
 * Base class for visual effect generators
 * Handles particles, weather overlays, and animated effects
 */
export abstract class EffectGenerator extends ArtGenerator {
  protected effectConfig: EffectConfig;

  constructor(scene: Phaser.Scene, config: Partial<EffectConfig> = {}) {
    const fullConfig: EffectConfig = {
      width: 64,
      height: 64,
      frames: 4,
      loop: true,
      particleCount: 10,
      ...config,
    };
    super(scene, fullConfig);
    this.effectConfig = fullConfig;
  }

  /**
   * Generate animated effect spritesheet
   */
  generateAnimated(key: string): GeneratedAsset {
    const { width, height } = this.config;
    const { frames } = this.effectConfig;

    const sheetWidth = width * frames;
    const canvas = new PixelCanvas(sheetWidth, height);
    const ctx = canvas.getContext();

    for (let i = 0; i < frames; i++) {
      const frameCanvas = new PixelCanvas(width, height);
      this.drawFrame(frameCanvas, i);
      ctx.drawImage(frameCanvas.getCanvas(), i * width, 0);
    }

    this.registerTexture(key, canvas);
    return { key, width: sheetWidth, height, frames };
  }

  /**
   * Draw a single animation frame
   * Must be implemented by subclasses
   */
  protected abstract drawFrame(canvas: PixelCanvas, frameIndex: number): void;
}
```

---

## Animation System

### Spritesheet Layout Standards

```
Character Spritesheets (256x192 @ 2x scale, or 512x384)
========================================================
Row 0: South (idle1, idle2, walk1, walk2, walk3, walk4, walk5, walk6)
Row 1: West  (idle1, idle2, walk1, walk2, walk3, walk4, walk5, walk6)
Row 2: East  (idle1, idle2, walk1, walk2, walk3, walk4, walk5, walk6)
Row 3: North (idle1, idle2, walk1, walk2, walk3, walk4, walk5, walk6)

Each frame: 64x96 pixels (2x scale of 32x48)
Total: 8 columns x 4 rows = 32 frames

Water/Effect Spritesheets
=========================
Linear strip: frame1, frame2, frame3, frame4...
Each frame same dimensions as base asset
```

### Animation Configuration

```typescript
// Animation timing constants
export const ANIMATION_CONFIG = {
  IDLE: {
    frameRate: 2,    // 2 FPS for subtle idle
    repeat: -1,      // Loop forever
  },
  WALK: {
    frameRate: 8,    // 8 FPS for walk cycle
    repeat: -1,
  },
  WATER: {
    frameRate: 4,    // 4 FPS for water shimmer
    repeat: -1,
  },
  RAIN: {
    frameRate: 12,   // 12 FPS for rain
    repeat: -1,
  },
  EFFECT: {
    frameRate: 6,    // 6 FPS for general effects
    repeat: 0,       // Play once
  },
} as const;
```

---

## Integration with BootScene

### Refactored BootScene

```typescript
// src/scenes/BootScene.ts (refactored)

import Phaser from 'phaser';
import { ArtGenerationSystem } from '../art';
import { AudioSystem } from '../systems/AudioSystem';

export class BootScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private audioSystem!: AudioSystem;
  private artSystem!: ArtGenerationSystem;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingScreen();
    this.initializeSystems();
  }

  private createLoadingScreen(): void {
    // ... existing loading screen code ...
  }

  private initializeSystems(): void {
    // Initialize art generation system
    this.artSystem = new ArtGenerationSystem(this);

    // Generate all placeholder assets with progress tracking
    this.artSystem.generateAll((progress) => {
      this.updateProgress(progress);
    });
  }

  private updateProgress(progress: number): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.progressBar.clear();
    this.progressBar.fillStyle(0x8b4513, 1);
    this.progressBar.fillRect(
      width / 4 + 5,
      height / 2 - 10,
      (width / 2 - 10) * progress,
      20
    );
  }

  create(): void {
    // Initialize audio system
    this.audioSystem = new AudioSystem(this);
    this.audioSystem.generatePlaceholderAudio();
    this.registry.set('audioSystem', this.audioSystem);

    // Store art system for runtime generation
    this.registry.set('artSystem', this.artSystem);

    // Transition to game
    this.scene.start('MarketScene');
    this.scene.launch('UIScene');
  }
}
```

### Art Generation System (Main Entry Point)

```typescript
// src/art/index.ts

import Phaser from 'phaser';
import { TextureFactory } from './core/TextureFactory';
import { GroundTileGen } from './generators/tiles/GroundTileGen';
import { WaterTileGen } from './generators/tiles/WaterTileGen';
// ... import other generators

export interface GenerationProgress {
  (progress: number): void;
}

/**
 * Main entry point for the art generation system
 * Coordinates all generators and tracks progress
 */
export class ArtGenerationSystem {
  private scene: Phaser.Scene;
  private factory: TextureFactory;
  private generatedAssets: Map<string, any> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.factory = new TextureFactory(scene);
  }

  /**
   * Generate all game assets with progress callback
   */
  generateAll(onProgress?: GenerationProgress): void {
    const tasks = [
      () => this.generateTiles(),
      () => this.generateCharacters(),
      () => this.generateBuildings(),
      () => this.generateUI(),
      () => this.generateEffects(),
    ];

    let completed = 0;
    tasks.forEach((task) => {
      task();
      completed++;
      onProgress?.(completed / tasks.length);
    });
  }

  /**
   * Generate tile assets
   */
  private generateTiles(): void {
    // Ground tiles with variants
    const groundTypes: Array<'cobble' | 'dirt' | 'sand' | 'grass'> =
      ['cobble', 'dirt', 'sand', 'grass'];

    groundTypes.forEach((type) => {
      for (let variant = 0; variant < 4; variant++) {
        const gen = new GroundTileGen(this.scene, {
          groundType: type,
          variant,
          seed: variant * 1000,
        });
        const suffix = variant > 0 ? `_${variant}` : '';
        gen.generate(`tile_${type}${suffix}`);
      }
    });

    // Water tiles (animated)
    for (let frame = 0; frame < 4; frame++) {
      const gen = new WaterTileGen(this.scene, { frame });
      const suffix = frame > 0 ? `_${frame}` : '';
      gen.generate(`tile_water${suffix}`);
    }

    // ... generate other tile types
  }

  private generateCharacters(): void {
    // Implementation for character generation
  }

  private generateBuildings(): void {
    // Implementation for building generation
  }

  private generateUI(): void {
    // Implementation for UI generation
  }

  private generateEffects(): void {
    // Implementation for effect generation
  }

  /**
   * Generate a single asset on demand (for runtime variations)
   */
  generateAsset(type: string, config: any): string {
    // Runtime asset generation for dynamic content
    const key = `dynamic_${type}_${Date.now()}`;
    // ... generate based on type and config
    return key;
  }

  /**
   * Get all generated asset keys
   */
  getGeneratedAssets(): Map<string, any> {
    return this.generatedAssets;
  }
}

// Export all public classes
export { GOA_PALETTE, COLOR_RAMPS } from './core/Palette';
export { PixelCanvas } from './core/PixelCanvas';
export { SeededRandom } from './core/SeededRandom';
export { TextureFactory } from './core/TextureFactory';
export { ArtGenerator } from './core/ArtGenerator';
export { TileGenerator } from './generators/tiles/TileGenerator';
export { GroundTileGen } from './generators/tiles/GroundTileGen';
export { CharacterGenerator } from './generators/characters/CharacterGenerator';
export { UIGenerator } from './generators/ui/UIGenerator';
export { EffectGenerator } from './generators/effects/EffectGenerator';
```

---

## Generation Workflow

### Asset Generation Pipeline

```
1. INITIALIZATION
   ├── Create ArtGenerationSystem instance
   ├── Initialize TextureFactory
   └── Set up progress tracking

2. TILE GENERATION
   ├── Ground tiles (4 types x 4 variants = 16 textures)
   ├── Water tiles (4 animation frames)
   ├── Building tiles (3 variants)
   ├── Roof tiles (2 variants)
   ├── Dock tiles (2 variants)
   ├── Market tiles (4 color variants)
   └── Decorative objects (palm, well, crates, etc.)

3. CHARACTER GENERATION
   ├── Player spritesheet (4 directions x 8 frames = 32 frames)
   ├── Portuguese NPCs (merchant, official, soldier, sailor)
   ├── Indian NPCs (merchant, locals, porter)
   ├── Arab NPCs (trader)
   └── Religious NPCs (monk, priest)

4. BUILDING GENERATION
   ├── Small structures (stalls, wells)
   ├── Medium structures (houses, shops)
   ├── Large structures (warehouses, merchant houses)
   └── Landmarks (churches, cathedral)

5. UI GENERATION
   ├── Panels (trade, inventory, dialogue)
   ├── Buttons (3 sizes x 3 states = 9 variants)
   ├── Icons (trade goods, currency, status)
   └── Fonts (bitmap font atlas)

6. EFFECT GENERATION
   ├── Rain particles (3 frames)
   ├── Dust particles (4 frames)
   ├── Smoke wisps (8 frames)
   ├── Weather overlays (rain, fog, heat)
   └── Lighting (shadows, lantern glow)

7. REGISTRATION
   ├── Register all textures with Phaser
   ├── Create animation definitions
   └── Store asset manifest for runtime access
```

### Runtime Asset Generation

For dynamic content (procedural variations during gameplay):

```typescript
// Example: Generate random market stall at runtime
const artSystem = scene.registry.get('artSystem') as ArtGenerationSystem;
const stallKey = artSystem.generateAsset('market_stall', {
  awningColor: 'blue',
  goodsType: 'spices',
  weathering: 0.5,
  seed: Math.random() * 10000,
});
scene.add.image(x, y, stallKey);
```

---

## API Reference

### Core Classes

| Class | Purpose |
|-------|---------|
| `ArtGenerationSystem` | Main entry point, coordinates all generators |
| `ArtGenerator` | Base class for all generators |
| `PixelCanvas` | Canvas wrapper for pixel-perfect drawing |
| `SeededRandom` | Deterministic RNG for reproducible variations |
| `TextureFactory` | Creates Phaser-compatible textures |

### Generator Classes

| Class | Output |
|-------|--------|
| `GroundTileGen` | 64x32 isometric ground tiles |
| `WaterTileGen` | 64x32 animated water tiles |
| `BuildingTileGen` | 64x32 building wall tiles |
| `CharacterGenerator` | 64x96 character sprites or spritesheets |
| `UIGenerator` | Variable-size UI panels and elements |
| `EffectGenerator` | Variable-size particle/overlay effects |

### Palette Constants

| Constant | Hex Value | Usage |
|----------|-----------|-------|
| `DARK_WOOD` | `0x2c1810` | Outlines, shadows |
| `TERRACOTTA` | `0x8b4513` | Roofs, pottery |
| `OCHRE_SAND` | `0xd4a574` | Streets, ground |
| `WHITEWASH` | `0xf5e6d3` | Building walls |
| `PORTUGUESE_BLUE` | `0x1e3a5f` | Water, azulejos |
| `TROPICAL_GREEN` | `0x2d5016` | Vegetation |
| `PEPPER_SPICE` | `0x4a1c1c` | Dark accents |
| `HEMP_FIBER` | `0xc19a6b` | Natural textiles |

---

## Implementation Notes

### Performance Considerations

1. **Batch Generation**: Generate all assets during loading to avoid runtime hitches
2. **Texture Atlases**: Combine related assets into atlases for fewer draw calls
3. **Canvas Reuse**: Reuse canvas elements when generating multiple variants
4. **Lazy Generation**: For rarely-used assets, generate on first access

### Quality Guidelines

1. **Integer Coordinates**: Always use `Math.floor()` for pixel positions
2. **No Anti-aliasing**: Keep `imageSmoothingEnabled = false`
3. **Palette Compliance**: Verify colors match the historical palette (allow 5% tolerance for blending)
4. **1-Pixel Outlines**: Maintain consistent outline weight using `DARK_WOOD`
5. **Consistent Shading**: Use color ramps for Ultima 8-style depth

### Historical Accuracy

Reference the following sources for authentic details:
- **Linschoten's Itinerario (1595-96)**: Architecture, street scenes, Portuguese dress
- **Codice Casanatense (~1540)**: Character costumes, ethnic diversity, daily activities
- **Period Color Palette**: Derived from terracotta, whitewash, Portuguese azulejos

---

## Future Extensions

1. **Dynamic Lighting**: Generate time-of-day variants (dawn, noon, dusk, night)
2. **Seasonal Variations**: Monsoon vs dry season tile sets
3. **Damage States**: Worn, damaged, and ruined building variants
4. **Character Customization**: Procedural outfit/accessory combinations
5. **Map-Based Generation**: Generate tiles based on world coordinates for seamless variety
