import Phaser from 'phaser';

/**
 * QuestSystem - Manages quests, objectives, and branching narratives
 * 
 * Historical context: 16th century Goa was rife with political intrigue,
 * trade monopolies, and factional power struggles. Quests reflect the
 * complex relationships between the Portuguese Crown, local Hindu traders,
 * Arab merchants, and the Catholic Church.
 */

// ============================================================================
// Interfaces
// ============================================================================

export interface QuestRequirement {
  type: 'reputation' | 'item' | 'gold' | 'quest' | 'flag';
  target?: string; // Faction name, item id, quest id, or flag name
  value: number | string | boolean;
  comparison?: 'gte' | 'lte' | 'eq' | 'neq'; // greater/less than or equal, equal, not equal
}

export interface QuestReward {
  type: 'gold' | 'item' | 'reputation' | 'flag' | 'unlock';
  target?: string; // Item id, faction name, flag name, or unlock id
  value: number | string | boolean;
}

export interface QuestChoiceEffect {
  type: 'reputation' | 'item' | 'gold' | 'flag';
  target?: string;
  value: number | string | boolean;
}

export interface QuestChoice {
  id: string;
  text: string; // What the player sees
  nextStageId: string; // Which stage to go to
  effects?: QuestChoiceEffect[]; // Reputation changes, items gained/lost, etc.
  condition?: QuestRequirement; // Optional requirement to show this choice
}

export interface QuestStage {
  id: string;
  objective: string; // Text description of what to do
  type: 'deliver' | 'collect' | 'talk' | 'travel' | 'trade' | 'wait';
  target: string; // ID of item, NPC, location, etc.
  quantity?: number; // For collect/deliver quests
  choices?: QuestChoice[]; // For branching narratives
  onComplete?: QuestChoiceEffect[]; // Effects applied when stage completes
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  faction?: string; // Optional faction association
  giver: string; // NPC id who gives the quest
  stages: QuestStage[];
  rewards: QuestReward[];
  requirements?: QuestRequirement[]; // Prerequisites to start the quest
  isRepeatable?: boolean;
  timeLimit?: number; // In game hours, optional
}

// Tracks progress for an active quest
interface ActiveQuestState {
  questId: string;
  currentStageIndex: number;
  currentStageId: string;
  progress: number; // For quantity-based objectives
  startTime: number;
  flags: Map<string, boolean | string | number>; // Quest-specific flags
}

// ============================================================================
// Quest System Class
// ============================================================================

export class QuestSystem {
  private scene: Phaser.Scene;
  
  // Quest storage
  private availableQuests: Map<string, Quest> = new Map();
  private activeQuests: Map<string, ActiveQuestState> = new Map();
  private completedQuests: Set<string> = new Set();
  private failedQuests: Set<string> = new Set();
  
  // External state accessors (set via setters for loose coupling)
  private getPlayerGold: () => number = () => 0;
  private getPlayerReputation: (faction: string) => number = () => 0;
  private hasPlayerItem: (itemId: string, quantity?: number) => boolean = () => false;
  private getFlag: (flagName: string) => boolean | string | number | undefined = () => undefined;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeSampleQuests();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Set external state accessors for requirement checking
   */
  public setStateAccessors(accessors: {
    getPlayerGold?: () => number;
    getPlayerReputation?: (faction: string) => number;
    hasPlayerItem?: (itemId: string, quantity?: number) => boolean;
    getFlag?: (flagName: string) => boolean | string | number | undefined;
  }): void {
    if (accessors.getPlayerGold) this.getPlayerGold = accessors.getPlayerGold;
    if (accessors.getPlayerReputation) this.getPlayerReputation = accessors.getPlayerReputation;
    if (accessors.hasPlayerItem) this.hasPlayerItem = accessors.hasPlayerItem;
    if (accessors.getFlag) this.getFlag = accessors.getFlag;
  }

  // ============================================================================
  // Quest Registration
  // ============================================================================

  /**
   * Register a quest to make it available
   */
  public registerQuest(quest: Quest): void {
    this.availableQuests.set(quest.id, quest);
  }

  /**
   * Register multiple quests at once
   */
  public registerQuests(quests: Quest[]): void {
    for (const quest of quests) {
      this.registerQuest(quest);
    }
  }

  /**
   * Get a quest definition by ID
   */
  public getQuest(questId: string): Quest | undefined {
    return this.availableQuests.get(questId);
  }

  // ============================================================================
  // Requirement Checking
  // ============================================================================

  /**
   * Check if a single requirement is met
   */
  private checkRequirement(req: QuestRequirement): boolean {
    const comparison = req.comparison || 'gte';
    
    switch (req.type) {
      case 'gold': {
        const gold = this.getPlayerGold();
        return this.compareValues(gold, req.value as number, comparison);
      }
      
      case 'reputation': {
        if (!req.target) return false;
        const rep = this.getPlayerReputation(req.target);
        return this.compareValues(rep, req.value as number, comparison);
      }
      
      case 'item': {
        if (!req.target) return false;
        const quantity = typeof req.value === 'number' ? req.value : 1;
        return this.hasPlayerItem(req.target, quantity);
      }
      
      case 'quest': {
        if (!req.target) return false;
        const isComplete = this.isQuestComplete(req.target);
        return req.value === true ? isComplete : !isComplete;
      }
      
      case 'flag': {
        if (!req.target) return false;
        const flagValue = this.getFlag(req.target);
        if (flagValue === undefined) return req.value === false;
        return flagValue === req.value;
      }
      
      default:
        return false;
    }
  }

  private compareValues(actual: number, expected: number, comparison: string): boolean {
    switch (comparison) {
      case 'gte': return actual >= expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      case 'neq': return actual !== expected;
      default: return actual >= expected;
    }
  }

  /**
   * Check if all requirements for a quest are met
   */
  public canStartQuest(questId: string): { canStart: boolean; failedRequirements: string[] } {
    const quest = this.availableQuests.get(questId);
    if (!quest) {
      return { canStart: false, failedRequirements: ['Quest not found'] };
    }

    // Check if already active or completed (unless repeatable)
    if (this.activeQuests.has(questId)) {
      return { canStart: false, failedRequirements: ['Quest already active'] };
    }

    if (this.completedQuests.has(questId) && !quest.isRepeatable) {
      return { canStart: false, failedRequirements: ['Quest already completed'] };
    }

    // Check requirements
    const failedRequirements: string[] = [];
    
    if (quest.requirements) {
      for (const req of quest.requirements) {
        if (!this.checkRequirement(req)) {
          failedRequirements.push(this.getRequirementDescription(req));
        }
      }
    }

    return {
      canStart: failedRequirements.length === 0,
      failedRequirements,
    };
  }

  private getRequirementDescription(req: QuestRequirement): string {
    switch (req.type) {
      case 'gold':
        return `Requires ${req.value} gold`;
      case 'reputation':
        return `Requires ${req.value} reputation with ${req.target}`;
      case 'item':
        return `Requires item: ${req.target}`;
      case 'quest':
        return `Requires completion of quest: ${req.target}`;
      case 'flag':
        return `Requires flag: ${req.target}`;
      default:
        return 'Unknown requirement';
    }
  }

  // ============================================================================
  // Quest Lifecycle
  // ============================================================================

  /**
   * Start a quest if requirements are met
   */
  public startQuest(questId: string): boolean {
    const { canStart, failedRequirements } = this.canStartQuest(questId);
    
    if (!canStart) {
      console.warn(`Cannot start quest ${questId}:`, failedRequirements);
      return false;
    }

    const quest = this.availableQuests.get(questId)!;
    
    // Initialize quest state
    const state: ActiveQuestState = {
      questId,
      currentStageIndex: 0,
      currentStageId: quest.stages[0].id,
      progress: 0,
      startTime: Date.now(),
      flags: new Map(),
    };

    this.activeQuests.set(questId, state);

    // Emit event
    this.scene.events.emit('questStarted', {
      questId,
      quest,
      stage: quest.stages[0],
    });

    console.log(`Quest started: ${quest.title}`);
    return true;
  }

  /**
   * Advance to the next stage of a quest, optionally via a specific choice
   */
  public advanceStage(questId: string, choiceId?: string): boolean {
    const state = this.activeQuests.get(questId);
    if (!state) {
      console.warn(`Quest not active: ${questId}`);
      return false;
    }

    const quest = this.availableQuests.get(questId);
    if (!quest) return false;

    const currentStage = quest.stages.find(s => s.id === state.currentStageId);
    if (!currentStage) return false;

    // Apply stage completion effects
    if (currentStage.onComplete) {
      this.applyEffects(currentStage.onComplete);
    }

    let nextStageId: string | null = null;

    // If a choice was made, use that to determine next stage
    if (choiceId && currentStage.choices) {
      const choice = currentStage.choices.find(c => c.id === choiceId);
      if (choice) {
        // Check choice condition if present
        if (choice.condition && !this.checkRequirement(choice.condition)) {
          console.warn(`Choice condition not met: ${choiceId}`);
          return false;
        }

        // Apply choice effects
        if (choice.effects) {
          this.applyEffects(choice.effects);
        }

        nextStageId = choice.nextStageId;
      }
    }

    // If no choice or choice didn't specify next stage, go to next in sequence
    if (!nextStageId) {
      const currentIndex = quest.stages.findIndex(s => s.id === state.currentStageId);
      if (currentIndex < quest.stages.length - 1) {
        nextStageId = quest.stages[currentIndex + 1].id;
      }
    }

    // Check if quest is complete (no more stages)
    if (!nextStageId || nextStageId === 'complete') {
      this.completeQuest(questId);
      return true;
    }

    // Check for failure
    if (nextStageId === 'fail') {
      this.failQuest(questId);
      return true;
    }

    // Find next stage
    const nextStage = quest.stages.find(s => s.id === nextStageId);
    if (!nextStage) {
      console.warn(`Next stage not found: ${nextStageId}`);
      return false;
    }

    // Update state
    const nextStageIndex = quest.stages.indexOf(nextStage);
    state.currentStageIndex = nextStageIndex;
    state.currentStageId = nextStageId;
    state.progress = 0;

    // Emit event
    this.scene.events.emit('questStageAdvanced', {
      questId,
      quest,
      previousStage: currentStage,
      currentStage: nextStage,
      stageIndex: nextStageIndex,
    });

    console.log(`Quest ${quest.title}: Advanced to stage "${nextStage.objective}"`);
    return true;
  }

  /**
   * Update progress for quantity-based objectives
   */
  public updateProgress(questId: string, amount: number = 1): void {
    const state = this.activeQuests.get(questId);
    if (!state) return;

    const quest = this.availableQuests.get(questId);
    if (!quest) return;

    const currentStage = quest.stages.find(s => s.id === state.currentStageId);
    if (!currentStage || !currentStage.quantity) return;

    state.progress += amount;

    // Check if objective is complete
    if (state.progress >= currentStage.quantity) {
      // If no choices, auto-advance
      if (!currentStage.choices || currentStage.choices.length === 0) {
        this.advanceStage(questId);
      }
      // Otherwise, player must make a choice or trigger advance manually
    }
  }

  /**
   * Complete a quest and grant rewards
   */
  public completeQuest(questId: string): boolean {
    const state = this.activeQuests.get(questId);
    if (!state) {
      console.warn(`Cannot complete quest: ${questId} not active`);
      return false;
    }

    const quest = this.availableQuests.get(questId);
    if (!quest) return false;

    // Grant rewards
    for (const reward of quest.rewards) {
      this.applyReward(reward);
    }

    // Update state
    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);

    // Emit event
    this.scene.events.emit('questCompleted', {
      questId,
      quest,
      rewards: quest.rewards,
    });

    console.log(`Quest completed: ${quest.title}`);
    return true;
  }

  /**
   * Fail a quest
   */
  public failQuest(questId: string): boolean {
    const state = this.activeQuests.get(questId);
    if (!state) {
      console.warn(`Cannot fail quest: ${questId} not active`);
      return false;
    }

    const quest = this.availableQuests.get(questId);
    if (!quest) return false;

    // Update state
    this.activeQuests.delete(questId);
    this.failedQuests.add(questId);

    // Emit event
    this.scene.events.emit('questFailed', {
      questId,
      quest,
    });

    console.log(`Quest failed: ${quest.title}`);
    return true;
  }

  // ============================================================================
  // Effects and Rewards
  // ============================================================================

  private applyEffects(effects: QuestChoiceEffect[]): void {
    for (const effect of effects) {
      this.scene.events.emit('questEffect', effect);
      
      switch (effect.type) {
        case 'gold':
          this.scene.events.emit('goldChange', effect.value);
          break;
        case 'reputation':
          this.scene.events.emit('reputationChange', {
            target: effect.target,
            value: effect.value,
          });
          break;
        case 'item':
          if (typeof effect.value === 'number' && effect.value > 0) {
            this.scene.events.emit('itemGained', {
              item: effect.target,
              quantity: effect.value,
            });
          } else if (typeof effect.value === 'number' && effect.value < 0) {
            this.scene.events.emit('itemLost', {
              item: effect.target,
              quantity: Math.abs(effect.value),
            });
          }
          break;
        case 'flag':
          this.scene.events.emit('flagSet', {
            flag: effect.target,
            value: effect.value,
          });
          break;
      }
    }
  }

  private applyReward(reward: QuestReward): void {
    switch (reward.type) {
      case 'gold':
        this.scene.events.emit('goldChange', reward.value);
        break;
      case 'item':
        this.scene.events.emit('itemGained', {
          item: reward.target,
          quantity: typeof reward.value === 'number' ? reward.value : 1,
        });
        break;
      case 'reputation':
        this.scene.events.emit('reputationChange', {
          target: reward.target,
          value: reward.value,
        });
        break;
      case 'flag':
        this.scene.events.emit('flagSet', {
          flag: reward.target,
          value: reward.value,
        });
        break;
      case 'unlock':
        this.scene.events.emit('unlock', {
          type: reward.target,
          value: reward.value,
        });
        break;
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get all active quests
   */
  public getActiveQuests(): { quest: Quest; state: ActiveQuestState }[] {
    const result: { quest: Quest; state: ActiveQuestState }[] = [];
    
    for (const [questId, state] of this.activeQuests) {
      const quest = this.availableQuests.get(questId);
      if (quest) {
        result.push({ quest, state });
      }
    }

    return result;
  }

  /**
   * Get the current stage of an active quest
   */
  public getCurrentStage(questId: string): QuestStage | undefined {
    const state = this.activeQuests.get(questId);
    if (!state) return undefined;

    const quest = this.availableQuests.get(questId);
    if (!quest) return undefined;

    return quest.stages.find(s => s.id === state.currentStageId);
  }

  /**
   * Get available choices for current stage
   */
  public getAvailableChoices(questId: string): QuestChoice[] {
    const stage = this.getCurrentStage(questId);
    if (!stage || !stage.choices) return [];

    // Filter choices by conditions
    return stage.choices.filter(choice => {
      if (!choice.condition) return true;
      return this.checkRequirement(choice.condition);
    });
  }

  /**
   * Check if a quest has been completed
   */
  public isQuestComplete(questId: string): boolean {
    return this.completedQuests.has(questId);
  }

  /**
   * Check if a quest has been failed
   */
  public isQuestFailed(questId: string): boolean {
    return this.failedQuests.has(questId);
  }

  /**
   * Check if a quest is currently active
   */
  public isQuestActive(questId: string): boolean {
    return this.activeQuests.has(questId);
  }

  /**
   * Get all completed quest IDs
   */
  public getCompletedQuests(): string[] {
    return Array.from(this.completedQuests);
  }

  /**
   * Get all failed quest IDs
   */
  public getFailedQuests(): string[] {
    return Array.from(this.failedQuests);
  }

  /**
   * Get quests available from a specific NPC
   */
  public getQuestsFromNPC(npcId: string): Quest[] {
    const quests: Quest[] = [];
    
    for (const quest of this.availableQuests.values()) {
      if (quest.giver === npcId) {
        const { canStart } = this.canStartQuest(quest.id);
        if (canStart || this.isQuestActive(quest.id)) {
          quests.push(quest);
        }
      }
    }

    return quests;
  }

  /**
   * Handle NPC interaction for quest progress (talk objectives)
   */
  public handleNPCInteraction(npcId: string): void {
    // Check all active quests for talk objectives matching this NPC
    for (const [questId, state] of this.activeQuests) {
      const quest = this.availableQuests.get(questId);
      if (!quest) continue;
      
      const currentStage = quest.stages.find(s => s.id === state.currentStageId);
      if (!currentStage) continue;
      
      // Check if this is a talk objective targeting this NPC
      if (currentStage.type === 'talk' && currentStage.target === npcId) {
        console.log(`Quest progress: Talked to ${npcId} for quest ${quest.title}`);
        this.advanceStage(questId);
      }
    }
  }

  /**
   * Handle item acquisition for quest progress (collect objectives)
   */
  public handleItemAcquired(itemId: string, quantity: number = 1): void {
    // Check all active quests for collect objectives matching this item
    for (const [questId, state] of this.activeQuests) {
      const quest = this.availableQuests.get(questId);
      if (!quest) continue;
      
      const currentStage = quest.stages.find(s => s.id === state.currentStageId);
      if (!currentStage) continue;
      
      // Check if this is a collect objective targeting this item
      if (currentStage.type === 'collect' && currentStage.target === itemId) {
        const targetQuantity = currentStage.quantity || 1;
        const newProgress = state.progress + quantity;
        state.progress = newProgress;
        
        console.log(`Quest progress: Collected ${itemId} (${newProgress}/${targetQuantity}) for quest ${quest.title}`);
        
        if (newProgress >= targetQuantity) {
          this.advanceStage(questId);
        }
      }
    }
  }

  /**
   * Handle item delivery for quest progress (deliver objectives)
   */
  public handleItemDelivered(npcId: string, _itemId: string, quantity: number): void {
    // Check all active quests for deliver objectives
    for (const [questId, state] of this.activeQuests) {
      const quest = this.availableQuests.get(questId);
      if (!quest) continue;

      const currentStage = quest.stages.find(s => s.id === state.currentStageId);
      if (!currentStage) continue;

      // Check if this is a deliver objective targeting this NPC with this item
      if (currentStage.type === 'deliver' && currentStage.target === npcId) {
        const targetQuantity = currentStage.quantity || 1;

        if (quantity >= targetQuantity) {
          console.log(`Quest progress: Delivered to ${npcId} for quest ${quest.title}`);
          this.advanceStage(questId);
        }
      }
    }
  }

  // ============================================================================
  // Save / Load
  // ============================================================================

  /**
   * Get serializable save data for the quest system
   */
  public getSaveData(): {
    active: Array<{ questId: string; stageIndex: number; stageId: string; progress: number; startTime: number; flags: Record<string, boolean | string | number> }>;
    completed: string[];
    failed: string[];
  } {
    const activeData: Array<{
      questId: string;
      stageIndex: number;
      stageId: string;
      progress: number;
      startTime: number;
      flags: Record<string, boolean | string | number>;
    }> = [];

    for (const [questId, state] of this.activeQuests) {
      const flagsObj: Record<string, boolean | string | number> = {};
      state.flags.forEach((value, key) => {
        flagsObj[key] = value;
      });

      activeData.push({
        questId,
        stageIndex: state.currentStageIndex,
        stageId: state.currentStageId,
        progress: state.progress,
        startTime: state.startTime,
        flags: flagsObj,
      });
    }

    return {
      active: activeData,
      completed: Array.from(this.completedQuests),
      failed: Array.from(this.failedQuests),
    };
  }

  /**
   * Load quest state from save data
   */
  public loadSaveData(data: {
    active?: Array<{ questId: string; stageIndex: number; stageId: string; progress: number; startTime: number; flags?: Record<string, boolean | string | number> }>;
    completed?: string[];
    failed?: string[];
  }): void {
    // Clear current state
    this.activeQuests.clear();
    this.completedQuests.clear();
    this.failedQuests.clear();

    // Restore active quests
    if (data.active) {
      for (const activeData of data.active) {
        const flags = new Map<string, boolean | string | number>();
        if (activeData.flags) {
          for (const [key, value] of Object.entries(activeData.flags)) {
            flags.set(key, value);
          }
        }

        this.activeQuests.set(activeData.questId, {
          questId: activeData.questId,
          currentStageIndex: activeData.stageIndex,
          currentStageId: activeData.stageId,
          progress: activeData.progress,
          startTime: activeData.startTime,
          flags,
        });
      }
    }

    // Restore completed quests
    if (data.completed) {
      for (const questId of data.completed) {
        this.completedQuests.add(questId);
      }
    }

    // Restore failed quests
    if (data.failed) {
      for (const questId of data.failed) {
        this.failedQuests.add(questId);
      }
    }

    this.scene.events.emit('questStateLoaded');
    console.log(`Loaded quest state: ${this.activeQuests.size} active, ${this.completedQuests.size} completed, ${this.failedQuests.size} failed`);
  }

  // ============================================================================
  // Sample Quest Data
  // ============================================================================

  private initializeSampleQuests(): void {
    // "The Pepper Contract" - A Crown faction quest about securing a trade monopoly
    const pepperContractQuest: Quest = {
      id: 'quest_pepper_contract',
      title: 'The Pepper Contract',
      description: 
        'The Portuguese Crown seeks to establish a monopoly on the Malabar pepper trade. ' +
        'Governor Afonso de Albuquerque\'s representative needs a capable merchant to ' +
        'negotiate with local suppliers and secure exclusive contracts. Success will ' +
        'bring royal favor; failure could mean losing everything.',
      faction: 'crown',
      giver: 'npc_crown_representative',
      requirements: [
        { type: 'reputation', target: 'crown', value: 10, comparison: 'gte' },
        { type: 'gold', value: 500, comparison: 'gte' },
      ],
      stages: [
        {
          id: 'stage_1_meet_representative',
          objective: 'Meet with the Crown Representative at the Governor\'s Palace',
          type: 'talk',
          target: 'npc_crown_representative',
        },
        {
          id: 'stage_2_gather_info',
          objective: 'Speak with local merchants to learn about pepper suppliers',
          type: 'talk',
          target: 'npc_hindu_trader',
          choices: [
            {
              id: 'choice_bribe',
              text: 'Offer a generous bribe for exclusive information',
              nextStageId: 'stage_3_negotiate_easy',
              effects: [
                { type: 'gold', value: -100 },
                { type: 'flag', target: 'pepper_bribed_info', value: true },
              ],
            },
            {
              id: 'choice_honest',
              text: 'Ask honestly and build a genuine relationship',
              nextStageId: 'stage_3_negotiate_hard',
              effects: [
                { type: 'reputation', target: 'hindu_merchants', value: 5 },
              ],
            },
            {
              id: 'choice_threaten',
              text: 'Imply consequences for those who don\'t cooperate',
              nextStageId: 'stage_3_negotiate_hostile',
              effects: [
                { type: 'reputation', target: 'hindu_merchants', value: -10 },
                { type: 'reputation', target: 'crown', value: 5 },
              ],
            },
          ],
        },
        {
          id: 'stage_3_negotiate_easy',
          objective: 'Use your insider knowledge to negotiate with the Pepper Guild',
          type: 'talk',
          target: 'npc_pepper_guild_master',
          onComplete: [
            { type: 'flag', target: 'pepper_contract_method', value: 'bribe' },
          ],
        },
        {
          id: 'stage_3_negotiate_hard',
          objective: 'Negotiate fairly with the Pepper Guild',
          type: 'talk',
          target: 'npc_pepper_guild_master',
          onComplete: [
            { type: 'flag', target: 'pepper_contract_method', value: 'honest' },
          ],
        },
        {
          id: 'stage_3_negotiate_hostile',
          objective: 'Force the Pepper Guild to accept Crown terms',
          type: 'talk',
          target: 'npc_pepper_guild_master',
          choices: [
            {
              id: 'choice_escalate',
              text: 'Threaten to bring in Crown soldiers',
              nextStageId: 'stage_4_deliver',
              effects: [
                { type: 'reputation', target: 'hindu_merchants', value: -20 },
                { type: 'flag', target: 'pepper_used_force', value: true },
              ],
            },
            {
              id: 'choice_back_down',
              text: 'Reconsider and attempt peaceful negotiation',
              nextStageId: 'stage_3_negotiate_hard',
              effects: [
                { type: 'reputation', target: 'hindu_merchants', value: 10 },
              ],
            },
          ],
          onComplete: [
            { type: 'flag', target: 'pepper_contract_method', value: 'hostile' },
          ],
        },
        {
          id: 'stage_4_deliver',
          objective: 'Deliver the signed contract to the Crown Representative',
          type: 'deliver',
          target: 'npc_crown_representative',
          quantity: 1,
        },
        {
          id: 'stage_5_final',
          objective: 'Collect your reward from the Crown Representative',
          type: 'talk',
          target: 'npc_crown_representative',
          choices: [
            {
              id: 'choice_modest',
              text: 'Accept the standard reward with gratitude',
              nextStageId: 'complete',
              effects: [
                { type: 'reputation', target: 'crown', value: 10 },
              ],
            },
            {
              id: 'choice_ambitious',
              text: 'Request a position in the colonial administration',
              nextStageId: 'complete',
              effects: [
                { type: 'reputation', target: 'crown', value: 5 },
                { type: 'flag', target: 'crown_administration_offer', value: true },
              ],
              condition: {
                type: 'reputation',
                target: 'crown',
                value: 25,
                comparison: 'gte',
              },
            },
          ],
        },
      ],
      rewards: [
        { type: 'gold', value: 1000 },
        { type: 'reputation', target: 'crown', value: 15 },
        { type: 'item', target: 'item_royal_trade_license', value: 1 },
        { type: 'unlock', target: 'crown_exclusive_quests', value: true },
      ],
    };

    this.registerQuest(pepperContractQuest);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.activeQuests.clear();
    this.completedQuests.clear();
  }
}
