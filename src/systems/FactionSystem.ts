import Phaser from 'phaser';

/**
 * FactionSystem - Manages the three thematic factions and player reputation
 *
 * Historical context: 16th century Goa was a crossroads of competing interests.
 * The Portuguese Crown sought monopoly control, independent traders pursued
 * profit through innovation, and ancient merchant networks maintained
 * traditions that predated European arrival.
 *
 * IMPORTANT: These factions are THEMATIC (economic/political), not ethnic.
 * Members of any background can belong to any faction based on their
 * economic philosophy and business practices.
 */

// Key NPC reference within a faction
export interface FactionNPC {
  id: string;
  name: string;
  role?: string;
}

// Faction definition
export interface Faction {
  id: string;
  name: string;
  description: string;
  philosophy: string;
  keyNPCs: FactionNPC[];
}

// Reputation levels with thresholds
export type ReputationLevel =
  | 'hostile'
  | 'unfriendly'
  | 'neutral'
  | 'friendly'
  | 'honored'
  | 'champion';

// Reputation change event data
export interface ReputationChangeEvent {
  factionId: string;
  previousReputation: number;
  newReputation: number;
  previousLevel: ReputationLevel;
  newLevel: ReputationLevel;
  amount: number;
}

// Reputation requirement for checks
export interface ReputationRequirement {
  factionId: string;
  minimumLevel?: ReputationLevel;
  minimumReputation?: number;
}

export class FactionSystem {
  private scene: Phaser.Scene;
  private factions: Map<string, Faction> = new Map();
  private reputation: Map<string, number> = new Map();

  // Reputation level thresholds
  private readonly reputationThresholds: { level: ReputationLevel; min: number }[] = [
    { level: 'hostile', min: -100 },
    { level: 'unfriendly', min: -50 },
    { level: 'neutral', min: -10 },
    { level: 'friendly', min: 10 },
    { level: 'honored', min: 50 },
    { level: 'champion', min: 80 },
  ];

  // The three thematic factions
  private readonly defaultFactions: Faction[] = [
    {
      id: 'crown',
      name: 'The Crown',
      description:
        'Representatives of state power and official trade monopolies. They control the Casa da Índia and enforce royal decrees on commerce.',
      philosophy:
        'Order through regulation. The Crown believes that centralized control ensures fair distribution, prevents exploitation, and maintains the social order. Trade is a privilege granted by royal charter.',
      keyNPCs: [
        { id: 'npc_inspector_ferreira', name: 'Inspector Ferreira', role: 'Trade Inspector' },
        { id: 'npc_cathedral_treasurer', name: 'Cathedral Treasurer', role: 'Church Financial Officer' },
        { id: 'npc_viceroys_aide', name: "Viceroy's Aide", role: 'Royal Administration' },
      ],
    },
    {
      id: 'free_traders',
      name: 'Free Traders',
      description:
        'Merchants who believe in open markets and fair competition. They operate on the edges of official channels, seeking opportunity wherever it arises.',
      philosophy:
        'Liberty through opportunity. Free Traders hold that innovation and competition create prosperity for all. They value entrepreneurship, risk-taking, and the free flow of goods and ideas.',
      keyNPCs: [
        { id: 'npc_captain_marques', name: 'Captain Marques', role: 'Ship Captain' },
        { id: 'npc_lakshmi', name: 'Lakshmi', role: 'Spice Merchant' },
        { id: 'npc_yusuf', name: 'Yusuf', role: 'Trading House Owner' },
      ],
    },
    {
      id: 'old_routes',
      name: 'Old Routes',
      description:
        'Keepers of ancient trade wisdom and networks that have connected East and West for centuries. They value relationships built over generations.',
      philosophy:
        'Wisdom through tradition. Old Routes merchants believe that trust, built over time through honest dealing, is more valuable than any contract. They preserve ancient trading practices and honor ancestral connections.',
      keyNPCs: [
        { id: 'npc_guild_master_chen', name: 'Guild Master Chen', role: 'Merchant Guild Leader' },
        { id: 'npc_elder_nair', name: 'Elder Nair', role: 'Trade Elder' },
        { id: 'npc_abbas', name: 'Abbas', role: 'Caravan Master' },
      ],
    },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeFactions();
    this.initializeReputation();
  }

  private initializeFactions(): void {
    for (const faction of this.defaultFactions) {
      this.factions.set(faction.id, faction);
    }
  }

  private initializeReputation(): void {
    // Start with neutral reputation (0) for all factions
    for (const faction of this.defaultFactions) {
      this.reputation.set(faction.id, 0);
    }
  }

  /**
   * Adjust reputation with a faction
   * @param factionId The faction to adjust reputation with
   * @param amount The amount to adjust (-100 to +100 range is enforced)
   * @returns The new reputation value
   */
  public adjustReputation(factionId: string, amount: number): number {
    const currentRep = this.reputation.get(factionId);
    if (currentRep === undefined) {
      console.warn(`FactionSystem: Unknown faction "${factionId}"`);
      return 0;
    }

    const previousReputation = currentRep;
    const previousLevel = this.getReputationLevel(factionId);

    // Calculate new reputation, clamped to -100 to +100
    const newReputation = Math.max(-100, Math.min(100, currentRep + amount));
    this.reputation.set(factionId, newReputation);

    const newLevel = this.getReputationLevel(factionId);

    // Emit reputation change event
    const event: ReputationChangeEvent = {
      factionId,
      previousReputation,
      newReputation,
      previousLevel,
      newLevel,
      amount,
    };

    this.scene.events.emit('reputationChange', event);

    // Emit level change event if level changed
    if (previousLevel !== newLevel) {
      this.scene.events.emit('reputationLevelChange', {
        factionId,
        previousLevel,
        newLevel,
        faction: this.factions.get(factionId),
      });
    }

    return newReputation;
  }

  /**
   * Get current reputation value with a faction
   * @param factionId The faction to check
   * @returns Reputation value (-100 to +100)
   */
  public getReputation(factionId: string): number {
    return this.reputation.get(factionId) ?? 0;
  }

  /**
   * Get the reputation level category for a faction
   * @param factionId The faction to check
   * @returns The reputation level string
   */
  public getReputationLevel(factionId: string): ReputationLevel {
    const rep = this.getReputation(factionId);

    // Iterate in reverse to find the highest matching threshold
    for (let i = this.reputationThresholds.length - 1; i >= 0; i--) {
      if (rep >= this.reputationThresholds[i].min) {
        return this.reputationThresholds[i].level;
      }
    }

    return 'hostile'; // Default fallback
  }

  /**
   * Check if player meets reputation requirements
   * @param requirements Array of reputation requirements to check
   * @returns True if all requirements are met
   */
  public meetsReputationRequirements(requirements: ReputationRequirement[]): boolean {
    for (const req of requirements) {
      const currentRep = this.getReputation(req.factionId);
      const currentLevel = this.getReputationLevel(req.factionId);

      // Check minimum reputation value if specified
      if (req.minimumReputation !== undefined && currentRep < req.minimumReputation) {
        return false;
      }

      // Check minimum level if specified
      if (req.minimumLevel !== undefined) {
        const levelOrder: ReputationLevel[] = [
          'hostile',
          'unfriendly',
          'neutral',
          'friendly',
          'honored',
          'champion',
        ];
        const currentIndex = levelOrder.indexOf(currentLevel);
        const requiredIndex = levelOrder.indexOf(req.minimumLevel);

        if (currentIndex < requiredIndex) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get a specific faction by ID
   * @param factionId The faction ID
   * @returns The faction or undefined
   */
  public getFaction(factionId: string): Faction | undefined {
    return this.factions.get(factionId);
  }

  /**
   * Get all factions
   * @returns Array of all factions
   */
  public getAllFactions(): Faction[] {
    return Array.from(this.factions.values());
  }

  /**
   * Get reputation summary for all factions
   * @returns Array of faction reputation data
   */
  public getReputationSummary(): {
    factionId: string;
    factionName: string;
    reputation: number;
    level: ReputationLevel;
  }[] {
    const summary = [];

    for (const faction of this.factions.values()) {
      summary.push({
        factionId: faction.id,
        factionName: faction.name,
        reputation: this.getReputation(faction.id),
        level: this.getReputationLevel(faction.id),
      });
    }

    return summary;
  }

  /**
   * Get key NPCs for a faction
   * @param factionId The faction ID
   * @returns Array of key NPCs or empty array
   */
  public getFactionNPCs(factionId: string): FactionNPC[] {
    const faction = this.factions.get(factionId);
    return faction?.keyNPCs ?? [];
  }

  /**
   * Check if an NPC belongs to a specific faction
   * @param npcId The NPC ID to check
   * @param factionId The faction ID to check against
   * @returns True if the NPC is a key member of the faction
   */
  public isNPCInFaction(npcId: string, factionId: string): boolean {
    const faction = this.factions.get(factionId);
    if (!faction) return false;

    return faction.keyNPCs.some((npc) => npc.id === npcId);
  }

  /**
   * Find which faction an NPC belongs to (if any)
   * @param npcId The NPC ID to look up
   * @returns The faction ID or undefined
   */
  public getNPCFaction(npcId: string): string | undefined {
    for (const faction of this.factions.values()) {
      if (faction.keyNPCs.some((npc) => npc.id === npcId)) {
        return faction.id;
      }
    }
    return undefined;
  }

  /**
   * Get a description of the current reputation level
   * @param level The reputation level
   * @returns A human-readable description
   */
  public getReputationLevelDescription(level: ReputationLevel): string {
    switch (level) {
      case 'hostile':
        return 'They actively work against you and may refuse service.';
      case 'unfriendly':
        return 'They are wary of you and offer poor terms.';
      case 'neutral':
        return 'They treat you as any stranger, with caution.';
      case 'friendly':
        return 'They recognize you as a friend and offer fair deals.';
      case 'honored':
        return 'You are respected among their ranks and receive preferential treatment.';
      case 'champion':
        return 'You are a celebrated ally, trusted with their most valuable opportunities.';
      default:
        return 'Unknown standing.';
    }
  }

  /**
   * Set reputation directly (useful for save/load)
   * @param factionId The faction ID
   * @param value The reputation value to set
   */
  public setReputation(factionId: string, value: number): void {
    if (!this.factions.has(factionId)) {
      console.warn(`FactionSystem: Unknown faction "${factionId}"`);
      return;
    }

    const clampedValue = Math.max(-100, Math.min(100, value));
    this.reputation.set(factionId, clampedValue);
  }

  /**
   * Reset all reputations to neutral
   */
  public resetAllReputations(): void {
    for (const factionId of this.factions.keys()) {
      this.reputation.set(factionId, 0);
    }

    this.scene.events.emit('reputationReset');
  }

  /**
   * Get save data for the faction system
   * @returns Serializable reputation data
   */
  public getSaveData(): Record<string, number> {
    const data: Record<string, number> = {};
    for (const [factionId, rep] of this.reputation) {
      data[factionId] = rep;
    }
    return data;
  }

  /**
   * Load reputation data from save
   * @param data Previously saved reputation data
   */
  public loadSaveData(data: Record<string, number>): void {
    for (const [factionId, rep] of Object.entries(data)) {
      if (this.factions.has(factionId)) {
        this.reputation.set(factionId, Math.max(-100, Math.min(100, rep)));
      }
    }

    this.scene.events.emit('reputationLoaded', this.getReputationSummary());
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.reputation.clear();
  }
}
