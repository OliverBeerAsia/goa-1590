/**
 * CharacterGenerator - Procedural character sprite generator for Goa 1590
 *
 * Generates pixel art character spritesheets compatible with Phaser's animation system.
 * Characters are 32x48 pixels with 4 directions and full animation cycles.
 *
 * Spritesheet layout (256x192, 8 cols x 4 rows):
 * Row 0: South (idle1, idle2, walk1-6)
 * Row 1: West  (idle1, idle2, walk1-6)
 * Row 2: East  (idle1, idle2, walk1-6)
 * Row 3: North (idle1, idle2, walk1-6)
 */

import {
  ColorRamp,
  SKIN_LIGHT,
  SKIN_MEDIUM,
  SKIN_DARK,
  WOOD_DARK,
  WOOD_LIGHT,
  FABRIC_RED,
  FABRIC_BLUE,
  FABRIC_GREEN,
  FABRIC_CREAM,
  SILK_GOLD,
  WHITEWASH,
  IRON,
  GOLD,
  SHADOW_COLOR,
  SHADOW_ALPHA,
} from '../palette';

// Character dimensions
export const CHAR_WIDTH = 32;
export const CHAR_HEIGHT = 48;
export const SHEET_COLS = 8;
export const SHEET_ROWS = 4;
export const SHEET_WIDTH = CHAR_WIDTH * SHEET_COLS; // 256
export const SHEET_HEIGHT = CHAR_HEIGHT * SHEET_ROWS; // 192

// Direction indices
export enum Direction {
  SOUTH = 0,
  WEST = 1,
  EAST = 2,
  NORTH = 3,
}

// Animation frame types
export enum FrameType {
  IDLE1 = 0,
  IDLE2 = 1,
  WALK1 = 2,
  WALK2 = 3,
  WALK3 = 4,
  WALK4 = 5,
  WALK5 = 6,
  WALK6 = 7,
}

// Character type definitions
export enum CharacterType {
  PLAYER = 'player',
  PORTUGUESE_MERCHANT = 'portuguese_merchant',
  HINDU_TRADER = 'hindu_trader',
  ARAB_MIDDLEMAN = 'arab_middleman',
  CROWN_OFFICIAL = 'crown_official',
  SAILOR = 'sailor',
  FRANCISCAN_MONK = 'franciscan_monk',
  PORTUGUESE_SOLDIER = 'portuguese_soldier',
  DOCK_PORTER = 'dock_porter',
  LOCAL_WOMAN = 'local_woman',
}

// Skin tone options
export enum SkinTone {
  LIGHT = 'light',
  MEDIUM = 'medium',
  DARK = 'dark',
}

// Clothing color variations
export interface ClothingColors {
  primary: ColorRamp;
  secondary: ColorRamp;
  accent: ColorRamp;
}

// Character configuration
export interface CharacterConfig {
  type: CharacterType;
  skinTone?: SkinTone;
  clothingVariant?: number;
  accessories?: string[];
}

// Body part rendering context
interface BodyPartContext {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  direction: Direction;
  frame: FrameType;
  skin: ColorRamp;
  clothing: ClothingColors;
}

/**
 * Get skin color ramp by tone
 */
function getSkinRamp(tone: SkinTone): ColorRamp {
  switch (tone) {
    case SkinTone.LIGHT:
      return SKIN_LIGHT;
    case SkinTone.MEDIUM:
      return SKIN_MEDIUM;
    case SkinTone.DARK:
      return SKIN_DARK;
    default:
      return SKIN_MEDIUM;
  }
}

/**
 * Get walk cycle leg offset for animation
 */
function getWalkOffset(frame: FrameType): { leftLeg: number; rightLeg: number; bob: number } {
  switch (frame) {
    case FrameType.IDLE1:
      return { leftLeg: 0, rightLeg: 0, bob: 0 };
    case FrameType.IDLE2:
      return { leftLeg: 0, rightLeg: 0, bob: 1 };
    case FrameType.WALK1:
      return { leftLeg: -2, rightLeg: 2, bob: 0 };
    case FrameType.WALK2:
      return { leftLeg: -3, rightLeg: 3, bob: -1 };
    case FrameType.WALK3:
      return { leftLeg: -2, rightLeg: 2, bob: 0 };
    case FrameType.WALK4:
      return { leftLeg: 2, rightLeg: -2, bob: 0 };
    case FrameType.WALK5:
      return { leftLeg: 3, rightLeg: -3, bob: -1 };
    case FrameType.WALK6:
      return { leftLeg: 2, rightLeg: -2, bob: 0 };
    default:
      return { leftLeg: 0, rightLeg: 0, bob: 0 };
  }
}

/**
 * Get arm swing offset for walk animation
 */
function getArmSwing(frame: FrameType): { leftArm: number; rightArm: number } {
  switch (frame) {
    case FrameType.IDLE1:
    case FrameType.IDLE2:
      return { leftArm: 0, rightArm: 0 };
    case FrameType.WALK1:
    case FrameType.WALK2:
    case FrameType.WALK3:
      return { leftArm: 2, rightArm: -2 };
    case FrameType.WALK4:
    case FrameType.WALK5:
    case FrameType.WALK6:
      return { leftArm: -2, rightArm: 2 };
    default:
      return { leftArm: 0, rightArm: 0 };
  }
}

/**
 * Main Character Generator class
 */
export class CharacterGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Generate a complete character spritesheet
   */
  generateCharacter(config: CharacterConfig): string {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    const skin = getSkinRamp(config.skinTone || SkinTone.MEDIUM);
    const clothing = this.getClothingColors(config.type, config.clothingVariant || 0);

    // Generate all frames for all directions
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 8; frame++) {
        const x = frame * CHAR_WIDTH;
        const y = dir * CHAR_HEIGHT;

        const ctx: BodyPartContext = {
          graphics,
          x,
          y,
          direction: dir as Direction,
          frame: frame as FrameType,
          skin,
          clothing,
        };

        this.renderCharacter(ctx, config.type);
      }
    }

    // Generate texture
    const textureKey = `char_${config.type}_${config.skinTone || 'medium'}_${config.clothingVariant || 0}`;
    graphics.generateTexture(textureKey, SHEET_WIDTH, SHEET_HEIGHT);
    graphics.destroy();

    // Add frame definitions for animation system
    const texture = this.scene.textures.get(textureKey);
    let frameIndex = 0;
    for (let row = 0; row < SHEET_ROWS; row++) {
      for (let col = 0; col < SHEET_COLS; col++) {
        texture.add(
          frameIndex,
          0, // sourceIndex (0 for single-source textures)
          col * CHAR_WIDTH,
          row * CHAR_HEIGHT,
          CHAR_WIDTH,
          CHAR_HEIGHT
        );
        frameIndex++;
      }
    }

    // Create animations for this character
    const animPrefix = config.type === CharacterType.PLAYER ? 'player' : `npc_${config.type}`;
    this.createAnimations(textureKey, animPrefix);

    return textureKey;
  }

  /**
   * Get clothing colors based on character type and variant
   */
  private getClothingColors(type: CharacterType, variant: number): ClothingColors {
    const variants: Record<CharacterType, ClothingColors[]> = {
      [CharacterType.PLAYER]: [
        { primary: WOOD_DARK, secondary: FABRIC_CREAM, accent: SILK_GOLD },
      ],
      [CharacterType.PORTUGUESE_MERCHANT]: [
        { primary: WOOD_DARK, secondary: SILK_GOLD, accent: FABRIC_CREAM },
        { primary: FABRIC_RED, secondary: SILK_GOLD, accent: FABRIC_CREAM },
        { primary: FABRIC_BLUE, secondary: SILK_GOLD, accent: FABRIC_CREAM },
      ],
      [CharacterType.HINDU_TRADER]: [
        { primary: FABRIC_CREAM, secondary: SILK_GOLD, accent: FABRIC_RED },
        { primary: FABRIC_CREAM, secondary: FABRIC_RED, accent: SILK_GOLD },
        { primary: SILK_GOLD, secondary: FABRIC_CREAM, accent: FABRIC_GREEN },
      ],
      [CharacterType.ARAB_MIDDLEMAN]: [
        { primary: FABRIC_RED, secondary: FABRIC_CREAM, accent: SILK_GOLD },
        { primary: FABRIC_GREEN, secondary: FABRIC_CREAM, accent: SILK_GOLD },
        { primary: FABRIC_BLUE, secondary: FABRIC_CREAM, accent: SILK_GOLD },
      ],
      [CharacterType.CROWN_OFFICIAL]: [
        { primary: WOOD_DARK, secondary: FABRIC_CREAM, accent: SILK_GOLD },
      ],
      [CharacterType.SAILOR]: [
        { primary: WOOD_LIGHT, secondary: FABRIC_CREAM, accent: FABRIC_BLUE },
        { primary: FABRIC_BLUE, secondary: FABRIC_CREAM, accent: WOOD_LIGHT },
      ],
      [CharacterType.FRANCISCAN_MONK]: [
        { primary: WOOD_LIGHT, secondary: FABRIC_CREAM, accent: SILK_GOLD },
      ],
      [CharacterType.PORTUGUESE_SOLDIER]: [
        { primary: IRON, secondary: FABRIC_RED, accent: SILK_GOLD },
      ],
      [CharacterType.DOCK_PORTER]: [
        { primary: FABRIC_CREAM, secondary: WOOD_LIGHT, accent: WOOD_DARK },
      ],
      [CharacterType.LOCAL_WOMAN]: [
        { primary: FABRIC_RED, secondary: SILK_GOLD, accent: FABRIC_CREAM },
        { primary: FABRIC_BLUE, secondary: SILK_GOLD, accent: FABRIC_CREAM },
        { primary: FABRIC_GREEN, secondary: SILK_GOLD, accent: FABRIC_CREAM },
        { primary: SILK_GOLD, secondary: FABRIC_RED, accent: FABRIC_CREAM },
      ],
    };

    const typeVariants = variants[type] || variants[CharacterType.PLAYER];
    return typeVariants[variant % typeVariants.length];
  }

  /**
   * Render a single character frame
   */
  private renderCharacter(ctx: BodyPartContext, type: CharacterType): void {
    const walkOffset = getWalkOffset(ctx.frame);

    // Draw shadow
    this.drawShadow(ctx);

    // Draw character based on type
    switch (type) {
      case CharacterType.PLAYER:
        this.drawPortugueseMerchantCharacter(ctx, walkOffset, true);
        break;
      case CharacterType.PORTUGUESE_MERCHANT:
        this.drawPortugueseMerchantCharacter(ctx, walkOffset, false);
        break;
      case CharacterType.HINDU_TRADER:
        this.drawHinduTraderCharacter(ctx, walkOffset);
        break;
      case CharacterType.ARAB_MIDDLEMAN:
        this.drawArabMiddlemanCharacter(ctx, walkOffset);
        break;
      case CharacterType.CROWN_OFFICIAL:
        this.drawCrownOfficialCharacter(ctx, walkOffset);
        break;
      case CharacterType.SAILOR:
        this.drawSailorCharacter(ctx, walkOffset);
        break;
      case CharacterType.FRANCISCAN_MONK:
        this.drawFranciscanMonkCharacter(ctx, walkOffset);
        break;
      case CharacterType.PORTUGUESE_SOLDIER:
        this.drawPortugueseSoldierCharacter(ctx, walkOffset);
        break;
      case CharacterType.DOCK_PORTER:
        this.drawDockPorterCharacter(ctx, walkOffset);
        break;
      case CharacterType.LOCAL_WOMAN:
        this.drawLocalWomanCharacter(ctx, walkOffset);
        break;
    }
  }

  /**
   * Draw character shadow
   */
  private drawShadow(ctx: BodyPartContext): void {
    ctx.graphics.fillStyle(SHADOW_COLOR, SHADOW_ALPHA);
    ctx.graphics.fillEllipse(ctx.x + 16, ctx.y + 46, 12, 4);
  }

  /**
   * Draw a filled rectangle with shading
   */
  private drawShadedRect(
    ctx: BodyPartContext,
    x: number,
    y: number,
    w: number,
    h: number,
    ramp: ColorRamp,
    direction: Direction
  ): void {
    // Base fill
    ctx.graphics.fillStyle(ramp.base, 1);
    ctx.graphics.fillRect(ctx.x + x, ctx.y + y, w, h);

    // Add directional shading
    if (direction === Direction.WEST || direction === Direction.NORTH) {
      ctx.graphics.fillStyle(ramp.shadow, 0.5);
      ctx.graphics.fillRect(ctx.x + x + w - 2, ctx.y + y, 2, h);
    } else {
      ctx.graphics.fillStyle(ramp.highlight, 0.4);
      ctx.graphics.fillRect(ctx.x + x, ctx.y + y, 2, h);
    }
  }

  /**
   * Draw head with proper direction
   */
  private drawHead(
    ctx: BodyPartContext,
    yOffset: number,
    walkOffset: { bob: number }
  ): void {
    const headY = ctx.y + 8 + walkOffset.bob + yOffset;
    const headX = ctx.x + 11;
    const headW = 10;
    const headH = 10;

    // Head shape
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(headX, headY, headW, headH);

    // Shading based on direction
    if (ctx.direction === Direction.WEST) {
      ctx.graphics.fillStyle(ctx.skin.shadow, 0.5);
      ctx.graphics.fillRect(headX + headW - 2, headY, 2, headH);
    } else if (ctx.direction === Direction.EAST) {
      ctx.graphics.fillStyle(ctx.skin.highlight, 0.4);
      ctx.graphics.fillRect(headX, headY, 2, headH);
    }

    // Facial features for south-facing
    if (ctx.direction === Direction.SOUTH) {
      // Eyes
      ctx.graphics.fillStyle(ctx.skin.deep, 1);
      ctx.graphics.fillRect(headX + 2, headY + 3, 2, 2);
      ctx.graphics.fillRect(headX + 6, headY + 3, 2, 2);
      // Nose shadow
      ctx.graphics.fillStyle(ctx.skin.shadow, 0.4);
      ctx.graphics.fillRect(headX + 4, headY + 5, 2, 2);
    } else if (ctx.direction === Direction.NORTH) {
      // Hair/back of head
      ctx.graphics.fillStyle(ctx.skin.deep, 0.3);
      ctx.graphics.fillRect(headX + 2, headY + 2, headW - 4, headH - 4);
    }
  }

  /**
   * Draw Portuguese merchant/player character
   */
  private drawPortugueseMerchantCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number },
    isPlayer: boolean
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Legs (hose)
    this.drawLegs(ctx, walkOffset, ctx.clothing.primary);

    // Shoes
    this.drawShoes(ctx, walkOffset, WOOD_DARK);

    // Doublet (torso)
    this.drawShadedRect(ctx, 10, 18 + walkOffset.bob, 12, 14, ctx.clothing.primary, ctx.direction);

    // Gold trim for player
    if (isPlayer) {
      ctx.graphics.fillStyle(ctx.clothing.accent.base, 1);
      ctx.graphics.fillRect(ctx.x + 10, ctx.y + 18 + walkOffset.bob, 1, 14);
      ctx.graphics.fillRect(ctx.x + 21, ctx.y + 18 + walkOffset.bob, 1, 14);
    }

    // White ruff collar
    ctx.graphics.fillStyle(WHITEWASH.base, 1);
    ctx.graphics.fillRect(ctx.x + 9, ctx.y + 16 + walkOffset.bob, 14, 3);
    ctx.graphics.fillStyle(WHITEWASH.shadow, 0.3);
    for (let i = 0; i < 7; i++) {
      ctx.graphics.fillRect(ctx.x + 10 + i * 2, ctx.y + 16 + walkOffset.bob, 1, 3);
    }

    // Arms
    this.drawArms(ctx, walkOffset, armSwing, ctx.clothing.primary);

    // Hands
    this.drawHands(ctx, walkOffset, armSwing);

    // Head
    this.drawHead(ctx, 0, walkOffset);

    // Wide-brimmed hat
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 5 + walkOffset.bob, 20, 3);
    ctx.graphics.fillRect(ctx.x + 11, ctx.y + 2 + walkOffset.bob, 10, 5);
    // Hat band
    ctx.graphics.fillStyle(ctx.clothing.accent.base, 1);
    ctx.graphics.fillRect(ctx.x + 11, ctx.y + 6 + walkOffset.bob, 10, 1);

    // Cape (back views)
    if (ctx.direction === Direction.NORTH) {
      ctx.graphics.fillStyle(WOOD_LIGHT.base, 0.9);
      ctx.graphics.fillRect(ctx.x + 8, ctx.y + 18 + walkOffset.bob, 16, 16);
      ctx.graphics.fillStyle(WOOD_LIGHT.shadow, 0.4);
      ctx.graphics.fillRect(ctx.x + 14, ctx.y + 18 + walkOffset.bob, 10, 16);
    }

    // Outline
    this.drawOutline(ctx, 10, 18 + walkOffset.bob, 12, 26);
  }

  /**
   * Draw Hindu trader character
   */
  private drawHinduTraderCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number }
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Dhoti (lower garment) - wider flowing cloth
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 24 + walkOffset.bob, 16, 18);
    ctx.graphics.fillStyle(ctx.clothing.primary.shadow, 0.4);
    ctx.graphics.fillRect(ctx.x + 20, ctx.y + 24 + walkOffset.bob, 4, 18);

    // Dhoti drape detail
    ctx.graphics.fillStyle(ctx.clothing.secondary.base, 0.6);
    ctx.graphics.fillRect(ctx.x + 14, ctx.y + 26 + walkOffset.bob, 2, 14);

    // Feet/sandals
    ctx.graphics.fillStyle(WOOD_LIGHT.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 42, 5, 3);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 42, 5, 3);

    // Upper body (bare chest with sacred thread or simple kurta)
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 16 + walkOffset.bob, 12, 10);
    ctx.graphics.fillStyle(ctx.skin.shadow, 0.3);
    ctx.graphics.fillRect(ctx.x + 18, ctx.y + 16 + walkOffset.bob, 4, 10);

    // Sacred thread (optional)
    ctx.graphics.lineStyle(1, ctx.clothing.secondary.base, 0.8);
    ctx.graphics.lineBetween(
      ctx.x + 12,
      ctx.y + 16 + walkOffset.bob,
      ctx.x + 20,
      ctx.y + 24 + walkOffset.bob
    );

    // Arms
    this.drawArms(ctx, walkOffset, armSwing, { ...ctx.skin, base: ctx.skin.base });

    // Hands
    this.drawHands(ctx, walkOffset, armSwing);

    // Head
    this.drawHead(ctx, 0, walkOffset);

    // Turban
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 2 + walkOffset.bob, 12, 8);
    // Turban folds
    ctx.graphics.fillStyle(ctx.clothing.primary.shadow, 0.5);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 4 + walkOffset.bob, 12, 2);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 7 + walkOffset.bob, 12, 1);
    // Turban jewel
    ctx.graphics.fillStyle(ctx.clothing.accent.base, 1);
    ctx.graphics.fillRect(ctx.x + 15, ctx.y + 3 + walkOffset.bob, 2, 2);

    // Outline
    this.drawOutline(ctx, 8, 16 + walkOffset.bob, 16, 28);
  }

  /**
   * Draw Arab middleman character
   */
  private drawArabMiddlemanCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number }
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Flowing robes
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 18 + walkOffset.bob, 16, 26);
    ctx.graphics.fillStyle(ctx.clothing.primary.highlight, 0.3);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 18 + walkOffset.bob, 5, 26);
    ctx.graphics.fillStyle(ctx.clothing.primary.shadow, 0.4);
    ctx.graphics.fillRect(ctx.x + 20, ctx.y + 18 + walkOffset.bob, 4, 26);

    // Robe seam detail
    ctx.graphics.lineStyle(1, ctx.clothing.primary.deep, 0.4);
    ctx.graphics.lineBetween(
      ctx.x + 14,
      ctx.y + 22 + walkOffset.bob,
      ctx.x + 14,
      ctx.y + 44
    );
    ctx.graphics.lineBetween(
      ctx.x + 18,
      ctx.y + 22 + walkOffset.bob,
      ctx.x + 18,
      ctx.y + 44
    );

    // Feet
    ctx.graphics.fillStyle(WOOD_DARK.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 44, 5, 2);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 44, 5, 2);

    // Arms (wide sleeves)
    const leftArmY = 20 + walkOffset.bob + armSwing.leftArm;
    const rightArmY = 20 + walkOffset.bob + armSwing.rightArm;
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 4, ctx.y + leftArmY, 6, 10);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + rightArmY, 6, 10);

    // Hands
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 5, ctx.y + leftArmY + 10, 4, 3);
    ctx.graphics.fillRect(ctx.x + 23, ctx.y + rightArmY + 10, 4, 3);

    // Head
    this.drawHead(ctx, 0, walkOffset);

    // Beard
    if (ctx.direction === Direction.SOUTH) {
      ctx.graphics.fillStyle(WOOD_DARK.base, 1);
      ctx.graphics.fillRect(ctx.x + 13, ctx.y + 14 + walkOffset.bob, 6, 4);
    }

    // Keffiyeh (headwear)
    ctx.graphics.fillStyle(ctx.clothing.secondary.base, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 2 + walkOffset.bob, 16, 8);
    // Agal (headband)
    ctx.graphics.fillStyle(ctx.clothing.primary.deep, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 4 + walkOffset.bob, 16, 2);

    // Side drapes of keffiyeh
    if (ctx.direction === Direction.SOUTH || ctx.direction === Direction.NORTH) {
      ctx.graphics.fillStyle(ctx.clothing.secondary.base, 0.8);
      ctx.graphics.fillRect(ctx.x + 6, ctx.y + 8 + walkOffset.bob, 3, 8);
      ctx.graphics.fillRect(ctx.x + 23, ctx.y + 8 + walkOffset.bob, 3, 8);
    }

    // Outline
    this.drawOutline(ctx, 8, 18 + walkOffset.bob, 16, 26);
  }

  /**
   * Draw Crown Official character
   */
  private drawCrownOfficialCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number }
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Legs
    this.drawLegs(ctx, walkOffset, ctx.clothing.primary);

    // Shoes
    this.drawShoes(ctx, walkOffset, WOOD_DARK);

    // Long formal coat
    this.drawShadedRect(ctx, 8, 16 + walkOffset.bob, 16, 20, ctx.clothing.primary, ctx.direction);

    // Large ornate ruff
    ctx.graphics.fillStyle(WHITEWASH.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 14 + walkOffset.bob, 20, 4);
    ctx.graphics.fillStyle(WHITEWASH.shadow, 0.4);
    for (let i = 0; i < 10; i++) {
      ctx.graphics.fillRect(ctx.x + 7 + i * 2, ctx.y + 14 + walkOffset.bob, 1, 4);
    }

    // Chain of office
    ctx.graphics.fillStyle(GOLD.base, 1);
    ctx.graphics.fillRect(ctx.x + 12, ctx.y + 18 + walkOffset.bob, 8, 1);
    ctx.graphics.fillCircle(ctx.x + 16, ctx.y + 22 + walkOffset.bob, 2);

    // Arms
    this.drawArms(ctx, walkOffset, armSwing, ctx.clothing.primary);

    // Hands
    this.drawHands(ctx, walkOffset, armSwing);

    // Head
    this.drawHead(ctx, 0, walkOffset);

    // Official cap (toque)
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 2 + walkOffset.bob, 12, 8);
    ctx.graphics.fillStyle(ctx.clothing.primary.shadow, 0.5);
    ctx.graphics.fillRect(ctx.x + 18, ctx.y + 2 + walkOffset.bob, 4, 8);

    // Outline
    this.drawOutline(ctx, 8, 14 + walkOffset.bob, 16, 30);
  }

  /**
   * Draw Sailor character
   */
  private drawSailorCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number }
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Rough trousers
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 32 + walkOffset.bob, 5, 10);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 32 + walkOffset.bob, 5, 10);

    // Bare feet
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 11 + walkOffset.leftLeg, ctx.y + 42, 4, 3);
    ctx.graphics.fillRect(ctx.x + 18 + walkOffset.rightLeg, ctx.y + 42, 4, 3);

    // Simple shirt
    this.drawShadedRect(ctx, 10, 18 + walkOffset.bob, 12, 14, ctx.clothing.secondary, ctx.direction);

    // Vest or open shirt front
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 0.8);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 18 + walkOffset.bob, 4, 14);
    ctx.graphics.fillRect(ctx.x + 18, ctx.y + 18 + walkOffset.bob, 4, 14);

    // Arms
    this.drawArms(ctx, walkOffset, armSwing, ctx.clothing.secondary);

    // Hands (weathered)
    ctx.graphics.fillStyle(ctx.skin.shadow, 1);
    ctx.graphics.fillRect(ctx.x + 5, ctx.y + 30 + walkOffset.bob + armSwing.leftArm, 4, 3);
    ctx.graphics.fillRect(ctx.x + 23, ctx.y + 30 + walkOffset.bob + armSwing.rightArm, 4, 3);

    // Head
    this.drawHead(ctx, 0, walkOffset);

    // Sailor's cap
    ctx.graphics.fillStyle(ctx.clothing.accent.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 4 + walkOffset.bob, 12, 6);
    ctx.graphics.fillStyle(ctx.clothing.accent.highlight, 0.4);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 4 + walkOffset.bob, 4, 6);

    // Outline
    this.drawOutline(ctx, 10, 18 + walkOffset.bob, 12, 26);
  }

  /**
   * Draw Franciscan Monk character
   */
  private drawFranciscanMonkCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number }
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Brown habit (full length robe)
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 16 + walkOffset.bob, 16, 28);
    ctx.graphics.fillStyle(ctx.clothing.primary.highlight, 0.3);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 16 + walkOffset.bob, 5, 28);
    ctx.graphics.fillStyle(ctx.clothing.primary.shadow, 0.4);
    ctx.graphics.fillRect(ctx.x + 20, ctx.y + 16 + walkOffset.bob, 4, 28);

    // Rope belt
    ctx.graphics.fillStyle(FABRIC_CREAM.shadow, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 28 + walkOffset.bob, 16, 2);
    // Hanging rope
    ctx.graphics.fillRect(ctx.x + 14, ctx.y + 30 + walkOffset.bob, 2, 6);
    ctx.graphics.fillCircle(ctx.x + 15, ctx.y + 37 + walkOffset.bob, 2);

    // Sandals
    ctx.graphics.fillStyle(WOOD_LIGHT.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 44, 5, 2);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 44, 5, 2);

    // Arms (wide sleeves)
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 4, ctx.y + 18 + walkOffset.bob + armSwing.leftArm, 6, 10);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 18 + walkOffset.bob + armSwing.rightArm, 6, 10);

    // Hands (folded in prayer pose for idle)
    if (ctx.frame === FrameType.IDLE1 || ctx.frame === FrameType.IDLE2) {
      ctx.graphics.fillStyle(ctx.skin.base, 1);
      ctx.graphics.fillRect(ctx.x + 13, ctx.y + 26 + walkOffset.bob, 6, 4);
    } else {
      ctx.graphics.fillStyle(ctx.skin.base, 1);
      ctx.graphics.fillRect(ctx.x + 5, ctx.y + 28 + walkOffset.bob + armSwing.leftArm, 4, 3);
      ctx.graphics.fillRect(ctx.x + 23, ctx.y + 28 + walkOffset.bob + armSwing.rightArm, 4, 3);
    }

    // Hood
    ctx.graphics.fillStyle(ctx.clothing.primary.shadow, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 8 + walkOffset.bob, 12, 10);

    // Head (visible under hood)
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillCircle(ctx.x + 16, ctx.y + 14 + walkOffset.bob, 5);

    // Tonsure
    if (ctx.direction === Direction.NORTH) {
      ctx.graphics.fillStyle(ctx.skin.highlight, 1);
      ctx.graphics.fillCircle(ctx.x + 16, ctx.y + 10 + walkOffset.bob, 3);
    }

    // Cross pendant
    ctx.graphics.fillStyle(GOLD.base, 1);
    ctx.graphics.fillRect(ctx.x + 15, ctx.y + 20 + walkOffset.bob, 2, 5);
    ctx.graphics.fillRect(ctx.x + 14, ctx.y + 22 + walkOffset.bob, 4, 2);

    // Outline
    this.drawOutline(ctx, 8, 16 + walkOffset.bob, 16, 28);
  }

  /**
   * Draw Portuguese Soldier character
   */
  private drawPortugueseSoldierCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number }
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Legs (armored)
    ctx.graphics.fillStyle(IRON.base, 1);
    ctx.graphics.fillRect(ctx.x + 11 + walkOffset.leftLeg, ctx.y + 32 + walkOffset.bob, 4, 10);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 32 + walkOffset.bob, 4, 10);
    ctx.graphics.fillStyle(IRON.highlight, 0.4);
    ctx.graphics.fillRect(ctx.x + 11 + walkOffset.leftLeg, ctx.y + 32 + walkOffset.bob, 2, 10);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 32 + walkOffset.bob, 2, 10);

    // Boots
    ctx.graphics.fillStyle(WOOD_DARK.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 42, 6, 4);
    ctx.graphics.fillRect(ctx.x + 16 + walkOffset.rightLeg, ctx.y + 42, 6, 4);

    // Breastplate
    ctx.graphics.fillStyle(IRON.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 18 + walkOffset.bob, 12, 14);
    ctx.graphics.fillStyle(IRON.highlight, 0.5);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 18 + walkOffset.bob, 4, 14);
    ctx.graphics.fillStyle(IRON.shadow, 0.4);
    ctx.graphics.fillRect(ctx.x + 18, ctx.y + 18 + walkOffset.bob, 4, 14);

    // Red sash
    ctx.graphics.fillStyle(ctx.clothing.secondary.base, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 26 + walkOffset.bob, 16, 3);
    ctx.graphics.fillStyle(ctx.clothing.secondary.highlight, 0.3);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 26 + walkOffset.bob, 5, 3);

    // Arms (armored)
    ctx.graphics.fillStyle(IRON.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 18 + walkOffset.bob + armSwing.leftArm, 4, 10);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 18 + walkOffset.bob + armSwing.rightArm, 4, 10);

    // Hands
    this.drawHands(ctx, walkOffset, armSwing);

    // Halberd/pike (on right side)
    ctx.graphics.fillStyle(WOOD_LIGHT.base, 1);
    ctx.graphics.fillRect(ctx.x + 26, ctx.y + 4, 2, 40);
    ctx.graphics.fillStyle(IRON.base, 1);
    ctx.graphics.fillRect(ctx.x + 24, ctx.y + 2, 6, 4);

    // Head
    this.drawHead(ctx, 0, walkOffset);

    // Morion helmet
    ctx.graphics.fillStyle(IRON.base, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 4 + walkOffset.bob, 16, 6);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 0 + walkOffset.bob, 12, 5);
    ctx.graphics.fillStyle(IRON.highlight, 0.5);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 0 + walkOffset.bob, 4, 5);
    // Helmet crest
    ctx.graphics.fillStyle(ctx.clothing.secondary.base, 1);
    ctx.graphics.fillRect(ctx.x + 15, ctx.y + 0 + walkOffset.bob, 2, 6);

    // Outline
    this.drawOutline(ctx, 10, 18 + walkOffset.bob, 12, 26);
  }

  /**
   * Draw Dock Porter character
   */
  private drawDockPorterCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number }
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Simple loincloth/dhoti
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 24 + walkOffset.bob, 12, 16);
    ctx.graphics.fillStyle(ctx.clothing.primary.shadow, 0.3);
    ctx.graphics.fillRect(ctx.x + 18, ctx.y + 24 + walkOffset.bob, 4, 16);

    // Legs (visible below loincloth)
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 11 + walkOffset.leftLeg, ctx.y + 36 + walkOffset.bob, 4, 6);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 36 + walkOffset.bob, 4, 6);

    // Bare feet
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 42, 5, 3);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 42, 5, 3);

    // Bare muscular upper body
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 14 + walkOffset.bob, 12, 12);
    ctx.graphics.fillStyle(ctx.skin.shadow, 0.3);
    ctx.graphics.fillRect(ctx.x + 18, ctx.y + 14 + walkOffset.bob, 4, 12);

    // Cargo sack on shoulder
    ctx.graphics.fillStyle(ctx.clothing.secondary.base, 1);
    ctx.graphics.fillCircle(ctx.x + 8, ctx.y + 16 + walkOffset.bob, 8);
    ctx.graphics.fillStyle(ctx.clothing.secondary.shadow, 0.4);
    ctx.graphics.fillCircle(ctx.x + 10, ctx.y + 18 + walkOffset.bob, 5);

    // Sack rope
    ctx.graphics.lineStyle(2, ctx.clothing.accent.base, 1);
    ctx.graphics.lineBetween(ctx.x + 8, ctx.y + 10 + walkOffset.bob, ctx.x + 24, ctx.y + 10 + walkOffset.bob);
    ctx.graphics.lineBetween(ctx.x + 8, ctx.y + 10 + walkOffset.bob, ctx.x + 6, ctx.y + 20 + walkOffset.bob);

    // Arms
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 16 + walkOffset.bob + armSwing.leftArm, 4, 10);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 16 + walkOffset.bob + armSwing.rightArm, 4, 10);

    // Hands
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 26 + walkOffset.bob + armSwing.leftArm, 4, 3);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 26 + walkOffset.bob + armSwing.rightArm, 4, 3);

    // Head
    this.drawHead(ctx, 0, walkOffset);

    // Head cloth
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 2 + walkOffset.bob, 12, 6);

    // Outline
    this.drawOutline(ctx, 10, 14 + walkOffset.bob, 12, 30);
  }

  /**
   * Draw Local Woman character
   */
  private drawLocalWomanCharacter(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number }
  ): void {
    const armSwing = getArmSwing(ctx.frame);

    // Sari (lower portion)
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 22 + walkOffset.bob, 16, 22);
    ctx.graphics.fillStyle(ctx.clothing.primary.shadow, 0.4);
    ctx.graphics.fillRect(ctx.x + 20, ctx.y + 22 + walkOffset.bob, 4, 22);

    // Sari pleats
    ctx.graphics.lineStyle(1, ctx.clothing.primary.deep, 0.3);
    for (let i = 0; i < 4; i++) {
      ctx.graphics.lineBetween(
        ctx.x + 10 + i * 3,
        ctx.y + 28 + walkOffset.bob,
        ctx.x + 10 + i * 3,
        ctx.y + 44
      );
    }

    // Feet with anklets
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 44, 5, 2);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 44, 5, 2);
    // Anklets
    ctx.graphics.fillStyle(GOLD.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 43, 5, 1);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 43, 5, 1);

    // Blouse (choli)
    ctx.graphics.fillStyle(ctx.clothing.secondary.base, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 14 + walkOffset.bob, 12, 10);
    ctx.graphics.fillStyle(ctx.clothing.secondary.shadow, 0.3);
    ctx.graphics.fillRect(ctx.x + 18, ctx.y + 14 + walkOffset.bob, 4, 10);

    // Sari pallu (draped over shoulder)
    ctx.graphics.fillStyle(ctx.clothing.primary.base, 0.9);
    if (ctx.direction === Direction.SOUTH || ctx.direction === Direction.WEST) {
      ctx.graphics.fillRect(ctx.x + 4, ctx.y + 14 + walkOffset.bob, 6, 18);
    } else {
      ctx.graphics.fillRect(ctx.x + 22, ctx.y + 14 + walkOffset.bob, 6, 18);
    }

    // Gold border on sari
    ctx.graphics.fillStyle(ctx.clothing.accent.base, 0.8);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 42 + walkOffset.bob, 16, 2);

    // Arms
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 16 + walkOffset.bob + armSwing.leftArm, 4, 10);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 16 + walkOffset.bob + armSwing.rightArm, 4, 10);

    // Bangles
    ctx.graphics.fillStyle(GOLD.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 24 + walkOffset.bob + armSwing.leftArm, 4, 1);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 24 + walkOffset.bob + armSwing.rightArm, 4, 1);

    // Hands
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 26 + walkOffset.bob + armSwing.leftArm, 4, 3);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 26 + walkOffset.bob + armSwing.rightArm, 4, 3);

    // Head
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 11, ctx.y + 6 + walkOffset.bob, 10, 10);
    ctx.graphics.fillStyle(ctx.skin.shadow, 0.4);
    ctx.graphics.fillRect(ctx.x + 17, ctx.y + 6 + walkOffset.bob, 4, 10);

    // Hair (bun style)
    ctx.graphics.fillStyle(WOOD_DARK.deep, 1);
    ctx.graphics.fillRect(ctx.x + 10, ctx.y + 4 + walkOffset.bob, 12, 4);
    if (ctx.direction === Direction.NORTH) {
      ctx.graphics.fillCircle(ctx.x + 16, ctx.y + 6 + walkOffset.bob, 4);
    }

    // Bindi
    if (ctx.direction === Direction.SOUTH) {
      ctx.graphics.fillStyle(ctx.clothing.primary.base, 1);
      ctx.graphics.fillCircle(ctx.x + 16, ctx.y + 7 + walkOffset.bob, 1);
      // Eyes
      ctx.graphics.fillStyle(WOOD_DARK.deep, 1);
      ctx.graphics.fillRect(ctx.x + 13, ctx.y + 10 + walkOffset.bob, 2, 2);
      ctx.graphics.fillRect(ctx.x + 17, ctx.y + 10 + walkOffset.bob, 2, 2);
    }

    // Earrings
    ctx.graphics.fillStyle(GOLD.base, 1);
    ctx.graphics.fillCircle(ctx.x + 11, ctx.y + 12 + walkOffset.bob, 1);
    ctx.graphics.fillCircle(ctx.x + 21, ctx.y + 12 + walkOffset.bob, 1);

    // Nose ring (for south view)
    if (ctx.direction === Direction.SOUTH) {
      ctx.graphics.fillStyle(GOLD.base, 1);
      ctx.graphics.fillCircle(ctx.x + 17, ctx.y + 13 + walkOffset.bob, 1);
    }

    // Outline
    this.drawOutline(ctx, 8, 14 + walkOffset.bob, 16, 30);
  }

  /**
   * Draw legs helper
   */
  private drawLegs(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number },
    ramp: ColorRamp
  ): void {
    ctx.graphics.fillStyle(ramp.base, 1);
    ctx.graphics.fillRect(ctx.x + 11 + walkOffset.leftLeg, ctx.y + 32 + walkOffset.bob, 4, 10);
    ctx.graphics.fillRect(ctx.x + 17 + walkOffset.rightLeg, ctx.y + 32 + walkOffset.bob, 4, 10);
    ctx.graphics.fillStyle(ramp.shadow, 0.4);
    ctx.graphics.fillRect(ctx.x + 14 + walkOffset.leftLeg, ctx.y + 32 + walkOffset.bob, 1, 10);
    ctx.graphics.fillRect(ctx.x + 20 + walkOffset.rightLeg, ctx.y + 32 + walkOffset.bob, 1, 10);
  }

  /**
   * Draw shoes helper
   */
  private drawShoes(
    ctx: BodyPartContext,
    walkOffset: { leftLeg: number; rightLeg: number; bob: number },
    ramp: ColorRamp
  ): void {
    ctx.graphics.fillStyle(ramp.base, 1);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 42, 6, 3);
    ctx.graphics.fillRect(ctx.x + 16 + walkOffset.rightLeg, ctx.y + 42, 6, 3);
    ctx.graphics.fillStyle(ramp.highlight, 0.3);
    ctx.graphics.fillRect(ctx.x + 10 + walkOffset.leftLeg, ctx.y + 42, 2, 2);
    ctx.graphics.fillRect(ctx.x + 16 + walkOffset.rightLeg, ctx.y + 42, 2, 2);
  }

  /**
   * Draw arms helper
   */
  private drawArms(
    ctx: BodyPartContext,
    walkOffset: { bob: number },
    armSwing: { leftArm: number; rightArm: number },
    ramp: ColorRamp
  ): void {
    ctx.graphics.fillStyle(ramp.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 20 + walkOffset.bob + armSwing.leftArm, 4, 10);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 20 + walkOffset.bob + armSwing.rightArm, 4, 10);
    ctx.graphics.fillStyle(ramp.shadow, 0.4);
    ctx.graphics.fillRect(ctx.x + 8, ctx.y + 20 + walkOffset.bob + armSwing.leftArm, 2, 10);
    ctx.graphics.fillRect(ctx.x + 24, ctx.y + 20 + walkOffset.bob + armSwing.rightArm, 2, 10);
  }

  /**
   * Draw hands helper
   */
  private drawHands(
    ctx: BodyPartContext,
    walkOffset: { bob: number },
    armSwing: { leftArm: number; rightArm: number }
  ): void {
    ctx.graphics.fillStyle(ctx.skin.base, 1);
    ctx.graphics.fillRect(ctx.x + 6, ctx.y + 30 + walkOffset.bob + armSwing.leftArm, 4, 3);
    ctx.graphics.fillRect(ctx.x + 22, ctx.y + 30 + walkOffset.bob + armSwing.rightArm, 4, 3);
  }

  /**
   * Draw character outline
   */
  private drawOutline(ctx: BodyPartContext, x: number, y: number, w: number, h: number): void {
    ctx.graphics.lineStyle(1, 0x000000, 0.6);
    ctx.graphics.strokeRect(ctx.x + x, ctx.y + y, w, h);
  }

  /**
   * Generate all character types with default configurations
   */
  generateAllCharacters(): Map<string, string> {
    const textureKeys = new Map<string, string>();

    const skinTones = [SkinTone.LIGHT, SkinTone.MEDIUM, SkinTone.DARK];

    // Generate player character
    const playerKey = this.generateCharacter({
      type: CharacterType.PLAYER,
      skinTone: SkinTone.LIGHT,
    });
    textureKeys.set('player', playerKey);

    // Generate each character type with skin tone variations
    const characterTypes = [
      CharacterType.PORTUGUESE_MERCHANT,
      CharacterType.HINDU_TRADER,
      CharacterType.ARAB_MIDDLEMAN,
      CharacterType.CROWN_OFFICIAL,
      CharacterType.SAILOR,
      CharacterType.FRANCISCAN_MONK,
      CharacterType.PORTUGUESE_SOLDIER,
      CharacterType.DOCK_PORTER,
      CharacterType.LOCAL_WOMAN,
    ];

    for (const charType of characterTypes) {
      // Generate default (medium skin tone)
      const defaultKey = this.generateCharacter({
        type: charType,
        skinTone: SkinTone.MEDIUM,
      });
      textureKeys.set(charType, defaultKey);

      // Generate with all skin tones
      for (const skinTone of skinTones) {
        const key = this.generateCharacter({
          type: charType,
          skinTone,
        });
        textureKeys.set(`${charType}_${skinTone}`, key);
      }

      // Generate clothing variants (up to 3 per type)
      for (let variant = 0; variant < 3; variant++) {
        const variantKey = this.generateCharacter({
          type: charType,
          skinTone: SkinTone.MEDIUM,
          clothingVariant: variant,
        });
        textureKeys.set(`${charType}_variant_${variant}`, variantKey);
      }
    }

    return textureKeys;
  }

  /**
   * Create Phaser animations for a character texture
   */
  createAnimations(textureKey: string, animPrefix: string): void {
    const anims = this.scene.anims;

    // Direction suffixes
    const directions = ['south', 'west', 'east', 'north'];

    for (let dir = 0; dir < 4; dir++) {
      const dirSuffix = directions[dir];
      const rowStart = dir * SHEET_COLS;

      // Idle animation (frames 0-1)
      anims.create({
        key: `${animPrefix}_idle_${dirSuffix}`,
        frames: anims.generateFrameNumbers(textureKey, {
          start: rowStart,
          end: rowStart + 1,
        }),
        frameRate: 2,
        repeat: -1,
      });

      // Walk animation (frames 2-7)
      anims.create({
        key: `${animPrefix}_walk_${dirSuffix}`,
        frames: anims.generateFrameNumbers(textureKey, {
          start: rowStart + 2,
          end: rowStart + 7,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}

/**
 * Factory function to generate a single character spritesheet
 */
export function generateCharacterSprite(
  scene: Phaser.Scene,
  config: CharacterConfig
): string {
  const generator = new CharacterGenerator(scene);
  return generator.generateCharacter(config);
}

/**
 * Factory function to generate all character types
 */
export function generateAllCharacterSprites(
  scene: Phaser.Scene
): Map<string, string> {
  const generator = new CharacterGenerator(scene);
  return generator.generateAllCharacters();
}
