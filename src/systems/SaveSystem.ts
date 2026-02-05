import Phaser from 'phaser';

/**
 * SaveSystem - Manages game saving and loading for the 16th century Goa trading game
 *
 * Provides persistent storage using localStorage with support for manual save slots
 * and auto-save functionality. Handles save data validation, version migration,
 * and error recovery for corrupted or incompatible saves.
 */

// ============================================================================
// Interfaces
// ============================================================================

/** Player position data within the game world */
export interface PlayerPosition {
  location: string;
  x: number;
  y: number;
}

/** Player inventory item */
export interface InventoryItem {
  item: string;
  quantity: number;
}

/** Player state to be saved */
export interface PlayerSaveData {
  position: PlayerPosition;
  inventory: InventoryItem[];
  gold: number;
}

/** World time state */
export interface WorldTimeData {
  hour: number;
  day: number;
}

/** World state to be saved */
export interface WorldSaveData {
  currentTime: WorldTimeData;
  currentLocation: string;
}

/** Faction reputation data */
export interface FactionSaveData {
  reputation: Record<string, number>;
}

/** Quest tracking data */
export interface QuestSaveData {
  active: ActiveQuestSaveData[];
  completed: string[];
  failed: string[];
}

/** Individual active quest state */
export interface ActiveQuestSaveData {
  questId: string;
  currentStageIndex: number;
  currentStageId: string;
  progress: number;
  startTime: number;
}

/** Weather state data */
export interface WeatherSaveData {
  current: string;
  season: string;
}

/**
 * Complete save data structure
 * Contains all game state needed to restore a saved game
 */
export interface SaveData {
  /** Save format version for migration compatibility */
  version: string;
  /** Unix timestamp when save was created */
  timestamp: number;
  /** Player character state */
  player: PlayerSaveData;
  /** World state including time and location */
  world: WorldSaveData;
  /** Faction reputation standings */
  factions: FactionSaveData;
  /** Quest progress and completion status */
  quests: QuestSaveData;
  /** Story progression flags */
  flags: Record<string, boolean | string | number>;
  /** Current weather conditions */
  weather: WeatherSaveData;
}

/** Save slot metadata for UI display */
export interface SaveSlotInfo {
  slotId: string;
  timestamp: number;
  playerGold: number;
  dayCount: number;
  location?: string;
  exists: boolean;
}

/** Event data for save-related events */
export interface SaveEventData {
  slotId: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

/** Response data from systems when gathering save data */
export interface SystemSaveDataResponse {
  system: string;
  data: unknown;
}

// ============================================================================
// Constants
// ============================================================================

/** Current save data format version */
const SAVE_VERSION = '1.0.0';

/** localStorage key prefix for saves */
const STORAGE_PREFIX = 'goa_trade_';

/** Available manual save slots */
const MANUAL_SAVE_SLOTS = ['save_1', 'save_2', 'save_3'];

/** Auto-save slot identifier */
const AUTOSAVE_SLOT = 'autosave';

/** All valid save slot identifiers */
const ALL_SLOTS = [...MANUAL_SAVE_SLOTS, AUTOSAVE_SLOT];

// ============================================================================
// SaveSystem Class
// ============================================================================

/**
 * SaveSystem manages game persistence using localStorage
 *
 * Features:
 * - 3 manual save slots + 1 auto-save slot
 * - Version-aware save format with migration support
 * - Event-driven data gathering from other systems
 * - Robust error handling for storage issues
 *
 * @example
 * ```typescript
 * const saveSystem = new SaveSystem(scene);
 *
 * // Save to slot 1
 * saveSystem.save('save_1');
 *
 * // Load from slot 1
 * const data = saveSystem.load('save_1');
 *
 * // Get all save slots for UI
 * const slots = saveSystem.getSaveSlots();
 * ```
 */
export class SaveSystem {
  private scene: Phaser.Scene;
  private isStorageAvailable: boolean = false;

  // Cached save data from systems for current save operation
  private pendingSaveData: Partial<SaveData> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.isStorageAvailable = this.checkStorageAvailability();
    this.setupEventListeners();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Check if localStorage is available and functional
   * @returns True if localStorage can be used for saving
   */
  private checkStorageAvailability(): boolean {
    try {
      const testKey = `${STORAGE_PREFIX}test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('SaveSystem: localStorage is not available', e);
      return false;
    }
  }

  /**
   * Set up event listeners for save system integration
   */
  private setupEventListeners(): void {
    // Listen for location changes to trigger auto-save
    this.scene.events.on('locationChange', () => {
      this.autoSave();
    });

    // Listen for responses from other systems when gathering save data
    this.scene.events.on('saveDataResponse', (response: SystemSaveDataResponse) => {
      this.handleSaveDataResponse(response);
    });
  }

  // ============================================================================
  // Save Operations
  // ============================================================================

  /**
   * Save the current game state to a specified slot
   * @param slotId The save slot identifier (save_1, save_2, save_3, or autosave)
   * @returns True if save was successful, false otherwise
   */
  public save(slotId: string): boolean {
    if (!this.isStorageAvailable) {
      this.emitSaveEvent(slotId, false, 'localStorage is not available');
      return false;
    }

    if (!this.isValidSlot(slotId)) {
      this.emitSaveEvent(slotId, false, `Invalid save slot: ${slotId}`);
      return false;
    }

    try {
      // Gather current game state
      const saveData = this.gatherSaveData();

      if (!saveData) {
        this.emitSaveEvent(slotId, false, 'Failed to gather save data');
        return false;
      }

      // Serialize and store
      const serialized = JSON.stringify(saveData);
      const storageKey = this.getStorageKey(slotId);

      localStorage.setItem(storageKey, serialized);

      // Emit success event
      this.emitSaveEvent(slotId, true);

      console.log(`SaveSystem: Game saved to slot "${slotId}"`);
      return true;
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Unknown error';

      // Handle quota exceeded error specifically
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error('SaveSystem: localStorage quota exceeded');
        this.emitSaveEvent(slotId, false, 'Storage quota exceeded. Delete old saves to continue.');
        return false;
      }

      console.error('SaveSystem: Failed to save game', e);
      this.emitSaveEvent(slotId, false, error);
      return false;
    }
  }

  /**
   * Perform an auto-save to the dedicated auto-save slot
   * Called automatically on location changes
   */
  public autoSave(): void {
    console.log('SaveSystem: Performing auto-save...');
    const success = this.save(AUTOSAVE_SLOT);

    if (success) {
      this.scene.events.emit('autoSaveComplete', { timestamp: Date.now() });
    }
  }

  // ============================================================================
  // Load Operations
  // ============================================================================

  /**
   * Load game state from a specified slot
   * @param slotId The save slot to load from
   * @returns The loaded SaveData or null if load failed
   */
  public load(slotId: string): SaveData | null {
    if (!this.isStorageAvailable) {
      console.error('SaveSystem: localStorage is not available');
      return null;
    }

    if (!this.isValidSlot(slotId)) {
      console.error(`SaveSystem: Invalid save slot: ${slotId}`);
      return null;
    }

    try {
      const storageKey = this.getStorageKey(slotId);
      const serialized = localStorage.getItem(storageKey);

      if (!serialized) {
        console.warn(`SaveSystem: No save found in slot "${slotId}"`);
        return null;
      }

      // Parse and validate
      const saveData = JSON.parse(serialized) as SaveData;

      // Validate save data structure
      if (!this.validateSaveData(saveData)) {
        console.error('SaveSystem: Save data validation failed');
        return null;
      }

      // Handle version migration if needed
      const migratedData = this.migrateSaveData(saveData);

      // Emit load event and distribute data to systems
      this.scene.events.emit('gameLoaded', {
        slotId,
        timestamp: migratedData.timestamp,
        success: true,
      });

      // Emit event for each system to restore their state
      this.scene.events.emit('restoreSaveData', migratedData);

      console.log(`SaveSystem: Game loaded from slot "${slotId}"`);
      return migratedData;
    } catch (e) {
      console.error('SaveSystem: Failed to load game', e);

      // Handle corrupted data
      if (e instanceof SyntaxError) {
        console.error('SaveSystem: Save data is corrupted');
        this.scene.events.emit('gameLoaded', {
          slotId,
          timestamp: 0,
          success: false,
          error: 'Save data is corrupted',
        });
      }

      return null;
    }
  }

  // ============================================================================
  // Delete Operations
  // ============================================================================

  /**
   * Delete a save from the specified slot
   * @param slotId The save slot to delete
   */
  public deleteSave(slotId: string): void {
    if (!this.isStorageAvailable) {
      console.error('SaveSystem: localStorage is not available');
      return;
    }

    if (!this.isValidSlot(slotId)) {
      console.error(`SaveSystem: Invalid save slot: ${slotId}`);
      return;
    }

    try {
      const storageKey = this.getStorageKey(slotId);
      localStorage.removeItem(storageKey);

      this.scene.events.emit('saveDeleted', { slotId });

      console.log(`SaveSystem: Save deleted from slot "${slotId}"`);
    } catch (e) {
      console.error('SaveSystem: Failed to delete save', e);
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Check if a save exists in the specified slot
   * @param slotId The save slot to check
   * @returns True if a save exists in the slot
   */
  public hasSave(slotId: string): boolean {
    if (!this.isStorageAvailable || !this.isValidSlot(slotId)) {
      return false;
    }

    try {
      const storageKey = this.getStorageKey(slotId);
      return localStorage.getItem(storageKey) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get information about all save slots for UI display
   * @returns Array of SaveSlotInfo objects for each slot
   */
  public getSaveSlots(): SaveSlotInfo[] {
    const slots: SaveSlotInfo[] = [];

    for (const slotId of ALL_SLOTS) {
      const info = this.getSlotInfo(slotId);
      slots.push(info);
    }

    return slots;
  }

  /**
   * Get metadata about a specific save slot
   * @param slotId The save slot to query
   * @returns SaveSlotInfo with slot metadata
   */
  public getSlotInfo(slotId: string): SaveSlotInfo {
    const defaultInfo: SaveSlotInfo = {
      slotId,
      timestamp: 0,
      playerGold: 0,
      dayCount: 0,
      exists: false,
    };

    if (!this.isStorageAvailable || !this.isValidSlot(slotId)) {
      return defaultInfo;
    }

    try {
      const storageKey = this.getStorageKey(slotId);
      const serialized = localStorage.getItem(storageKey);

      if (!serialized) {
        return defaultInfo;
      }

      const saveData = JSON.parse(serialized) as SaveData;

      return {
        slotId,
        timestamp: saveData.timestamp,
        playerGold: saveData.player?.gold ?? 0,
        dayCount: saveData.world?.currentTime?.day ?? 0,
        location: saveData.world?.currentLocation,
        exists: true,
      };
    } catch (e) {
      console.error(`SaveSystem: Failed to read slot info for "${slotId}"`, e);
      return { ...defaultInfo, exists: true }; // Exists but corrupted
    }
  }

  /**
   * Get the list of available manual save slots
   * @returns Array of manual save slot IDs
   */
  public getManualSlots(): string[] {
    return [...MANUAL_SAVE_SLOTS];
  }

  /**
   * Get the auto-save slot ID
   * @returns The auto-save slot identifier
   */
  public getAutoSaveSlot(): string {
    return AUTOSAVE_SLOT;
  }

  // ============================================================================
  // Data Gathering
  // ============================================================================

  /**
   * Gather current game state from all systems
   * Emits 'requestSaveData' event and collects responses
   * @returns Complete SaveData object or null on failure
   */
  private gatherSaveData(): SaveData | null {
    // Reset pending data
    this.pendingSaveData = {};

    // Emit request for save data from other systems
    this.scene.events.emit('requestSaveData');

    // Build save data from current game state
    // Systems should respond synchronously or we use fallback data
    try {
      const saveData: SaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        player: this.gatherPlayerData(),
        world: this.gatherWorldData(),
        factions: this.gatherFactionData(),
        quests: this.gatherQuestData(),
        flags: this.gatherFlagData(),
        weather: this.gatherWeatherData(),
      };

      return saveData;
    } catch (e) {
      console.error('SaveSystem: Error gathering save data', e);
      return null;
    }
  }

  /**
   * Handle save data response from a system
   * @param response The system's save data response
   */
  private handleSaveDataResponse(response: SystemSaveDataResponse): void {
    if (response.system && response.data) {
      // Type-safe assignment based on system key
      const key = response.system as keyof SaveData;
      (this.pendingSaveData as Record<string, unknown>)[key] = response.data;
    }
  }

  /**
   * Gather player data from the game
   * @returns Player save data
   */
  private gatherPlayerData(): PlayerSaveData {
    // If pending data was provided by a system, use it
    if (this.pendingSaveData.player) {
      return this.pendingSaveData.player;
    }

    // Default/fallback player data
    // In a full implementation, this would query the Player entity
    return {
      position: {
        location: 'ribeira-grande',
        x: 400,
        y: 300,
      },
      inventory: [],
      gold: 100,
    };
  }

  /**
   * Gather world data from the game
   * @returns World save data
   */
  private gatherWorldData(): WorldSaveData {
    if (this.pendingSaveData.world) {
      return this.pendingSaveData.world;
    }

    // Default world data
    return {
      currentTime: {
        hour: 7,
        day: 1,
      },
      currentLocation: 'ribeira-grande',
    };
  }

  /**
   * Gather faction data from the game
   * @returns Faction save data
   */
  private gatherFactionData(): FactionSaveData {
    if (this.pendingSaveData.factions) {
      return this.pendingSaveData.factions;
    }

    // Default faction data (neutral with all factions)
    return {
      reputation: {
        crown: 0,
        free_traders: 0,
        old_routes: 0,
      },
    };
  }

  /**
   * Gather quest data from the game
   * @returns Quest save data
   */
  private gatherQuestData(): QuestSaveData {
    if (this.pendingSaveData.quests) {
      return this.pendingSaveData.quests;
    }

    // Default quest data
    return {
      active: [],
      completed: [],
      failed: [],
    };
  }

  /**
   * Gather story flags from the game
   * @returns Story flags data
   */
  private gatherFlagData(): Record<string, boolean | string | number> {
    if (this.pendingSaveData.flags) {
      return this.pendingSaveData.flags;
    }

    // Default empty flags
    return {};
  }

  /**
   * Gather weather data from the game
   * @returns Weather save data
   */
  private gatherWeatherData(): WeatherSaveData {
    if (this.pendingSaveData.weather) {
      return this.pendingSaveData.weather;
    }

    // Default weather data
    return {
      current: 'clear',
      season: 'dry',
    };
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate that save data has the required structure
   * @param data The save data to validate
   * @returns True if save data is valid
   */
  private validateSaveData(data: unknown): data is SaveData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const saveData = data as Partial<SaveData>;

    // Check required top-level properties
    if (typeof saveData.version !== 'string') {
      console.warn('SaveSystem: Missing or invalid version');
      return false;
    }

    if (typeof saveData.timestamp !== 'number') {
      console.warn('SaveSystem: Missing or invalid timestamp');
      return false;
    }

    // Validate player data
    if (!saveData.player || typeof saveData.player !== 'object') {
      console.warn('SaveSystem: Missing or invalid player data');
      return false;
    }

    // Validate world data
    if (!saveData.world || typeof saveData.world !== 'object') {
      console.warn('SaveSystem: Missing or invalid world data');
      return false;
    }

    // Validate factions data
    if (!saveData.factions || typeof saveData.factions !== 'object') {
      console.warn('SaveSystem: Missing or invalid factions data');
      return false;
    }

    // Validate quests data
    if (!saveData.quests || typeof saveData.quests !== 'object') {
      console.warn('SaveSystem: Missing or invalid quests data');
      return false;
    }

    return true;
  }

  /**
   * Check if a slot ID is valid
   * @param slotId The slot ID to check
   * @returns True if the slot ID is valid
   */
  private isValidSlot(slotId: string): boolean {
    return ALL_SLOTS.includes(slotId);
  }

  // ============================================================================
  // Migration
  // ============================================================================

  /**
   * Migrate save data from older versions to current version
   * @param data The save data to migrate
   * @returns Migrated save data
   */
  private migrateSaveData(data: SaveData): SaveData {
    const version = data.version;

    // No migration needed for current version
    if (version === SAVE_VERSION) {
      return data;
    }

    console.log(`SaveSystem: Migrating save from version ${version} to ${SAVE_VERSION}`);

    // Clone data to avoid mutations
    const migrated = JSON.parse(JSON.stringify(data)) as SaveData;

    // Apply migrations based on version
    // Future migrations will use compareVersions:
    if (this.compareVersions(version, SAVE_VERSION) < 0) {
      console.log(`Migrating save from ${version} to ${SAVE_VERSION}`);
    }

    // Ensure all required fields exist with defaults
    migrated.version = SAVE_VERSION;
    migrated.flags = migrated.flags ?? {};
    migrated.weather = migrated.weather ?? { current: 'clear', season: 'dry' };

    // Ensure player data structure
    if (!migrated.player.position) {
      migrated.player.position = { location: 'ribeira-grande', x: 400, y: 300 };
    }
    if (!migrated.player.inventory) {
      migrated.player.inventory = [];
    }
    if (typeof migrated.player.gold !== 'number') {
      migrated.player.gold = 100;
    }

    // Ensure world data structure
    if (!migrated.world.currentTime) {
      migrated.world.currentTime = { hour: 7, day: 1 };
    }
    if (!migrated.world.currentLocation) {
      migrated.world.currentLocation = 'ribeira-grande';
    }

    // Ensure faction data structure
    if (!migrated.factions.reputation) {
      migrated.factions.reputation = {};
    }

    // Ensure quest data structure
    if (!Array.isArray(migrated.quests.active)) {
      migrated.quests.active = [];
    }
    if (!Array.isArray(migrated.quests.completed)) {
      migrated.quests.completed = [];
    }
    if (!Array.isArray(migrated.quests.failed)) {
      migrated.quests.failed = [];
    }

    return migrated;
  }

  /**
   * Compare two semantic version strings
   * @param v1 First version
   * @param v2 Second version
   * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    // Note: This function is reserved for future migration logic

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get the localStorage key for a save slot
   * @param slotId The save slot ID
   * @returns The localStorage key
   */
  private getStorageKey(slotId: string): string {
    return `${STORAGE_PREFIX}${slotId}`;
  }

  /**
   * Emit a save event with result information
   * @param slotId The save slot
   * @param success Whether the save was successful
   * @param error Optional error message
   */
  private emitSaveEvent(slotId: string, success: boolean, error?: string): void {
    const eventData: SaveEventData = {
      slotId,
      timestamp: Date.now(),
      success,
      error,
    };

    this.scene.events.emit('gameSaved', eventData);
  }

  // ============================================================================
  // Debug & Testing
  // ============================================================================

  /**
   * Export all saves as a JSON string (for backup/debug)
   * @returns JSON string containing all saves
   */
  public exportAllSaves(): string {
    const exports: Record<string, SaveData | null> = {};

    for (const slotId of ALL_SLOTS) {
      if (this.hasSave(slotId)) {
        try {
          const storageKey = this.getStorageKey(slotId);
          const serialized = localStorage.getItem(storageKey);
          exports[slotId] = serialized ? JSON.parse(serialized) : null;
        } catch (e) {
          exports[slotId] = null;
        }
      }
    }

    return JSON.stringify(exports, null, 2);
  }

  /**
   * Import saves from a JSON string (for restore/debug)
   * @param jsonString JSON string containing saves to import
   * @returns True if import was successful
   */
  public importSaves(jsonString: string): boolean {
    if (!this.isStorageAvailable) {
      return false;
    }

    try {
      const imports = JSON.parse(jsonString) as Record<string, SaveData>;

      for (const [slotId, saveData] of Object.entries(imports)) {
        if (this.isValidSlot(slotId) && saveData && this.validateSaveData(saveData)) {
          const storageKey = this.getStorageKey(slotId);
          localStorage.setItem(storageKey, JSON.stringify(saveData));
        }
      }

      return true;
    } catch (e) {
      console.error('SaveSystem: Failed to import saves', e);
      return false;
    }
  }

  /**
   * Clear all saves (use with caution!)
   */
  public clearAllSaves(): void {
    for (const slotId of ALL_SLOTS) {
      this.deleteSave(slotId);
    }

    console.log('SaveSystem: All saves cleared');
  }

  /**
   * Get the current save data version
   * @returns The save data format version string
   */
  public getVersion(): string {
    return SAVE_VERSION;
  }
}
