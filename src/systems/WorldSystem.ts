import Phaser from 'phaser';

/**
 * WorldSystem - Manages game locations and transitions in 16th century Goa
 * 
 * This system handles the interconnected world of Portuguese Goa, including
 * the main market at Ribeira Grande, the customs house (Alfândega), religious
 * sites, and commercial districts. Each location has its own map and can have
 * faction-controlled territories that affect gameplay.
 * 
 * Transitions between locations occur when the player enters designated
 * transition zones, subject to optional requirements like reputation,
 * required items, or time-of-day restrictions.
 */

/**
 * Requirements for accessing a location or transition
 * Used for conditional access based on player state
 */
export interface TransitionRequirement {
  /** Minimum reputation level with a specific faction (e.g., 'portuguese', 'hindu', 'arab') */
  reputation?: { faction: string; minLevel: number };
  /** Item required to be in inventory (e.g., a pass or key) */
  item?: string;
  /** Time window during which transition is allowed (24-hour format) */
  time?: { startHour: number; endHour: number };
  /** Minimum gold required */
  gold?: number;
  /** Custom condition function for complex requirements */
  customCondition?: () => boolean;
}

/**
 * Defines a connection/transition point between two locations
 */
export interface LocationConnection {
  /** ID of the target location this connection leads to */
  targetLocationId: string;
  /** Zone coordinates where transition is triggered (in tile coordinates) */
  transitionZone: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Optional requirements to use this transition */
  requirements?: TransitionRequirement;
  /** Spawn position in target location after transition */
  targetSpawnPoint?: { x: number; y: number };
  /** Display name for this exit (e.g., "To the Docks") */
  displayName?: string;
}

/**
 * Represents a game location/area in the world
 */
export interface Location {
  /** Unique identifier for this location */
  id: string;
  /** Display name shown to the player */
  name: string;
  /** Path to the Tiled map file for this location */
  mapFile: string;
  /** Connections to other locations */
  connections: LocationConnection[];
  /** Optional faction that controls this territory */
  factionTerritory?: string;
  /** Default spawn point when entering this location */
  defaultSpawnPoint?: { x: number; y: number };
  /** Description shown when entering the location */
  description?: string;
  /** Ambient sound/music for this location */
  ambientSound?: string;
}

/**
 * Event data emitted when location changes
 */
export interface LocationChangeEvent {
  /** The location being left */
  previousLocation: Location | null;
  /** The new location being entered */
  newLocation: Location;
  /** The connection used for the transition (null if initial spawn) */
  connection: LocationConnection | null;
  /** Spawn position in the new location */
  spawnPoint: { x: number; y: number };
}

/**
 * Result of a transition requirement check
 */
export interface RequirementCheckResult {
  /** Whether all requirements are met */
  allowed: boolean;
  /** Reason for denial if not allowed */
  reason?: string;
}

/**
 * WorldSystem class - Core world management system
 * 
 * Manages all game locations, tracks the current location,
 * handles transitions, and enforces access requirements.
 */
export class WorldSystem {
  private scene: Phaser.Scene;
  private locations: Map<string, Location> = new Map();
  private currentLocation: Location | null = null;
  private transitionInProgress = false;
  
  /** Callback to check player reputation (set by game systems) */
  private reputationChecker?: (faction: string) => number;
  /** Callback to check player inventory (set by game systems) */
  private inventoryChecker?: (item: string) => boolean;
  /** Callback to check player gold (set by game systems) */
  private goldChecker?: () => number;
  /** Callback to get current game hour (set by TimeSystem) */
  private timeChecker?: () => number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeLocations();
  }

  /**
   * Initialize all game locations with their connections
   * These represent the key areas of 16th century Portuguese Goa
   */
  private initializeLocations(): void {
    // Ribeira Grande - The main market area (current starting location)
    this.addLocation({
      id: 'ribeira_grande',
      name: 'Ribeira Grande',
      mapFile: 'data/maps/ribeira-grande.json',
      description: 'The bustling heart of Goa\'s commerce, where merchants from across the world gather to trade.',
      defaultSpawnPoint: { x: 15, y: 15 },
      connections: [
        {
          targetLocationId: 'alfandega',
          transitionZone: { x: 0, y: 10, width: 2, height: 4 },
          displayName: 'To Customs House',
          targetSpawnPoint: { x: 28, y: 15 },
        },
        {
          targetLocationId: 'se_cathedral',
          transitionZone: { x: 28, y: 5, width: 2, height: 3 },
          displayName: 'To Sé Cathedral',
          targetSpawnPoint: { x: 2, y: 10 },
        },
        {
          targetLocationId: 'tavern',
          transitionZone: { x: 20, y: 28, width: 3, height: 2 },
          displayName: 'To the Tavern',
          targetSpawnPoint: { x: 5, y: 2 },
          requirements: {
            time: { startHour: 17, endHour: 24 }, // Evening only
          },
        },
        {
          targetLocationId: 'docks',
          transitionZone: { x: 5, y: 0, width: 5, height: 2 },
          displayName: 'To the Docks',
          targetSpawnPoint: { x: 15, y: 28 },
        },
      ],
    });

    // Alfândega - The Portuguese Customs House
    this.addLocation({
      id: 'alfandega',
      name: 'Alfândega (Customs House)',
      mapFile: 'data/maps/alfandega.json',
      description: 'The official Portuguese customs house where all trade goods must be registered and taxed.',
      factionTerritory: 'portuguese',
      defaultSpawnPoint: { x: 28, y: 15 },
      connections: [
        {
          targetLocationId: 'ribeira_grande',
          transitionZone: { x: 28, y: 10, width: 2, height: 4 },
          displayName: 'To Market',
          targetSpawnPoint: { x: 2, y: 12 },
        },
        {
          targetLocationId: 'warehouse_district',
          transitionZone: { x: 0, y: 15, width: 2, height: 3 },
          displayName: 'To Warehouses',
          targetSpawnPoint: { x: 28, y: 10 },
          requirements: {
            reputation: { faction: 'portuguese', minLevel: 10 },
          },
        },
      ],
    });

    // Sé Cathedral - The religious center
    this.addLocation({
      id: 'se_cathedral',
      name: 'Sé Cathedral',
      mapFile: 'data/maps/se-cathedral.json',
      description: 'The grand Sé Cathedral, seat of the Archbishop and symbol of Portuguese religious authority.',
      factionTerritory: 'portuguese',
      defaultSpawnPoint: { x: 15, y: 20 },
      connections: [
        {
          targetLocationId: 'ribeira_grande',
          transitionZone: { x: 0, y: 8, width: 2, height: 4 },
          displayName: 'To Market',
          targetSpawnPoint: { x: 26, y: 6 },
        },
        {
          targetLocationId: 'old_quarter',
          transitionZone: { x: 28, y: 10, width: 2, height: 3 },
          displayName: 'To Old Quarter',
          targetSpawnPoint: { x: 2, y: 15 },
        },
      ],
    });

    // Tavern - The social hub for rumors and information
    this.addLocation({
      id: 'tavern',
      name: 'The Sailor\'s Rest Tavern',
      mapFile: 'data/maps/tavern.json',
      description: 'A dimly lit tavern where sailors, merchants, and rogues share tales and trade secrets.',
      defaultSpawnPoint: { x: 5, y: 5 },
      ambientSound: 'tavern_ambience',
      connections: [
        {
          targetLocationId: 'ribeira_grande',
          transitionZone: { x: 4, y: 0, width: 3, height: 2 },
          displayName: 'Exit to Market',
          targetSpawnPoint: { x: 21, y: 26 },
        },
        {
          targetLocationId: 'docks',
          transitionZone: { x: 0, y: 5, width: 2, height: 2 },
          displayName: 'Back Alley to Docks',
          targetSpawnPoint: { x: 25, y: 20 },
        },
      ],
    });

    // Old Quarter - The historic Hindu neighborhood
    this.addLocation({
      id: 'old_quarter',
      name: 'Old Quarter',
      mapFile: 'data/maps/old-quarter.json',
      description: 'The ancient Hindu quarter, where traditional ways persist despite Portuguese rule.',
      factionTerritory: 'hindu',
      defaultSpawnPoint: { x: 15, y: 15 },
      connections: [
        {
          targetLocationId: 'se_cathedral',
          transitionZone: { x: 0, y: 13, width: 2, height: 4 },
          displayName: 'To Cathedral',
          targetSpawnPoint: { x: 26, y: 11 },
        },
        {
          targetLocationId: 'warehouse_district',
          transitionZone: { x: 28, y: 15, width: 2, height: 3 },
          displayName: 'To Warehouses',
          targetSpawnPoint: { x: 2, y: 15 },
        },
      ],
    });

    // Warehouse District - Storage and bulk trade
    this.addLocation({
      id: 'warehouse_district',
      name: 'Warehouse District',
      mapFile: 'data/maps/warehouse-district.json',
      description: 'Massive warehouses storing goods from across the Portuguese trading empire.',
      defaultSpawnPoint: { x: 15, y: 15 },
      connections: [
        {
          targetLocationId: 'alfandega',
          transitionZone: { x: 28, y: 8, width: 2, height: 4 },
          displayName: 'To Customs House',
          targetSpawnPoint: { x: 2, y: 16 },
        },
        {
          targetLocationId: 'old_quarter',
          transitionZone: { x: 0, y: 13, width: 2, height: 4 },
          displayName: 'To Old Quarter',
          targetSpawnPoint: { x: 26, y: 16 },
        },
        {
          targetLocationId: 'docks',
          transitionZone: { x: 15, y: 0, width: 4, height: 2 },
          displayName: 'To Docks',
          targetSpawnPoint: { x: 15, y: 26 },
        },
      ],
    });

    // Docks - The waterfront where ships arrive
    this.addLocation({
      id: 'docks',
      name: 'The Docks',
      mapFile: 'data/maps/docks.json',
      description: 'The busy waterfront where carracks and dhows unload exotic goods from distant lands.',
      defaultSpawnPoint: { x: 15, y: 15 },
      ambientSound: 'harbor_ambience',
      connections: [
        {
          targetLocationId: 'ribeira_grande',
          transitionZone: { x: 13, y: 28, width: 5, height: 2 },
          displayName: 'To Market',
          targetSpawnPoint: { x: 7, y: 2 },
        },
        {
          targetLocationId: 'warehouse_district',
          transitionZone: { x: 13, y: 0, width: 4, height: 2 },
          displayName: 'To Warehouses',
          targetSpawnPoint: { x: 16, y: 2 },
        },
        {
          targetLocationId: 'tavern',
          transitionZone: { x: 25, y: 18, width: 2, height: 3 },
          displayName: 'To Tavern',
          targetSpawnPoint: { x: 2, y: 6 },
        },
      ],
    });
  }

  /**
   * Add a location to the world
   * @param location The location data to add
   */
  public addLocation(location: Location): void {
    this.locations.set(location.id, location);
  }

  /**
   * Get a location by its ID
   * @param locationId The unique location identifier
   * @returns The location or undefined if not found
   */
  public getLocation(locationId: string): Location | undefined {
    return this.locations.get(locationId);
  }

  /**
   * Get all registered locations
   * @returns Array of all locations
   */
  public getAllLocations(): Location[] {
    return Array.from(this.locations.values());
  }

  /**
   * Get the current location
   * @returns The current location or null if not set
   */
  public getCurrentLocation(): Location | null {
    return this.currentLocation;
  }

  /**
   * Set the current location directly (used for initial spawn)
   * @param locationId The location ID to set as current
   * @returns True if successful, false if location not found
   */
  public setCurrentLocation(locationId: string): boolean {
    const location = this.locations.get(locationId);
    if (!location) {
      console.warn(`WorldSystem: Location not found: ${locationId}`);
      return false;
    }

    const previousLocation = this.currentLocation;
    this.currentLocation = location;

    const spawnPoint = location.defaultSpawnPoint || { x: 15, y: 15 };

    // Emit location change event
    const event: LocationChangeEvent = {
      previousLocation,
      newLocation: location,
      connection: null,
      spawnPoint,
    };

    this.scene.events.emit('locationChange', event);
    return true;
  }

  /**
   * Set callbacks for checking player state
   * These should be set by the game systems that track player data
   */
  public setStateCheckers(checkers: {
    reputation?: (faction: string) => number;
    inventory?: (item: string) => boolean;
    gold?: () => number;
    time?: () => number;
  }): void {
    if (checkers.reputation) this.reputationChecker = checkers.reputation;
    if (checkers.inventory) this.inventoryChecker = checkers.inventory;
    if (checkers.gold) this.goldChecker = checkers.gold;
    if (checkers.time) this.timeChecker = checkers.time;
  }

  /**
   * Check if a transition's requirements are met
   * @param requirements The requirements to check
   * @returns Result indicating if access is allowed and reason if denied
   */
  public checkRequirements(requirements?: TransitionRequirement): RequirementCheckResult {
    if (!requirements) {
      return { allowed: true };
    }

    // Check reputation requirement
    if (requirements.reputation) {
      const currentRep = this.reputationChecker?.(requirements.reputation.faction) ?? 0;
      if (currentRep < requirements.reputation.minLevel) {
        return {
          allowed: false,
          reason: `Requires ${requirements.reputation.minLevel} reputation with ${requirements.reputation.faction}`,
        };
      }
    }

    // Check item requirement
    if (requirements.item) {
      const hasItem = this.inventoryChecker?.(requirements.item) ?? false;
      if (!hasItem) {
        return {
          allowed: false,
          reason: `Requires item: ${requirements.item}`,
        };
      }
    }

    // Check gold requirement
    if (requirements.gold) {
      const currentGold = this.goldChecker?.() ?? 0;
      if (currentGold < requirements.gold) {
        return {
          allowed: false,
          reason: `Requires ${requirements.gold} gold`,
        };
      }
    }

    // Check time requirement
    if (requirements.time) {
      const currentHour = this.timeChecker?.() ?? 12;
      const { startHour, endHour } = requirements.time;

      let timeAllowed: boolean;
      if (startHour <= endHour) {
        // Normal time range (e.g., 9-17)
        timeAllowed = currentHour >= startHour && currentHour < endHour;
      } else {
        // Overnight range (e.g., 20-6)
        timeAllowed = currentHour >= startHour || currentHour < endHour;
      }

      if (!timeAllowed) {
        return {
          allowed: false,
          reason: `Only accessible from ${startHour}:00 to ${endHour}:00`,
        };
      }
    }

    // Check custom condition
    if (requirements.customCondition && !requirements.customCondition()) {
      return {
        allowed: false,
        reason: 'Access requirements not met',
      };
    }

    return { allowed: true };
  }

  /**
   * Check if the player is within a transition zone
   * @param playerTileX Player's tile X coordinate
   * @param playerTileY Player's tile Y coordinate
   * @returns The connection if player is in a transition zone, null otherwise
   */
  public checkTransitionZone(playerTileX: number, playerTileY: number): LocationConnection | null {
    if (!this.currentLocation || this.transitionInProgress) {
      return null;
    }

    for (const connection of this.currentLocation.connections) {
      const zone = connection.transitionZone;
      if (
        playerTileX >= zone.x &&
        playerTileX < zone.x + zone.width &&
        playerTileY >= zone.y &&
        playerTileY < zone.y + zone.height
      ) {
        return connection;
      }
    }

    return null;
  }

  /**
   * Attempt to transition to another location via a connection
   * @param connection The connection to use for transition
   * @returns True if transition was successful
   */
  public attemptTransition(connection: LocationConnection): boolean {
    if (this.transitionInProgress) {
      return false;
    }

    // Check requirements
    const requirementCheck = this.checkRequirements(connection.requirements);
    if (!requirementCheck.allowed) {
      // Emit blocked transition event
      this.scene.events.emit('transitionBlocked', {
        connection,
        reason: requirementCheck.reason,
      });
      return false;
    }

    // Get target location
    const targetLocation = this.locations.get(connection.targetLocationId);
    if (!targetLocation) {
      console.warn(`WorldSystem: Target location not found: ${connection.targetLocationId}`);
      return false;
    }

    // Begin transition
    this.transitionInProgress = true;

    const previousLocation = this.currentLocation;
    this.currentLocation = targetLocation;

    const spawnPoint = connection.targetSpawnPoint ||
      targetLocation.defaultSpawnPoint ||
      { x: 15, y: 15 };

    // Emit location change event
    const event: LocationChangeEvent = {
      previousLocation,
      newLocation: targetLocation,
      connection,
      spawnPoint,
    };

    this.scene.events.emit('locationChange', event);

    // Reset transition lock after a brief delay (allows for transition animations)
    this.scene.time.delayedCall(500, () => {
      this.transitionInProgress = false;
    });

    return true;
  }

  /**
   * Get connections available from the current location
   * @param includeBlocked Whether to include connections with unmet requirements
   * @returns Array of available connections with their status
   */
  public getAvailableConnections(includeBlocked = false): Array<{
    connection: LocationConnection;
    accessible: boolean;
    reason?: string;
  }> {
    if (!this.currentLocation) {
      return [];
    }

    return this.currentLocation.connections
      .map((connection) => {
        const check = this.checkRequirements(connection.requirements);
        return {
          connection,
          accessible: check.allowed,
          reason: check.reason,
        };
      })
      .filter((c) => includeBlocked || c.accessible);
  }

  /**
   * Get the faction that controls the current location
   * @returns The faction ID or undefined if neutral territory
   */
  public getCurrentFactionTerritory(): string | undefined {
    return this.currentLocation?.factionTerritory;
  }

  /**
   * Check if the current location belongs to a specific faction
   * @param faction The faction to check
   * @returns True if the location is that faction's territory
   */
  public isInFactionTerritory(faction: string): boolean {
    return this.currentLocation?.factionTerritory === faction;
  }

  /**
   * Get locations controlled by a specific faction
   * @param faction The faction ID
   * @returns Array of locations controlled by that faction
   */
  public getFactionLocations(faction: string): Location[] {
    return Array.from(this.locations.values()).filter(
      (location) => location.factionTerritory === faction
    );
  }

  /**
   * Update method called each frame
   * Checks for zone transitions based on player position
   * @param playerTileX Player's current tile X position
   * @param playerTileY Player's current tile Y position
   */
  public update(playerTileX: number, playerTileY: number): void {
    const connection = this.checkTransitionZone(playerTileX, playerTileY);
    if (connection) {
      // Emit event that player entered a transition zone
      this.scene.events.emit('transitionZoneEntered', {
        connection,
        displayName: connection.displayName || `To ${this.locations.get(connection.targetLocationId)?.name || 'Unknown'}`,
      });
    }
  }

  /**
   * Check if a transition is currently in progress
   * @returns True if transitioning between locations
   */
  public isTransitioning(): boolean {
    return this.transitionInProgress;
  }

  /**
   * Get a summary of the current world state for debugging
   */
  public getDebugInfo(): {
    currentLocation: string | null;
    totalLocations: number;
    availableExits: number;
    factionTerritory: string | undefined;
  } {
    return {
      currentLocation: this.currentLocation?.id || null,
      totalLocations: this.locations.size,
      availableExits: this.getAvailableConnections().length,
      factionTerritory: this.getCurrentFactionTerritory(),
    };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.locations.clear();
    this.currentLocation = null;
  }
}
