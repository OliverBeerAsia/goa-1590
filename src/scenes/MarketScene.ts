import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { TimeSystem } from '../systems/TimeSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { AtmosphereSystem } from '../systems/AtmosphereSystem';
import { WorldSystem } from '../systems/WorldSystem';
import { FactionSystem } from '../systems/FactionSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { EventSystem } from '../systems/EventSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { TradeSystem } from '../systems/TradeSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { ContractSystem } from '../systems/ContractSystem';
import { NPCMemorySystem } from '../systems/NPCMemorySystem';
import { TradeRouteSystem } from '../systems/TradeRouteSystem';
import { AchievementSystem } from '../systems/AchievementSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { PostProcessingSystem } from '../systems/PostProcessingSystem';

// Import rich JSON quest files
import pepperContractQuest from '../data/quests/the-pepper-contract.json';
import breakingMonopolyQuest from '../data/quests/breaking-the-monopoly.json';
import forgottenPassageQuest from '../data/quests/the-forgotten-passage.json';

/**
 * MarketScene - The main gameplay scene featuring Ribeira Grande
 * The great waterfront marketplace of 16th century Goa
 */
export class MarketScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private timeSystem!: TimeSystem;
  private weatherSystem!: WeatherSystem;
  private atmosphereSystem!: AtmosphereSystem;
  private worldSystem!: WorldSystem;
  private factionSystem!: FactionSystem;
  private questSystem!: QuestSystem;
  private saveSystem!: SaveSystem;
  private eventSystem!: EventSystem;
  private dialogueSystem!: DialogueSystem;
  private tradeSystem!: TradeSystem;
  private progressionSystem!: ProgressionSystem;
  private contractSystem!: ContractSystem;
  private npcMemorySystem!: NPCMemorySystem;
  private tradeRouteSystem!: TradeRouteSystem;
  private achievementSystem!: AchievementSystem;
  private particleSystem!: ParticleSystem;
  private postProcessing!: PostProcessingSystem;
  private mapWidth = 40;
  private mapHeight = 30;
  private tileWidth = 64;  // 2x scale for Ultima 8 style
  private tileHeight = 32;
  private transitionZones: { x: number; y: number; targetLocation: string; label: string }[] = [];
  private waterTiles: Phaser.GameObjects.Sprite[] = [];
  private isTransitioning = false; // Guard against double transitions

  constructor() {
    super({ key: 'MarketScene' });
  }

  create(): void {
    console.log('MarketScene: create() started');

    // Initialize core systems
    this.timeSystem = new TimeSystem(this);
    this.weatherSystem = new WeatherSystem(this);
    this.atmosphereSystem = new AtmosphereSystem(this);
    this.worldSystem = new WorldSystem(this);
    this.factionSystem = new FactionSystem(this);
    this.questSystem = new QuestSystem(this);
    this.saveSystem = new SaveSystem(this);
    this.eventSystem = new EventSystem(this);
    this.eventSystem.setWeatherSystem(this.weatherSystem);
    this.dialogueSystem = new DialogueSystem(this);

    // Initialize new trading and progression systems
    this.tradeSystem = new TradeSystem(this);
    this.progressionSystem = new ProgressionSystem(this);
    this.contractSystem = new ContractSystem(this);
    this.npcMemorySystem = new NPCMemorySystem(this);
    this.tradeRouteSystem = new TradeRouteSystem(this);
    this.achievementSystem = new AchievementSystem(this);
    this.particleSystem = new ParticleSystem(this, {
      enableDust: true,
      enableFireflies: true,
      maxDustParticles: 25,
      maxFireflyParticles: 12,
      dustSpawnRate: 1.5,
    });
    this.postProcessing = new PostProcessingSystem(this, {
      enableScanlines: true,
      scanlineOpacity: 0.02,   // Very subtle
      scanlineSpacing: 4,      // Less frequent
      enableVignette: false,   // AtmosphereSystem already has vignette
      vignetteIntensity: 0,
      vignetteRadius: 1,
    });
    console.log('MarketScene: systems initialized');

    // Create water animation
    this.createWaterAnimation();

    // Create the isometric tilemap
    this.createIsometricMap();
    console.log('MarketScene: map created');

    // Create player
    this.createPlayer();
    console.log('MarketScene: player created');

    // Create NPCs
    this.createNPCs();
    console.log('MarketScene: NPCs created');

    // Create transition zones to other locations
    this.createTransitionZones();

    // Set up camera to follow player
    this.setupCamera();

    // Set up input handlers
    this.setupInput();

    // Create ambient atmosphere
    this.createAtmosphere();

    // Set initial location for atmosphere
    this.atmosphereSystem.setLocation('ribeira_grande', false);

    // Set up system event listeners
    this.setupSystemEvents();

    // Load and register quests
    this.loadQuests();

    // Connect quest system to game state
    this.setupQuestStateAccessors();

    // Store systems in registry for other scenes
    this.registry.set('worldSystem', this.worldSystem);
    this.registry.set('factionSystem', this.factionSystem);
    this.registry.set('questSystem', this.questSystem);
    this.registry.set('saveSystem', this.saveSystem);
    this.registry.set('eventSystem', this.eventSystem);
    this.registry.set('dialogueSystem', this.dialogueSystem);
    this.registry.set('tradeSystem', this.tradeSystem);
    this.registry.set('progressionSystem', this.progressionSystem);
    this.registry.set('contractSystem', this.contractSystem);
    this.registry.set('npcMemorySystem', this.npcMemorySystem);
    this.registry.set('tradeRouteSystem', this.tradeRouteSystem);
    this.registry.set('achievementSystem', this.achievementSystem);
    this.registry.set('currentLocation', 'ribeira_grande');

    // Check if we should load a saved game (set by MainMenuScene continue)
    if (this.registry.get('loadSaveOnStart')) {
      this.registry.set('loadSaveOnStart', false); // Clear the flag
      this.time.delayedCall(100, () => {
        const saveData = this.saveSystem.load('autosave');
        if (saveData) {
          this.applySaveData(saveData);
        }
      });
    }

    console.log('MarketScene: create() complete');
  }

  private applySaveData(saveData: any): void {
    // Apply player data
    if (saveData.player) {
      if (typeof saveData.player.gold === 'number') {
        const currentGold = this.player.getGold();
        const goldDiff = saveData.player.gold - currentGold;
        if (goldDiff > 0) {
          this.player.addGold(goldDiff);
        } else if (goldDiff < 0) {
          this.player.removeGold(Math.abs(goldDiff));
        }
      }

      if (Array.isArray(saveData.player.inventory)) {
        // Clear current inventory and add saved items
        const currentInv = this.player.getInventory();
        for (const item of currentInv) {
          this.player.removeFromInventory(item.item, item.quantity);
        }
        for (const item of saveData.player.inventory) {
          this.player.addToInventory(item.item, item.quantity);
        }
      }
    }

    // Apply faction data
    if (saveData.factions) {
      this.factionSystem.loadSaveData(saveData.factions);
    }

    // Apply quest data
    if (saveData.quests) {
      this.questSystem.loadSaveData(saveData.quests);
    }

    // Apply world location
    if (saveData.world?.currentLocation && saveData.world.currentLocation !== 'ribeira_grande') {
      this.handleLocationChange(saveData.world.currentLocation);
    }

    // Apply progression data
    if (saveData.progression) {
      this.progressionSystem.loadSaveData(saveData.progression);
    }

    // Apply contract data
    if (saveData.contracts) {
      this.contractSystem.loadSaveData(saveData.contracts);
    }

    // Apply NPC memory data
    if (saveData.npcMemories) {
      this.npcMemorySystem.loadSaveData(saveData.npcMemories);
    }

    // Apply trade route data
    if (saveData.tradeRoutes) {
      this.tradeRouteSystem.loadSaveData(saveData.tradeRoutes);
    }

    // Apply achievement data
    if (saveData.achievements) {
      this.achievementSystem.loadSaveData(saveData.achievements);
    }

    // Apply player skills
    if (saveData.player?.skills) {
      this.player.setSkills(saveData.player.skills);
    }

    console.log('MarketScene: Save data applied');
  }

  private loadQuests(): void {
    try {
      // Register the rich JSON quest files with full branching narratives
      // These quests have multiple stages, choices, and faction consequences

      // The Pepper Contract - Crown faction quest with corruption choices
      this.questSystem.registerQuest(pepperContractQuest as any);

      // Breaking the Monopoly - Free Traders quest about circumventing Crown control
      this.questSystem.registerQuest(breakingMonopolyQuest as any);

      // The Forgotten Passage - Old Routes quest about ancient trade routes
      this.questSystem.registerQuest(forgottenPassageQuest as any);

      console.log('Loaded 3 rich quest files with branching narratives');
    } catch (e) {
      console.error('Error loading quests:', e);
    }
  }

  private setupQuestStateAccessors(): void {
    this.questSystem.setStateAccessors({
      getPlayerGold: () => this.player.getGold(),
      getPlayerReputation: (faction: string) => this.factionSystem.getReputation(faction),
      hasPlayerItem: (itemId: string, quantity: number = 1) => {
        const inventory = this.player.getInventory();
        const item = inventory.find(i => i.item === itemId);
        return item ? item.quantity >= quantity : false;
      },
      getFlag: (flagName: string) => this.registry.get('gameFlags')?.[flagName],
    });
  }

  /**
   * Create animated water texture from individual frames
   * Includes soft water, harbor water, and shoreline animations
   */
  private createWaterAnimation(): void {
    try {
      // Determine frame count (8 for high quality, 4 for low)
      const frameCount = this.textures.exists('tile_soft_water_4') ? 8 :
                         this.textures.exists('tile_harbor_water_4') ? 8 : 4;

      // Create soft water animation (preferred - more realistic)
      if (!this.anims.exists('anim_soft_water')) {
        const softFrames: Phaser.Types.Animations.AnimationFrame[] = [];
        for (let i = 0; i < frameCount; i++) {
          const key = `tile_soft_water_${i}`;
          if (this.textures.exists(key)) {
            softFrames.push({ key });
          }
        }
        if (softFrames.length > 0) {
          this.anims.create({
            key: 'anim_soft_water',
            frames: softFrames,
            frameRate: 3, // Slower for softer effect
            repeat: -1,
          });
          console.log('Created soft water animation with', softFrames.length, 'frames');
        }
      }

      // Create harbor water animation (fallback)
      if (!this.anims.exists('anim_harbor_water')) {
        const harborFrames: Phaser.Types.Animations.AnimationFrame[] = [];
        for (let i = 0; i < frameCount; i++) {
          const key = this.textures.exists(`tile_harbor_water_${i}`)
            ? `tile_harbor_water_${i}`
            : `tile_water_${i}`;
          if (this.textures.exists(key)) {
            harborFrames.push({ key });
          }
        }
        if (harborFrames.length > 0) {
          this.anims.create({
            key: 'anim_harbor_water',
            frames: harborFrames,
            frameRate: 4,
            repeat: -1,
          });
          console.log('Created harbor water animation with', harborFrames.length, 'frames');
        }
      }

      // Create shoreline animations for each edge direction
      const edges = ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw'];
      for (const edge of edges) {
        const animKey = `anim_shoreline_${edge}`;
        if (!this.anims.exists(animKey)) {
          const shoreFrames: Phaser.Types.Animations.AnimationFrame[] = [];
          for (let i = 0; i < frameCount; i++) {
            const key = `tile_shoreline_${edge}_${i}`;
            if (this.textures.exists(key)) {
              shoreFrames.push({ key });
            }
          }
          if (shoreFrames.length > 0) {
            this.anims.create({
              key: animKey,
              frames: shoreFrames,
              frameRate: 3,
              repeat: -1,
            });
          }
        }
      }

      console.log('Water animations created successfully');
    } catch (e) {
      console.warn('Error creating water animation:', e);
    }
  }

  private createIsometricMap(): void {
    // Map layout definition
    // 0 = ground, 1 = water, 2 = building, 3 = dock, 4 = market stall
    const mapData = this.generateMapData();

    // First pass: identify shoreline positions (water adjacent to land)
    const shorelineEdges = this.identifyShorelineEdges(mapData);

    // Render the map
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = mapData[y][x];
        const screenPos = this.isoToScreen(x, y);

        let tileKey: string;
        let isWalkable = true;
        let isDecorative = false;
        let useAnimation = false;
        let animKey = '';

        // Determine tile key based on type code
        if (tileType >= 0 && tileType <= 3) {
          // Ground - use location-appropriate tiles
          tileKey = this.selectGroundTile(x, y, mapData);
        } else if (tileType === 100) {
          // Water - use soft water with animation
          tileKey = this.textures.exists('tile_soft_water_0') ? 'tile_soft_water_0' : 'tile_harbor_water_0';
          isWalkable = false;
          useAnimation = true;
          animKey = this.anims.exists('anim_soft_water') ? 'anim_soft_water' : 'anim_harbor_water';
        } else if (tileType >= 200 && tileType <= 202) {
          // Building variants
          const variant = tileType - 200;
          tileKey = variant === 0 ? 'tile_building' : `tile_building_${variant}`;
          isWalkable = false;
        } else if (tileType === 3) {
          // Dock - use laterite for authentic Goa look
          tileKey = this.textures.exists('tile_laterite_worn') ? 'tile_laterite_worn' : 'tile_dock';
        } else if (tileType >= 400 && tileType <= 403) {
          // Market stall variants
          const variant = tileType - 400;
          tileKey = variant === 0 ? 'tile_market' : `tile_market_${variant}`;
        } else if (tileType === 800) {
          // Palm tree - render ground first, then decorative
          tileKey = this.selectGroundTile(x, y, mapData);
          isDecorative = true;
        } else if (tileType === 900) {
          // Well - render ground first, then decorative
          tileKey = this.selectGroundTile(x, y, mapData);
          isDecorative = true;
        } else if (tileType === 1000) {
          // Crates - render ground first, then decorative
          tileKey = this.selectGroundTile(x, y, mapData);
          isDecorative = true;
        } else if (tileType === 1100) {
          // Planter - render ground first, then decorative
          tileKey = this.selectGroundTile(x, y, mapData);
          isDecorative = true;
        } else {
          tileKey = this.selectGroundTile(x, y, mapData);
        }

        // Check if this is a shoreline position
        const shoreKey = `${x},${y}`;
        const shorelineEdge = shorelineEdges.get(shoreKey);

        if (shorelineEdge && tileType === 100) {
          // Render shoreline tile instead of plain water
          const shoreAnimKey = `anim_shoreline_${shorelineEdge}`;
          const shoreTexKey = `tile_shoreline_${shorelineEdge}_0`;

          if (this.anims.exists(shoreAnimKey) && this.textures.exists(shoreTexKey)) {
            const shoreSprite = this.add.sprite(screenPos.x, screenPos.y, shoreTexKey);
            shoreSprite.setOrigin(0.5, 0.5);
            shoreSprite.setDepth(y);
            shoreSprite.play(shoreAnimKey);
            shoreSprite.anims.setProgress(((x + y) % 8) / 8);
            this.waterTiles.push(shoreSprite);
            shoreSprite.setData('tileX', x);
            shoreSprite.setData('tileY', y);
            shoreSprite.setData('walkable', false);
          } else {
            // Fallback to regular water
            this.createWaterTile(screenPos, x, y, tileKey, animKey);
          }
        } else if (useAnimation && animKey) {
          // Create animated water sprite
          this.createWaterTile(screenPos, x, y, tileKey, animKey);
        } else {
          // Regular static tile - verify texture exists
          const finalKey = this.textures.exists(tileKey) ? tileKey : 'tile_ground';
          const tile = this.add.image(screenPos.x, screenPos.y, finalKey);
          tile.setOrigin(0.5, 0.5);
          tile.setDepth(y);

          // Store tile data for collision detection
          tile.setData('tileX', x);
          tile.setData('tileY', y);
          tile.setData('walkable', isWalkable);
        }

        // Render decorative elements on top
        if (isDecorative) {
          let decorKey: string;
          if (tileType === 800) decorKey = 'tile_palm';
          else if (tileType === 900) decorKey = 'tile_well';
          else if (tileType === 1000) decorKey = 'tile_crates';
          else decorKey = 'tile_planter';

          const decor = this.add.image(screenPos.x, screenPos.y - 8, decorKey);
          decor.setOrigin(0.5, 1);
          decor.setDepth(y + 50);
        }
      }
    }

    // Add building heights (roofs) for buildings
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = mapData[y][x];
        if (tileType >= 200 && tileType <= 202) {
          const screenPos = this.isoToScreen(x, y);
          // Add roof above building
          const roof = this.add.image(screenPos.x, screenPos.y - 24, 'tile_roof');
          roof.setOrigin(0.5, 0.5);
          roof.setDepth(y + 0.5);
        }
      }
    }
  }

  /**
   * Create an animated water tile
   */
  private createWaterTile(
    screenPos: { x: number; y: number },
    tileX: number,
    tileY: number,
    textureKey: string,
    animKey: string
  ): void {
    const finalTexture = this.textures.exists(textureKey) ? textureKey : 'tile_harbor_water_0';
    const waterSprite = this.add.sprite(screenPos.x, screenPos.y, finalTexture);
    waterSprite.setOrigin(0.5, 0.5);
    waterSprite.setDepth(tileY);

    if (this.anims.exists(animKey)) {
      waterSprite.play(animKey);
      // Offset animation start for visual variety - use more variation
      waterSprite.anims.setProgress(((tileX * 7 + tileY * 13) % 8) / 8);
    }

    this.waterTiles.push(waterSprite);
    waterSprite.setData('tileX', tileX);
    waterSprite.setData('tileY', tileY);
    waterSprite.setData('walkable', false);
  }

  /**
   * Identify shoreline edges where water meets land
   * Returns a map of "x,y" -> edge direction
   */
  private identifyShorelineEdges(mapData: number[][]): Map<string, string> {
    const edges = new Map<string, string>();

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (mapData[y][x] !== 100) continue; // Only check water tiles

        const hasLandNorth = y > 0 && mapData[y - 1][x] !== 100;
        const hasLandSouth = y < this.mapHeight - 1 && mapData[y + 1][x] !== 100;
        const hasLandEast = x < this.mapWidth - 1 && mapData[y][x + 1] !== 100;
        const hasLandWest = x > 0 && mapData[y][x - 1] !== 100;

        // Determine edge type - prioritize cardinal directions
        let edge = '';
        if (hasLandEast && !hasLandWest && !hasLandNorth && !hasLandSouth) {
          edge = 'east';
        } else if (hasLandWest && !hasLandEast && !hasLandNorth && !hasLandSouth) {
          edge = 'west';
        } else if (hasLandNorth && !hasLandSouth && !hasLandEast && !hasLandWest) {
          edge = 'north';
        } else if (hasLandSouth && !hasLandNorth && !hasLandEast && !hasLandWest) {
          edge = 'south';
        } else if (hasLandNorth && hasLandEast) {
          edge = 'ne';
        } else if (hasLandNorth && hasLandWest) {
          edge = 'nw';
        } else if (hasLandSouth && hasLandEast) {
          edge = 'se';
        } else if (hasLandSouth && hasLandWest) {
          edge = 'sw';
        } else if (hasLandEast) {
          edge = 'east';
        }

        if (edge) {
          edges.set(`${x},${y}`, edge);
        }
      }
    }

    return edges;
  }

  /**
   * Select appropriate ground tile based on position
   * Uses primarily cobblestone with laterite for docks and occasional calçada accents
   */
  private selectGroundTile(x: number, y: number, mapData: number[][]): string {
    // Position-based hash for consistent variation
    const hash = Math.abs((x * 73856093) ^ (y * 19349663));

    // Check if near a building (calçada only appears near prestigious buildings)
    const nearBuilding = this.isNearBuilding(x, y, mapData);

    // Dock area (x: 5-8) - use laterite (red Goan soil)
    if (x >= 5 && x <= 8) {
      const variants = ['tile_laterite_standard', 'tile_laterite_worn', 'tile_laterite_dusty', 'tile_laterite_rocky'];
      const variantIdx = hash % variants.length;
      const key = variants[variantIdx];
      return this.textures.exists(key) ? key : 'tile_cobble_worn';
    }

    // Transition zone near docks - mix of laterite and cobblestone
    if (x >= 9 && x <= 11) {
      const variants = ['tile_laterite_rocky', 'tile_laterite_dusty', 'tile_cobble_worn', 'tile_cobble_mossy'];
      const variantIdx = hash % variants.length;
      const key = variants[variantIdx];
      return this.textures.exists(key) ? key : 'tile_ground';
    }

    // Market center - primarily cobblestone, calçada only directly adjacent to buildings
    if (x >= 12 && x <= 28 && y >= 4 && y <= 26) {
      // Only use calçada if directly adjacent to a building (within 1 tile)
      if (nearBuilding && (hash % 3 === 0)) {
        const calcadaVariants = ['tile_calcada_wave', 'tile_calcada_border'];
        const key = calcadaVariants[hash % calcadaVariants.length];
        return this.textures.exists(key) ? key : 'tile_cobble_worn';
      }

      // Most of market uses weathered cobblestone
      const variants = ['tile_cobble_worn', 'tile_cobble_worn', 'tile_cobble_mossy', 'tile_cobble_new'];
      const variantIdx = hash % variants.length;
      const key = variants[variantIdx];
      return this.textures.exists(key) ? key : 'tile_ground';
    }

    // Edges of map - laterite (natural Goan soil)
    const variants = ['tile_laterite_standard', 'tile_laterite_rocky', 'tile_laterite_dusty', 'tile_cobble_worn'];
    const variantIdx = hash % variants.length;
    const key = variants[variantIdx];
    return this.textures.exists(key) ? key : 'tile_ground';
  }

  /**
   * Check if a tile position is adjacent to a building
   */
  private isNearBuilding(x: number, y: number, mapData: number[][]): boolean {
    const checkRadius = 2;
    for (let dy = -checkRadius; dy <= checkRadius; dy++) {
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        const checkY = y + dy;
        const checkX = x + dx;
        if (checkY >= 0 && checkY < this.mapHeight && checkX >= 0 && checkX < this.mapWidth) {
          const tile = mapData[checkY][checkX];
          // Building tiles are 200-202
          if (tile >= 200 && tile <= 202) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private generateMapData(): number[][] {
    // Create a map representing Ribeira Grande marketplace
    // Layout inspired by Linschoten's engravings:
    // - Water on the left (docks)
    // - Main commercial street (Rua Direita) in the center
    // - Buildings on both sides
    // - Market stalls scattered in the open areas
    // - Decorative elements (palms, wells, crates)
    
    // Tile types:
    // 0-3: Ground variants, 1: Water, 2: Building, 3: Dock
    // 4-7: Market stall variants, 8: Palm, 9: Well, 10: Crates, 11: Planter

    const map: number[][] = [];

    for (let y = 0; y < this.mapHeight; y++) {
      map[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        // Water on the left edge (harbor)
        if (x < 5) {
          map[y][x] = 100; // Water (100 series for water frames)
        }
        // Docks along the waterfront
        else if (x >= 5 && x < 8) {
          map[y][x] = 3; // Dock
        }
        // Buildings - Portuguese colonial structures along the street
        else if (
          (x >= 8 && x < 10 && y % 6 < 4) || // Left row of buildings
          (x >= 30 && x < 33 && y % 6 < 4) || // Right row of buildings
          (y < 3 && x > 10 && x < 35) || // Top row of buildings
          (y > 26 && x > 10 && x < 35) // Bottom row of buildings
        ) {
          // Use building variants
          map[y][x] = 200 + ((x + y) % 3); // 200, 201, 202 for building variants
        }
        // Market stalls in the central area with different types
        else if (x === 14 && y > 5 && y < 25 && y % 4 === 0) {
          map[y][x] = 400; // Spice stall (red)
        }
        else if (x === 18 && y > 5 && y < 25 && y % 4 === 0) {
          map[y][x] = 401; // Textile stall (blue)
        }
        else if (x === 22 && y > 5 && y < 25 && y % 4 === 0) {
          map[y][x] = 402; // Produce stall (green)
        }
        else if (x === 26 && y > 5 && y < 25 && y % 4 === 0) {
          map[y][x] = 403; // Luxury stall (gold)
        }
        // Decorative elements
        else if ((x === 12 && y === 8) || (x === 28 && y === 8) || (x === 12 && y === 20) || (x === 28 && y === 20)) {
          map[y][x] = 800; // Palm trees at corners
        }
        else if (x === 20 && y === 14) {
          map[y][x] = 900; // Central well/fountain
        }
        else if ((x === 7 && y % 8 === 4) || (x === 33 && y % 8 === 4)) {
          map[y][x] = 1000; // Cargo crates near docks and buildings
        }
        else if ((x === 10 && y === 5) || (x === 10 && y === 23)) {
          map[y][x] = 1100; // Decorative planters
        }
        // Open ground (Rua Direita - main street) with variants
        else {
          // Use ground variants based on position (seeded randomness)
          const variant = (x * 7 + y * 13) % 4;
          map[y][x] = variant; // 0, 1, 2, 3 for ground variants
        }
      }
    }

    return map;
  }

  private isoToScreen(x: number, y: number): { x: number; y: number } {
    // Convert isometric tile coordinates to screen coordinates
    const screenX = (x - y) * (this.tileWidth / 2) + this.cameras.main.width / 2;
    const screenY = (x + y) * (this.tileHeight / 2) + 100;
    return { x: screenX, y: screenY };
  }

  private screenToIso(screenX: number, screenY: number): { x: number; y: number } {
    // Convert screen coordinates to isometric tile coordinates
    const adjustedX = screenX - this.cameras.main.width / 2;
    const adjustedY = screenY - 100;
    
    const x = (adjustedX / (this.tileWidth / 2) + adjustedY / (this.tileHeight / 2)) / 2;
    const y = (adjustedY / (this.tileHeight / 2) - adjustedX / (this.tileWidth / 2)) / 2;
    
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  private createPlayer(): void {
    // Start player in the middle of the marketplace
    const startTile = { x: 18, y: 15 };
    const startPos = this.isoToScreen(startTile.x, startTile.y);
    
    this.player = new Player(this, startPos.x, startPos.y - 16);
    this.player.setTilePosition(startTile.x, startTile.y);
  }

  private createNPCs(): void {
    // Create merchants at various market stall locations
    // Based on Linschoten's descriptions of the diverse population
    // Organized by trading zones

    const npcData = [
      // Spice Zone (red stalls - around x=14)
      { type: 'npc_hindu', id: 'spice_vendor_1', x: 14, y: 8, name: 'Spice Vendor', goods: ['good_pepper', 'good_cinnamon', 'good_cloves'] },
      { type: 'npc_hindu', id: 'spice_vendor_2', x: 15, y: 12, name: 'Pepper Merchant', goods: ['good_pepper'] },
      { type: 'npc_arab', id: 'spice_middleman', x: 14, y: 16, name: 'Arab Spice Trader', goods: ['good_cloves', 'good_nutmeg'] },
      
      // Textile Zone (blue stalls - around x=18)
      { type: 'npc_portuguese', id: 'silk_merchant', x: 18, y: 8, name: 'Silk Merchant', goods: ['good_silk'] },
      { type: 'npc_hindu', id: 'cloth_vendor', x: 19, y: 12, name: 'Cloth Vendor', goods: ['good_silk', 'good_indigo'] },
      
      // Produce Zone (green stalls - around x=22)
      { type: 'npc_hindu', id: 'produce_vendor', x: 22, y: 8, name: 'Produce Seller', goods: ['good_ginger'] },
      { type: 'npc_porter', id: 'porter_1', x: 23, y: 12, name: 'Porter', goods: [] },
      
      // Luxury Zone (gold stalls - around x=26)
      { type: 'npc_portuguese', id: 'luxury_merchant', x: 26, y: 8, name: 'Portuguese Merchant', goods: ['good_porcelain', 'good_silk'] },
      { type: 'npc_arab', id: 'arab_trader', x: 27, y: 12, name: 'Arab Middleman', goods: ['good_cloves'] },
      
      // Officials and Guards (near buildings)
      { type: 'npc_official', id: 'crown_officer', x: 32, y: 10, name: 'Crown Trade Officer', goods: [] },
      { type: 'npc_soldier', id: 'guard_1', x: 9, y: 10, name: 'Portuguese Guard', goods: [] },
      { type: 'npc_soldier', id: 'guard_2', x: 9, y: 18, name: 'Portuguese Guard', goods: [] },
      
      // Dock workers
      { type: 'npc_sailor', id: 'sailor_1', x: 7, y: 8, name: 'Sailor', goods: [] },
      { type: 'npc_porter', id: 'dock_porter', x: 7, y: 14, name: 'Dock Worker', goods: [] },
      
      // Religious figures (near cathedral area)
      { type: 'npc_monk', id: 'friar_1', x: 20, y: 4, name: 'Franciscan Friar', goods: [] },
      
      // Wandering merchants
      { type: 'npc_hindu', id: 'wandering_vendor', x: 16, y: 18, name: 'Ginger Seller', goods: ['good_ginger'] },
      { type: 'npc_arab', id: 'yusuf_broker', x: 24, y: 20, name: 'Yusuf al-Rashid', goods: ['good_pepper', 'good_cinnamon'] },
    ];

    for (const data of npcData) {
      const pos = this.isoToScreen(data.x, data.y);
      const npc = new NPC(this, pos.x, pos.y - 16, data.type, data.name, data.goods);
      npc.setTilePosition(data.x, data.y);
      npc.setNpcId(data.id); // Set NPC ID for quest system
      this.npcs.push(npc);
    }
  }

  private setupCamera(): void {
    // Set up camera bounds and follow player
    const mapWidthPixels = (this.mapWidth + this.mapHeight) * (this.tileWidth / 2);
    const mapHeightPixels = (this.mapWidth + this.mapHeight) * (this.tileHeight / 2);

    // Calculate proper bounds for isometric map
    // Center of map in isometric coords at (mapWidth/2, mapHeight/2)
    const centerX = this.cameras.main.width / 2;
    const minX = centerX - mapWidthPixels;
    const maxX = centerX + mapWidthPixels;

    this.cameras.main.setBounds(
      minX,
      -100,
      maxX - minX,
      mapHeightPixels + 400
    );

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5); // Slightly zoomed for pixel art clarity while fitting viewport
  }

  private setupInput(): void {
    // Keyboard input is handled by Player class
    // Add click-to-interact for NPCs
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.checkNPCInteraction(worldPoint.x, worldPoint.y);
    });

    // Centralized E key handler for both NPCs and transitions
    this.input.keyboard?.on('keydown-E', () => {
      this.handleInteractionKey();
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.handleInteractionKey();
    });
    
    // Quick save (F5) and quick load (F9)
    this.input.keyboard?.on('keydown-F5', () => {
      this.saveSystem.autoSave();
      this.events.emit('notification', { title: 'Game Saved', message: 'Auto-save complete.' });
    });
    this.input.keyboard?.on('keydown-F9', () => {
      const saveData = this.saveSystem.load('autosave');
      if (saveData) {
        this.applySaveData(saveData);
        this.events.emit('notification', { title: 'Game Loaded', message: 'Save loaded.' });
      } else {
        this.events.emit('notification', { title: 'No Save', message: 'No save data found.' });
      }
    });
  }

  private handleInteractionKey(): void {
    // Priority 1: Check for nearby NPCs
    for (const npc of this.npcs) {
      if (npc.isNearPlayer()) {
        npc.interact(this.player);
        return;
      }
    }
    
    // Priority 2: Check for transition zones
    const nearTransition = this.registry.get('nearTransition');
    if (nearTransition) {
      this.handleLocationChange(nearTransition.targetLocation);
    }
  }

  private checkNPCInteraction(worldX: number, worldY: number): void {
    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(worldX, worldY, npc.x, npc.y);
      if (distance < 30) {
        const playerDistance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          npc.x,
          npc.y
        );
        if (playerDistance < 60) {
          npc.interact(this.player);
        }
      }
    }
  }

  private createAtmosphere(): void {
    // Add ambient visual elements
    // Time-based lighting will be handled by TimeSystem
  }

  private createTransitionZones(): void {
    // Define zones where player can travel to other locations
    this.transitionZones = [
      { x: 6, y: 5, targetLocation: 'docks', label: 'To Docks' },
      { x: 6, y: 15, targetLocation: 'docks', label: 'To Docks' },
      { x: 35, y: 10, targetLocation: 'alfandega', label: 'To Customs House' },
      { x: 35, y: 20, targetLocation: 'se_cathedral', label: 'To Cathedral' },
      { x: 18, y: 28, targetLocation: 'old_quarter', label: 'To Old Quarter' },
      { x: 25, y: 28, targetLocation: 'tavern', label: 'To Tavern' },
      { x: 12, y: 28, targetLocation: 'warehouse_district', label: 'To Warehouses' },
    ];

    // Create visual indicators for transition zones
    for (const zone of this.transitionZones) {
      const screenPos = this.isoToScreen(zone.x, zone.y);
      
      // Create a glowing marker
      const marker = this.add.graphics();
      marker.fillStyle(0xffd700, 0.4);
      marker.fillCircle(0, 0, 12);
      marker.fillStyle(0xffffff, 0.6);
      marker.fillCircle(0, 0, 6);
      marker.setPosition(screenPos.x, screenPos.y - 8);
      marker.setDepth(zone.y + 50);
      
      // Add pulsing animation
      this.tweens.add({
        targets: marker,
        alpha: { from: 0.5, to: 1 },
        scale: { from: 0.9, to: 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
      
      // Add label
      const label = this.add.text(screenPos.x, screenPos.y - 24, zone.label, {
        fontFamily: 'Georgia, serif',
        fontSize: '8px',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 2,
      });
      label.setOrigin(0.5, 0.5);
      label.setDepth(zone.y + 51);
    }
  }

  private setupSystemEvents(): void {
    // Listen for location change requests
    this.events.on('requestLocationChange', (targetLocation: string) => {
      this.handleLocationChange(targetLocation);
    });

    // Listen for ship arrival events (emitted by EventSystem to scene)
    this.events.on('ship_arrival', (data: { shipType: { name: string }; cargo: { goodId: string; quantity: number }[] }) => {
      console.log(`Ship arrived: ${data.shipType.name}`);
      // Show notification to player
      this.showLocationNotification(`${data.shipType.name} has arrived!`);
    });

    // Listen for cargo unloaded events
    this.events.on('cargo_unloaded', (data: { goods: { goodId: string; quantity: number }[] }) => {
      console.log('Cargo unloaded:', data.goods);
    });

    // Connect Quest System reputation events to Faction System
    this.events.on('reputationChange', (data: { target: string; value: number }) => {
      if (data.target && typeof data.value === 'number') {
        this.factionSystem.adjustReputation(data.target, data.value);
        console.log(`Faction reputation changed: ${data.target} by ${data.value}`);
      }
    });

    // Handle gold changes from quest effects
    this.events.on('goldChange', (amount: number) => {
      if (typeof amount === 'number') {
        if (amount > 0) {
          this.player.addGold(amount);
        } else if (amount < 0) {
          this.player.removeGold(Math.abs(amount));
        }
      }
    });

    // Handle item gained from quest effects
    this.events.on('itemGained', (data: { item: string; quantity: number }) => {
      if (data.item && data.quantity) {
        this.player.addToInventory(data.item, data.quantity);
      }
    });

    // Handle item lost from quest effects
    this.events.on('itemLost', (data: { item: string; quantity: number }) => {
      if (data.item && data.quantity) {
        this.player.removeFromInventory(data.item, data.quantity);
      }
    });

    // Handle quest state changes - notify UI
    this.events.on('questStarted', () => {
      this.events.emit('questStateChange');
    });

    this.events.on('questStageAdvanced', () => {
      this.events.emit('questStateChange');
    });

    this.events.on('questCompleted', () => {
      this.events.emit('questStateChange');
    });

    // Handle save data requests
    this.events.on('requestSaveData', () => {
      // Emit quest system save data
      this.events.emit('saveDataResponse', {
        system: 'quests',
        data: this.questSystem.getSaveData(),
      });

      // Emit faction system save data
      this.events.emit('saveDataResponse', {
        system: 'factions',
        data: this.factionSystem.getSaveData(),
      });

      // Emit player save data
      this.events.emit('saveDataResponse', {
        system: 'player',
        data: {
          gold: this.player.getGold(),
          inventory: this.player.getInventory(),
          skills: this.player.getSkills(),
          position: { x: this.player.x, y: this.player.y },
          location: this.worldSystem.getCurrentLocation?.() || 'ribeira_grande',
        },
      });

      // Emit progression system save data
      this.events.emit('saveDataResponse', {
        system: 'progression',
        data: this.progressionSystem.getSaveData(),
      });

      // Emit contract system save data
      this.events.emit('saveDataResponse', {
        system: 'contracts',
        data: this.contractSystem.getSaveData(),
      });

      // Emit NPC memory save data
      this.events.emit('saveDataResponse', {
        system: 'npcMemories',
        data: this.npcMemorySystem.getSaveData(),
      });

      // Emit trade route save data
      this.events.emit('saveDataResponse', {
        system: 'tradeRoutes',
        data: this.tradeRouteSystem.getSaveData(),
      });

      // Emit achievement save data
      this.events.emit('saveDataResponse', {
        system: 'achievements',
        data: this.achievementSystem.getSaveData(),
      });
    });
  }

  private handleLocationChange(targetLocation: string): void {
    // Guard against double transitions
    if (this.isTransitioning) {
      console.warn('Location transition already in progress');
      return;
    }

    // Check if location exists
    const location = this.worldSystem.getLocation(targetLocation);
    if (!location) {
      console.warn(`Location not found: ${targetLocation}`);
      return;
    }

    // Set transition guard
    this.isTransitioning = true;
    this.input.enabled = false; // Disable input during transition

    // Close any open dialogue before transitioning
    if (this.dialogueSystem?.isDialogueActive?.()) {
      this.dialogueSystem.endDialogue();
    }

    // Fade out effect
    this.cameras.main.fadeOut(500, 0, 0, 0);

    // Show loading indicator during transition
    const loadingText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `Travelling to ${this.getLocationDisplayName(targetLocation)}...`,
      { fontSize: '18px', color: '#c9a227', fontFamily: 'Georgia' }
    ).setOrigin(0.5).setDepth(20000).setScrollFactor(0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Change location in world system
      this.worldSystem.setCurrentLocation(targetLocation);

      // Store current location in registry for NPC schedule checks
      this.registry.set('currentLocation', targetLocation);

      // Update atmosphere for new location
      this.atmosphereSystem.setLocation(targetLocation, this.isInteriorLocation(targetLocation));

      // Regenerate map for the new location
      this.regenerateForLocation(targetLocation);

      // Fade back in
      this.cameras.main.fadeIn(500, 0, 0, 0);

      // Show location name
      this.showLocationNotification(this.getLocationDisplayName(targetLocation));

      // Clear transition guard after fade completes
      this.cameras.main.once('camerafadeincomplete', () => {
        this.isTransitioning = false;
        this.input.enabled = true;
        loadingText.destroy();
      });
    });
  }

  private getLocationDisplayName(locationId: string): string {
    const names: { [key: string]: string } = {
      'ribeira_grande': 'Ribeira Grande - The Great Waterfront',
      'docks': 'The Docks - Ship Moorings',
      'alfandega': 'Alfândega - Customs House',
      'se_cathedral': 'Sé Cathedral - Under Construction',
      'old_quarter': 'Old Quarter - Residential Streets',
      'tavern': 'Taverna do Porto - Sailors\' Rest',
      'warehouse_district': 'Warehouse District - Storage Area',
    };
    return names[locationId] || locationId;
  }
  
  private regenerateForLocation(locationId: string): void {
    // Properly clean up water tiles to prevent memory leaks
    for (const tile of this.waterTiles) {
      if (tile && tile.active) {
        tile.destroy();
      }
    }
    this.waterTiles = [];

    // Clear existing map tiles (but keep player and core systems)
    this.children.getAll().forEach(child => {
      // Keep player, NPCs (will be regenerated), and system objects
      if (child !== this.player &&
          child.name !== 'statusBar' &&
          child.type !== 'ParticleEmitter' &&
          !(child instanceof Phaser.Cameras.Scene2D.Camera)) {
        // Check if it's an NPC
        const isNPC = this.npcs.some(npc => npc === child);
        // Destroy tiles and graphics (not NPCs which we'll handle separately)
        if (!isNPC && (child.type === 'Graphics' || child.type === 'Image' || child.type === 'Sprite')) {
          child.destroy();
        }
      }
    });

    // Destroy old NPCs
    this.npcs.forEach(npc => npc.destroy());
    this.npcs = [];
    
    // Generate new map based on location
    const mapData = this.generateMapDataForLocation(locationId);
    this.createIsometricMapFromData(mapData);
    
    // Create location-specific NPCs
    this.createNPCsForLocation(locationId);
    
    // Recreate transition zones for new location
    this.transitionZones = [];
    this.createTransitionZonesForLocation(locationId);
    
    // Reset player position
    const startPos = this.isoToScreen(this.mapWidth / 2, this.mapHeight / 2);
    this.player.setPosition(startPos.x, startPos.y);
  }
  
  private generateMapDataForLocation(locationId: string): string[][] {
    const mapData: string[][] = [];
    
    for (let y = 0; y < this.mapHeight; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        row.push(this.getTileForLocation(locationId, x, y));
      }
      mapData.push(row);
    }
    
    return mapData;
  }
  
  private getTileForLocation(locationId: string, x: number, y: number): string {
    switch (locationId) {
      case 'docks':
        // Docks: lots of water, wooden platforms, laterite ground
        if (y < 10) return `W${x % 4}`;
        if (y < 12) return 'D';
        if (x < 8 || x > 32) return `W${x % 4}`;
        // Laterite ground for docks area
        return `L${(x + y) % 4}`;

      case 'alfandega':
        // Customs house: formal building, Calçada floor (wealthy area)
        if (x < 5 || x > 35 || y < 5 || y > 25) return `B${x % 3}`;
        // Prestigious Calçada Portuguesa floor inside
        return `C${(x + y) % 3}`;

      case 'se_cathedral':
        // Cathedral: under construction, stone floor with Calçada
        if (x > 15 && x < 25 && y > 10 && y < 20) return `B${x % 3}`;
        if ((x + y) % 7 === 0) return 'R';
        // Mix of Calçada and laterite
        if (x > 10 && x < 30) return `C${(x + y) % 3}`;
        return `L${(x + y) % 4}`;

      case 'old_quarter':
        // Residential: narrow streets, laterite ground (poorer area)
        if ((x % 6 < 3 && y % 5 < 3) || (x % 8 === 0)) return `B${x % 3}`;
        // Laterite soil streets
        return `L${(x + y) % 4}`;

      case 'tavern':
        // Tavern interior: wooden floor, dim
        if (x < 5 || x > 35 || y < 5 || y > 25) return `B${x % 3}`;
        return 'D';

      case 'warehouse_district':
        // Warehouses: crates, dock tiles, laterite
        if (y < 5 || y > 25) return `B${x % 3}`;
        if ((x + y) % 5 === 0) return 'D';
        return `L${(x + y) % 4}`;

      default: // ribeira_grande - default market
        return this.getDefaultMarketTile(x, y);
    }
  }
  
  private getDefaultMarketTile(x: number, y: number): string {
    // Deep water (far left)
    if (x < 4) return `W${(x + y) % 4}`;

    // Shoreline transition zone - where water meets land
    if (x === 4) return `Sw`; // West shoreline edge
    if (x === 5) return `Ssw`; // Southwest transition

    // Dock wooden platforms
    if (x >= 6 && x < 8) return 'D';

    // Buildings along right side
    if (x > 32) return `B${x % 3}`;
    // Roofs above buildings
    if (x > 34 && y % 4 < 2) return 'R';

    // Market stall zones - fancy Calçada floor (wealthy trading area)
    if (x >= 14 && x <= 16 && y >= 6 && y <= 18) return `M${0}`;
    if (x >= 18 && x <= 20 && y >= 6 && y <= 18) return `M${1}`;
    if (x >= 22 && x <= 24 && y >= 6 && y <= 18) return `M${2}`;
    if (x >= 26 && x <= 28 && y >= 6 && y <= 18) return `M${3}`;

    // Main market area with Calçada Portuguesa (prestigious cobblestone)
    if (x >= 12 && x <= 30 && y >= 4 && y <= 20) {
      return `C${(x + y) % 3}`;
    }

    // Transition from Calçada to Laterite around market edges
    if (x >= 10 && x <= 32 && y >= 2 && y <= 22) {
      // Mix of Calçada border and laterite
      if ((x + y) % 4 === 0) return `C2`; // Border Calçada
      return `L${(x + y) % 4}`;
    }

    // Default red laterite soil (authentic Goan ground)
    return `L${(x + y) % 4}`;
  }
  
  private createIsometricMapFromData(mapData: string[][]): void {
    // Render the map data as tiles
    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        const tileCode = mapData[y][x];
        const pos = this.isoToScreen(x, y);
        this.createTileFromCode(tileCode, pos.x, pos.y, x, y);
      }
    }
  }
  
  private createTileFromCode(code: string, screenX: number, screenY: number, tileX: number, tileY: number): void {
    const type = code.charAt(0);
    const variant = parseInt(code.charAt(1)) || 0;

    let textureKey = 'tile_ground_0';
    let isAnimated = false;
    let animKey = '';

    switch (type) {
      // Original tile types
      case 'G': textureKey = `tile_ground_${variant}`; break;
      case 'B': textureKey = `tile_building_${variant}`; break;
      case 'D': textureKey = 'tile_dock'; break;
      case 'R': textureKey = 'tile_roof'; break;
      case 'M': textureKey = `tile_market_${variant}`; break;

      // Water - use soft water if available
      case 'W':
        if (this.anims.exists('anim_soft_water')) {
          isAnimated = true;
          textureKey = 'tile_soft_water_0';
          animKey = 'anim_soft_water';
        } else if (this.anims.exists('anim_harbor_water')) {
          isAnimated = true;
          textureKey = 'tile_harbor_water_0';
          animKey = 'anim_harbor_water';
        } else {
          textureKey = `tile_water_${variant}`;
        }
        break;

      // New Goa-specific tiles
      case 'L':
        // Laterite - red Goan soil
        const lateriteVariants = ['standard', 'rocky', 'dusty', 'worn'];
        const lateriteVar = lateriteVariants[variant % lateriteVariants.length];
        textureKey = `tile_laterite_${lateriteVar}`;
        // Fallback to dirt if laterite not available
        if (!this.textures.exists(textureKey)) {
          textureKey = `tile_dirt_packed`;
        }
        break;

      case 'C':
        // Calçada Portuguesa - Portuguese cobblestone
        const calcadaVariants = ['wave', 'checkerboard', 'border'];
        const calcadaVar = calcadaVariants[variant % calcadaVariants.length];
        textureKey = `tile_calcada_${calcadaVar}`;
        // Fallback to cobblestone if calcada not available
        if (!this.textures.exists(textureKey)) {
          textureKey = 'tile_cobble_new';
        }
        break;

      case 'S':
        // Shoreline tiles
        const edgeCode = code.substring(1).toLowerCase();
        const shorelineEdge = this.parseShorelineEdge(edgeCode);
        if (this.anims.exists(`anim_shoreline_${shorelineEdge}`)) {
          isAnimated = true;
          textureKey = `tile_shoreline_${shorelineEdge}_0`;
          animKey = `anim_shoreline_${shorelineEdge}`;
        } else {
          // Fallback: draw laterite with water edge
          textureKey = this.textures.exists('tile_laterite_water_edge')
            ? 'tile_laterite_water_edge'
            : 'tile_cobble_water_edge';
        }
        break;

      default:
        textureKey = 'tile_ground_0';
    }

    // Create the tile - animated or static
    if (isAnimated && this.anims.exists(animKey)) {
      const sprite = this.add.sprite(screenX, screenY, textureKey);
      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(tileY);
      sprite.play(animKey);
      // Offset animation start for visual variety
      sprite.anims.setProgress(((tileX + tileY) % 4) / 4);
      this.waterTiles.push(sprite);
    } else {
      // Try to create the tile, with fallback
      if (!this.textures.exists(textureKey)) {
        console.warn(`Texture not found: ${textureKey}, using fallback`);
        textureKey = 'tile_ground_0';
      }
      const tile = this.add.image(screenX, screenY, textureKey);
      tile.setOrigin(0.5, 0.5);
      tile.setDepth(tileY);
    }
  }

  /**
   * Parse shoreline edge code to edge type
   */
  private parseShorelineEdge(code: string): string {
    const edgeMap: { [key: string]: string } = {
      'n': 'north',
      's': 'south',
      'e': 'east',
      'w': 'west',
      'ne': 'ne',
      'nw': 'nw',
      'se': 'se',
      'sw': 'sw',
    };
    return edgeMap[code] || 'west';
  }
  
  private createNPCsForLocation(locationId: string): void {
    const npcData = this.getNPCDataForLocation(locationId);
    
    for (const data of npcData) {
      const pos = this.isoToScreen(data.x, data.y);
      const npc = new NPC(this, pos.x, pos.y - 16, data.type, data.name, data.goods);
      npc.setTilePosition(data.x, data.y);
      npc.setNpcId(data.id);
      this.npcs.push(npc);
    }
  }
  
  private getNPCDataForLocation(locationId: string): Array<{type: string; id: string; x: number; y: number; name: string; goods: string[]}> {
    switch (locationId) {
      case 'docks':
        return [
          { type: 'npc_sailor', id: 'dock_sailor_1', x: 15, y: 14, name: 'Sailor', goods: [] },
          { type: 'npc_sailor', id: 'dock_sailor_2', x: 20, y: 16, name: 'Bosun', goods: [] },
          { type: 'npc_porter', id: 'dock_porter_1', x: 18, y: 12, name: 'Dock Porter', goods: [] },
          { type: 'npc_porter', id: 'dock_porter_2', x: 25, y: 14, name: 'Cargo Handler', goods: [] },
          { type: 'npc_soldier', id: 'dock_guard', x: 12, y: 14, name: 'Harbor Guard', goods: [] },
        ];
        
      case 'alfandega':
        return [
          { type: 'npc_official', id: 'customs_officer', x: 20, y: 15, name: 'Customs Official', goods: [] },
          { type: 'npc_official', id: 'tax_collector', x: 18, y: 18, name: 'Tax Collector', goods: [] },
          { type: 'npc_soldier', id: 'customs_guard', x: 15, y: 12, name: 'Customs Guard', goods: [] },
          { type: 'npc_portuguese', id: 'merchant_waiting', x: 22, y: 18, name: 'Waiting Merchant', goods: ['good_silk', 'good_pepper'] },
        ];
        
      case 'se_cathedral':
        return [
          { type: 'npc_monk', id: 'fr_tomas', x: 20, y: 15, name: 'Brother Tomás', goods: [] },
          { type: 'npc_monk', id: 'fr_miguel', x: 18, y: 18, name: 'Brother Miguel', goods: [] },
          { type: 'npc_porter', id: 'worker_1', x: 22, y: 14, name: 'Stone Mason', goods: [] },
        ];
        
      case 'old_quarter':
        return [
          { type: 'npc_hindu', id: 'resident_1', x: 18, y: 15, name: 'Local Resident', goods: [] },
          { type: 'npc_hindu', id: 'home_vendor', x: 22, y: 18, name: 'Home Vendor', goods: ['good_ginger'] },
          { type: 'npc_arab', id: 'quarter_trader', x: 20, y: 12, name: 'Street Trader', goods: ['good_cloves', 'good_nutmeg'] },
        ];
        
      case 'tavern':
        return [
          { type: 'npc_sailor', id: 'drunk_sailor', x: 18, y: 15, name: 'Tipsy Sailor', goods: [] },
          { type: 'npc_portuguese', id: 'tavern_patron', x: 22, y: 16, name: 'Merchant', goods: [] },
          { type: 'npc_arab', id: 'tavern_trader', x: 20, y: 18, name: 'Traveler', goods: ['good_silk'] },
        ];
        
      case 'warehouse_district':
        return [
          { type: 'npc_porter', id: 'warehouse_worker_1', x: 18, y: 15, name: 'Warehouse Worker', goods: [] },
          { type: 'npc_porter', id: 'warehouse_worker_2', x: 22, y: 18, name: 'Inventory Clerk', goods: [] },
          { type: 'npc_official', id: 'warehouse_master', x: 20, y: 12, name: 'Warehouse Master', goods: [] },
          { type: 'npc_portuguese', id: 'bulk_merchant', x: 25, y: 16, name: 'Bulk Merchant', goods: ['good_pepper', 'good_cinnamon', 'good_silk'] },
        ];
        
      default: // ribeira_grande
        return [
          { type: 'npc_hindu', id: 'spice_vendor_1', x: 14, y: 8, name: 'Spice Vendor', goods: ['good_pepper', 'good_cinnamon', 'good_cloves'] },
          { type: 'npc_hindu', id: 'spice_vendor_2', x: 15, y: 12, name: 'Pepper Merchant', goods: ['good_pepper'] },
          { type: 'npc_arab', id: 'spice_middleman', x: 14, y: 16, name: 'Arab Spice Trader', goods: ['good_cloves', 'good_nutmeg'] },
          { type: 'npc_portuguese', id: 'silk_merchant', x: 18, y: 8, name: 'Silk Merchant', goods: ['good_silk'] },
          { type: 'npc_hindu', id: 'cloth_vendor', x: 19, y: 12, name: 'Cloth Vendor', goods: ['good_silk', 'good_indigo'] },
          { type: 'npc_hindu', id: 'produce_vendor', x: 22, y: 8, name: 'Produce Seller', goods: ['good_ginger'] },
          { type: 'npc_portuguese', id: 'luxury_merchant', x: 26, y: 8, name: 'Portuguese Merchant', goods: ['good_porcelain', 'good_silk'] },
          { type: 'npc_arab', id: 'arab_trader', x: 27, y: 12, name: 'Yusuf al-Rashid', goods: ['good_cloves'] },
          { type: 'npc_official', id: 'crown_officer', x: 32, y: 10, name: 'Crown Trade Officer', goods: [] },
          { type: 'npc_soldier', id: 'guard_1', x: 9, y: 10, name: 'Portuguese Guard', goods: [] },
          { type: 'npc_soldier', id: 'guard_2', x: 9, y: 18, name: 'Portuguese Guard', goods: [] },
          { type: 'npc_sailor', id: 'sailor_1', x: 7, y: 8, name: 'Sailor', goods: [] },
          { type: 'npc_porter', id: 'dock_porter', x: 7, y: 14, name: 'Dock Worker', goods: [] },
          { type: 'npc_hindu', id: 'ginger_seller', x: 23, y: 16, name: 'Ginger Seller', goods: ['good_ginger'] },
        ];
    }
  }
  
  private createTransitionZonesForLocation(locationId: string): void {
    const zones = this.getTransitionZonesForLocation(locationId);
    this.transitionZones = zones;
    
    // Create visual indicators
    for (const zone of zones) {
      const screenPos = this.isoToScreen(zone.x, zone.y);
      const marker = this.add.graphics();
      marker.fillStyle(0xffd700, 0.4);
      marker.fillCircle(0, 0, 12);
      marker.fillStyle(0xffffff, 0.6);
      marker.fillCircle(0, 0, 6);
      marker.setPosition(screenPos.x, screenPos.y - 8);
      marker.setDepth(zone.y + 50);
      
      this.tweens.add({
        targets: marker,
        alpha: { from: 0.5, to: 1 },
        scale: { from: 0.9, to: 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }
  
  private getTransitionZonesForLocation(locationId: string): Array<{x: number; y: number; targetLocation: string; label: string}> {
    switch (locationId) {
      case 'docks':
        return [
          { x: 20, y: 28, targetLocation: 'ribeira_grande', label: 'To Market' },
          { x: 30, y: 20, targetLocation: 'warehouse_district', label: 'To Warehouses' },
        ];
      case 'alfandega':
        return [
          { x: 10, y: 15, targetLocation: 'ribeira_grande', label: 'To Market' },
        ];
      case 'se_cathedral':
        return [
          { x: 10, y: 15, targetLocation: 'ribeira_grande', label: 'To Market' },
        ];
      case 'old_quarter':
        return [
          { x: 10, y: 15, targetLocation: 'ribeira_grande', label: 'To Market' },
          { x: 25, y: 25, targetLocation: 'tavern', label: 'To Tavern' },
        ];
      case 'tavern':
        return [
          { x: 10, y: 15, targetLocation: 'old_quarter', label: 'To Old Quarter' },
          { x: 20, y: 28, targetLocation: 'ribeira_grande', label: 'To Market' },
        ];
      case 'warehouse_district':
        return [
          { x: 10, y: 15, targetLocation: 'docks', label: 'To Docks' },
          { x: 25, y: 25, targetLocation: 'ribeira_grande', label: 'To Market' },
        ];
      default: // ribeira_grande
        return [
          { x: 6, y: 5, targetLocation: 'docks', label: 'To Docks' },
          { x: 6, y: 15, targetLocation: 'docks', label: 'To Docks' },
          { x: 35, y: 10, targetLocation: 'alfandega', label: 'To Customs House' },
          { x: 35, y: 20, targetLocation: 'se_cathedral', label: 'To Cathedral' },
          { x: 18, y: 28, targetLocation: 'old_quarter', label: 'To Old Quarter' },
          { x: 25, y: 28, targetLocation: 'tavern', label: 'To Tavern' },
          { x: 12, y: 28, targetLocation: 'warehouse_district', label: 'To Warehouses' },
        ];
    }
  }

  private isInteriorLocation(locationId: string): boolean {
    const interiors = ['alfandega', 'se_cathedral', 'tavern'];
    return interiors.includes(locationId);
  }

  private showLocationNotification(locationId: string): void {
    const locationNames: { [key: string]: string } = {
      'ribeira_grande': 'Ribeira Grande - The Great Market',
      'docks': 'The Docks - Goa Harbor',
      'alfandega': 'Alfandega - The Customs House',
      'se_cathedral': 'Sé Cathedral',
      'tavern': 'A Nau Tavern',
      'old_quarter': 'The Old Quarter',
      'warehouse_district': 'Warehouse District',
    };
    
    const name = locationNames[locationId] || locationId;
    
    // Create centered location title
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 3,
      name,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5, 0.5);
    text.setScrollFactor(0);
    text.setDepth(1000);
    
    // Fade out after 2 seconds
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => text.destroy(),
    });
  }

  private checkTransitionZones(): void {
    // Use screen-space distance for more reliable detection
    const playerX = this.player.x;
    const playerY = this.player.y;
    const detectionRadius = 40; // pixels
    
    for (const zone of this.transitionZones) {
      const zoneScreenPos = this.isoToScreen(zone.x, zone.y);
      const distance = Phaser.Math.Distance.Between(
        playerX, playerY,
        zoneScreenPos.x, zoneScreenPos.y - 8 // Offset to match marker position
      );
      
      if (distance <= detectionRadius) {
        // Player is near a transition zone
        if (!this.registry.get('nearTransition')) {
          this.registry.set('nearTransition', zone);
          this.events.emit('showTransitionPrompt', zone.label);
        }
        return;
      }
    }
    
    // Not near any zone
    if (this.registry.get('nearTransition')) {
      this.registry.set('nearTransition', null);
      this.events.emit('hideTransitionPrompt');
    }
  }

  update(time: number, delta: number): void {
    // Update player
    this.player.update(time, delta);

    // Update NPCs
    for (const npc of this.npcs) {
      npc.update(time, delta);
    }

    // Update core systems
    this.timeSystem.update(delta);
    this.weatherSystem.update(delta);
    this.atmosphereSystem.update(delta);
    this.eventSystem.update(delta);
    this.tradeSystem.update(time);
    this.particleSystem.update(delta);

    // Sync particle system with time
    this.particleSystem.setHour(this.timeSystem.getTimeData().hour);

    // Render dynamic shadows for entities
    const entities = [
      { x: this.player.x, y: this.player.y, width: 14, height: 6 },
      ...this.npcs.map(npc => ({ x: npc.x, y: npc.y, width: 12, height: 5 })),
    ];
    this.atmosphereSystem.renderEntityShadows(entities);

    // Check if player is near a transition zone
    this.checkTransitionZones();

    // Update depth sorting based on Y position
    this.updateDepthSorting();

    // Emit time update event for UI (include weather info)
    this.events.emit('timeUpdate', {
      ...this.timeSystem.getTimeData(),
      weather: this.weatherSystem.getCurrentWeather(),
      weatherDescription: this.weatherSystem.getWeatherDescription(),
      season: this.weatherSystem.getCurrentSeason(),
    });
  }

  private updateDepthSorting(): void {
    // Sort player and NPCs by their Y position for proper overlap
    const entities = [this.player, ...this.npcs];
    for (const entity of entities) {
      const isoPos = this.screenToIso(entity.x, entity.y + 16);
      entity.setDepth(isoPos.x + isoPos.y + 100);
    }
  }

  public getTimeSystem(): TimeSystem {
    return this.timeSystem;
  }

  public getWeatherSystem(): WeatherSystem {
    return this.weatherSystem;
  }

  public getAtmosphereSystem(): AtmosphereSystem {
    return this.atmosphereSystem;
  }

  public getPlayer(): Player {
    return this.player;
  }

  /**
   * Clean up resources when scene is shut down
   */
  shutdown(): void {
    // Clean up particle system
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }

    // Clean up post-processing
    if (this.postProcessing) {
      this.postProcessing.destroy();
    }

    // Clean up water tiles
    for (const tile of this.waterTiles) {
      if (tile && tile.active) {
        tile.destroy();
      }
    }
    this.waterTiles = [];

    // Clean up NPCs
    for (const npc of this.npcs) {
      if (npc && npc.active) {
        npc.destroy();
      }
    }
    this.npcs = [];

    // Remove keyboard event listeners
    this.input.keyboard?.off('keydown-E');
    this.input.keyboard?.off('keydown-ENTER');
    this.input.keyboard?.off('keydown-F5');
    this.input.keyboard?.off('keydown-F9');

    // Remove input event listeners
    this.input.off('pointerdown');

    // Unsubscribe from events to prevent memory leaks
    this.events.off('requestLocationChange');
    this.events.off('ship_arrival');
    this.events.off('cargo_unloaded');
    this.events.off('reputationChange');
    this.events.off('goldChange');
    this.events.off('itemGained');
    this.events.off('itemLost');
    this.events.off('questStarted');
    this.events.off('questStageAdvanced');
    this.events.off('questCompleted');
    this.events.off('requestSaveData');

    // Destroy all systems
    if (this.timeSystem?.destroy) this.timeSystem.destroy();
    if (this.weatherSystem?.destroy) this.weatherSystem.destroy();
    if (this.atmosphereSystem?.destroy) this.atmosphereSystem.destroy();
    if (this.worldSystem?.destroy) this.worldSystem.destroy();
    if (this.factionSystem?.destroy) this.factionSystem.destroy();
    if (this.questSystem?.destroy) this.questSystem.destroy();
    if (this.saveSystem?.destroy) this.saveSystem.destroy();
    if (this.eventSystem?.destroy) this.eventSystem.destroy();
    if (this.dialogueSystem?.destroy) this.dialogueSystem.destroy();
    if (this.tradeSystem?.destroy) this.tradeSystem.destroy();
    if (this.progressionSystem?.destroy) this.progressionSystem.destroy();
    if (this.contractSystem?.destroy) this.contractSystem.destroy();
    if (this.npcMemorySystem?.destroy) this.npcMemorySystem.destroy();
    if (this.tradeRouteSystem?.destroy) this.tradeRouteSystem.destroy();
    if (this.achievementSystem?.destroy) this.achievementSystem.destroy();

    // Destroy player
    if (this.player?.destroy) this.player.destroy();

    // Clear registry references
    this.registry.remove('worldSystem');
    this.registry.remove('factionSystem');
    this.registry.remove('questSystem');
    this.registry.remove('saveSystem');
    this.registry.remove('eventSystem');
    this.registry.remove('dialogueSystem');
    this.registry.remove('tradeSystem');
    this.registry.remove('progressionSystem');
    this.registry.remove('contractSystem');
    this.registry.remove('npcMemorySystem');
    this.registry.remove('tradeRouteSystem');
    this.registry.remove('achievementSystem');
    this.registry.remove('nearTransition');
    this.registry.remove('currentLocation');
  }
}
