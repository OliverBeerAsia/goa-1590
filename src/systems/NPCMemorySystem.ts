import Phaser from 'phaser';

/**
 * NPCMemorySystem - Tracks NPC relationships and memories of player
 *
 * NPCs remember past interactions, trade history, and quest decisions.
 * This creates persistent relationships that affect dialogue and deals.
 */

interface TradeHistory {
  profitable: number;  // Trades where NPC profited (player bought)
  total: number;       // Total trades
  lastTradeTime: number;
  averageValue: number;
}

interface NPCMemory {
  npcId: string;
  lastInteraction: number;     // Game time of last interaction
  interactionCount: number;    // Total times player talked to this NPC
  tradeHistory: TradeHistory;
  questHistory: string[];      // Quest IDs involving this NPC
  attitude: number;            // -100 to +100, starts at 0
  flags: Record<string, boolean | number | string>; // Custom memory flags
  firstMet: number;            // Game time when first met
}

interface MemorySaveData {
  memories: NPCMemory[];
}

export class NPCMemorySystem {
  private scene: Phaser.Scene;
  private memories: Map<string, NPCMemory> = new Map();

  // Attitude thresholds
  private readonly attitudeThresholds = {
    hostile: -50,
    unfriendly: -20,
    neutral: 20,
    friendly: 50,
    trusted: 80,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Track NPC interactions
    this.scene.events.on('npcInteraction', (data: { npcId: string; npcName: string }) => {
      this.recordInteraction(data.npcId);
    });

    // Track trades
    this.scene.events.on('playerBuy', (data: { good: string; price: number; npcId?: string }) => {
      if (data.npcId) {
        this.recordTrade(data.npcId, data.price, true);
      }
    });

    this.scene.events.on('playerSell', (data: { good: string; price: number; npcId?: string }) => {
      if (data.npcId) {
        this.recordTrade(data.npcId, data.price, false);
      }
    });

    // Track quest decisions that affect NPCs
    this.scene.events.on('questChoice', (data: { questId: string; choiceId: string; npcId?: string }) => {
      if (data.npcId) {
        this.recordQuestInvolvement(data.npcId, data.questId);
      }
    });

    // Track quest completions
    this.scene.events.on('questCompleted', (data: { questId: string; npcId?: string }) => {
      if (data.npcId) {
        this.recordQuestInvolvement(data.npcId, data.questId);
        this.adjustAttitude(data.npcId, 5); // Completing a quest improves relationship
      }
    });
  }

  private getCurrentGameTime(): number {
    try {
      const marketScene = this.scene.scene.get('MarketScene') as any;
      if (marketScene?.getTimeSystem) {
        const timeData = marketScene.getTimeSystem().getTimeData();
        return timeData.hour + (timeData.dayCount * 24);
      }
    } catch (e) {
      // Fallback
    }
    return 7 + 24;
  }

  private getOrCreateMemory(npcId: string): NPCMemory {
    let memory = this.memories.get(npcId);

    if (!memory) {
      const currentTime = this.getCurrentGameTime();
      memory = {
        npcId,
        lastInteraction: currentTime,
        interactionCount: 0,
        tradeHistory: {
          profitable: 0,
          total: 0,
          lastTradeTime: 0,
          averageValue: 0,
        },
        questHistory: [],
        attitude: 0,
        flags: {},
        firstMet: currentTime,
      };
      this.memories.set(npcId, memory);
    }

    return memory;
  }

  public recordInteraction(npcId: string): void {
    const memory = this.getOrCreateMemory(npcId);
    memory.lastInteraction = this.getCurrentGameTime();
    memory.interactionCount++;

    // Slight attitude boost for regular interactions
    if (memory.interactionCount > 5 && memory.attitude < 30) {
      this.adjustAttitude(npcId, 1);
    }

    this.scene.events.emit('npcMemoryUpdated', { npcId, memory });
  }

  public recordTrade(npcId: string, value: number, npcProfited: boolean): void {
    const memory = this.getOrCreateMemory(npcId);
    const history = memory.tradeHistory;

    history.total++;
    if (npcProfited) {
      history.profitable++;
    }
    history.lastTradeTime = this.getCurrentGameTime();

    // Update running average
    history.averageValue = ((history.averageValue * (history.total - 1)) + value) / history.total;

    // Attitude adjusts based on trade fairness
    // If player mostly buys (NPC profits), attitude improves
    const profitRatio = history.profitable / history.total;
    if (profitRatio > 0.6 && history.total >= 3) {
      this.adjustAttitude(npcId, 2); // Good customer
    }

    this.scene.events.emit('npcMemoryUpdated', { npcId, memory });
  }

  public recordQuestInvolvement(npcId: string, questId: string): void {
    const memory = this.getOrCreateMemory(npcId);

    if (!memory.questHistory.includes(questId)) {
      memory.questHistory.push(questId);
    }

    this.scene.events.emit('npcMemoryUpdated', { npcId, memory });
  }

  public adjustAttitude(npcId: string, amount: number): void {
    const memory = this.getOrCreateMemory(npcId);
    const previousAttitude = memory.attitude;

    memory.attitude = Math.max(-100, Math.min(100, memory.attitude + amount));

    // Check for attitude level changes
    const previousLevel = this.getAttitudeLevel(previousAttitude);
    const newLevel = this.getAttitudeLevel(memory.attitude);

    if (previousLevel !== newLevel) {
      this.scene.events.emit('npcAttitudeChange', {
        npcId,
        previousLevel,
        newLevel,
        attitude: memory.attitude,
      });
    }
  }

  public getAttitudeLevel(attitude: number): string {
    if (attitude <= this.attitudeThresholds.hostile) return 'hostile';
    if (attitude <= this.attitudeThresholds.unfriendly) return 'unfriendly';
    if (attitude <= this.attitudeThresholds.neutral) return 'neutral';
    if (attitude <= this.attitudeThresholds.friendly) return 'friendly';
    return 'trusted';
  }

  public getMemory(npcId: string): NPCMemory | undefined {
    return this.memories.get(npcId);
  }

  public getAttitude(npcId: string): number {
    const memory = this.memories.get(npcId);
    return memory?.attitude ?? 0;
  }

  public getAttitudeLevelForNPC(npcId: string): string {
    return this.getAttitudeLevel(this.getAttitude(npcId));
  }

  public getInteractionCount(npcId: string): number {
    const memory = this.memories.get(npcId);
    return memory?.interactionCount ?? 0;
  }

  public getTradeHistory(npcId: string): TradeHistory | null {
    const memory = this.memories.get(npcId);
    return memory?.tradeHistory ?? null;
  }

  public hasMetNPC(npcId: string): boolean {
    return this.memories.has(npcId);
  }

  public setFlag(npcId: string, flag: string, value: boolean | number | string): void {
    const memory = this.getOrCreateMemory(npcId);
    memory.flags[flag] = value;
  }

  public getFlag(npcId: string, flag: string): boolean | number | string | undefined {
    const memory = this.memories.get(npcId);
    return memory?.flags[flag];
  }

  public hasFlag(npcId: string, flag: string): boolean {
    const memory = this.memories.get(npcId);
    return memory?.flags[flag] !== undefined;
  }

  /**
   * Get price modifier based on NPC relationship
   * Positive attitude = better prices, negative = worse
   */
  public getPriceModifier(npcId: string): number {
    const attitude = this.getAttitude(npcId);

    if (attitude >= 80) return 0.85;  // Trusted: 15% discount
    if (attitude >= 50) return 0.90;  // Friendly: 10% discount
    if (attitude >= 20) return 0.95;  // Neutral+: 5% discount
    if (attitude >= -20) return 1.0;  // Neutral: no change
    if (attitude >= -50) return 1.10; // Unfriendly: 10% markup
    return 1.25; // Hostile: 25% markup
  }

  /**
   * Get sell modifier based on NPC relationship
   * Positive attitude = better sell prices
   */
  public getSellModifier(npcId: string): number {
    const attitude = this.getAttitude(npcId);

    if (attitude >= 80) return 1.15;  // Trusted: 15% bonus
    if (attitude >= 50) return 1.10;  // Friendly: 10% bonus
    if (attitude >= 20) return 1.05;  // Neutral+: 5% bonus
    if (attitude >= -20) return 1.0;  // Neutral: no change
    if (attitude >= -50) return 0.90; // Unfriendly: 10% less
    return 0.75; // Hostile: 25% less
  }

  /**
   * Check if NPC will offer special deals/opportunities
   */
  public willOfferSpecialDeal(npcId: string): boolean {
    const memory = this.memories.get(npcId);
    if (!memory) return false;

    // Need trusted status + multiple trades
    return memory.attitude >= 50 && memory.tradeHistory.total >= 5;
  }

  /**
   * Get dialogue modifier based on relationship
   * Returns a key that DialogueSystem can use for conditional dialogue
   */
  public getDialogueKey(npcId: string): string {
    const level = this.getAttitudeLevelForNPC(npcId);
    const memory = this.memories.get(npcId);

    if (!memory) return 'stranger';

    // First meeting
    if (memory.interactionCount === 1) return 'first_meeting';

    // Returning customer
    if (memory.tradeHistory.total > 0 && memory.interactionCount > 1) {
      return `returning_${level}`;
    }

    return level;
  }

  /**
   * Get summary for all NPCs the player has met
   */
  public getRelationshipSummary(): Array<{
    npcId: string;
    attitude: number;
    level: string;
    trades: number;
    interactions: number;
  }> {
    const summary = [];

    for (const [npcId, memory] of this.memories) {
      summary.push({
        npcId,
        attitude: memory.attitude,
        level: this.getAttitudeLevel(memory.attitude),
        trades: memory.tradeHistory.total,
        interactions: memory.interactionCount,
      });
    }

    return summary.sort((a, b) => b.attitude - a.attitude);
  }

  public getSaveData(): MemorySaveData {
    return {
      memories: Array.from(this.memories.values()),
    };
  }

  public loadSaveData(data: MemorySaveData): void {
    this.memories.clear();

    if (data.memories) {
      for (const memory of data.memories) {
        this.memories.set(memory.npcId, memory);
      }
    }

    this.scene.events.emit('npcMemoriesLoaded', this.getRelationshipSummary());
  }

  public reset(): void {
    this.memories.clear();
  }

  /**
   * Clean up event listeners and data to prevent memory leaks
   */
  public destroy(): void {
    this.scene.events.off('npcInteraction');
    this.scene.events.off('playerBuy');
    this.scene.events.off('playerSell');
    this.scene.events.off('questChoice');
    this.scene.events.off('questCompleted');
    this.memories.clear();
  }
}
