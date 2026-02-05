/**
 * Goa 1590 Art Pipeline - Main Export Module
 *
 * This module provides unified access to the entire procedural art generation
 * system for the Goa 1590 trading game. It exports:
 *
 * - GoaPalette: The complete color system with historical colors
 * - ArtGenerator: Main orchestrating class for batch generation
 * - Individual generators for tiles, characters, buildings, UI, and effects
 * - All types, interfaces, and enums needed for art generation
 * - Utility functions for color manipulation and pattern generation
 *
 * Usage:
 * ```typescript
 * import {
 *   ArtGenerator,
 *   GoaPalette,
 *   TileGenerator,
 *   CharacterType,
 *   createArtPipeline
 * } from '../art';
 * ```
 *
 * @module art
 */

// =============================================================================
// PALETTE - Complete Color System
// =============================================================================

export {
  // Main palette export
  GoaPalette,
  // Type definitions
  type RGBA,
  type HSL,
  type ColorEntry,
  type ColorRamp,
  type ExtendedColorRamp,
  type PatternOptions,
  type DitherPattern,
  // Primary palette constants
  PRIMARY_PALETTE,
  EXTENDED_RAMPS,
  SKIN_TONES,
  MATERIAL_COLORS,
  ENVIRONMENT_COLORS,
  // Legacy color ramps (backward compatibility)
  COBBLESTONE,
  DIRT,
  SAND,
  GRASS,
  WATER_HARBOR,
  WATER_DEEP,
  WATER_RIVER,
  WHITEWASH,
  TERRACOTTA,
  WOOD_DARK,
  WOOD_LIGHT,
  STONE,
  PALM_FROND,
  PALM_TRUNK,
  SILK_GOLD,
  FABRIC_RED,
  FABRIC_BLUE,
  FABRIC_GREEN,
  FABRIC_CREAM,
  SKIN_LIGHT,
  SKIN_MEDIUM,
  SKIN_DARK,
  GOLD,
  IRON,
  MOSS,
  // Special colors
  PORTUGUESE_BLUE,
  INDIGO_DYE,
  PEPPER_BLACK,
  CINNAMON,
  CLOVES,
  NUTMEG,
  SHADOW_COLOR,
  SHADOW_ALPHA,
  MARKET_TILE_LIGHT,
  MARKET_TILE_DARK,
  MARKET_TILE_ACCENT,
  // Color conversion utilities
  hexToRGBA,
  rgbaToHex,
  rgbaToHSL,
  hslToRGBA,
  colorToInt,
  intToRGBA,
  intToHex,
  // Color blending utilities
  lerpColor,
  lerpColorRGBA,
  getRampColor,
  addColorNoise,
  blendAlpha,
  blendColors,
  multiplyColors,
  screenColors,
  // Dithering
  BAYER_2X2,
  BAYER_4X4,
  BAYER_8X8,
  getBayerThreshold,
  ditherPixel,
  createDitheredGradient,
  // Shading utilities
  generateHighlight,
  generateShadow,
  generateShadingRamp,
  applyAmbientOcclusion,
  // Color distance and matching
  colorDistanceRGB,
  colorDistancePerceptual,
  findClosestColor,
  quantizeToPalette,
  applyPixelArtAA,
  // Pattern generators
  generateWoodGrainPattern,
  generateStonePattern,
  generateFabricPattern,
  generateWaterRipplePattern,
  generateLateritePattern,
  generateRoofTilePattern,
  // Phaser integration
  patternToColorInts,
  patternToImageData,
  // Palette helpers
  getPrimaryPaletteHex,
  getPrimaryPaletteRGBA,
  getExtendedPaletteHex,
  getSkinToneRamp,
  legacyRampToExtended,
} from './palette';

// =============================================================================
// MAIN ART GENERATOR
// =============================================================================

export {
  ArtGenerator,
  createArtGenerator,
  // Types
  type QualityLevel,
  type ArtGeneratorConfig,
  type ProgressCallback,
  type AnimationDefinition,
  type SpritesheetData,
  type TextureManifest,
} from './ArtGenerator';

// =============================================================================
// INDIVIDUAL GENERATORS (via barrel export)
// =============================================================================

export {
  // Tile Generator
  TileGenerator,
  createTileGenerator,
  type CobblestoneVariant,
  type DirtVariant,
  type SandVariant,
  type GrassVariant,
  type MarketFloorVariant,
  // Character Generator
  CharacterGenerator,
  generateCharacterSprite,
  generateAllCharacterSprites,
  CHAR_WIDTH,
  CHAR_HEIGHT,
  SHEET_COLS,
  SHEET_ROWS,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  Direction,
  FrameType,
  CharacterType,
  SkinTone,
  type ClothingColors,
  type CharacterConfig,
  // Building Generator
  BuildingGenerator,
  type BuildingType,
  type MarketStallVariant,
  type BuildingState,
  type BuildingConfig,
  type BuildingSpec,
  // UI Generator
  UIGenerator,
  createUIGenerator,
  UI_COLORS,
  BUTTON_SIZES,
  ICON_SIZES,
  type PanelOptions,
  type ButtonOptions,
  type ButtonSize,
  type ButtonState,
  type IconOptions,
  type IconType,
  type FactionType,
  // Effects Generator
  EffectsGenerator,
  type EffectConfig,
  type GeneratedEffect,
  type ParticleOptions,
  generateRainDrops,
  generateHeavyRain,
  generateDustParticles,
  generateHeatShimmer,
  generateFogWisps,
  generateFireflies,
  generateSmokeWisps,
  generateIncenseSmoke,
  generateTorchSparks,
  generateSeaSpray,
  generateGoldSparkle,
  generateQuestCompleteBurst,
  generateReputationIndicator,
  generateFootstepDust,
  generateVignette,
  generateSunRays,
  generateCandlelightFlicker,
  generateMonsoonOverlay,
  generateRainOverlay,
  generateHeatHazePattern,
  generateNightTintOverlay,
} from './generators';

// =============================================================================
// FACTORY FUNCTION - CONVENIENT PIPELINE CREATION
// =============================================================================

import Phaser from 'phaser';
import { ArtGenerator, ArtGeneratorConfig } from './ArtGenerator';

/**
 * Options for creating the art pipeline
 */
export interface ArtPipelineOptions extends ArtGeneratorConfig {
  /** Whether to auto-generate all assets immediately (default: false) */
  autoGenerate?: boolean;
  /** Progress callback for auto-generation */
  onProgress?: (progress: number, currentAsset: string) => void;
  /** Callback when generation is complete */
  onComplete?: () => void;
}

/**
 * Create a complete art pipeline for Goa 1590
 *
 * This is a convenience factory function that creates and optionally
 * initializes an ArtGenerator with all sub-generators ready to use.
 *
 * @param scene - Phaser scene for texture generation
 * @param options - Pipeline configuration options
 * @returns Promise resolving to the configured ArtGenerator
 *
 * @example
 * ```typescript
 * // Basic usage - manual generation
 * const artPipeline = await createArtPipeline(scene, { quality: 'medium' });
 * await artPipeline.generateAll();
 *
 * // Auto-generate with progress tracking
 * const artPipeline = await createArtPipeline(scene, {
 *   quality: 'high',
 *   seed: 42,
 *   autoGenerate: true,
 *   onProgress: (progress, asset) => console.log(`${Math.round(progress * 100)}%: ${asset}`),
 *   onComplete: () => console.log('All assets generated!')
 * });
 * ```
 */
export async function createArtPipeline(
  scene: Phaser.Scene,
  options: ArtPipelineOptions
): Promise<ArtGenerator> {
  const {
    autoGenerate = false,
    onProgress,
    onComplete,
    ...config
  } = options;

  // Create the art generator
  const artGenerator = new ArtGenerator(scene, config);

  // Auto-generate if requested
  if (autoGenerate) {
    await artGenerator.generateAll(onProgress);
    onComplete?.();
  }

  return artGenerator;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default ArtGenerator;
