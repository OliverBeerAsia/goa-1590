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
  private mapWidth = 40;
  private mapHeight = 30;
  private tileWidth = 64;  // 2x scale for Ultima 8 style
  private tileHeight = 32;
  private transitionZones: { x: number; y: number; targetLocation: string; label: string }[] = [];
  private waterTiles: Phaser.GameObjects.Sprite[] = [];

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
   */
  private createWaterAnimation(): void {
    try {
      // Check if we have the water frame textures
      const hasWaterFrames = this.textures.exists('tile_harbor_water_0') ||
                             this.textures.exists('tile_water');

      if (!hasWaterFrames) {
        console.warn('Water frame textures not found, skipping water animation');
        return;
      }

      // Create water animation if it doesn't exist
      if (!this.anims.exists('anim_harbor_water')) {
        // Try to use the harbor water frames first
        const frames: Phaser.Types.Animations.AnimationFrame[] = [];

        for (let i = 0; i < 4; i++) {
          const key = this.textures.exists(`tile_harbor_water_${i}`)
            ? `tile_harbor_water_${i}`
            : `tile_water_${i}`;

          if (this.textures.exists(key)) {
            frames.push({ key });
          }
        }

        if (frames.length > 0) {
          this.anims.create({
            key: 'anim_harbor_water',
            frames,
            frameRate: 4,
            repeat: -1,
          });
          console.log('Created water animation with', frames.length, 'frames');
        }
      }
    } catch (e) {
      console.warn('Error creating water animation:', e);
    }
  }

  private createIsometricMap(): void {
    // Map layout definition
    // 0 = ground, 1 = water, 2 = building, 3 = dock, 4 = market stall
    const mapData = this.generateMapData();

    // Render the map
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = mapData[y][x];
        const screenPos = this.isoToScreen(x, y);
        
        let tileKey: string;
        let isWalkable = true;
        let isDecorative = false;
        
        // Determine tile key based on type code
        if (tileType >= 0 && tileType <= 3) {
          // Ground variants
          tileKey = tileType === 0 ? 'tile_ground' : `tile_ground_${tileType}`;
        } else if (tileType === 100) {
          // Water - will use animated sprite instead of static image
          tileKey = 'tile_water';
          isWalkable = false;
        } else if (tileType >= 200 && tileType <= 202) {
          // Building variants
          const variant = tileType - 200;
          tileKey = variant === 0 ? 'tile_building' : `tile_building_${variant}`;
          isWalkable = false;
        } else if (tileType === 3) {
          tileKey = 'tile_dock';
        } else if (tileType >= 400 && tileType <= 403) {
          // Market stall variants
          const variant = tileType - 400;
          tileKey = variant === 0 ? 'tile_market' : `tile_market_${variant}`;
        } else if (tileType === 800) {
          // Palm tree - render ground first, then decorative
          tileKey = 'tile_ground';
          isDecorative = true;
        } else if (tileType === 900) {
          // Well - render ground first, then decorative
          tileKey = 'tile_ground';
          isDecorative = true;
        } else if (tileType === 1000) {
          // Crates - render ground first, then decorative
          tileKey = 'tile_ground';
          isDecorative = true;
        } else if (tileType === 1100) {
          // Planter - render ground first, then decorative
          tileKey = 'tile_ground';
          isDecorative = true;
        } else {
          tileKey = 'tile_ground';
        }

        // Render base tile - use sprite for water tiles to enable animation
        if (tileType === 100 && this.anims.exists('anim_harbor_water')) {
          // Create animated water sprite
          const waterSprite = this.add.sprite(screenPos.x, screenPos.y, 'tile_water');
          waterSprite.setOrigin(0.5, 0.5);
          waterSprite.setDepth(y);
          waterSprite.play('anim_harbor_water');
          // Offset animation start for visual variety
          waterSprite.anims.setProgress(((x + y) % 4) / 4);
          this.waterTiles.push(waterSprite);

          // Store tile data
          waterSprite.setData('tileX', x);
          waterSprite.setData('tileY', y);
          waterSprite.setData('walkable', false);
        } else {
          // Regular static tile
          const tile = this.add.image(screenPos.x, screenPos.y, tileKey);
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

    this.cameras.main.setBounds(
      -mapWidthPixels / 2,
      0,
      mapWidthPixels * 1.5,
      mapHeightPixels + 200
    );

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2); // Zoom in for pixel art clarity
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
          position: { x: this.player.x, y: this.player.y },
          location: this.worldSystem.getCurrentLocation?.() || 'ribeira_grande',
        },
      });
    });
  }

  private handleLocationChange(targetLocation: string): void {
    // Check if location exists
    const location = this.worldSystem.getLocation(targetLocation);
    if (!location) {
      console.warn(`Location not found: ${targetLocation}`);
      return;
    }

    // Fade out effect
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Change location in world system
      this.worldSystem.setCurrentLocation(targetLocation);
      
      // Update atmosphere for new location
      this.atmosphereSystem.setLocation(targetLocation, this.isInteriorLocation(targetLocation));
      
      // Regenerate map for the new location
      this.regenerateForLocation(targetLocation);
      
      // Fade back in
      this.cameras.main.fadeIn(500, 0, 0, 0);
      
      // Show location name
      this.showLocationNotification(this.getLocationDisplayName(targetLocation));
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
    // Clear water tiles array (they'll be destroyed with other children)
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
        // Docks: lots of water, wooden platforms
        if (y < 10) return `W${x % 4}`;
        if (y < 12) return 'D';
        if (x < 8 || x > 32) return `W${x % 4}`;
        return `G${(x + y) % 4}`;
        
      case 'alfandega':
        // Customs house: formal building, stone floor
        if (x < 5 || x > 35 || y < 5 || y > 25) return `B${x % 3}`;
        return `G${(x + y) % 4}`;
        
      case 'se_cathedral':
        // Cathedral: under construction, scaffolding, stone
        if (x > 15 && x < 25 && y > 10 && y < 20) return `B${x % 3}`;
        if ((x + y) % 7 === 0) return 'R';
        return `G${(x + y) % 4}`;
        
      case 'old_quarter':
        // Residential: narrow streets, many buildings
        if ((x % 6 < 3 && y % 5 < 3) || (x % 8 === 0)) return `B${x % 3}`;
        return `G${(x + y) % 4}`;
        
      case 'tavern':
        // Tavern interior: wooden floor, dim
        if (x < 5 || x > 35 || y < 5 || y > 25) return `B${x % 3}`;
        return 'D';
        
      case 'warehouse_district':
        // Warehouses: lots of crates, dock tiles
        if (y < 5 || y > 25) return `B${x % 3}`;
        if ((x + y) % 5 === 0) return 'D';
        return `G${(x + y) % 4}`;
        
      default: // ribeira_grande - default market
        return this.getDefaultMarketTile(x, y);
    }
  }
  
  private getDefaultMarketTile(x: number, y: number): string {
    // Water along left edge
    if (x < 6) return `W${(x + y) % 4}`;
    // Dock area
    if (x >= 6 && x < 8) return 'D';
    // Buildings along right side
    if (x > 32) return `B${x % 3}`;
    // Roofs above buildings
    if (x > 34 && y % 4 < 2) return 'R';
    // Market stall zones
    if (x >= 14 && x <= 16 && y >= 6 && y <= 18) return `M${0}`;
    if (x >= 18 && x <= 20 && y >= 6 && y <= 18) return `M${1}`;
    if (x >= 22 && x <= 24 && y >= 6 && y <= 18) return `M${2}`;
    if (x >= 26 && x <= 28 && y >= 6 && y <= 18) return `M${3}`;
    // Default ground
    return `G${(x + y) % 4}`;
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

    switch (type) {
      case 'G': textureKey = `tile_ground_${variant}`; break;
      case 'W': textureKey = `tile_water_${variant}`; break;
      case 'B': textureKey = `tile_building_${variant}`; break;
      case 'D': textureKey = 'tile_dock'; break;
      case 'R': textureKey = 'tile_roof'; break;
      case 'M': textureKey = `tile_market_${variant}`; break;
      default: textureKey = 'tile_ground_0';
    }

    // Use animated sprite for water tiles
    if (type === 'W' && this.anims.exists('anim_harbor_water')) {
      const waterSprite = this.add.sprite(screenX, screenY, 'tile_water');
      waterSprite.setOrigin(0.5, 0.5);
      waterSprite.setDepth(tileY);
      waterSprite.play('anim_harbor_water');
      // Offset animation start for visual variety
      waterSprite.anims.setProgress(((tileX + tileY) % 4) / 4);
      this.waterTiles.push(waterSprite);
    } else {
      const tile = this.add.image(screenX, screenY, textureKey);
      tile.setOrigin(0.5, 0.5);
      tile.setDepth(tileY);
    }
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
}
