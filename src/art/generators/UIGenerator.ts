/**
 * UIGenerator - Procedural UI Element Generator for Goa 1590
 *
 * Generates period-appropriate UI elements with Portuguese colonial styling:
 * - Aged parchment aesthetic
 * - Gold accents on important elements
 * - Portuguese decorative motifs
 * - Clean pixel art with limited anti-aliasing
 */

import {
  GOLD,
  WOOD_DARK,
  WOOD_LIGHT,
  SILK_GOLD,
  IRON,
  FABRIC_RED,
  FABRIC_BLUE,
  FABRIC_GREEN,
  PEPPER_BLACK,
  CINNAMON,
  CLOVES,
  lerpColor,
} from '../palette';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PanelOptions {
  width: number;
  height: number;
  cornerRadius?: number;
  borderWidth?: number;
  hasGoldAccent?: boolean;
  agingIntensity?: number; // 0-1
}

export interface ButtonOptions {
  width: number;
  height: number;
  text?: string;
  cornerRadius?: number;
}

export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';

export interface IconOptions {
  size: number;
  type: IconType;
}

export type IconType =
  // Trade goods (24x24)
  | 'pepper'
  | 'cinnamon'
  | 'cloves'
  | 'silk'
  | 'porcelain'
  // Currency (16x16)
  | 'gold_coins'
  | 'silver_coins'
  // Status (16x16)
  | 'health'
  | 'reputation'
  | 'time'
  // Actions (16x16)
  | 'buy'
  | 'sell'
  | 'talk'
  | 'quest';

export type FactionType = 'crown' | 'free_traders' | 'old_routes';

// ============================================================================
// UI COLOR PALETTE (derived from main palette)
// ============================================================================

export const UI_COLORS = {
  // Parchment colors
  parchment: {
    light: 0xfff8f0,
    base: 0xf4e4bc,
    aged: 0xe8d4a8,
    dark: 0xd4c4a0,
    stain: 0xc8b080,
  },
  // Wood frame colors
  wood: {
    highlight: WOOD_DARK.highlight,
    base: WOOD_DARK.base,
    shadow: WOOD_DARK.shadow,
    deep: WOOD_DARK.deep,
  },
  // Gold accents
  gold: {
    bright: GOLD.highlight,
    base: GOLD.base,
    shadow: GOLD.shadow,
    deep: GOLD.deep,
  },
  // Text ink colors
  ink: {
    black: 0x2c1810,
    brown: 0x4a3020,
    faded: 0x6a5040,
    gold: 0x8b6914,
  },
  // Button colors
  button: {
    normal: 0x3d2314,
    hover: 0x5a3824,
    pressed: 0x2c1810,
    disabled: 0x6a6a6a,
    textNormal: 0xf4e4bc,
    textDisabled: 0xa0a0a0,
  },
  // Status bar colors
  status: {
    health: 0x4a8a42,
    healthLow: 0x8b2500,
    reputation: 0xc9a227,
    time: 0x4a8ab0,
  },
  // Wax seal colors
  waxSeal: {
    red: 0x8b2500,
    redHighlight: 0xa83000,
    green: 0x2d5a27,
    greenHighlight: 0x4a8a42,
  },
};

// Button size presets
export const BUTTON_SIZES: Record<ButtonSize, { width: number; height: number }> = {
  small: { width: 48, height: 24 },
  medium: { width: 96, height: 32 },
  large: { width: 144, height: 40 },
};

// Icon size presets
export const ICON_SIZES = {
  goods: 24,
  status: 16,
  action: 16,
  currency: 16,
};

// ============================================================================
// UI GENERATOR CLASS
// ============================================================================

export class UIGenerator {
  private graphics: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
  }

  /**
   * Create a new graphics context for drawing
   */
  private createGraphics(): Phaser.GameObjects.Graphics {
    return this.scene.add.graphics();
  }

  // ==========================================================================
  // PANELS & FRAMES
  // ==========================================================================

  /**
   * Generate a parchment panel with aged paper texture and torn edges
   */
  generateParchmentPanel(options: PanelOptions): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const {
      width,
      height,
      cornerRadius = 8,
      borderWidth = 4,
      hasGoldAccent = true,
      agingIntensity = 0.3,
    } = options;

    // Main parchment fill
    g.fillStyle(UI_COLORS.parchment.base, 0.98);
    g.fillRoundedRect(0, 0, width, height, cornerRadius);

    // Aged paper texture (subtle noise and stains)
    this.drawAgedTexture(g, width, height, agingIntensity);

    // Torn edge effect on corners
    this.drawTornEdges(g, width, height, cornerRadius);

    // Dark wood frame
    g.fillStyle(UI_COLORS.wood.base, 1);
    g.fillRect(0, 0, width, borderWidth);
    g.fillRect(0, height - borderWidth, width, borderWidth);
    g.fillRect(0, 0, borderWidth, height);
    g.fillRect(width - borderWidth, 0, borderWidth, height);

    // Gold accent line (inside the frame)
    if (hasGoldAccent) {
      g.fillStyle(UI_COLORS.gold.shadow, 0.7);
      g.fillRect(borderWidth, borderWidth, width - borderWidth * 2, 2);
      g.fillRect(borderWidth, height - borderWidth - 2, width - borderWidth * 2, 2);
    }

    return g;
  }

  /**
   * Generate a wooden frame panel (dark wood with grain)
   */
  generateWoodenFrame(options: PanelOptions): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const { width, height, borderWidth = 6 } = options;

    // Inner area (lighter wood)
    g.fillStyle(WOOD_LIGHT.base, 1);
    g.fillRect(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2);

    // Wood grain texture
    this.drawWoodGrain(g, borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2);

    // Outer frame (dark wood)
    g.fillStyle(UI_COLORS.wood.base, 1);
    g.fillRect(0, 0, width, borderWidth);
    g.fillRect(0, height - borderWidth, width, borderWidth);
    g.fillRect(0, 0, borderWidth, height);
    g.fillRect(width - borderWidth, 0, borderWidth, height);

    // Frame highlight (top-left edges)
    g.fillStyle(UI_COLORS.wood.highlight, 0.6);
    g.fillRect(0, 0, width, 2);
    g.fillRect(0, 0, 2, height);

    // Frame shadow (bottom-right edges)
    g.fillStyle(UI_COLORS.wood.deep, 0.8);
    g.fillRect(0, height - 2, width, 2);
    g.fillRect(width - 2, 0, 2, height);

    // Corner reinforcements
    this.drawWoodCorners(g, width, height, borderWidth);

    return g;
  }

  /**
   * Generate a ledger/book style panel
   */
  generateLedgerPanel(options: PanelOptions): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const { width, height, agingIntensity = 0.2 } = options;
    const bindingWidth = 20;

    // Main page area
    g.fillStyle(UI_COLORS.parchment.base, 0.98);
    g.fillRect(bindingWidth, 0, width - bindingWidth, height);

    // Page aging
    this.drawAgedTexture(g, width, height, agingIntensity);

    // Ledger lines (horizontal ruling)
    g.lineStyle(1, UI_COLORS.parchment.dark, 0.4);
    const lineSpacing = 20;
    for (let y = 40; y < height - 20; y += lineSpacing) {
      g.lineBetween(bindingWidth + 10, y, width - 10, y);
    }

    // Vertical margin line
    g.lineStyle(1, UI_COLORS.ink.faded, 0.3);
    g.lineBetween(bindingWidth + 40, 20, bindingWidth + 40, height - 20);

    // Leather binding
    g.fillStyle(WOOD_DARK.shadow, 1);
    g.fillRect(0, 0, bindingWidth, height);

    // Binding texture
    g.fillStyle(WOOD_DARK.highlight, 0.3);
    for (let y = 5; y < height; y += 10) {
      g.fillRect(2, y, bindingWidth - 4, 2);
    }

    // Gold embossing on binding
    g.fillStyle(UI_COLORS.gold.shadow, 0.6);
    g.fillRect(bindingWidth - 3, 10, 2, height - 20);

    // Page edge shadow
    g.fillStyle(UI_COLORS.parchment.stain, 0.5);
    g.fillRect(bindingWidth, 0, 4, height);

    return g;
  }

  /**
   * Generate a scroll panel with rolled edges
   */
  generateScrollPanel(options: PanelOptions): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const { width, height, agingIntensity = 0.25 } = options;
    const rollHeight = 16;

    // Main scroll body
    g.fillStyle(UI_COLORS.parchment.base, 0.98);
    g.fillRect(0, rollHeight, width, height - rollHeight * 2);

    // Aging texture
    this.drawAgedTexture(g, width, height, agingIntensity);

    // Top roll
    this.drawScrollRoll(g, 0, 0, width, rollHeight, true);

    // Bottom roll
    this.drawScrollRoll(g, 0, height - rollHeight, width, rollHeight, false);

    // Side shadows for depth
    g.fillStyle(UI_COLORS.parchment.stain, 0.4);
    g.fillRect(0, rollHeight, 6, height - rollHeight * 2);
    g.fillStyle(UI_COLORS.parchment.dark, 0.3);
    g.fillRect(width - 6, rollHeight, 6, height - rollHeight * 2);

    return g;
  }

  /**
   * Generate an ornate dialog box with decorative border
   */
  generateDialogBox(options: PanelOptions): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const { width, height, hasGoldAccent = true } = options;
    const borderWidth = 8;

    // Main parchment background
    g.fillStyle(UI_COLORS.parchment.base, 0.98);
    g.fillRoundedRect(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2, 6);

    // Aging
    this.drawAgedTexture(g, width, height, 0.15);

    // Ornate border (dark wood base)
    g.fillStyle(UI_COLORS.wood.base, 1);
    g.fillRect(0, 0, width, borderWidth);
    g.fillRect(0, height - borderWidth, width, borderWidth);
    g.fillRect(0, 0, borderWidth, height);
    g.fillRect(width - borderWidth, 0, borderWidth, height);

    // Corner ornaments
    if (hasGoldAccent) {
      this.drawPortugueseCornerOrnament(g, 0, 0);
      this.drawPortugueseCornerOrnament(g, width - 24, 0, true);
      this.drawPortugueseCornerOrnament(g, 0, height - 24, false, true);
      this.drawPortugueseCornerOrnament(g, width - 24, height - 24, true, true);
    }

    // Inner gold accent line
    if (hasGoldAccent) {
      g.lineStyle(2, UI_COLORS.gold.shadow, 0.8);
      g.strokeRoundedRect(
        borderWidth + 2,
        borderWidth + 2,
        width - borderWidth * 2 - 4,
        height - borderWidth * 2 - 4,
        4
      );
    }

    return g;
  }

  // ==========================================================================
  // BUTTONS
  // ==========================================================================

  /**
   * Generate a button with the specified size and state
   */
  generateButton(size: ButtonSize, state: ButtonState): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const { width, height } = BUTTON_SIZES[size];
    const cornerRadius = size === 'small' ? 3 : size === 'medium' ? 4 : 5;

    // Determine colors based on state
    let bgColor: number;
    let yOffset = 0;
    let shadowDepth = 3;

    switch (state) {
      case 'normal':
        bgColor = UI_COLORS.button.normal;
        break;
      case 'hover':
        bgColor = UI_COLORS.button.hover;
        break;
      case 'pressed':
        bgColor = UI_COLORS.button.pressed;
        yOffset = 2;
        shadowDepth = 1;
        break;
      case 'disabled':
        bgColor = UI_COLORS.button.disabled;
        shadowDepth = 1;
        break;
    }

    // Drop shadow
    if (state !== 'pressed') {
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(2, 2 + shadowDepth, width, height, cornerRadius);
    }

    // Button body
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(0, yOffset, width, height, cornerRadius);

    // Top highlight
    if (state !== 'pressed' && state !== 'disabled') {
      g.fillStyle(lerpColor(bgColor, 0xffffff, 0.2), 0.5);
      g.fillRect(4, yOffset + 2, width - 8, 2);
    }

    // Bottom shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRect(4, yOffset + height - 4, width - 8, 2);

    // Gold border for normal/hover states
    if (state === 'normal' || state === 'hover') {
      g.lineStyle(1, UI_COLORS.gold.shadow, state === 'hover' ? 1 : 0.6);
      g.strokeRoundedRect(0, yOffset, width, height, cornerRadius);
    }

    return g;
  }

  /**
   * Generate all button states as a container
   */
  generateButtonSet(size: ButtonSize): {
    normal: Phaser.GameObjects.Graphics;
    hover: Phaser.GameObjects.Graphics;
    pressed: Phaser.GameObjects.Graphics;
    disabled: Phaser.GameObjects.Graphics;
  } {
    return {
      normal: this.generateButton(size, 'normal'),
      hover: this.generateButton(size, 'hover'),
      pressed: this.generateButton(size, 'pressed'),
      disabled: this.generateButton(size, 'disabled'),
    };
  }

  // ==========================================================================
  // ICONS
  // ==========================================================================

  /**
   * Generate a trade goods icon (24x24)
   */
  generateGoodsIcon(type: 'pepper' | 'cinnamon' | 'cloves' | 'silk' | 'porcelain'): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const size = ICON_SIZES.goods;

    switch (type) {
      case 'pepper':
        this.drawPepperIcon(g, size);
        break;
      case 'cinnamon':
        this.drawCinnamonIcon(g, size);
        break;
      case 'cloves':
        this.drawClovesIcon(g, size);
        break;
      case 'silk':
        this.drawSilkIcon(g, size);
        break;
      case 'porcelain':
        this.drawPorcelainIcon(g, size);
        break;
    }

    return g;
  }

  /**
   * Generate a currency icon (16x16)
   */
  generateCurrencyIcon(type: 'gold_coins' | 'silver_coins'): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const size = ICON_SIZES.currency;

    if (type === 'gold_coins') {
      this.drawGoldCoinsIcon(g, size);
    } else {
      this.drawSilverCoinsIcon(g, size);
    }

    return g;
  }

  /**
   * Generate a status icon (16x16)
   */
  generateStatusIcon(type: 'health' | 'reputation' | 'time'): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const size = ICON_SIZES.status;

    switch (type) {
      case 'health':
        this.drawHealthIcon(g, size);
        break;
      case 'reputation':
        this.drawReputationIcon(g, size);
        break;
      case 'time':
        this.drawTimeIcon(g, size);
        break;
    }

    return g;
  }

  /**
   * Generate an action icon (16x16)
   */
  generateActionIcon(type: 'buy' | 'sell' | 'talk' | 'quest'): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const size = ICON_SIZES.action;

    switch (type) {
      case 'buy':
        this.drawBuyIcon(g, size);
        break;
      case 'sell':
        this.drawSellIcon(g, size);
        break;
      case 'talk':
        this.drawTalkIcon(g, size);
        break;
      case 'quest':
        this.drawQuestIcon(g, size);
        break;
    }

    return g;
  }

  // ==========================================================================
  // DECORATIVE ELEMENTS
  // ==========================================================================

  /**
   * Generate a Portuguese-style corner ornament
   */
  generateCornerOrnament(_size: number = 24): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    this.drawPortugueseCornerOrnament(g, 0, 0);
    return g;
  }

  /**
   * Generate a horizontal divider with ornamental ends
   */
  generateDivider(width: number): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();

    // Main line
    g.lineStyle(2, UI_COLORS.gold.shadow, 0.8);
    g.lineBetween(12, 6, width - 12, 6);

    // Center ornament
    const centerX = width / 2;
    g.fillStyle(UI_COLORS.gold.base, 1);
    g.fillCircle(centerX, 6, 4);
    g.fillStyle(UI_COLORS.gold.deep, 0.8);
    g.fillCircle(centerX, 6, 2);

    // End flourishes
    g.fillStyle(UI_COLORS.gold.shadow, 0.9);
    // Left
    g.fillRect(4, 4, 8, 4);
    g.fillRect(0, 2, 4, 8);
    // Right
    g.fillRect(width - 12, 4, 8, 4);
    g.fillRect(width - 4, 2, 4, 8);

    return g;
  }

  /**
   * Generate a vertical border decoration
   */
  generateBorder(height: number): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const borderWidth = 8;

    // Main border line
    g.fillStyle(UI_COLORS.wood.base, 1);
    g.fillRect(0, 0, borderWidth, height);

    // Gold inlay pattern
    g.fillStyle(UI_COLORS.gold.shadow, 0.7);
    g.fillRect(2, 0, 2, height);

    // Decorative dots
    for (let y = 10; y < height - 10; y += 20) {
      g.fillStyle(UI_COLORS.gold.base, 0.8);
      g.fillCircle(4, y, 2);
    }

    return g;
  }

  /**
   * Generate a compass rose decoration
   */
  generateCompassRose(size: number = 48): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const center = size / 2;
    const outerRadius = size / 2 - 2;
    const innerRadius = outerRadius * 0.3;

    // Outer circle
    g.lineStyle(2, UI_COLORS.gold.shadow, 1);
    g.strokeCircle(center, center, outerRadius);

    // Cardinal points (N, E, S, W)
    const cardinalLength = outerRadius * 0.9;
    g.fillStyle(UI_COLORS.gold.base, 1);

    // North (top) - special treatment
    this.drawCompassPoint(g, center, center, 0, cardinalLength, 6, true);
    // East
    this.drawCompassPoint(g, center, center, Math.PI / 2, cardinalLength, 6, false);
    // South
    this.drawCompassPoint(g, center, center, Math.PI, cardinalLength, 6, false);
    // West
    this.drawCompassPoint(g, center, center, (3 * Math.PI) / 2, cardinalLength, 6, false);

    // Intercardinal points (NE, SE, SW, NW)
    const interLength = outerRadius * 0.6;
    g.fillStyle(UI_COLORS.gold.shadow, 1);

    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 4) + (i * Math.PI / 2);
      this.drawCompassPoint(g, center, center, angle, interLength, 4, false);
    }

    // Center decoration
    g.fillStyle(UI_COLORS.gold.deep, 1);
    g.fillCircle(center, center, innerRadius);
    g.fillStyle(UI_COLORS.gold.base, 1);
    g.fillCircle(center, center, innerRadius * 0.5);

    return g;
  }

  /**
   * Generate a ship silhouette decoration
   */
  generateShipSilhouette(size: number = 32): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const scale = size / 32;

    g.fillStyle(UI_COLORS.wood.shadow, 1);

    // Hull
    g.beginPath();
    g.moveTo(4 * scale, 24 * scale);
    g.lineTo(28 * scale, 24 * scale);
    g.lineTo(30 * scale, 20 * scale);
    g.lineTo(28 * scale, 16 * scale);
    g.lineTo(4 * scale, 16 * scale);
    g.lineTo(2 * scale, 20 * scale);
    g.closePath();
    g.fillPath();

    // Mast
    g.fillRect(14 * scale, 4 * scale, 2 * scale, 20 * scale);

    // Sail
    g.fillStyle(UI_COLORS.parchment.aged, 0.9);
    g.beginPath();
    g.moveTo(15 * scale, 6 * scale);
    g.lineTo(26 * scale, 10 * scale);
    g.lineTo(26 * scale, 14 * scale);
    g.lineTo(15 * scale, 14 * scale);
    g.closePath();
    g.fillPath();

    // Crow's nest
    g.fillStyle(UI_COLORS.wood.shadow, 1);
    g.fillRect(12 * scale, 2 * scale, 6 * scale, 3 * scale);

    // Portuguese cross on sail (optional)
    g.fillStyle(FABRIC_RED.base, 0.8);
    g.fillRect(18 * scale, 8 * scale, 6 * scale, 2 * scale);
    g.fillRect(20 * scale, 6 * scale, 2 * scale, 6 * scale);

    return g;
  }

  /**
   * Generate a faction emblem
   */
  generateFactionEmblem(faction: FactionType, size: number = 32): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const center = size / 2;

    switch (faction) {
      case 'crown':
        this.drawCrownEmblem(g, center, center, size);
        break;
      case 'free_traders':
        this.drawFreeTraderEmblem(g, center, center, size);
        break;
      case 'old_routes':
        this.drawOldRoutesEmblem(g, center, center, size);
        break;
    }

    return g;
  }

  // ==========================================================================
  // PROGRESS BARS & INDICATORS
  // ==========================================================================

  /**
   * Generate a reputation bar
   */
  generateReputationBar(width: number, height: number = 12): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();

    // Background
    g.fillStyle(UI_COLORS.parchment.dark, 0.8);
    g.fillRect(0, 0, width, height);

    // Border
    g.lineStyle(1, UI_COLORS.wood.base, 1);
    g.strokeRect(0, 0, width, height);

    // Inner frame
    g.lineStyle(1, UI_COLORS.gold.shadow, 0.5);
    g.strokeRect(1, 1, width - 2, height - 2);

    return g;
  }

  /**
   * Generate reputation bar fill (separate for animation)
   */
  generateReputationFill(fillWidth: number, height: number = 12): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();

    // Gradient fill effect
    const segments = Math.ceil(fillWidth / 4);
    for (let i = 0; i < segments; i++) {
      const x = i * 4 + 2;
      const segWidth = Math.min(4, fillWidth - x);
      if (segWidth > 0) {
        const shade = lerpColor(UI_COLORS.gold.deep, UI_COLORS.gold.base, i / segments);
        g.fillStyle(shade, 1);
        g.fillRect(x, 2, segWidth - 1, height - 4);
      }
    }

    // Highlight
    g.fillStyle(UI_COLORS.gold.bright, 0.4);
    g.fillRect(2, 2, fillWidth - 4, 2);

    return g;
  }

  /**
   * Generate a time/clock display frame
   */
  generateClockFrame(size: number = 48): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();
    const center = size / 2;
    const radius = size / 2 - 4;

    // Outer ring (wood)
    g.fillStyle(UI_COLORS.wood.base, 1);
    g.fillCircle(center, center, radius + 4);

    // Inner face (parchment)
    g.fillStyle(UI_COLORS.parchment.base, 1);
    g.fillCircle(center, center, radius);

    // Hour markers
    g.fillStyle(UI_COLORS.ink.black, 0.8);
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 - Math.PI / 2;
      const markerLength = i % 3 === 0 ? 6 : 3;
      const x1 = center + Math.cos(angle) * (radius - 2);
      const y1 = center + Math.sin(angle) * (radius - 2);
      const x2 = center + Math.cos(angle) * (radius - markerLength - 2);
      const y2 = center + Math.sin(angle) * (radius - markerLength - 2);
      g.lineStyle(i % 3 === 0 ? 2 : 1, UI_COLORS.ink.black, 0.8);
      g.lineBetween(x1, y1, x2, y2);
    }

    // Center pin
    g.fillStyle(UI_COLORS.gold.base, 1);
    g.fillCircle(center, center, 3);

    // Gold accent ring
    g.lineStyle(2, UI_COLORS.gold.shadow, 0.8);
    g.strokeCircle(center, center, radius + 2);

    return g;
  }

  /**
   * Generate inventory slot frame
   */
  generateInventorySlot(size: number = 36, isHighlighted: boolean = false): Phaser.GameObjects.Graphics {
    const g = this.createGraphics();

    // Background
    g.fillStyle(isHighlighted ? UI_COLORS.parchment.light : UI_COLORS.parchment.aged, 0.9);
    g.fillRect(2, 2, size - 4, size - 4);

    // Inner shadow (recessed effect)
    g.fillStyle(UI_COLORS.parchment.stain, 0.5);
    g.fillRect(2, 2, size - 4, 2);
    g.fillRect(2, 2, 2, size - 4);

    // Border
    g.lineStyle(2, UI_COLORS.wood.base, 1);
    g.strokeRect(0, 0, size, size);

    // Highlight border for selected
    if (isHighlighted) {
      g.lineStyle(1, UI_COLORS.gold.base, 1);
      g.strokeRect(1, 1, size - 2, size - 2);
    }

    return g;
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private drawAgedTexture(g: Phaser.GameObjects.Graphics, width: number, height: number, intensity: number): void {
    // Random aging spots and stains
    const spotCount = Math.floor((width * height) / 500 * intensity);

    for (let i = 0; i < spotCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const spotSize = 2 + Math.random() * 4;

      g.fillStyle(UI_COLORS.parchment.stain, 0.1 + Math.random() * 0.2);
      g.fillCircle(x, y, spotSize);
    }

    // Horizontal aging lines
    g.fillStyle(UI_COLORS.parchment.aged, 0.2);
    const lineCount = Math.floor(height / 15 * intensity);
    for (let i = 0; i < lineCount; i++) {
      const y = Math.random() * height;
      const lineWidth = 20 + Math.random() * 40;
      const x = Math.random() * (width - lineWidth);
      g.fillRect(x, y, lineWidth, 1);
    }
  }

  private drawTornEdges(g: Phaser.GameObjects.Graphics, width: number, height: number, cornerRadius: number): void {
    // Simulate torn edges with small irregular notches
    g.fillStyle(UI_COLORS.parchment.stain, 0.4);

    // Top edge tears
    for (let x = cornerRadius; x < width - cornerRadius; x += 8 + Math.random() * 12) {
      if (Math.random() > 0.6) {
        const tearHeight = 2 + Math.random() * 3;
        g.fillRect(x, 4, 3, tearHeight);
      }
    }

    // Right edge tears
    for (let y = cornerRadius; y < height - cornerRadius; y += 8 + Math.random() * 12) {
      if (Math.random() > 0.6) {
        const tearWidth = 2 + Math.random() * 3;
        g.fillRect(width - 4 - tearWidth, y, tearWidth, 3);
      }
    }
  }

  private drawWoodGrain(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    g.fillStyle(WOOD_LIGHT.shadow, 0.3);
    for (let i = 0; i < height; i += 4 + Math.random() * 3) {
      const grainY = y + i;
      const grainWidth = width * (0.6 + Math.random() * 0.4);
      const grainX = x + Math.random() * (width - grainWidth);
      g.fillRect(grainX, grainY, grainWidth, 1);
    }
  }

  private drawWoodCorners(g: Phaser.GameObjects.Graphics, width: number, height: number, borderWidth: number): void {
    // Corner metal reinforcements
    const cornerSize = borderWidth + 4;
    g.fillStyle(IRON.base, 1);

    // Top-left
    g.fillRect(0, 0, cornerSize, 3);
    g.fillRect(0, 0, 3, cornerSize);
    // Top-right
    g.fillRect(width - cornerSize, 0, cornerSize, 3);
    g.fillRect(width - 3, 0, 3, cornerSize);
    // Bottom-left
    g.fillRect(0, height - 3, cornerSize, 3);
    g.fillRect(0, height - cornerSize, 3, cornerSize);
    // Bottom-right
    g.fillRect(width - cornerSize, height - 3, cornerSize, 3);
    g.fillRect(width - 3, height - cornerSize, 3, cornerSize);

    // Rivets
    g.fillStyle(IRON.highlight, 0.8);
    g.fillCircle(4, 4, 2);
    g.fillCircle(width - 4, 4, 2);
    g.fillCircle(4, height - 4, 2);
    g.fillCircle(width - 4, height - 4, 2);
  }

  private drawScrollRoll(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    rollHeight: number,
    isTop: boolean
  ): void {
    // Roll shadow
    g.fillStyle(UI_COLORS.parchment.stain, 0.8);
    g.fillRect(x, isTop ? y + rollHeight - 4 : y, width, 4);

    // Roll body
    g.fillStyle(UI_COLORS.parchment.aged, 1);
    g.fillRect(x, isTop ? y : y + 4, width, rollHeight - 4);

    // Roll highlight
    g.fillStyle(UI_COLORS.parchment.light, 0.6);
    g.fillRect(x, isTop ? y + 2 : y + rollHeight - 6, width, 4);

    // End caps
    g.fillStyle(WOOD_LIGHT.base, 1);
    g.fillRect(x, y, 8, rollHeight);
    g.fillRect(x + width - 8, y, 8, rollHeight);

    // End cap details
    g.fillStyle(WOOD_LIGHT.highlight, 0.5);
    g.fillRect(x + 1, y + 2, 2, rollHeight - 4);
    g.fillRect(x + width - 7, y + 2, 2, rollHeight - 4);
  }

  private drawPortugueseCornerOrnament(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    flipX: boolean = false,
    flipY: boolean = false
  ): void {
    const size = 24;
    const sx = flipX ? -1 : 1;
    const sy = flipY ? -1 : 1;
    const ox = flipX ? x + size : x;
    const oy = flipY ? y + size : y;

    g.fillStyle(UI_COLORS.gold.shadow, 0.9);

    // Main L-shape
    g.fillRect(ox, oy, sx * 20, sy * 3);
    g.fillRect(ox, oy, sx * 3, sy * 20);

    // Inner accent
    g.fillRect(ox + sx * 5, oy + sy * 5, sx * 12, sy * 2);
    g.fillRect(ox + sx * 5, oy + sy * 5, sx * 2, sy * 12);

    // Flourish dot
    g.fillStyle(UI_COLORS.gold.base, 1);
    g.fillCircle(ox + sx * 10, oy + sy * 10, 3);
  }

  private drawCompassPoint(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    angle: number,
    length: number,
    baseWidth: number,
    isNorth: boolean
  ): void {
    const tipX = cx + Math.cos(angle - Math.PI / 2) * length;
    const tipY = cy + Math.sin(angle - Math.PI / 2) * length;
    const baseLeftX = cx + Math.cos(angle - Math.PI / 2 + Math.PI / 2) * (baseWidth / 2);
    const baseLeftY = cy + Math.sin(angle - Math.PI / 2 + Math.PI / 2) * (baseWidth / 2);
    const baseRightX = cx + Math.cos(angle - Math.PI / 2 - Math.PI / 2) * (baseWidth / 2);
    const baseRightY = cy + Math.sin(angle - Math.PI / 2 - Math.PI / 2) * (baseWidth / 2);

    if (isNorth) {
      g.fillStyle(FABRIC_RED.base, 1);
    }

    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(baseLeftX, baseLeftY);
    g.lineTo(baseRightX, baseRightY);
    g.closePath();
    g.fillPath();
  }

  // Icon drawing methods
  private drawPepperIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 24;

    // Pepper berries cluster
    g.fillStyle(PEPPER_BLACK, 1);
    const positions = [
      [12, 8],
      [8, 12],
      [16, 12],
      [10, 16],
      [14, 16],
      [12, 20],
    ];
    for (const [x, y] of positions) {
      g.fillCircle(x * scale, y * scale, 3 * scale);
      g.fillStyle(0x4a3828, 0.5);
      g.fillCircle((x - 1) * scale, (y - 1) * scale, 1.5 * scale);
      g.fillStyle(PEPPER_BLACK, 1);
    }

    // Stem
    g.fillStyle(0x2d5016, 1);
    g.fillRect(11 * scale, 2 * scale, 2 * scale, 6 * scale);
  }

  private drawCinnamonIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 24;

    // Cinnamon sticks (rolled bark)
    g.fillStyle(CINNAMON, 1);
    g.fillRect(4 * scale, 8 * scale, 16 * scale, 4 * scale);
    g.fillRect(4 * scale, 14 * scale, 16 * scale, 4 * scale);

    // Inner spiral detail
    g.fillStyle(0x6b3410, 0.8);
    g.fillRect(4 * scale, 8 * scale, 2 * scale, 4 * scale);
    g.fillRect(4 * scale, 14 * scale, 2 * scale, 4 * scale);

    // Highlight
    g.fillStyle(0xa86530, 0.5);
    g.fillRect(6 * scale, 9 * scale, 12 * scale, 1 * scale);
    g.fillRect(6 * scale, 15 * scale, 12 * scale, 1 * scale);
  }

  private drawClovesIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 24;

    // Clove buds
    g.fillStyle(CLOVES, 1);

    // Center clove
    g.fillRect(10 * scale, 4 * scale, 4 * scale, 12 * scale);
    g.fillCircle(12 * scale, 18 * scale, 4 * scale);

    // Side cloves
    g.fillRect(4 * scale, 8 * scale, 3 * scale, 8 * scale);
    g.fillCircle(5.5 * scale, 18 * scale, 3 * scale);

    g.fillRect(17 * scale, 8 * scale, 3 * scale, 8 * scale);
    g.fillCircle(18.5 * scale, 18 * scale, 3 * scale);

    // Highlights
    g.fillStyle(0x6a3030, 0.5);
    g.fillRect(11 * scale, 5 * scale, 1 * scale, 10 * scale);
  }

  private drawSilkIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 24;

    // Silk roll/bolt
    g.fillStyle(SILK_GOLD.base, 1);
    g.fillRect(4 * scale, 6 * scale, 16 * scale, 12 * scale);

    // Fabric folds
    g.fillStyle(SILK_GOLD.shadow, 0.6);
    for (let i = 0; i < 4; i++) {
      g.fillRect((6 + i * 4) * scale, 6 * scale, 1 * scale, 12 * scale);
    }

    // Highlight
    g.fillStyle(SILK_GOLD.highlight, 0.4);
    g.fillRect(5 * scale, 7 * scale, 14 * scale, 2 * scale);

    // Roll ends
    g.fillStyle(SILK_GOLD.deep, 1);
    g.fillRect(4 * scale, 4 * scale, 16 * scale, 2 * scale);
    g.fillRect(4 * scale, 18 * scale, 16 * scale, 2 * scale);
  }

  private drawPorcelainIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 24;

    // Vase/bowl shape
    g.fillStyle(0xf8f8ff, 1);
    g.fillCircle(12 * scale, 14 * scale, 8 * scale);

    // Vase neck
    g.fillRect(9 * scale, 4 * scale, 6 * scale, 6 * scale);

    // Blue pattern (Chinese style)
    g.fillStyle(FABRIC_BLUE.base, 0.9);
    g.fillCircle(12 * scale, 14 * scale, 5 * scale);

    // Inner white
    g.fillStyle(0xf8f8ff, 1);
    g.fillCircle(12 * scale, 14 * scale, 3 * scale);

    // Rim highlight
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(10 * scale, 4 * scale, 4 * scale, 2 * scale);
  }

  private drawGoldCoinsIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;

    // Stack of coins
    for (let i = 2; i >= 0; i--) {
      const y = 4 + i * 3;

      // Coin shadow
      g.fillStyle(UI_COLORS.gold.deep, 1);
      g.fillCircle(8 * scale, (y + 1) * scale, 5 * scale);

      // Coin body
      g.fillStyle(UI_COLORS.gold.base, 1);
      g.fillCircle(8 * scale, y * scale, 5 * scale);

      // Coin highlight
      g.fillStyle(UI_COLORS.gold.bright, 0.6);
      g.fillCircle(7 * scale, (y - 1) * scale, 2 * scale);
    }
  }

  private drawSilverCoinsIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;

    // Stack of silver coins
    for (let i = 2; i >= 0; i--) {
      const y = 4 + i * 3;

      // Coin shadow
      g.fillStyle(IRON.shadow, 1);
      g.fillCircle(8 * scale, (y + 1) * scale, 5 * scale);

      // Coin body
      g.fillStyle(IRON.highlight, 1);
      g.fillCircle(8 * scale, y * scale, 5 * scale);

      // Coin highlight
      g.fillStyle(0xc0c0c0, 0.6);
      g.fillCircle(7 * scale, (y - 1) * scale, 2 * scale);
    }
  }

  private drawHealthIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;

    // Heart shape
    g.fillStyle(FABRIC_RED.base, 1);
    g.fillCircle(5 * scale, 6 * scale, 4 * scale);
    g.fillCircle(11 * scale, 6 * scale, 4 * scale);

    g.beginPath();
    g.moveTo(1 * scale, 7 * scale);
    g.lineTo(8 * scale, 15 * scale);
    g.lineTo(15 * scale, 7 * scale);
    g.closePath();
    g.fillPath();

    // Highlight
    g.fillStyle(FABRIC_RED.highlight, 0.5);
    g.fillCircle(5 * scale, 5 * scale, 2 * scale);
  }

  private drawReputationIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;

    // Star shape
    g.fillStyle(UI_COLORS.gold.base, 1);

    g.beginPath();
    g.moveTo(8 * scale, 1 * scale);
    g.lineTo(10 * scale, 6 * scale);
    g.lineTo(15 * scale, 6 * scale);
    g.lineTo(11 * scale, 10 * scale);
    g.lineTo(13 * scale, 15 * scale);
    g.lineTo(8 * scale, 12 * scale);
    g.lineTo(3 * scale, 15 * scale);
    g.lineTo(5 * scale, 10 * scale);
    g.lineTo(1 * scale, 6 * scale);
    g.lineTo(6 * scale, 6 * scale);
    g.closePath();
    g.fillPath();

    // Inner highlight
    g.fillStyle(UI_COLORS.gold.bright, 0.5);
    g.fillCircle(7 * scale, 7 * scale, 2 * scale);
  }

  private drawTimeIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;
    const center = 8 * scale;
    const radius = 6 * scale;

    // Clock face
    g.fillStyle(UI_COLORS.parchment.base, 1);
    g.fillCircle(center, center, radius);

    // Border
    g.lineStyle(2 * scale, UI_COLORS.wood.base, 1);
    g.strokeCircle(center, center, radius);

    // Hour hand
    g.lineStyle(2 * scale, UI_COLORS.ink.black, 1);
    g.lineBetween(center, center, center, center - 3 * scale);

    // Minute hand
    g.lineStyle(1 * scale, UI_COLORS.ink.black, 1);
    g.lineBetween(center, center, center + 3 * scale, center);

    // Center dot
    g.fillStyle(UI_COLORS.gold.base, 1);
    g.fillCircle(center, center, 1 * scale);
  }

  private drawBuyIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;

    // Arrow pointing down into bag/hand
    g.fillStyle(UI_COLORS.status.health, 1);

    // Arrow body
    g.fillRect(6 * scale, 2 * scale, 4 * scale, 8 * scale);

    // Arrow head
    g.beginPath();
    g.moveTo(8 * scale, 14 * scale);
    g.lineTo(3 * scale, 8 * scale);
    g.lineTo(13 * scale, 8 * scale);
    g.closePath();
    g.fillPath();
  }

  private drawSellIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;

    // Arrow pointing up (selling)
    g.fillStyle(UI_COLORS.gold.base, 1);

    // Arrow body
    g.fillRect(6 * scale, 6 * scale, 4 * scale, 8 * scale);

    // Arrow head
    g.beginPath();
    g.moveTo(8 * scale, 2 * scale);
    g.lineTo(3 * scale, 8 * scale);
    g.lineTo(13 * scale, 8 * scale);
    g.closePath();
    g.fillPath();
  }

  private drawTalkIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;

    // Speech bubble
    g.fillStyle(UI_COLORS.parchment.base, 1);
    g.fillRoundedRect(2 * scale, 2 * scale, 12 * scale, 8 * scale, 2 * scale);

    // Bubble tail
    g.beginPath();
    g.moveTo(4 * scale, 10 * scale);
    g.lineTo(2 * scale, 14 * scale);
    g.lineTo(8 * scale, 10 * scale);
    g.closePath();
    g.fillPath();

    // Border
    g.lineStyle(1 * scale, UI_COLORS.ink.brown, 1);
    g.strokeRoundedRect(2 * scale, 2 * scale, 12 * scale, 8 * scale, 2 * scale);

    // Text lines
    g.fillStyle(UI_COLORS.ink.faded, 0.8);
    g.fillRect(4 * scale, 4 * scale, 8 * scale, 1 * scale);
    g.fillRect(4 * scale, 7 * scale, 6 * scale, 1 * scale);
  }

  private drawQuestIcon(g: Phaser.GameObjects.Graphics, size: number): void {
    const scale = size / 16;

    // Exclamation mark / quest marker
    g.fillStyle(UI_COLORS.gold.base, 1);

    // Circle background
    g.fillCircle(8 * scale, 8 * scale, 7 * scale);

    // Exclamation mark
    g.fillStyle(UI_COLORS.wood.deep, 1);
    g.fillRect(7 * scale, 3 * scale, 2 * scale, 7 * scale);
    g.fillCircle(8 * scale, 12 * scale, 1.5 * scale);
  }

  // Faction emblem drawing methods
  private drawCrownEmblem(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number): void {
    const scale = size / 32;

    // Shield background
    g.fillStyle(UI_COLORS.gold.base, 1);
    g.beginPath();
    g.moveTo(cx, cy - 12 * scale);
    g.lineTo(cx + 12 * scale, cy - 8 * scale);
    g.lineTo(cx + 12 * scale, cy + 4 * scale);
    g.lineTo(cx, cy + 14 * scale);
    g.lineTo(cx - 12 * scale, cy + 4 * scale);
    g.lineTo(cx - 12 * scale, cy - 8 * scale);
    g.closePath();
    g.fillPath();

    // Crown
    g.fillStyle(UI_COLORS.wood.deep, 1);
    g.fillRect(cx - 8 * scale, cy - 4 * scale, 16 * scale, 8 * scale);

    // Crown points
    g.beginPath();
    g.moveTo(cx - 8 * scale, cy - 4 * scale);
    g.lineTo(cx - 6 * scale, cy - 10 * scale);
    g.lineTo(cx - 4 * scale, cy - 4 * scale);
    g.lineTo(cx, cy - 12 * scale);
    g.lineTo(cx + 4 * scale, cy - 4 * scale);
    g.lineTo(cx + 6 * scale, cy - 10 * scale);
    g.lineTo(cx + 8 * scale, cy - 4 * scale);
    g.closePath();
    g.fillPath();

    // Jewels
    g.fillStyle(FABRIC_RED.base, 1);
    g.fillCircle(cx, cy - 10 * scale, 2 * scale);
    g.fillStyle(FABRIC_BLUE.base, 1);
    g.fillCircle(cx - 6 * scale, cy - 8 * scale, 1.5 * scale);
    g.fillCircle(cx + 6 * scale, cy - 8 * scale, 1.5 * scale);
  }

  private drawFreeTraderEmblem(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number): void {
    const scale = size / 32;

    // Circle background
    g.fillStyle(FABRIC_BLUE.base, 1);
    g.fillCircle(cx, cy, 12 * scale);

    // Anchor shape
    g.fillStyle(UI_COLORS.gold.base, 1);

    // Anchor shank
    g.fillRect(cx - 1.5 * scale, cy - 8 * scale, 3 * scale, 14 * scale);

    // Anchor stock (crossbar)
    g.fillRect(cx - 6 * scale, cy - 6 * scale, 12 * scale, 2 * scale);

    // Anchor arms
    g.beginPath();
    g.moveTo(cx - 1.5 * scale, cy + 6 * scale);
    g.lineTo(cx - 8 * scale, cy + 2 * scale);
    g.lineTo(cx - 6 * scale, cy + 6 * scale);
    g.lineTo(cx - 1.5 * scale, cy + 4 * scale);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(cx + 1.5 * scale, cy + 6 * scale);
    g.lineTo(cx + 8 * scale, cy + 2 * scale);
    g.lineTo(cx + 6 * scale, cy + 6 * scale);
    g.lineTo(cx + 1.5 * scale, cy + 4 * scale);
    g.closePath();
    g.fillPath();

    // Ring at top
    g.lineStyle(2 * scale, UI_COLORS.gold.base, 1);
    g.strokeCircle(cx, cy - 10 * scale, 3 * scale);
  }

  private drawOldRoutesEmblem(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number): void {
    const scale = size / 32;

    // Octagonal background
    g.fillStyle(FABRIC_GREEN.base, 1);
    const octPoints: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 8;
      octPoints.push([cx + Math.cos(angle) * 12 * scale, cy + Math.sin(angle) * 12 * scale]);
    }
    g.beginPath();
    g.moveTo(octPoints[0][0], octPoints[0][1]);
    for (let i = 1; i < 8; i++) {
      g.lineTo(octPoints[i][0], octPoints[i][1]);
    }
    g.closePath();
    g.fillPath();

    // Crescent moon
    g.fillStyle(UI_COLORS.gold.base, 1);
    g.fillCircle(cx, cy, 8 * scale);
    g.fillStyle(FABRIC_GREEN.base, 1);
    g.fillCircle(cx + 4 * scale, cy, 7 * scale);

    // Star
    g.fillStyle(UI_COLORS.gold.base, 1);
    g.beginPath();
    const starCx = cx - 2 * scale;
    const starCy = cy;
    g.moveTo(starCx, starCy - 4 * scale);
    g.lineTo(starCx + 1.5 * scale, starCy - 1.5 * scale);
    g.lineTo(starCx + 4 * scale, starCy - 1 * scale);
    g.lineTo(starCx + 2 * scale, starCy + 1.5 * scale);
    g.lineTo(starCx + 2.5 * scale, starCy + 4 * scale);
    g.lineTo(starCx, starCy + 2.5 * scale);
    g.lineTo(starCx - 2.5 * scale, starCy + 4 * scale);
    g.lineTo(starCx - 2 * scale, starCy + 1.5 * scale);
    g.lineTo(starCx - 4 * scale, starCy - 1 * scale);
    g.lineTo(starCx - 1.5 * scale, starCy - 1.5 * scale);
    g.closePath();
    g.fillPath();
  }

  // ==========================================================================
  // TEXTURE GENERATION (for Phaser texture cache)
  // ==========================================================================

  /**
   * Generate a panel texture and add it to Phaser's texture cache
   */
  generatePanelTexture(key: string, options: PanelOptions): void {
    const g = this.generateParchmentPanel(options);
    this.graphicsToTexture(g, key, options.width, options.height);
    g.destroy();
  }

  /**
   * Generate a button spritesheet texture (all 4 states)
   */
  generateButtonTexture(key: string, size: ButtonSize): void {
    const { width, height } = BUTTON_SIZES[size];
    const totalHeight = height * 4 + 12; // 4 states with 3px offset for pressed

    const container = this.scene.add.container(0, 0);
    const states: ButtonState[] = ['normal', 'hover', 'pressed', 'disabled'];

    states.forEach((state, index) => {
      const btn = this.generateButton(size, state);
      btn.setPosition(0, index * (height + 3));
      container.add(btn);
    });

    // Render to texture
    const rt = this.scene.add.renderTexture(0, 0, width + 4, totalHeight);
    rt.draw(container);
    rt.saveTexture(key);

    container.destroy();
    rt.destroy();
  }

  /**
   * Convert a graphics object to a texture
   */
  private graphicsToTexture(
    graphics: Phaser.GameObjects.Graphics,
    key: string,
    width: number,
    height: number
  ): void {
    const rt = this.scene.add.renderTexture(0, 0, width, height);
    rt.draw(graphics);
    rt.saveTexture(key);
    rt.destroy();
  }

  /**
   * Generate all standard UI textures and add to cache
   */
  generateAllTextures(): void {
    // Panels
    this.generatePanelTexture('ui-panel-parchment-sm', { width: 192, height: 256 });
    this.generatePanelTexture('ui-panel-parchment-md', { width: 256, height: 192 });
    this.generatePanelTexture('ui-panel-parchment-lg', { width: 440, height: 350 });

    // Buttons
    this.generateButtonTexture('ui-btn-small', 'small');
    this.generateButtonTexture('ui-btn-medium', 'medium');
    this.generateButtonTexture('ui-btn-large', 'large');

    // Additional textures can be generated as needed
  }

  /**
   * Cleanup the generator
   */
  destroy(): void {
    this.graphics.destroy();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a UIGenerator instance for a scene
 */
export function createUIGenerator(scene: Phaser.Scene): UIGenerator {
  return new UIGenerator(scene);
}
