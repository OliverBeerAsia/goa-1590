/**
 * Barrel export for all art generators
 *
 * This module re-exports all individual generators for convenient importing:
 * - TileGenerator: Isometric ground tiles, water, transitions, decorations
 * - CharacterGenerator: NPC spritesheets with animations
 * - BuildingGenerator: Colonial buildings, market stalls, religious structures
 * - UIGenerator: Panels, buttons, icons, decorative elements
 * - EffectsGenerator: Weather particles, ambient effects, lighting overlays
 *
 * @module art/generators
 */

// =============================================================================
// TILE GENERATOR
// =============================================================================

export {
  TileGenerator,
  createTileGenerator,
  // Variant types
  type CobblestoneVariant,
  type DirtVariant,
  type SandVariant,
  type GrassVariant,
  type MarketFloorVariant,
} from './TileGenerator';

// =============================================================================
// CHARACTER GENERATOR
// =============================================================================

export {
  CharacterGenerator,
  generateCharacterSprite,
  generateAllCharacterSprites,
  // Constants
  CHAR_WIDTH,
  CHAR_HEIGHT,
  SHEET_COLS,
  SHEET_ROWS,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  // Enums
  Direction,
  FrameType,
  CharacterType,
  SkinTone,
  // Types
  type ClothingColors,
  type CharacterConfig,
} from './CharacterGenerator';

// =============================================================================
// BUILDING GENERATOR
// =============================================================================

export {
  BuildingGenerator,
  // Types
  type BuildingType,
  type MarketStallVariant,
  type BuildingState,
  type BuildingConfig,
  type BuildingSpec,
} from './BuildingGenerator';

// =============================================================================
// UI GENERATOR
// =============================================================================

export {
  UIGenerator,
  createUIGenerator,
  // Constants
  UI_COLORS,
  BUTTON_SIZES,
  ICON_SIZES,
  // Types
  type PanelOptions,
  type ButtonOptions,
  type ButtonSize,
  type ButtonState,
  type IconOptions,
  type IconType,
  type FactionType,
} from './UIGenerator';

// =============================================================================
// EFFECTS GENERATOR
// =============================================================================

export {
  EffectsGenerator,
  // Types
  type EffectConfig,
  type GeneratedEffect,
  type ParticleOptions,
  // Individual effect generators for standalone use
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
} from './EffectsGenerator';
