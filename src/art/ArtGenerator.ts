/**
 * ArtGenerator - Unified Art Pipeline for Goa 1590
 *
 * Orchestrates all procedural art generators into a unified API:
 * - TileGenerator: Ground tiles, water, transitions, decorations
 * - CharacterGenerator: NPCs with all variations and animations
 * - BuildingGenerator: Colonial buildings, market stalls, religious structures
 * - UIGenerator: Panels, buttons, icons, decorative elements
 *
 * Features:
 * - Shared seed for deterministic generation
 * - Quality settings for performance optimization
 * - Progress tracking for loading screens
 * - Texture caching and manifest generation
 * - Batch generation with callbacks
 */

import Phaser from 'phaser';
import { TileGenerator } from './generators/TileGenerator';
import {
  CharacterGenerator,
  CharacterType,
  SkinTone,
  CHAR_WIDTH,
  CHAR_HEIGHT,
  SHEET_COLS,
  SHEET_ROWS,
} from './generators/CharacterGenerator';
import {
  BuildingGenerator,
  BuildingType,
  MarketStallVariant,
  BuildingState,
  BuildingSpec,
} from './generators/BuildingGenerator';
import { UIGenerator, ICON_SIZES } from './generators/UIGenerator';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Quality presets for art generation
 */
export type QualityLevel = 'low' | 'medium' | 'high';

/**
 * Configuration options for the ArtGenerator
 */
export interface ArtGeneratorConfig {
  /** Quality level affecting variations and animations */
  quality: QualityLevel;
  /** Seed for deterministic procedural generation */
  seed?: number;
  /** Enable texture caching (default: true) */
  enableCache?: boolean;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Progress callback for tracking generation progress
 */
export type ProgressCallback = (progress: number, currentAsset: string) => void;

/**
 * Animation definition for the manifest
 */
export interface AnimationDefinition {
  key: string;
  textureKey: string;
  frameStart: number;
  frameEnd: number;
  frameRate: number;
  repeat: number;
}

/**
 * Spritesheet frame data for the manifest
 */
export interface SpritesheetData {
  key: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns?: number;
  rows?: number;
}

/**
 * Texture manifest containing all generated assets
 */
export interface TextureManifest {
  /** All generated texture keys */
  textureKeys: string[];
  /** Animation definitions for Phaser */
  animations: AnimationDefinition[];
  /** Spritesheet frame data */
  spritesheets: SpritesheetData[];
  /** Generation metadata */
  metadata: {
    seed: number;
    quality: QualityLevel;
    generatedAt: number;
    totalTextures: number;
    totalAnimations: number;
  };
  /** Organized keys by category */
  categories: {
    tiles: string[];
    characters: string[];
    buildings: string[];
    ui: string[];
  };
}

/**
 * Quality configuration for each level
 */
interface QualityConfig {
  /** Number of skin tone variations per character */
  skinVariations: number;
  /** Number of clothing variations per character */
  clothingVariations: number;
  /** Include building state variations (day/night/active) */
  buildingStates: BuildingState[];
  /** Include market stall variants */
  marketVariants: MarketStallVariant[];
  /** Generate water animations */
  waterAnimations: boolean;
  /** Generate character walk animations */
  characterAnimations: boolean;
  /** Include all ground tile variants */
  allTileVariants: boolean;
  /** Include transition tiles */
  transitionTiles: boolean;
  /** Include decoration tiles */
  decorationTiles: boolean;
}

/**
 * Quality presets
 */
const QUALITY_CONFIGS: Record<QualityLevel, QualityConfig> = {
  low: {
    skinVariations: 1,
    clothingVariations: 1,
    buildingStates: ['day'],
    marketVariants: ['spice'],
    waterAnimations: false,
    characterAnimations: false,
    allTileVariants: false,
    transitionTiles: false,
    decorationTiles: false,
  },
  medium: {
    skinVariations: 2,
    clothingVariations: 2,
    buildingStates: ['day', 'night'],
    marketVariants: ['spice', 'cloth', 'pottery', 'food'],
    waterAnimations: true,
    characterAnimations: true,
    allTileVariants: true,
    transitionTiles: true,
    decorationTiles: false,
  },
  high: {
    skinVariations: 3,
    clothingVariations: 3,
    buildingStates: ['day', 'night', 'active'],
    marketVariants: ['spice', 'cloth', 'pottery', 'food'],
    waterAnimations: true,
    characterAnimations: true,
    allTileVariants: true,
    transitionTiles: true,
    decorationTiles: true,
  },
};

// ============================================================================
// ART GENERATOR CLASS
// ============================================================================

/**
 * Main ArtGenerator class that orchestrates all procedural generation
 */
export class ArtGenerator {
  private scene: Phaser.Scene;
  private config: Required<ArtGeneratorConfig>;
  private qualityConfig: QualityConfig;

  // Sub-generators
  private tileGenerator: TileGenerator;
  private characterGenerator: CharacterGenerator;
  private buildingGenerator: BuildingGenerator;
  private uiGenerator: UIGenerator;

  // Texture tracking
  private textureCache: Map<string, boolean> = new Map();
  private generatedTextures: string[] = [];
  private animations: AnimationDefinition[] = [];
  private spritesheets: SpritesheetData[] = [];

  // Categories for manifest
  private tileKeys: string[] = [];
  private characterKeys: string[] = [];
  private buildingKeys: string[] = [];
  private uiKeys: string[] = [];

  // Generation state
  private isGenerating: boolean = false;
  private generationAborted: boolean = false;

  /**
   * Create a new ArtGenerator instance
   * @param scene - Phaser scene for texture generation
   * @param config - Configuration options
   */
  constructor(scene: Phaser.Scene, config: ArtGeneratorConfig) {
    this.scene = scene;

    // Apply defaults
    this.config = {
      quality: config.quality,
      seed: config.seed ?? 12345,
      enableCache: config.enableCache ?? true,
      verbose: config.verbose ?? false,
    };

    this.qualityConfig = QUALITY_CONFIGS[this.config.quality];

    // Initialize sub-generators with shared seed
    this.tileGenerator = new TileGenerator(scene, this.config.seed);
    this.characterGenerator = new CharacterGenerator(scene);
    this.buildingGenerator = new BuildingGenerator(scene);
    this.uiGenerator = new UIGenerator(scene);

    this.log(`ArtGenerator initialized with quality: ${this.config.quality}, seed: ${this.config.seed}`);
  }

  // ==========================================================================
  // PUBLIC API - BATCH GENERATION
  // ==========================================================================

  /**
   * Generate all art assets with progress tracking
   * @param onProgress - Callback for progress updates
   */
  async generateAll(onProgress?: ProgressCallback): Promise<void> {
    if (this.isGenerating) {
      throw new Error('Generation already in progress');
    }

    this.isGenerating = true;
    this.generationAborted = false;

    try {
      const totalSteps = 4;
      let currentStep = 0;

      // Step 1: Tiles
      this.log('Generating tiles...');
      await this.generateAllTiles((progress, asset) => {
        const overallProgress = (currentStep + progress) / totalSteps;
        onProgress?.(overallProgress, asset);
      });
      currentStep++;

      if (this.generationAborted) return;

      // Step 2: Characters
      this.log('Generating characters...');
      await this.generateAllCharacters((progress, asset) => {
        const overallProgress = (currentStep + progress) / totalSteps;
        onProgress?.(overallProgress, asset);
      });
      currentStep++;

      if (this.generationAborted) return;

      // Step 3: Buildings
      this.log('Generating buildings...');
      await this.generateAllBuildings((progress, asset) => {
        const overallProgress = (currentStep + progress) / totalSteps;
        onProgress?.(overallProgress, asset);
      });
      currentStep++;

      if (this.generationAborted) return;

      // Step 4: UI
      this.log('Generating UI elements...');
      await this.generateAllUI((progress, asset) => {
        const overallProgress = (currentStep + progress) / totalSteps;
        onProgress?.(overallProgress, asset);
      });

      onProgress?.(1, 'Complete');
      this.log(`Generation complete. Total textures: ${this.generatedTextures.length}`);
    } catch (error) {
      this.log(`Generation error: ${error}`, true);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate all tile textures
   * @param onProgress - Callback for progress updates
   */
  async generateAllTiles(onProgress?: ProgressCallback): Promise<string[]> {
    const tiles: string[] = [];
    const tasks: { name: string; fn: () => void }[] = [];

    // Ground tiles
    const groundVariants = this.qualityConfig.allTileVariants
      ? ['worn', 'new', 'mossy']
      : ['worn'];

    for (const variant of groundVariants) {
      tasks.push({
        name: `tile_cobble_${variant}`,
        fn: () => this.tileGenerator.generateCobblestone(variant as 'worn' | 'new' | 'mossy'),
      });
    }

    const dirtVariants = this.qualityConfig.allTileVariants
      ? ['packed', 'loose', 'muddy']
      : ['packed'];

    for (const variant of dirtVariants) {
      tasks.push({
        name: `tile_dirt_${variant}`,
        fn: () => this.tileGenerator.generateDirt(variant as 'packed' | 'loose' | 'muddy'),
      });
    }

    const sandVariants = this.qualityConfig.allTileVariants
      ? ['beach', 'dusty', 'wet']
      : ['beach'];

    for (const variant of sandVariants) {
      tasks.push({
        name: `tile_sand_${variant}`,
        fn: () => this.tileGenerator.generateSand(variant as 'beach' | 'dusty' | 'wet'),
      });
    }

    const grassVariants = this.qualityConfig.allTileVariants
      ? ['lush', 'dry', 'patchy']
      : ['lush'];

    for (const variant of grassVariants) {
      tasks.push({
        name: `tile_grass_${variant}`,
        fn: () => this.tileGenerator.generateGrass(variant as 'lush' | 'dry' | 'patchy'),
      });
    }

    // Market floor
    const marketVariants = this.qualityConfig.allTileVariants
      ? ['checkered', 'diamond', 'ornate']
      : ['checkered'];

    for (const variant of marketVariants) {
      tasks.push({
        name: `tile_market_${variant}`,
        fn: () => this.tileGenerator.generateMarketFloor(variant as 'checkered' | 'diamond' | 'ornate'),
      });
    }

    // Water tiles
    if (this.qualityConfig.waterAnimations) {
      tasks.push({
        name: 'tile_harbor_water',
        fn: () => this.tileGenerator.generateHarborWater(),
      });
      tasks.push({
        name: 'tile_river_water',
        fn: () => this.tileGenerator.generateRiverWater(),
      });

      // Register water animations
      this.registerWaterAnimations();
    } else {
      // Just generate frame 0
      tasks.push({
        name: 'tile_harbor_water_0',
        fn: () => {
          const g = this.scene.make.graphics({ x: 0, y: 0 });
          // Simplified single-frame water
          g.fillStyle(0x4a8ab0, 1);
          g.beginPath();
          g.moveTo(16, 0);
          g.lineTo(32, 8);
          g.lineTo(16, 16);
          g.lineTo(0, 8);
          g.closePath();
          g.fillPath();
          g.generateTexture('tile_harbor_water_0', 32, 16);
          g.destroy();
        },
      });
    }

    tasks.push({
      name: 'tile_puddle',
      fn: () => this.tileGenerator.generatePuddles(),
    });

    // Transition tiles
    if (this.qualityConfig.transitionTiles) {
      tasks.push({
        name: 'tile_cobble_water_edge',
        fn: () => this.tileGenerator.generateGroundToWaterEdge('cobble'),
      });
      tasks.push({
        name: 'tile_dirt_water_edge',
        fn: () => this.tileGenerator.generateGroundToWaterEdge('dirt'),
      });
      tasks.push({
        name: 'tile_sand_water_edge',
        fn: () => this.tileGenerator.generateGroundToWaterEdge('sand'),
      });
      tasks.push({
        name: 'tile_cobble_dirt_transition',
        fn: () => this.tileGenerator.generateCobbleToDirtTransition(),
      });
      tasks.push({
        name: 'tile_shadow_overlay',
        fn: () => this.tileGenerator.generateShadowOverlay(),
      });
    }

    // Decoration tiles
    if (this.qualityConfig.decorationTiles) {
      for (const color of ['red', 'blue', 'green', 'gold'] as const) {
        tasks.push({
          name: `tile_stall_base_${color}`,
          fn: () => this.tileGenerator.generateMarketStallBase(color),
        });
      }
      tasks.push({
        name: 'tile_crates',
        fn: () => this.tileGenerator.generateCrates(),
      });
      tasks.push({
        name: 'tile_barrels',
        fn: () => this.tileGenerator.generateBarrels(),
      });
      tasks.push({
        name: 'tile_small_plants',
        fn: () => this.tileGenerator.generateSmallPlants(),
      });
      tasks.push({
        name: 'tile_palm_shadow',
        fn: () => this.tileGenerator.generatePalmShadow(),
      });
    }

    // Execute tasks with progress
    for (let i = 0; i < tasks.length; i++) {
      if (this.generationAborted) break;

      const task = tasks[i];
      try {
        task.fn();
        tiles.push(task.name);
        this.registerTexture(task.name, 'tile');
        onProgress?.(i / tasks.length, task.name);
      } catch (error) {
        this.log(`Error generating ${task.name}: ${error}`, true);
      }

      // Yield to prevent blocking
      await this.yieldToMain();
    }

    this.tileKeys = tiles;
    return tiles;
  }

  /**
   * Generate all character spritesheets
   * @param onProgress - Callback for progress updates
   */
  async generateAllCharacters(onProgress?: ProgressCallback): Promise<string[]> {
    const characters: string[] = [];
    const tasks: { name: string; fn: () => string }[] = [];

    const characterTypes = [
      CharacterType.PLAYER,
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

    const skinTones = this.getSkinTonesForQuality();
    const clothingVariations = this.qualityConfig.clothingVariations;

    for (const charType of characterTypes) {
      // Default character (medium skin, variant 0)
      tasks.push({
        name: `char_${charType}`,
        fn: () =>
          this.characterGenerator.generateCharacter({
            type: charType,
            skinTone: SkinTone.MEDIUM,
            clothingVariant: 0,
          }),
      });

      // Skin tone variations
      for (const skinTone of skinTones) {
        if (skinTone === SkinTone.MEDIUM) continue; // Already generated

        tasks.push({
          name: `char_${charType}_${skinTone}`,
          fn: () =>
            this.characterGenerator.generateCharacter({
              type: charType,
              skinTone,
              clothingVariant: 0,
            }),
        });
      }

      // Clothing variations
      for (let variant = 1; variant < clothingVariations; variant++) {
        tasks.push({
          name: `char_${charType}_variant_${variant}`,
          fn: () =>
            this.characterGenerator.generateCharacter({
              type: charType,
              skinTone: SkinTone.MEDIUM,
              clothingVariant: variant,
            }),
        });
      }
    }

    // Execute tasks with progress
    for (let i = 0; i < tasks.length; i++) {
      if (this.generationAborted) break;

      const task = tasks[i];
      try {
        const textureKey = task.fn();
        characters.push(textureKey);
        this.registerTexture(textureKey, 'character');

        // Register spritesheet data
        this.spritesheets.push({
          key: textureKey,
          frameWidth: CHAR_WIDTH,
          frameHeight: CHAR_HEIGHT,
          frameCount: SHEET_COLS * SHEET_ROWS,
          columns: SHEET_COLS,
          rows: SHEET_ROWS,
        });

        // Create animations if enabled
        if (this.qualityConfig.characterAnimations) {
          this.registerCharacterAnimations(textureKey);
        }

        onProgress?.(i / tasks.length, task.name);
      } catch (error) {
        this.log(`Error generating ${task.name}: ${error}`, true);
      }

      // Yield to prevent blocking
      await this.yieldToMain();
    }

    this.characterKeys = characters;
    return characters;
  }

  /**
   * Generate all building textures
   * @param onProgress - Callback for progress updates
   */
  async generateAllBuildings(onProgress?: ProgressCallback): Promise<string[]> {
    const buildings: string[] = [];
    const tasks: { name: string; fn: () => string }[] = [];

    const buildingTypes: BuildingType[] = [
      'merchantHouse',
      'customsHouse',
      'warehouse',
      'tavern',
      'cathedral',
      'chapel',
      'hinduShrine',
      'portugueseTownhouse',
      'localDwelling',
      'arabMerchantHouse',
    ];

    const states = this.qualityConfig.buildingStates;

    // Regular buildings with states
    for (const type of buildingTypes) {
      for (const state of states) {
        tasks.push({
          name: `bldg_${type}_${state}`,
          fn: () =>
            this.buildingGenerator.generateBuilding({
              type,
              state,
              seed: this.config.seed,
            }),
        });
      }
    }

    // Market stalls with variants
    const marketVariants = this.qualityConfig.marketVariants;
    for (const variant of marketVariants) {
      for (const state of states) {
        tasks.push({
          name: `bldg_marketStall_${variant}_${state}`,
          fn: () =>
            this.buildingGenerator.generateBuilding({
              type: 'marketStall',
              variant,
              state,
              seed: this.config.seed,
            }),
        });
      }
    }

    // Execute tasks with progress
    for (let i = 0; i < tasks.length; i++) {
      if (this.generationAborted) break;

      const task = tasks[i];
      try {
        const textureKey = task.fn();
        buildings.push(textureKey);
        this.registerTexture(textureKey, 'building');
        onProgress?.(i / tasks.length, task.name);
      } catch (error) {
        this.log(`Error generating ${task.name}: ${error}`, true);
      }

      // Yield to prevent blocking
      await this.yieldToMain();
    }

    this.buildingKeys = buildings;
    return buildings;
  }

  /**
   * Generate all UI elements
   * @param onProgress - Callback for progress updates
   */
  async generateAllUI(onProgress?: ProgressCallback): Promise<string[]> {
    const uiElements: string[] = [];
    const tasks: { name: string; fn: () => void }[] = [];

    // Panels
    const panelSizes = [
      { name: 'sm', width: 192, height: 256 },
      { name: 'md', width: 256, height: 192 },
      { name: 'lg', width: 440, height: 350 },
    ];

    for (const size of panelSizes) {
      tasks.push({
        name: `ui-panel-parchment-${size.name}`,
        fn: () => {
          this.uiGenerator.generatePanelTexture(`ui-panel-parchment-${size.name}`, {
            width: size.width,
            height: size.height,
            hasGoldAccent: true,
            agingIntensity: 0.3,
          });
        },
      });
    }

    // Buttons
    const buttonSizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    for (const size of buttonSizes) {
      tasks.push({
        name: `ui-btn-${size}`,
        fn: () => {
          this.uiGenerator.generateButtonTexture(`ui-btn-${size}`, size);
        },
      });
    }

    // Goods icons
    const goodsTypes: ('pepper' | 'cinnamon' | 'cloves' | 'silk' | 'porcelain')[] = [
      'pepper',
      'cinnamon',
      'cloves',
      'silk',
      'porcelain',
    ];
    for (const goodsType of goodsTypes) {
      tasks.push({
        name: `ui-icon-goods-${goodsType}`,
        fn: () => {
          const g = this.uiGenerator.generateGoodsIcon(goodsType);
          this.graphicsToTexture(g, `ui-icon-goods-${goodsType}`, ICON_SIZES.goods, ICON_SIZES.goods);
          g.destroy();
        },
      });
    }

    // Currency icons
    const currencyTypes: ('gold_coins' | 'silver_coins')[] = ['gold_coins', 'silver_coins'];
    for (const currencyType of currencyTypes) {
      tasks.push({
        name: `ui-icon-currency-${currencyType}`,
        fn: () => {
          const g = this.uiGenerator.generateCurrencyIcon(currencyType);
          this.graphicsToTexture(g, `ui-icon-currency-${currencyType}`, ICON_SIZES.currency, ICON_SIZES.currency);
          g.destroy();
        },
      });
    }

    // Status icons
    const statusTypes: ('health' | 'reputation' | 'time')[] = ['health', 'reputation', 'time'];
    for (const statusType of statusTypes) {
      tasks.push({
        name: `ui-icon-status-${statusType}`,
        fn: () => {
          const g = this.uiGenerator.generateStatusIcon(statusType);
          this.graphicsToTexture(g, `ui-icon-status-${statusType}`, ICON_SIZES.status, ICON_SIZES.status);
          g.destroy();
        },
      });
    }

    // Action icons
    const actionTypes: ('buy' | 'sell' | 'talk' | 'quest')[] = ['buy', 'sell', 'talk', 'quest'];
    for (const actionType of actionTypes) {
      tasks.push({
        name: `ui-icon-action-${actionType}`,
        fn: () => {
          const g = this.uiGenerator.generateActionIcon(actionType);
          this.graphicsToTexture(g, `ui-icon-action-${actionType}`, ICON_SIZES.action, ICON_SIZES.action);
          g.destroy();
        },
      });
    }

    // Decorative elements
    tasks.push({
      name: 'ui-compass-rose',
      fn: () => {
        const g = this.uiGenerator.generateCompassRose(48);
        this.graphicsToTexture(g, 'ui-compass-rose', 48, 48);
        g.destroy();
      },
    });

    tasks.push({
      name: 'ui-ship-silhouette',
      fn: () => {
        const g = this.uiGenerator.generateShipSilhouette(32);
        this.graphicsToTexture(g, 'ui-ship-silhouette', 32, 32);
        g.destroy();
      },
    });

    // Faction emblems
    const factions: ('crown' | 'free_traders' | 'old_routes')[] = ['crown', 'free_traders', 'old_routes'];
    for (const faction of factions) {
      tasks.push({
        name: `ui-faction-${faction}`,
        fn: () => {
          const g = this.uiGenerator.generateFactionEmblem(faction, 32);
          this.graphicsToTexture(g, `ui-faction-${faction}`, 32, 32);
          g.destroy();
        },
      });
    }

    // Clock frame
    tasks.push({
      name: 'ui-clock-frame',
      fn: () => {
        const g = this.uiGenerator.generateClockFrame(48);
        this.graphicsToTexture(g, 'ui-clock-frame', 48, 48);
        g.destroy();
      },
    });

    // Inventory slots
    tasks.push({
      name: 'ui-inventory-slot',
      fn: () => {
        const g = this.uiGenerator.generateInventorySlot(36, false);
        this.graphicsToTexture(g, 'ui-inventory-slot', 36, 36);
        g.destroy();
      },
    });
    tasks.push({
      name: 'ui-inventory-slot-selected',
      fn: () => {
        const g = this.uiGenerator.generateInventorySlot(36, true);
        this.graphicsToTexture(g, 'ui-inventory-slot-selected', 36, 36);
        g.destroy();
      },
    });

    // Execute tasks with progress
    for (let i = 0; i < tasks.length; i++) {
      if (this.generationAborted) break;

      const task = tasks[i];
      try {
        task.fn();
        uiElements.push(task.name);
        this.registerTexture(task.name, 'ui');
        onProgress?.(i / tasks.length, task.name);
      } catch (error) {
        this.log(`Error generating ${task.name}: ${error}`, true);
      }

      // Yield to prevent blocking
      await this.yieldToMain();
    }

    this.uiKeys = uiElements;
    return uiElements;
  }

  // ==========================================================================
  // PUBLIC API - MANIFEST & QUERIES
  // ==========================================================================

  /**
   * Get the texture manifest containing all generated asset information
   */
  getManifest(): TextureManifest {
    return {
      textureKeys: [...this.generatedTextures],
      animations: [...this.animations],
      spritesheets: [...this.spritesheets],
      metadata: {
        seed: this.config.seed,
        quality: this.config.quality,
        generatedAt: Date.now(),
        totalTextures: this.generatedTextures.length,
        totalAnimations: this.animations.length,
      },
      categories: {
        tiles: [...this.tileKeys],
        characters: [...this.characterKeys],
        buildings: [...this.buildingKeys],
        ui: [...this.uiKeys],
      },
    };
  }

  /**
   * Check if a texture exists
   * @param key - Texture key to check
   */
  hasTexture(key: string): boolean {
    return this.textureCache.has(key) || this.scene.textures.exists(key);
  }

  /**
   * Get all texture keys for a specific category
   * @param category - Category to get keys for
   */
  getTexturesByCategory(category: 'tiles' | 'characters' | 'buildings' | 'ui'): string[] {
    switch (category) {
      case 'tiles':
        return [...this.tileKeys];
      case 'characters':
        return [...this.characterKeys];
      case 'buildings':
        return [...this.buildingKeys];
      case 'ui':
        return [...this.uiKeys];
      default:
        return [];
    }
  }

  /**
   * Get building specification
   * @param type - Building type
   */
  getBuildingSpec(type: BuildingType): BuildingSpec {
    return this.buildingGenerator.getSpec(type);
  }

  /**
   * Get water animation texture keys
   * @param type - Water type ('harbor' or 'river')
   */
  getWaterAnimationKeys(type: 'harbor' | 'river'): string[] {
    return this.tileGenerator.getWaterAnimationKeys(type);
  }

  /**
   * Abort ongoing generation
   */
  abortGeneration(): void {
    this.generationAborted = true;
    this.log('Generation aborted');
  }

  /**
   * Check if generation is in progress
   */
  isGenerationInProgress(): boolean {
    return this.isGenerating;
  }

  // ==========================================================================
  // PUBLIC API - INDIVIDUAL GENERATION
  // ==========================================================================

  /**
   * Generate a specific character on demand
   * @param type - Character type
   * @param skinTone - Skin tone variant
   * @param clothingVariant - Clothing variant index
   */
  generateCharacter(
    type: CharacterType,
    skinTone: SkinTone = SkinTone.MEDIUM,
    clothingVariant: number = 0
  ): string {
    const key = this.characterGenerator.generateCharacter({
      type,
      skinTone,
      clothingVariant,
    });
    this.registerTexture(key, 'character');
    return key;
  }

  /**
   * Generate a specific building on demand
   * @param type - Building type
   * @param state - Building state
   * @param variant - Market stall variant (if applicable)
   */
  generateBuilding(
    type: BuildingType,
    state: BuildingState = 'day',
    variant?: MarketStallVariant
  ): string {
    const key = this.buildingGenerator.generateBuilding({
      type,
      state,
      variant,
      seed: this.config.seed,
    });
    this.registerTexture(key, 'building');
    return key;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all cached textures and reset the generator
   */
  clearCache(): void {
    // Clear building generator cache
    this.buildingGenerator.clearCache();

    // Clear internal tracking
    this.textureCache.clear();
    this.generatedTextures = [];
    this.animations = [];
    this.spritesheets = [];
    this.tileKeys = [];
    this.characterKeys = [];
    this.buildingKeys = [];
    this.uiKeys = [];

    this.log('Cache cleared');
  }

  /**
   * Destroy the generator and all sub-generators
   */
  destroy(): void {
    this.abortGeneration();
    this.clearCache();
    this.buildingGenerator.destroy();
    this.uiGenerator.destroy();
    this.log('ArtGenerator destroyed');
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Register a generated texture
   */
  private registerTexture(key: string, _category: 'tile' | 'character' | 'building' | 'ui'): void {
    if (!this.textureCache.has(key)) {
      this.textureCache.set(key, true);
      this.generatedTextures.push(key);
    }
  }

  /**
   * Register water animations
   */
  private registerWaterAnimations(): void {
    // Harbor water animation
    const harborFrames = this.tileGenerator.getWaterAnimationKeys('harbor');
    this.animations.push({
      key: 'anim_harbor_water',
      textureKey: harborFrames[0],
      frameStart: 0,
      frameEnd: 3,
      frameRate: 4,
      repeat: -1,
    });

    // River water animation
    const riverFrames = this.tileGenerator.getWaterAnimationKeys('river');
    this.animations.push({
      key: 'anim_river_water',
      textureKey: riverFrames[0],
      frameStart: 0,
      frameEnd: 3,
      frameRate: 6,
      repeat: -1,
    });
  }

  /**
   * Register character animations
   */
  private registerCharacterAnimations(textureKey: string): void {
    const directions = ['south', 'west', 'east', 'north'];
    const animPrefix = textureKey;

    for (let dir = 0; dir < 4; dir++) {
      const dirSuffix = directions[dir];
      const rowStart = dir * SHEET_COLS;

      // Idle animation
      this.animations.push({
        key: `${animPrefix}_idle_${dirSuffix}`,
        textureKey,
        frameStart: rowStart,
        frameEnd: rowStart + 1,
        frameRate: 2,
        repeat: -1,
      });

      // Walk animation
      this.animations.push({
        key: `${animPrefix}_walk_${dirSuffix}`,
        textureKey,
        frameStart: rowStart + 2,
        frameEnd: rowStart + 7,
        frameRate: 8,
        repeat: -1,
      });
    }

    // Also create the actual Phaser animations
    if (this.qualityConfig.characterAnimations) {
      this.characterGenerator.createAnimations(textureKey, textureKey);
    }
  }

  /**
   * Get skin tones based on quality level
   */
  private getSkinTonesForQuality(): SkinTone[] {
    const allTones = [SkinTone.LIGHT, SkinTone.MEDIUM, SkinTone.DARK];
    return allTones.slice(0, this.qualityConfig.skinVariations);
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
   * Yield to the main thread to prevent blocking
   */
  private yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Log a message if verbose mode is enabled
   */
  private log(message: string, isError: boolean = false): void {
    if (this.config.verbose || isError) {
      const prefix = '[ArtGenerator]';
      if (isError) {
        console.error(`${prefix} ${message}`);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an ArtGenerator instance
 * @param scene - Phaser scene
 * @param config - Configuration options
 */
export function createArtGenerator(scene: Phaser.Scene, config: ArtGeneratorConfig): ArtGenerator {
  return new ArtGenerator(scene, config);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default ArtGenerator;
