import Phaser from 'phaser';
import {
  WHITEWASH,
  TERRACOTTA,
  WOOD_DARK,
  WOOD_LIGHT,
  COBBLESTONE,
  PORTUGUESE_BLUE,
  SILK_GOLD,
} from '../palette';

/**
 * Local palette mapping for building generator
 * Maps to the color ramps from ../palette for consistent styling
 */
const palette = {
  // Core building colors
  whitewash: WHITEWASH.base,
  terracotta: TERRACOTTA.base,
  darkWood: WOOD_DARK.shadow,
  ochreSand: COBBLESTONE.base,
  hempFiber: WOOD_LIGHT.highlight,
  portugueseBlue: PORTUGUESE_BLUE,

  // Additional utility colors
  gold: SILK_GOLD.base,
};

/**
 * BuildingGenerator - Procedural isometric building generator for 16th century Goa
 *
 * Generates historically accurate buildings including:
 * - Market stalls (spice, cloth, pottery, food)
 * - Portuguese colonial buildings (merchant houses, customs house, warehouses, taverns)
 * - Religious buildings (cathedral, chapel, Hindu shrine)
 * - Residential buildings (Portuguese townhouse, local dwelling, Arab merchant house)
 *
 * All buildings follow isometric 2:1 ratio with 32x16 base tile size.
 * Z-height increment: 8 pixels per level.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type BuildingType =
  | 'marketStall'
  | 'merchantHouse'
  | 'customsHouse'
  | 'warehouse'
  | 'tavern'
  | 'cathedral'
  | 'chapel'
  | 'hinduShrine'
  | 'portugueseTownhouse'
  | 'localDwelling'
  | 'arabMerchantHouse';

export type MarketStallVariant = 'spice' | 'cloth' | 'pottery' | 'food';

export type BuildingState = 'day' | 'night' | 'active';

export interface BuildingConfig {
  type: BuildingType;
  variant?: MarketStallVariant;
  state?: BuildingState;
  seed?: number;
}

export interface BuildingSpec {
  type: BuildingType;
  tilesX: number;
  tilesY: number;
  pixelWidth: number;
  pixelHeight: number;
  heightLevels: number;
  description: string;
}

// IsometricPoint interface reserved for future building coordinate calculations
// interface IsometricPoint {
//   x: number;
//   y: number;
// }

// ============================================================================
// BUILDING SPECIFICATIONS
// ============================================================================

const TILE_WIDTH = 32;
const TILE_HEIGHT = 16;
const Z_HEIGHT = 8;

const BUILDING_SPECS: { [key in BuildingType]: BuildingSpec } = {
  // Market Stalls (2x1 tiles, ~64x48)
  marketStall: {
    type: 'marketStall',
    tilesX: 2,
    tilesY: 1,
    pixelWidth: 64,
    pixelHeight: 48,
    heightLevels: 2,
    description: 'Open-air market stall with fabric awning',
  },

  // Portuguese Colonial Buildings (2x2 to 3x2 tiles)
  merchantHouse: {
    type: 'merchantHouse',
    tilesX: 3,
    tilesY: 2,
    pixelWidth: 96,
    pixelHeight: 80,
    heightLevels: 3,
    description: 'Portuguese merchant townhouse, whitewashed with blue trim',
  },
  customsHouse: {
    type: 'customsHouse',
    tilesX: 4,
    tilesY: 3,
    pixelWidth: 128,
    pixelHeight: 96,
    heightLevels: 4,
    description: 'Alfandega - Official customs house, grand colonial style',
  },
  warehouse: {
    type: 'warehouse',
    tilesX: 4,
    tilesY: 2,
    pixelWidth: 128,
    pixelHeight: 72,
    heightLevels: 2,
    description: 'Trading warehouse/godown with large wooden doors',
  },
  tavern: {
    type: 'tavern',
    tilesX: 2,
    tilesY: 2,
    pixelWidth: 64,
    pixelHeight: 72,
    heightLevels: 3,
    description: 'Colonial tavern with hanging sign',
  },

  // Religious Buildings
  cathedral: {
    type: 'cathedral',
    tilesX: 6,
    tilesY: 4,
    pixelWidth: 192,
    pixelHeight: 160,
    heightLevels: 8,
    description: 'Se Cathedral under construction with scaffolding',
  },
  chapel: {
    type: 'chapel',
    tilesX: 3,
    tilesY: 2,
    pixelWidth: 96,
    pixelHeight: 80,
    heightLevels: 4,
    description: 'Small Portuguese chapel with bell tower',
  },
  hinduShrine: {
    type: 'hinduShrine',
    tilesX: 2,
    tilesY: 2,
    pixelWidth: 64,
    pixelHeight: 64,
    heightLevels: 3,
    description: 'Colorful Hindu shrine with ornate carvings',
  },

  // Residential (2x2 tiles)
  portugueseTownhouse: {
    type: 'portugueseTownhouse',
    tilesX: 2,
    tilesY: 2,
    pixelWidth: 64,
    pixelHeight: 64,
    heightLevels: 3,
    description: 'Portuguese townhouse with balcony',
  },
  localDwelling: {
    type: 'localDwelling',
    tilesX: 2,
    tilesY: 2,
    pixelWidth: 64,
    pixelHeight: 56,
    heightLevels: 2,
    description: 'Traditional Goan dwelling',
  },
  arabMerchantHouse: {
    type: 'arabMerchantHouse',
    tilesX: 2,
    tilesY: 2,
    pixelWidth: 64,
    pixelHeight: 64,
    heightLevels: 3,
    description: 'Arab merchant residence with courtyard',
  },
};

// ============================================================================
// BUILDING GENERATOR CLASS
// ============================================================================

export class BuildingGenerator {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private seed: number = 12345;
  private textureCache: Map<string, string> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.make.graphics({ x: 0, y: 0 });
  }

  /**
   * Generate a building texture and return the texture key
   */
  public generateBuilding(config: BuildingConfig): string {
    const { type, variant, state = 'day', seed } = config;

    // Create cache key
    const cacheKey = `bldg_${type}_${variant || 'default'}_${state}_${seed || 'random'}`;

    // Check cache
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    // Set seed for deterministic generation
    if (seed !== undefined) {
      this.seed = seed;
    }

    const spec = BUILDING_SPECS[type];
    this.graphics.clear();

    // Route to specific generator
    switch (type) {
      case 'marketStall':
        this.drawMarketStall(spec, variant as MarketStallVariant || 'spice', state);
        break;
      case 'merchantHouse':
        this.drawMerchantHouse(spec, state);
        break;
      case 'customsHouse':
        this.drawCustomsHouse(spec, state);
        break;
      case 'warehouse':
        this.drawWarehouse(spec, state);
        break;
      case 'tavern':
        this.drawTavern(spec, state);
        break;
      case 'cathedral':
        this.drawCathedral(spec, state);
        break;
      case 'chapel':
        this.drawChapel(spec, state);
        break;
      case 'hinduShrine':
        this.drawHinduShrine(spec, state);
        break;
      case 'portugueseTownhouse':
        this.drawPortugueseTownhouse(spec, state);
        break;
      case 'localDwelling':
        this.drawLocalDwelling(spec, state);
        break;
      case 'arabMerchantHouse':
        this.drawArabMerchantHouse(spec, state);
        break;
    }

    // Generate texture
    this.graphics.generateTexture(cacheKey, spec.pixelWidth, spec.pixelHeight);
    this.textureCache.set(cacheKey, cacheKey);

    return cacheKey;
  }

  /**
   * Get building specifications
   */
  public getSpec(type: BuildingType): BuildingSpec {
    return BUILDING_SPECS[type];
  }

  /**
   * Get all building types
   */
  public getAllTypes(): BuildingType[] {
    return Object.keys(BUILDING_SPECS) as BuildingType[];
  }

  // ==========================================================================
  // SEEDED RANDOM
  // ==========================================================================

  private random(): number {
    // Simple seeded random (LCG)
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // Reserved for future use
  // private _randomInt(min: number, max: number): number {
  //   return Math.floor(this.random() * (max - min + 1)) + min;
  // }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }

  // ==========================================================================
  // ISOMETRIC HELPERS
  // ==========================================================================

  /**
   * Convert grid coordinates to isometric screen coordinates
   * Reserved for future use in complex building generation
   */
  // private _toIsometric(gridX: number, gridY: number, z: number = 0): IsometricPoint {
  //   return {
  //     x: (gridX - gridY) * (TILE_WIDTH / 2),
  //     y: (gridX + gridY) * (TILE_HEIGHT / 2) - z * Z_HEIGHT,
  //   };
  // }

  /**
   * Draw an isometric floor/platform
   */
  private drawIsometricFloor(
    centerX: number,
    baseY: number,
    tilesX: number,
    tilesY: number,
    z: number,
    fillColor: number,
    outlineColor: number = palette.darkWood
  ): void {
    const halfTileW = TILE_WIDTH / 2;
    const halfTileH = TILE_HEIGHT / 2;

    // Calculate corners of the isometric floor
    const topCorner = { x: centerX, y: baseY - z * Z_HEIGHT };
    const rightCorner = { x: centerX + tilesX * halfTileW, y: topCorner.y + tilesX * halfTileH };
    const bottomCorner = { x: centerX + (tilesX - tilesY) * halfTileW, y: topCorner.y + (tilesX + tilesY) * halfTileH };
    const leftCorner = { x: centerX - tilesY * halfTileW, y: topCorner.y + tilesY * halfTileH };

    this.graphics.fillStyle(fillColor);
    this.graphics.beginPath();
    this.graphics.moveTo(topCorner.x, topCorner.y);
    this.graphics.lineTo(rightCorner.x, rightCorner.y);
    this.graphics.lineTo(bottomCorner.x, bottomCorner.y);
    this.graphics.lineTo(leftCorner.x, leftCorner.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.lineStyle(1, outlineColor);
    this.graphics.strokePath();
  }

  /**
   * Draw an isometric box/wall
   */
  private drawIsometricBox(
    centerX: number,
    baseY: number,
    tilesX: number,
    tilesY: number,
    heightLevels: number,
    topColor: number,
    leftColor: number,
    rightColor: number,
    outlineColor: number = palette.darkWood
  ): void {
    const halfTileW = TILE_WIDTH / 2;
    const halfTileH = TILE_HEIGHT / 2;
    const boxHeight = heightLevels * Z_HEIGHT;

    // Top face vertices
    const topTop = { x: centerX, y: baseY - boxHeight };
    const topRight = { x: centerX + tilesX * halfTileW, y: baseY - boxHeight + tilesX * halfTileH };
    const topBottom = { x: centerX + (tilesX - tilesY) * halfTileW, y: baseY - boxHeight + (tilesX + tilesY) * halfTileH };
    const topLeft = { x: centerX - tilesY * halfTileW, y: baseY - boxHeight + tilesY * halfTileH };

    // Bottom face vertices (for sides)
    const bottomRight = { x: topRight.x, y: topRight.y + boxHeight };
    const bottomBottom = { x: topBottom.x, y: topBottom.y + boxHeight };
    const bottomLeft = { x: topLeft.x, y: topLeft.y + boxHeight };

    // Draw right face (visible side)
    this.graphics.fillStyle(rightColor);
    this.graphics.beginPath();
    this.graphics.moveTo(topRight.x, topRight.y);
    this.graphics.lineTo(topBottom.x, topBottom.y);
    this.graphics.lineTo(bottomBottom.x, bottomBottom.y);
    this.graphics.lineTo(bottomRight.x, bottomRight.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Draw left face (visible side)
    this.graphics.fillStyle(leftColor);
    this.graphics.beginPath();
    this.graphics.moveTo(topLeft.x, topLeft.y);
    this.graphics.lineTo(topBottom.x, topBottom.y);
    this.graphics.lineTo(bottomBottom.x, bottomBottom.y);
    this.graphics.lineTo(bottomLeft.x, bottomLeft.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Draw top face
    this.graphics.fillStyle(topColor);
    this.graphics.beginPath();
    this.graphics.moveTo(topTop.x, topTop.y);
    this.graphics.lineTo(topRight.x, topRight.y);
    this.graphics.lineTo(topBottom.x, topBottom.y);
    this.graphics.lineTo(topLeft.x, topLeft.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Draw outlines
    this.graphics.lineStyle(1, outlineColor);
    this.graphics.strokePath();

    // Outline all visible edges
    this.graphics.beginPath();
    this.graphics.moveTo(topTop.x, topTop.y);
    this.graphics.lineTo(topRight.x, topRight.y);
    this.graphics.lineTo(bottomRight.x, bottomRight.y);
    this.graphics.lineTo(bottomBottom.x, bottomBottom.y);
    this.graphics.lineTo(bottomLeft.x, bottomLeft.y);
    this.graphics.lineTo(topLeft.x, topLeft.y);
    this.graphics.lineTo(topTop.x, topTop.y);
    this.graphics.lineTo(topBottom.x, topBottom.y);
    this.graphics.moveTo(topLeft.x, topLeft.y);
    this.graphics.lineTo(topBottom.x, topBottom.y);
    this.graphics.lineTo(topRight.x, topRight.y);
    this.graphics.strokePath();
  }

  /**
   * Draw an isometric roof (triangular prism)
   */
  private drawIsometricRoof(
    centerX: number,
    baseY: number,
    tilesX: number,
    tilesY: number,
    roofHeight: number,
    roofColor: number,
    shadeColor: number,
    outlineColor: number = palette.darkWood
  ): void {
    const halfTileW = TILE_WIDTH / 2;
    const halfTileH = TILE_HEIGHT / 2;

    // Base vertices
    const topCorner = { x: centerX, y: baseY };
    const rightCorner = { x: centerX + tilesX * halfTileW, y: baseY + tilesX * halfTileH };
    const bottomCorner = { x: centerX + (tilesX - tilesY) * halfTileW, y: baseY + (tilesX + tilesY) * halfTileH };
    const leftCorner = { x: centerX - tilesY * halfTileW, y: baseY + tilesY * halfTileH };

    // Ridge line (center of roof)
    const ridgeStart = {
      x: (topCorner.x + leftCorner.x) / 2,
      y: ((topCorner.y + leftCorner.y) / 2) - roofHeight,
    };
    const ridgeEnd = {
      x: (rightCorner.x + bottomCorner.x) / 2,
      y: ((rightCorner.y + bottomCorner.y) / 2) - roofHeight,
    };

    // Draw front roof face (right side)
    this.graphics.fillStyle(roofColor);
    this.graphics.beginPath();
    this.graphics.moveTo(topCorner.x, topCorner.y);
    this.graphics.lineTo(ridgeStart.x, ridgeStart.y);
    this.graphics.lineTo(ridgeEnd.x, ridgeEnd.y);
    this.graphics.lineTo(rightCorner.x, rightCorner.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Draw back roof face (left side, shaded)
    this.graphics.fillStyle(shadeColor);
    this.graphics.beginPath();
    this.graphics.moveTo(leftCorner.x, leftCorner.y);
    this.graphics.lineTo(ridgeStart.x, ridgeStart.y);
    this.graphics.lineTo(ridgeEnd.x, ridgeEnd.y);
    this.graphics.lineTo(bottomCorner.x, bottomCorner.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Draw gable end (right triangle)
    this.graphics.fillStyle(shadeColor);
    this.graphics.beginPath();
    this.graphics.moveTo(rightCorner.x, rightCorner.y);
    this.graphics.lineTo(ridgeEnd.x, ridgeEnd.y);
    this.graphics.lineTo(bottomCorner.x, bottomCorner.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Outlines
    this.graphics.lineStyle(1, outlineColor);
    this.graphics.beginPath();
    this.graphics.moveTo(topCorner.x, topCorner.y);
    this.graphics.lineTo(ridgeStart.x, ridgeStart.y);
    this.graphics.lineTo(ridgeEnd.x, ridgeEnd.y);
    this.graphics.lineTo(rightCorner.x, rightCorner.y);
    this.graphics.lineTo(bottomCorner.x, bottomCorner.y);
    this.graphics.lineTo(ridgeEnd.x, ridgeEnd.y);
    this.graphics.moveTo(ridgeStart.x, ridgeStart.y);
    this.graphics.lineTo(leftCorner.x, leftCorner.y);
    this.graphics.lineTo(bottomCorner.x, bottomCorner.y);
    this.graphics.strokePath();
  }

  /**
   * Draw a window on an isometric surface
   */
  private drawWindow(
    x: number,
    y: number,
    width: number,
    height: number,
    isRightFace: boolean,
    isLit: boolean = false,
    hasShutters: boolean = true
  ): void {
    // Isometric skew for windows
    const skewX = isRightFace ? 0.5 : -0.5;

    // Window frame
    const windowColor = isLit ? palette.hempFiber : palette.darkWood;
    const glassColor = isLit ? 0xFFD700 : palette.portugueseBlue;

    // Draw window opening
    this.graphics.fillStyle(glassColor);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x + width, y + width * skewX * 0.5);
    this.graphics.lineTo(x + width, y + height + width * skewX * 0.5);
    this.graphics.lineTo(x, y + height);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Window frame
    this.graphics.lineStyle(1, windowColor);
    this.graphics.strokePath();

    // Cross bars
    this.graphics.beginPath();
    this.graphics.moveTo(x + width / 2, y + (width / 2) * skewX * 0.5);
    this.graphics.lineTo(x + width / 2, y + height + (width / 2) * skewX * 0.5);
    this.graphics.moveTo(x, y + height / 2);
    this.graphics.lineTo(x + width, y + height / 2 + width * skewX * 0.5);
    this.graphics.strokePath();

    // Shutters (if not night or if has shutters)
    if (hasShutters && !isLit) {
      this.graphics.fillStyle(palette.portugueseBlue);
      // Left shutter
      this.graphics.fillRect(x - 2, y, 2, height);
      // Right shutter
      this.graphics.fillRect(x + width, y + width * skewX * 0.5, 2, height);
    }
  }

  /**
   * Draw a door on an isometric surface
   */
  private drawDoor(
    x: number,
    y: number,
    width: number,
    height: number,
    isRightFace: boolean,
    isOpen: boolean = false,
    hasArch: boolean = false
  ): void {
    const skewX = isRightFace ? 0.5 : -0.5;

    // Door frame
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.beginPath();
    this.graphics.moveTo(x - 1, y - 1);
    this.graphics.lineTo(x + width + 1, y - 1 + (width + 2) * skewX * 0.5);
    this.graphics.lineTo(x + width + 1, y + height + (width + 2) * skewX * 0.5);
    this.graphics.lineTo(x - 1, y + height);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Door interior
    const doorColor = isOpen ? 0x1a1a1a : palette.terracotta;
    this.graphics.fillStyle(doorColor);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x + width, y + width * skewX * 0.5);
    this.graphics.lineTo(x + width, y + height + width * skewX * 0.5);
    this.graphics.lineTo(x, y + height);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Arch (if applicable)
    if (hasArch) {
      this.graphics.lineStyle(2, palette.ochreSand);
      this.graphics.beginPath();
      this.graphics.arc(x + width / 2, y + 2, width / 2 - 1, Math.PI, 0, false);
      this.graphics.strokePath();
    }

    // Door details (panels)
    if (!isOpen) {
      this.graphics.lineStyle(1, palette.darkWood);
      // Vertical split
      this.graphics.beginPath();
      this.graphics.moveTo(x + width / 2, y + 2);
      this.graphics.lineTo(x + width / 2, y + height - 1);
      this.graphics.strokePath();
    }
  }

  // ==========================================================================
  // MARKET STALLS
  // ==========================================================================

  private drawMarketStall(spec: BuildingSpec, variant: MarketStallVariant, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;

    // Support posts
    this.drawSupportPost(centerX - 20, baseY, 24);
    this.drawSupportPost(centerX + 20, baseY, 24);
    this.drawSupportPost(centerX - 20, baseY - 8, 24);
    this.drawSupportPost(centerX + 20, baseY - 8, 24);

    // Counter/table
    this.drawIsometricBox(
      centerX,
      baseY,
      1.5, 0.8,
      1,
      palette.hempFiber,
      this.darkenColor(palette.hempFiber, 0.2),
      this.darkenColor(palette.hempFiber, 0.1)
    );

    // Awning
    this.drawAwning(centerX, baseY - 24, 2, 1.2, variant);

    // Goods display based on variant
    this.drawGoods(centerX, baseY - 8, variant, state);

    // Active state - animated commerce indicator
    if (state === 'active') {
      this.drawActiveIndicator(centerX + 15, baseY - 30);
    }

    // Night state - lantern
    if (state === 'night') {
      this.drawLantern(centerX - 25, baseY - 20);
    }
  }

  private drawSupportPost(x: number, y: number, height: number): void {
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x - 1, y - height, 3, height);
    this.graphics.lineStyle(1, this.darkenColor(palette.darkWood, 0.3));
    this.graphics.strokeRect(x - 1, y - height, 3, height);
  }

  private drawAwning(
    centerX: number,
    y: number,
    tilesX: number,
    _tilesY: number,
    variant: MarketStallVariant
  ): void {
    // Awning colors based on variant
    const awningColors: { [key in MarketStallVariant]: number[] } = {
      spice: [0xCC4400, 0xFF6600, 0xCC4400],
      cloth: [palette.portugueseBlue, 0x2A4A7F, palette.portugueseBlue],
      pottery: [palette.terracotta, palette.ochreSand, palette.terracotta],
      food: [0x228B22, 0x32CD32, 0x228B22],
    };

    const colors = awningColors[variant];
    const halfTileW = TILE_WIDTH / 2;

    // Draw striped awning
    const stripeWidth = (tilesX * halfTileW * 2) / colors.length;

    for (let i = 0; i < colors.length; i++) {
      this.graphics.fillStyle(colors[i]);
      const startX = centerX - tilesX * halfTileW + i * stripeWidth;
      this.graphics.beginPath();
      this.graphics.moveTo(startX, y + i * 2);
      this.graphics.lineTo(startX + stripeWidth, y + (i + 0.5) * 2);
      this.graphics.lineTo(startX + stripeWidth, y + 6 + (i + 0.5) * 2);
      this.graphics.lineTo(startX, y + 6 + i * 2);
      this.graphics.closePath();
      this.graphics.fillPath();
    }

    // Awning outline
    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeRect(centerX - tilesX * halfTileW, y, tilesX * halfTileW * 2, 8);
  }

  private drawGoods(centerX: number, y: number, variant: MarketStallVariant, state: BuildingState): void {
    const isActive = state === 'active';

    switch (variant) {
      case 'spice':
        this.drawSpiceGoods(centerX, y, isActive);
        break;
      case 'cloth':
        this.drawClothGoods(centerX, y, isActive);
        break;
      case 'pottery':
        this.drawPotteryGoods(centerX, y, isActive);
        break;
      case 'food':
        this.drawFoodGoods(centerX, y, isActive);
        break;
    }
  }

  private drawSpiceGoods(centerX: number, y: number, _isActive: boolean): void {
    // Colorful spice bowls
    const spiceColors = [0xFF4500, 0xFFD700, 0x8B4513, 0xDC143C, 0x32CD32];

    for (let i = 0; i < 5; i++) {
      const bx = centerX - 15 + i * 7;
      const by = y + 2 + (i % 2) * 2;

      // Bowl
      this.graphics.fillStyle(palette.terracotta);
      this.graphics.fillCircle(bx, by + 2, 3);

      // Spice
      this.graphics.fillStyle(spiceColors[i]);
      this.graphics.fillCircle(bx, by, 2);
    }
  }

  private drawClothGoods(centerX: number, y: number, _isActive: boolean): void {
    // Hanging fabrics
    const fabricColors = [palette.portugueseBlue, 0xCC0000, 0xFFD700, 0x9932CC];

    for (let i = 0; i < 4; i++) {
      const fx = centerX - 18 + i * 12;
      const fy = y - 8;

      this.graphics.fillStyle(fabricColors[i]);
      // Hanging cloth
      this.graphics.fillRect(fx, fy, 4, 14);
      this.graphics.fillRect(fx - 2, fy + 14, 8, 4);

      // Outline
      this.graphics.lineStyle(1, palette.darkWood);
      this.graphics.strokeRect(fx, fy, 4, 14);
    }

    // Folded fabrics on counter
    for (let i = 0; i < 3; i++) {
      this.graphics.fillStyle(fabricColors[(i + 1) % 4]);
      this.graphics.fillRect(centerX - 10 + i * 8, y, 6, 4);
    }
  }

  private drawPotteryGoods(centerX: number, y: number, _isActive: boolean): void {
    // Ceramic pots and vases
    const potColors = [palette.terracotta, palette.ochreSand, 0xCD853F];

    // Large pot
    this.graphics.fillStyle(potColors[0]);
    this.graphics.fillCircle(centerX - 12, y + 1, 5);
    this.graphics.fillRect(centerX - 15, y - 6, 6, 7);

    // Medium pots
    for (let i = 0; i < 3; i++) {
      this.graphics.fillStyle(potColors[i % 3]);
      const px = centerX + i * 8;
      this.graphics.fillCircle(px, y + 2, 3);
      this.graphics.fillRect(px - 2, y - 2, 4, 4);
    }

    // Small decorative items
    for (let i = 0; i < 4; i++) {
      this.graphics.fillStyle(this.randomChoice(potColors));
      this.graphics.fillCircle(centerX - 5 + i * 5, y + 4, 2);
    }
  }

  private drawFoodGoods(centerX: number, y: number, _isActive: boolean): void {
    // Tropical fruits
    const fruitColors = [0xFFD700, 0xFF6347, 0x32CD32, 0xFFA500, 0x8B4513];

    // Fruit baskets
    for (let i = 0; i < 3; i++) {
      const bx = centerX - 15 + i * 15;
      const by = y + 2;

      // Basket
      this.graphics.fillStyle(palette.hempFiber);
      this.graphics.fillCircle(bx, by + 2, 5);

      // Fruits
      for (let j = 0; j < 4; j++) {
        this.graphics.fillStyle(fruitColors[(i + j) % 5]);
        this.graphics.fillCircle(bx - 2 + (j % 2) * 4, by - 2 + Math.floor(j / 2) * 3, 2);
      }
    }

    // Hanging items (fish, dried goods)
    this.graphics.fillStyle(0xC0C0C0);
    this.graphics.fillRect(centerX - 20, y - 10, 2, 8);
    this.graphics.fillRect(centerX + 18, y - 10, 2, 8);
  }

  private drawActiveIndicator(x: number, y: number): void {
    // Small coin/sparkle indicator for active commerce
    this.graphics.fillStyle(0xFFD700);
    this.graphics.fillCircle(x, y, 3);
    this.graphics.lineStyle(1, 0xFFA500);
    this.graphics.strokeCircle(x, y, 3);

    // Sparkle lines
    this.graphics.lineStyle(1, 0xFFFFFF);
    this.graphics.beginPath();
    this.graphics.moveTo(x - 5, y);
    this.graphics.lineTo(x + 5, y);
    this.graphics.moveTo(x, y - 5);
    this.graphics.lineTo(x, y + 5);
    this.graphics.strokePath();
  }

  private drawLantern(x: number, y: number): void {
    // Hanging lantern
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x, y - 8, 1, 8);

    // Lantern body
    this.graphics.fillStyle(0xFFD700);
    this.graphics.fillRect(x - 3, y, 7, 8);

    // Warm glow
    this.graphics.fillStyle(0xFFD700);
    this.graphics.fillCircle(x, y + 4, 10);
    this.graphics.fillStyle(0xFFA500);
    this.graphics.fillCircle(x, y + 4, 6);
  }

  // ==========================================================================
  // PORTUGUESE COLONIAL BUILDINGS
  // ==========================================================================

  private drawMerchantHouse(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;
    const isNight = state === 'night';

    // Main building body (whitewashed walls)
    const wallLight = palette.whitewash;
    const wallLeft = this.darkenColor(wallLight, 0.15);
    const wallRight = this.darkenColor(wallLight, 0.08);

    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX,
      spec.tilesY,
      spec.heightLevels,
      wallLight,
      wallLeft,
      wallRight
    );

    // Terracotta roof
    this.drawIsometricRoof(
      centerX,
      baseY - spec.heightLevels * Z_HEIGHT,
      spec.tilesX,
      spec.tilesY,
      12,
      palette.terracotta,
      this.darkenColor(palette.terracotta, 0.2)
    );

    // Blue trim around base
    this.drawTrim(centerX, baseY, spec.tilesX, spec.tilesY, palette.portugueseBlue);

    // Windows
    const windowY = baseY - spec.heightLevels * Z_HEIGHT + 8;
    this.drawWindow(centerX + 8, windowY, 6, 8, true, isNight);
    this.drawWindow(centerX + 22, windowY, 6, 8, true, isNight);

    // Second floor windows
    this.drawWindow(centerX + 8, windowY + 12, 6, 8, true, isNight);
    this.drawWindow(centerX + 22, windowY + 12, 6, 8, true, isNight);

    // Left face windows
    this.drawWindow(centerX - 20, windowY + 4, 5, 7, false, isNight);

    // Wooden balcony (balcao)
    this.drawBalcony(centerX + 15, windowY + 10, 20, 6);

    // Door
    this.drawDoor(centerX + 30, baseY - 14, 8, 12, true, state === 'active', true);

    // Night glow from windows
    if (isNight) {
      this.drawWindowGlow(centerX + 11, windowY + 4);
      this.drawWindowGlow(centerX + 25, windowY + 4);
    }
  }

  private drawCustomsHouse(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 12;
    const isNight = state === 'night';

    // Grand foundation/base
    this.drawIsometricBox(
      centerX,
      baseY + 4,
      spec.tilesX,
      spec.tilesY,
      1,
      palette.ochreSand,
      this.darkenColor(palette.ochreSand, 0.2),
      this.darkenColor(palette.ochreSand, 0.1)
    );

    // Main building body
    const wallLight = palette.whitewash;
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX,
      spec.tilesY,
      spec.heightLevels,
      wallLight,
      this.darkenColor(wallLight, 0.15),
      this.darkenColor(wallLight, 0.08)
    );

    // Impressive roof
    this.drawIsometricRoof(
      centerX,
      baseY - spec.heightLevels * Z_HEIGHT,
      spec.tilesX,
      spec.tilesY,
      16,
      palette.terracotta,
      this.darkenColor(palette.terracotta, 0.25)
    );

    // Official coat of arms (simplified)
    this.drawCoatOfArms(centerX + 20, baseY - spec.heightLevels * Z_HEIGHT + 12);

    // Grand entrance columns
    this.drawColumn(centerX + 35, baseY - 4, 20);
    this.drawColumn(centerX + 50, baseY - 4, 20);

    // Large arched entrance
    this.drawDoor(centerX + 40, baseY - 4, 12, 16, true, state === 'active', true);

    // Multiple windows with blue trim
    for (let i = 0; i < 3; i++) {
      const wx = centerX + 10 + i * 18;
      this.drawWindow(wx, baseY - 28, 8, 10, true, isNight, true);
    }

    // Upper floor windows
    for (let i = 0; i < 3; i++) {
      const wx = centerX + 10 + i * 18;
      this.drawWindow(wx, baseY - 42, 6, 8, true, isNight, true);
    }

    // Blue decorative trim
    this.drawTrim(centerX, baseY, spec.tilesX, spec.tilesY, palette.portugueseBlue);

    // Flag pole with Portuguese flag (simplified)
    if (state !== 'night') {
      this.drawFlagPole(centerX + 60, baseY - spec.heightLevels * Z_HEIGHT - 8);
    }
  }

  private drawWarehouse(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;

    // Functional stone base
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX,
      spec.tilesY,
      spec.heightLevels,
      palette.ochreSand,
      this.darkenColor(palette.ochreSand, 0.25),
      this.darkenColor(palette.ochreSand, 0.12)
    );

    // Simple gabled roof
    this.drawIsometricRoof(
      centerX,
      baseY - spec.heightLevels * Z_HEIGHT,
      spec.tilesX,
      spec.tilesY,
      10,
      palette.terracotta,
      this.darkenColor(palette.terracotta, 0.2)
    );

    // Large warehouse doors
    this.drawLargeDoor(centerX + 20, baseY - 2, 16, 14, state === 'active');
    this.drawLargeDoor(centerX + 45, baseY - 2, 16, 14, false);

    // Small ventilation windows
    this.drawWindow(centerX + 15, baseY - 22, 4, 4, true, false, false);
    this.drawWindow(centerX + 50, baseY - 22, 4, 4, true, false, false);

    // Crates outside (if active)
    if (state === 'active') {
      this.drawCrate(centerX + 55, baseY + 2);
      this.drawCrate(centerX + 60, baseY + 4);
    }

    // Lantern for night
    if (state === 'night') {
      this.drawLantern(centerX + 30, baseY - 18);
    }
  }

  private drawTavern(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;
    const isNight = state === 'night';

    // Main building
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX,
      spec.tilesY,
      spec.heightLevels,
      palette.whitewash,
      this.darkenColor(palette.whitewash, 0.18),
      this.darkenColor(palette.whitewash, 0.08)
    );

    // Roof
    this.drawIsometricRoof(
      centerX,
      baseY - spec.heightLevels * Z_HEIGHT,
      spec.tilesX,
      spec.tilesY,
      10,
      palette.terracotta,
      this.darkenColor(palette.terracotta, 0.2)
    );

    // Tavern sign
    this.drawTavernSign(centerX + 24, baseY - 20);

    // Door (often open)
    this.drawDoor(centerX + 20, baseY - 2, 8, 12, true, true, true);

    // Windows with warm glow at night
    this.drawWindow(centerX + 6, baseY - 18, 6, 8, true, isNight);
    this.drawWindow(centerX - 10, baseY - 14, 5, 7, false, isNight);

    // Upper windows
    this.drawWindow(centerX + 6, baseY - 28, 5, 6, true, isNight);
    this.drawWindow(centerX + 18, baseY - 28, 5, 6, true, isNight);

    // Warm lighting effect for night/active
    if (isNight || state === 'active') {
      this.drawWarmGlow(centerX + 24, baseY - 8);
    }

    // Barrel outside
    this.drawBarrel(centerX + 28, baseY + 2);
  }

  // ==========================================================================
  // RELIGIOUS BUILDINGS
  // ==========================================================================

  private drawCathedral(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 16;
    const isNight = state === 'night';

    // Grand foundation
    this.drawIsometricBox(
      centerX,
      baseY + 8,
      spec.tilesX,
      spec.tilesY,
      1,
      palette.ochreSand,
      this.darkenColor(palette.ochreSand, 0.2),
      this.darkenColor(palette.ochreSand, 0.1)
    );

    // Main nave
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX - 1,
      spec.tilesY,
      spec.heightLevels - 2,
      palette.whitewash,
      this.darkenColor(palette.whitewash, 0.15),
      this.darkenColor(palette.whitewash, 0.08)
    );

    // Bell tower (under construction - taller)
    this.drawIsometricBox(
      centerX - 30,
      baseY - 8,
      1.5,
      1.5,
      spec.heightLevels,
      palette.whitewash,
      this.darkenColor(palette.whitewash, 0.18),
      this.darkenColor(palette.whitewash, 0.1)
    );

    // Tower spire
    this.drawSpire(centerX - 30, baseY - 8 - spec.heightLevels * Z_HEIGHT, 20);

    // Main roof
    this.drawIsometricRoof(
      centerX,
      baseY - (spec.heightLevels - 2) * Z_HEIGHT,
      spec.tilesX - 1,
      spec.tilesY,
      18,
      palette.terracotta,
      this.darkenColor(palette.terracotta, 0.25)
    );

    // Rose window (simplified)
    this.drawRoseWindow(centerX + 40, baseY - 40);

    // Grand entrance
    this.drawDoor(centerX + 50, baseY - 2, 14, 20, true, false, true);

    // Side windows
    for (let i = 0; i < 4; i++) {
      this.drawWindow(centerX + 15 + i * 18, baseY - 35, 6, 12, true, isNight, false);
    }

    // SCAFFOLDING (under construction)
    this.drawScaffolding(centerX + 70, baseY - 20, 30, 40);

    // Cross on tower
    this.drawCross(centerX - 30, baseY - 8 - spec.heightLevels * Z_HEIGHT - 25);

    // Steps
    this.drawSteps(centerX + 55, baseY + 4, 20, 4);
  }

  private drawChapel(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;
    const isNight = state === 'night';

    // Main body
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX,
      spec.tilesY,
      spec.heightLevels - 1,
      palette.whitewash,
      this.darkenColor(palette.whitewash, 0.15),
      this.darkenColor(palette.whitewash, 0.08)
    );

    // Bell tower
    this.drawIsometricBox(
      centerX - 15,
      baseY - 4,
      1,
      1,
      spec.heightLevels + 1,
      palette.whitewash,
      this.darkenColor(palette.whitewash, 0.18),
      this.darkenColor(palette.whitewash, 0.1)
    );

    // Tower cap
    this.drawIsometricRoof(
      centerX - 15,
      baseY - 4 - (spec.heightLevels + 1) * Z_HEIGHT,
      1,
      1,
      8,
      palette.terracotta,
      this.darkenColor(palette.terracotta, 0.2)
    );

    // Main roof
    this.drawIsometricRoof(
      centerX,
      baseY - (spec.heightLevels - 1) * Z_HEIGHT,
      spec.tilesX,
      spec.tilesY,
      12,
      palette.terracotta,
      this.darkenColor(palette.terracotta, 0.2)
    );

    // Arched entrance
    this.drawDoor(centerX + 25, baseY - 2, 10, 14, true, false, true);

    // Windows
    this.drawWindow(centerX + 10, baseY - 20, 5, 10, true, isNight, false);
    this.drawWindow(centerX + 35, baseY - 20, 5, 10, true, isNight, false);

    // Bell in tower
    this.drawBell(centerX - 15, baseY - 4 - spec.heightLevels * Z_HEIGHT);

    // Cross on tower
    this.drawCross(centerX - 15, baseY - 4 - (spec.heightLevels + 1) * Z_HEIGHT - 12);

    // Blue trim
    this.drawTrim(centerX, baseY, spec.tilesX, spec.tilesY, palette.portugueseBlue);
  }

  private drawHinduShrine(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;
    const isNight = state === 'night';

    // Colorful base platform
    this.drawIsometricBox(
      centerX,
      baseY + 4,
      spec.tilesX,
      spec.tilesY,
      1,
      0xFFD700, // Gold
      this.darkenColor(0xFFD700, 0.2),
      this.darkenColor(0xFFD700, 0.1)
    );

    // Main shrine body (whitewashed with colorful trim)
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX - 0.5,
      spec.tilesY - 0.5,
      spec.heightLevels,
      palette.whitewash,
      this.darkenColor(palette.whitewash, 0.12),
      this.darkenColor(palette.whitewash, 0.06)
    );

    // Ornate tower (shikhara style - stepped)
    this.drawShikhara(centerX, baseY - spec.heightLevels * Z_HEIGHT, 16);

    // Colorful entrance arch
    this.drawOrnateArch(centerX + 15, baseY - 2, 8, 12, 0xCC0000);

    // Decorative elements - colorful stripes
    this.drawDecorativeStripes(centerX + 20, baseY - spec.heightLevels * Z_HEIGHT + 4, 0xCC0000);
    this.drawDecorativeStripes(centerX - 5, baseY - spec.heightLevels * Z_HEIGHT + 4, 0x228B22);

    // Oil lamps
    if (isNight || state === 'active') {
      this.drawOilLamp(centerX + 8, baseY);
      this.drawOilLamp(centerX + 22, baseY);
    }

    // Flowers/offerings if active
    if (state === 'active') {
      this.drawFlowers(centerX + 15, baseY + 2);
    }
  }

  // ==========================================================================
  // RESIDENTIAL BUILDINGS
  // ==========================================================================

  private drawPortugueseTownhouse(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;
    const isNight = state === 'night';

    // Main building
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX,
      spec.tilesY,
      spec.heightLevels,
      palette.whitewash,
      this.darkenColor(palette.whitewash, 0.15),
      this.darkenColor(palette.whitewash, 0.08)
    );

    // Roof
    this.drawIsometricRoof(
      centerX,
      baseY - spec.heightLevels * Z_HEIGHT,
      spec.tilesX,
      spec.tilesY,
      10,
      palette.terracotta,
      this.darkenColor(palette.terracotta, 0.2)
    );

    // Balcony (balcao)
    this.drawBalcony(centerX + 10, baseY - 14, 16, 6);

    // Windows with blue shutters
    this.drawWindow(centerX + 6, baseY - 10, 5, 7, true, isNight, true);
    this.drawWindow(centerX + 18, baseY - 10, 5, 7, true, isNight, true);

    // Upper windows
    this.drawWindow(centerX + 6, baseY - 20, 5, 6, true, isNight, true);
    this.drawWindow(centerX + 18, baseY - 20, 5, 6, true, isNight, true);

    // Door
    this.drawDoor(centerX + 24, baseY - 2, 7, 10, true, false, false);

    // Blue trim
    this.drawTrim(centerX, baseY, spec.tilesX, spec.tilesY, palette.portugueseBlue);

    // Ochre window trim
    this.drawWindowTrim(centerX + 6, baseY - 10, 5, 7, palette.ochreSand);
    this.drawWindowTrim(centerX + 18, baseY - 10, 5, 7, palette.ochreSand);
  }

  private drawLocalDwelling(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;
    const isNight = state === 'night';

    // Simple clay/mud walls
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX,
      spec.tilesY,
      spec.heightLevels,
      palette.ochreSand,
      this.darkenColor(palette.ochreSand, 0.2),
      this.darkenColor(palette.ochreSand, 0.1)
    );

    // Thatched/tile roof
    this.drawIsometricRoof(
      centerX,
      baseY - spec.heightLevels * Z_HEIGHT,
      spec.tilesX,
      spec.tilesY,
      8,
      palette.hempFiber,
      this.darkenColor(palette.hempFiber, 0.25)
    );

    // Simple doorway
    this.drawDoor(centerX + 18, baseY - 2, 6, 10, true, state === 'active', false);

    // Small windows
    this.drawWindow(centerX + 6, baseY - 12, 4, 5, true, isNight, false);
    this.drawWindow(centerX - 8, baseY - 10, 4, 5, false, isNight, false);

    // Veranda posts
    this.drawSupportPost(centerX + 26, baseY, 12);
    this.drawSupportPost(centerX + 30, baseY + 2, 12);

    // Veranda roof overhang
    this.graphics.fillStyle(palette.hempFiber);
    this.graphics.fillRect(centerX + 24, baseY - 14, 10, 3);

    // Clay pots outside
    if (state === 'active' || state === 'day') {
      this.drawClayPot(centerX + 28, baseY + 4);
    }
  }

  private drawArabMerchantHouse(spec: BuildingSpec, state: BuildingState): void {
    const centerX = spec.pixelWidth / 2;
    const baseY = spec.pixelHeight - 8;
    const isNight = state === 'night';

    // Courtyard-style building
    this.drawIsometricBox(
      centerX,
      baseY,
      spec.tilesX,
      spec.tilesY,
      spec.heightLevels,
      palette.whitewash,
      this.darkenColor(palette.whitewash, 0.12),
      this.darkenColor(palette.whitewash, 0.06)
    );

    // Flat roof with low parapet
    this.drawIsometricFloor(
      centerX,
      baseY - spec.heightLevels * Z_HEIGHT,
      spec.tilesX,
      spec.tilesY,
      0,
      palette.ochreSand
    );

    // Parapet
    this.drawParapet(centerX, baseY - spec.heightLevels * Z_HEIGHT, spec.tilesX, spec.tilesY);

    // Arched windows (mashrabiya style)
    this.drawMashrabiya(centerX + 8, baseY - 18, 8, 10, isNight);
    this.drawMashrabiya(centerX + 22, baseY - 18, 8, 10, isNight);

    // Arched doorway
    this.drawOrnateArch(centerX + 20, baseY - 2, 8, 12, palette.portugueseBlue);

    // Upper floor windows
    this.drawMashrabiya(centerX + 8, baseY - 28, 6, 8, isNight);
    this.drawMashrabiya(centerX + 22, baseY - 28, 6, 8, isNight);

    // Decorative tiles around door
    this.drawGeometricTiles(centerX + 16, baseY - 14);
    this.drawGeometricTiles(centerX + 30, baseY - 14);

    // Lantern at night
    if (isNight) {
      this.drawOilLamp(centerX + 24, baseY - 16);
    }
  }

  // ==========================================================================
  // ARCHITECTURAL DETAILS
  // ==========================================================================

  private drawTrim(
    centerX: number,
    baseY: number,
    tilesX: number,
    tilesY: number,
    color: number
  ): void {
    const halfTileW = TILE_WIDTH / 2;
    const halfTileH = TILE_HEIGHT / 2;

    // Bottom trim line
    this.graphics.lineStyle(2, color);
    this.graphics.beginPath();
    this.graphics.moveTo(centerX - tilesY * halfTileW, baseY + tilesY * halfTileH);
    this.graphics.lineTo(centerX + (tilesX - tilesY) * halfTileW, baseY + (tilesX + tilesY) * halfTileH);
    this.graphics.lineTo(centerX + tilesX * halfTileW, baseY + tilesX * halfTileH);
    this.graphics.strokePath();
  }

  private drawBalcony(x: number, y: number, width: number, height: number): void {
    // Balcony floor
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x - width / 2, y, width, 3);

    // Railing
    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeRect(x - width / 2, y - height, width, height);

    // Balusters
    for (let i = 0; i < width / 4; i++) {
      this.graphics.fillRect(x - width / 2 + i * 4 + 1, y - height, 2, height);
    }

    // Supports
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x - width / 2, y + 3, 2, 4);
    this.graphics.fillRect(x + width / 2 - 2, y + 3, 2, 4);
  }

  private drawColumn(x: number, y: number, height: number): void {
    // Column shaft
    this.graphics.fillStyle(palette.whitewash);
    this.graphics.fillRect(x - 2, y - height, 4, height);

    // Capital
    this.graphics.fillStyle(palette.ochreSand);
    this.graphics.fillRect(x - 3, y - height - 2, 6, 3);

    // Base
    this.graphics.fillRect(x - 3, y - 2, 6, 3);

    // Outline
    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeRect(x - 2, y - height, 4, height);
  }

  private drawCoatOfArms(x: number, y: number): void {
    // Simplified Portuguese coat of arms
    this.graphics.fillStyle(palette.portugueseBlue);
    this.graphics.fillRect(x - 6, y - 4, 12, 10);

    // Shield outline
    this.graphics.lineStyle(1, 0xFFD700);
    this.graphics.strokeRect(x - 6, y - 4, 12, 10);

    // Cross
    this.graphics.fillStyle(0xFFD700);
    this.graphics.fillRect(x - 1, y - 2, 2, 6);
    this.graphics.fillRect(x - 4, y + 1, 8, 2);
  }

  private drawFlagPole(x: number, y: number): void {
    // Pole
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x, y, 2, 20);

    // Flag
    this.graphics.fillStyle(0x228B22);
    this.graphics.fillRect(x + 2, y, 10, 3);
    this.graphics.fillStyle(0xCC0000);
    this.graphics.fillRect(x + 2, y + 3, 10, 4);
  }

  private drawLargeDoor(x: number, y: number, width: number, height: number, isOpen: boolean): void {
    // Door frame
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x - 2, y - height - 2, width + 4, height + 4);

    // Door panels
    const doorColor = isOpen ? 0x1a1a1a : palette.terracotta;
    this.graphics.fillStyle(doorColor);
    this.graphics.fillRect(x, y - height, width, height);

    // Door details if closed
    if (!isOpen) {
      this.graphics.lineStyle(1, palette.darkWood);
      // Vertical split
      this.graphics.beginPath();
      this.graphics.moveTo(x + width / 2, y - height + 2);
      this.graphics.lineTo(x + width / 2, y - 2);
      this.graphics.strokePath();

      // Horizontal bands
      this.graphics.beginPath();
      this.graphics.moveTo(x + 2, y - height / 3);
      this.graphics.lineTo(x + width - 2, y - height / 3);
      this.graphics.moveTo(x + 2, y - 2 * height / 3);
      this.graphics.lineTo(x + width - 2, y - 2 * height / 3);
      this.graphics.strokePath();
    }
  }

  private drawCrate(x: number, y: number): void {
    // Wooden crate
    this.graphics.fillStyle(palette.hempFiber);
    this.graphics.fillRect(x - 4, y - 6, 8, 6);

    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeRect(x - 4, y - 6, 8, 6);

    // Wood grain lines
    this.graphics.beginPath();
    this.graphics.moveTo(x - 4, y - 3);
    this.graphics.lineTo(x + 4, y - 3);
    this.graphics.strokePath();
  }

  private drawBarrel(x: number, y: number): void {
    // Barrel body
    this.graphics.fillStyle(palette.terracotta);
    this.graphics.fillCircle(x, y - 4, 4);
    this.graphics.fillRect(x - 4, y - 8, 8, 4);

    // Metal bands
    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeCircle(x, y - 4, 4);
    this.graphics.beginPath();
    this.graphics.moveTo(x - 4, y - 6);
    this.graphics.lineTo(x + 4, y - 6);
    this.graphics.strokePath();
  }

  private drawTavernSign(x: number, y: number): void {
    // Sign bracket
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x, y - 2, 8, 2);
    this.graphics.fillRect(x + 6, y, 2, 8);

    // Sign board
    this.graphics.fillStyle(palette.hempFiber);
    this.graphics.fillRect(x - 2, y + 6, 12, 8);

    // Sign decoration (tankard shape)
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x + 2, y + 8, 4, 4);

    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeRect(x - 2, y + 6, 12, 8);
  }

  private drawWarmGlow(x: number, y: number): void {
    // Warm light emanating from entrance
    this.graphics.fillStyle(0xFFD700);
    const alpha = 0.3;
    this.graphics.fillStyle(Phaser.Display.Color.GetColor32(255, 215, 0, Math.floor(alpha * 255)));
    this.graphics.fillTriangle(x, y, x - 8, y + 10, x + 8, y + 10);
  }

  private drawWindowGlow(x: number, y: number): void {
    // Soft glow around lit window
    this.graphics.fillStyle(0xFFD700);
    this.graphics.fillCircle(x, y, 8);
  }

  private drawSpire(x: number, y: number, height: number): void {
    // Pointed spire
    this.graphics.fillStyle(palette.terracotta);
    this.graphics.fillTriangle(x, y - height, x - 6, y, x + 6, y);

    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeTriangle(x, y - height, x - 6, y, x + 6, y);
  }

  private drawRoseWindow(x: number, y: number): void {
    // Circular rose window
    this.graphics.fillStyle(palette.portugueseBlue);
    this.graphics.fillCircle(x, y, 8);

    // Decorative spokes
    this.graphics.lineStyle(1, palette.ochreSand);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      this.graphics.beginPath();
      this.graphics.moveTo(x, y);
      this.graphics.lineTo(x + Math.cos(angle) * 7, y + Math.sin(angle) * 7);
      this.graphics.strokePath();
    }

    // Outer ring
    this.graphics.strokeCircle(x, y, 8);
  }

  private drawScaffolding(x: number, y: number, width: number, height: number): void {
    // Wooden scaffolding (under construction)
    this.graphics.lineStyle(2, palette.hempFiber);

    // Vertical poles
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x, y - height);
    this.graphics.moveTo(x + width, y);
    this.graphics.lineTo(x + width, y - height);
    this.graphics.strokePath();

    // Horizontal platforms
    for (let i = 0; i < 4; i++) {
      const platformY = y - (i + 1) * (height / 4);
      this.graphics.beginPath();
      this.graphics.moveTo(x, platformY);
      this.graphics.lineTo(x + width, platformY);
      this.graphics.strokePath();
    }

    // Cross braces
    this.graphics.lineStyle(1, palette.hempFiber);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x + width, y - height / 2);
    this.graphics.moveTo(x + width, y);
    this.graphics.lineTo(x, y - height / 2);
    this.graphics.strokePath();
  }

  private drawCross(x: number, y: number): void {
    // Simple cross
    this.graphics.fillStyle(palette.ochreSand);
    this.graphics.fillRect(x - 1, y - 8, 3, 12);
    this.graphics.fillRect(x - 4, y - 5, 9, 3);

    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeRect(x - 1, y - 8, 3, 12);
  }

  private drawSteps(x: number, y: number, width: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const stepY = y + i * 2;
      const stepW = width - i * 2;

      this.graphics.fillStyle(palette.ochreSand);
      this.graphics.fillRect(x + i, stepY, stepW, 2);

      this.graphics.lineStyle(1, palette.darkWood);
      this.graphics.strokeRect(x + i, stepY, stepW, 2);
    }
  }

  private drawBell(x: number, y: number): void {
    // Church bell
    this.graphics.fillStyle(0xB8860B);
    this.graphics.fillRect(x - 3, y - 6, 6, 8);
    this.graphics.fillTriangle(x, y + 2, x - 4, y + 6, x + 4, y + 6);

    this.graphics.lineStyle(1, palette.darkWood);
    this.graphics.strokeRect(x - 3, y - 6, 6, 8);
  }

  private drawShikhara(x: number, y: number, height: number): void {
    // Hindu temple tower (stepped pyramid style)
    const levels = 4;
    const levelHeight = height / levels;

    for (let i = 0; i < levels; i++) {
      const levelWidth = 12 - i * 2;
      const levelY = y - i * levelHeight;

      // Alternating colors
      const color = i % 2 === 0 ? 0xFFD700 : 0xCC0000;
      this.graphics.fillStyle(color);
      this.graphics.fillRect(x - levelWidth / 2, levelY - levelHeight, levelWidth, levelHeight);

      this.graphics.lineStyle(1, palette.darkWood);
      this.graphics.strokeRect(x - levelWidth / 2, levelY - levelHeight, levelWidth, levelHeight);
    }

    // Kalash (pot) on top
    this.graphics.fillStyle(0xFFD700);
    this.graphics.fillCircle(x, y - height - 2, 3);
  }

  private drawOrnateArch(x: number, y: number, width: number, height: number, color: number): void {
    // Colorful archway
    this.graphics.fillStyle(color);
    this.graphics.fillRect(x - 2, y - height, 4, height);
    this.graphics.fillRect(x + width - 2, y - height, 4, height);

    // Arch top
    this.graphics.beginPath();
    this.graphics.arc(x + width / 2, y - height + 2, width / 2, Math.PI, 0, false);
    this.graphics.fillPath();

    // Inner opening
    this.graphics.fillStyle(0x1a1a1a);
    this.graphics.fillRect(x + 2, y - height + 4, width - 4, height - 4);
  }

  private drawDecorativeStripes(x: number, y: number, color: number): void {
    // Colorful horizontal stripes
    this.graphics.fillStyle(color);
    this.graphics.fillRect(x - 4, y, 8, 2);
    this.graphics.fillRect(x - 4, y + 4, 8, 2);
  }

  private drawOilLamp(x: number, y: number): void {
    // Traditional oil lamp
    this.graphics.fillStyle(palette.terracotta);
    this.graphics.fillCircle(x, y, 3);

    // Flame
    this.graphics.fillStyle(0xFFD700);
    this.graphics.fillTriangle(x, y - 6, x - 2, y - 2, x + 2, y - 2);

    // Glow
    this.graphics.fillStyle(0xFFA500);
    this.graphics.fillCircle(x, y - 3, 5);
  }

  private drawFlowers(x: number, y: number): void {
    // Flower offerings
    const colors = [0xFF69B4, 0xFFD700, 0xFF4500, 0x9932CC];

    for (let i = 0; i < 4; i++) {
      this.graphics.fillStyle(colors[i]);
      this.graphics.fillCircle(x - 4 + i * 3, y, 2);
    }
  }

  private drawWindowTrim(x: number, y: number, width: number, height: number, color: number): void {
    // Decorative trim around window
    this.graphics.lineStyle(2, color);
    this.graphics.strokeRect(x - 1, y - 1, width + 2, height + 2);
  }

  private drawClayPot(x: number, y: number): void {
    this.graphics.fillStyle(palette.terracotta);
    this.graphics.fillCircle(x, y, 3);
    this.graphics.fillRect(x - 2, y - 3, 4, 3);
  }

  private drawParapet(
    centerX: number,
    baseY: number,
    tilesX: number,
    _tilesY: number
  ): void {
    const halfTileW = TILE_WIDTH / 2;
    const halfTileH = TILE_HEIGHT / 2;
    const parapetHeight = 4;

    // Right parapet
    this.graphics.fillStyle(palette.whitewash);
    const rightStart = { x: centerX, y: baseY };
    const rightEnd = { x: centerX + tilesX * halfTileW, y: baseY + tilesX * halfTileH };

    this.graphics.fillRect(rightEnd.x - 2, rightEnd.y - parapetHeight, 4, parapetHeight);

    // Decorative crenellations
    for (let i = 0; i < tilesX * 2; i++) {
      if (i % 2 === 0) {
        const px = rightStart.x + (i / (tilesX * 2)) * (rightEnd.x - rightStart.x);
        const py = rightStart.y + (i / (tilesX * 2)) * (rightEnd.y - rightStart.y);
        this.graphics.fillRect(px - 1, py - parapetHeight - 2, 3, parapetHeight + 2);
      }
    }
  }

  private drawMashrabiya(
    x: number,
    y: number,
    width: number,
    height: number,
    isLit: boolean
  ): void {
    // Arabic-style projecting window with wooden lattice
    // Window opening
    this.graphics.fillStyle(isLit ? 0xFFD700 : palette.portugueseBlue);
    this.graphics.fillRect(x, y, width, height);

    // Lattice work
    this.graphics.lineStyle(1, palette.darkWood);

    // Horizontal lines
    for (let i = 1; i < 4; i++) {
      this.graphics.beginPath();
      this.graphics.moveTo(x, y + (height / 4) * i);
      this.graphics.lineTo(x + width, y + (height / 4) * i);
      this.graphics.strokePath();
    }

    // Vertical lines
    for (let i = 1; i < 3; i++) {
      this.graphics.beginPath();
      this.graphics.moveTo(x + (width / 3) * i, y);
      this.graphics.lineTo(x + (width / 3) * i, y + height);
      this.graphics.strokePath();
    }

    // Frame
    this.graphics.strokeRect(x, y, width, height);

    // Projecting ledge
    this.graphics.fillStyle(palette.darkWood);
    this.graphics.fillRect(x - 1, y + height, width + 2, 3);
  }

  private drawGeometricTiles(x: number, y: number): void {
    // Islamic geometric pattern (simplified)
    const tileSize = 4;
    const colors = [palette.portugueseBlue, 0xFFD700, palette.whitewash];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.graphics.fillStyle(colors[(i + j) % 3]);
        this.graphics.fillRect(x + i * tileSize, y + j * tileSize, tileSize - 1, tileSize - 1);
      }
    }
  }

  // ==========================================================================
  // COLOR UTILITIES
  // ==========================================================================

  private darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (color & 0xff) * (1 - amount));
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  /**
   * Lighten a color by a specified amount
   * Reserved for future use in highlight effects
   */
  // private _lightenColor(color: number, amount: number): number {
  //   const r = Math.min(255, ((color >> 16) & 0xff) + 255 * amount);
  //   const g = Math.min(255, ((color >> 8) & 0xff) + 255 * amount);
  //   const b = Math.min(255, (color & 0xff) + 255 * amount);
  //   return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  // }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  public destroy(): void {
    this.graphics.destroy();
    this.textureCache.clear();
  }

  /**
   * Clear the texture cache to free memory
   */
  public clearCache(): void {
    for (const key of this.textureCache.keys()) {
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
    }
    this.textureCache.clear();
  }
}
