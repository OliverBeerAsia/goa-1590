import Phaser from 'phaser';

/**
 * AchievementSystem - Tracks milestones and rewards
 *
 * Achievements provide both recognition and gameplay rewards,
 * encouraging exploration of all game systems.
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'trading' | 'wealth' | 'exploration' | 'social' | 'story';
  icon: string;
  reward?: AchievementReward;
  hidden: boolean;       // Hidden until unlocked
  requirement: AchievementRequirement;
}

interface AchievementReward {
  type: 'gold' | 'capacity' | 'unlock' | 'reputation' | 'skill';
  value: number | string;
  description: string;
}

interface AchievementRequirement {
  type: 'gold_earned' | 'gold_held' | 'trades_completed' | 'contracts_completed' |
        'routes_completed' | 'npcs_met' | 'quests_completed' | 'faction_honored' |
        'rank_achieved' | 'days_survived' | 'skill_level' | 'custom';
  target: number | string;
}

interface AchievementProgress {
  achievementId: string;
  current: number;
  unlocked: boolean;
  unlockedAt?: number;  // Game time when unlocked
}

interface AchievementSaveData {
  progress: AchievementProgress[];
}

export class AchievementSystem {
  private scene: Phaser.Scene;
  private achievements: Map<string, Achievement> = new Map();
  private progress: Map<string, AchievementProgress> = new Map();

  private readonly defaultAchievements: Achievement[] = [
    // Wealth achievements
    {
      id: 'first_hundred',
      name: 'Getting Started',
      description: 'Accumulate 100 gold',
      category: 'wealth',
      icon: 'coin_small',
      hidden: false,
      requirement: { type: 'gold_held', target: 100 },
    },
    {
      id: 'first_thousand',
      name: 'Rising Merchant',
      description: 'Accumulate 1,000 gold',
      category: 'wealth',
      icon: 'coin_stack',
      reward: { type: 'capacity', value: 5, description: '+5 carry capacity' },
      hidden: false,
      requirement: { type: 'gold_held', target: 1000 },
    },
    {
      id: 'five_thousand',
      name: 'Wealthy Trader',
      description: 'Accumulate 5,000 gold',
      category: 'wealth',
      icon: 'gold_bar',
      reward: { type: 'unlock', value: 'price_information', description: 'See market trends' },
      hidden: false,
      requirement: { type: 'gold_held', target: 5000 },
    },
    {
      id: 'merchant_prince',
      name: 'Merchant Prince',
      description: 'Accumulate 50,000 gold',
      category: 'wealth',
      icon: 'crown',
      hidden: false,
      requirement: { type: 'gold_held', target: 50000 },
    },

    // Trading achievements
    {
      id: 'first_trade',
      name: 'First Sale',
      description: 'Complete your first trade',
      category: 'trading',
      icon: 'handshake',
      hidden: false,
      requirement: { type: 'trades_completed', target: 1 },
    },
    {
      id: 'ten_trades',
      name: 'Regular Trader',
      description: 'Complete 10 trades',
      category: 'trading',
      icon: 'scales',
      reward: { type: 'skill', value: 'negotiation_5', description: '+5 Negotiation skill' },
      hidden: false,
      requirement: { type: 'trades_completed', target: 10 },
    },
    {
      id: 'fifty_trades',
      name: 'Experienced Dealer',
      description: 'Complete 50 trades',
      category: 'trading',
      icon: 'ledger',
      reward: { type: 'gold', value: 100, description: '100 gold bonus' },
      hidden: false,
      requirement: { type: 'trades_completed', target: 50 },
    },
    {
      id: 'hundred_trades',
      name: 'Master Negotiator',
      description: 'Complete 100 trades',
      category: 'trading',
      icon: 'seal',
      reward: { type: 'skill', value: 'negotiation_10', description: '+10 Negotiation skill' },
      hidden: false,
      requirement: { type: 'trades_completed', target: 100 },
    },

    // Contract achievements
    {
      id: 'first_contract',
      name: 'Contracted',
      description: 'Complete your first contract',
      category: 'trading',
      icon: 'scroll',
      hidden: false,
      requirement: { type: 'contracts_completed', target: 1 },
    },
    {
      id: 'reliable_supplier',
      name: 'Reliable Supplier',
      description: 'Complete 10 contracts',
      category: 'trading',
      icon: 'scroll_gold',
      reward: { type: 'reputation', value: 'all_10', description: '+10 reputation with all factions' },
      hidden: false,
      requirement: { type: 'contracts_completed', target: 10 },
    },

    // Trade route achievements
    {
      id: 'first_voyage',
      name: 'First Voyage',
      description: 'Complete your first trade route',
      category: 'exploration',
      icon: 'ship',
      hidden: false,
      requirement: { type: 'routes_completed', target: 1 },
    },
    {
      id: 'seasoned_voyager',
      name: 'Seasoned Voyager',
      description: 'Complete 10 trade routes',
      category: 'exploration',
      icon: 'compass',
      reward: { type: 'skill', value: 'navigation_10', description: '+10 Navigation skill' },
      hidden: false,
      requirement: { type: 'routes_completed', target: 10 },
    },

    // Social achievements
    {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Meet 10 different NPCs',
      category: 'social',
      icon: 'crowd',
      hidden: false,
      requirement: { type: 'npcs_met', target: 10 },
    },
    {
      id: 'crown_friend',
      name: 'Friend of the Crown',
      description: 'Reach Honored status with the Crown faction',
      category: 'social',
      icon: 'crown_small',
      reward: { type: 'unlock', value: 'crown_contracts', description: 'Access to Crown exclusive contracts' },
      hidden: false,
      requirement: { type: 'faction_honored', target: 'crown' },
    },
    {
      id: 'free_spirit',
      name: 'Free Spirit',
      description: 'Reach Honored status with the Free Traders',
      category: 'social',
      icon: 'feather',
      reward: { type: 'unlock', value: 'smuggler_routes', description: 'Access to hidden trade routes' },
      hidden: false,
      requirement: { type: 'faction_honored', target: 'free_traders' },
    },
    {
      id: 'keeper_traditions',
      name: 'Keeper of Traditions',
      description: 'Reach Honored status with the Old Routes',
      category: 'social',
      icon: 'ancient_map',
      reward: { type: 'unlock', value: 'ancient_wisdom', description: 'Access to ancient trading secrets' },
      hidden: false,
      requirement: { type: 'faction_honored', target: 'old_routes' },
    },

    // Story achievements
    {
      id: 'first_quest',
      name: 'Adventurer',
      description: 'Complete your first quest',
      category: 'story',
      icon: 'quest_marker',
      hidden: false,
      requirement: { type: 'quests_completed', target: 1 },
    },
    {
      id: 'quest_master',
      name: 'Quest Master',
      description: 'Complete all main quests',
      category: 'story',
      icon: 'trophy',
      hidden: true,
      requirement: { type: 'quests_completed', target: 3 },
    },

    // Survival achievements
    {
      id: 'week_survivor',
      name: 'Week Survivor',
      description: 'Survive for 7 days',
      category: 'exploration',
      icon: 'calendar',
      hidden: false,
      requirement: { type: 'days_survived', target: 7 },
    },
    {
      id: 'month_veteran',
      name: 'Month Veteran',
      description: 'Survive for 30 days',
      category: 'exploration',
      icon: 'calendar_gold',
      reward: { type: 'gold', value: 500, description: '500 gold bonus' },
      hidden: false,
      requirement: { type: 'days_survived', target: 30 },
    },

    // Rank achievements
    {
      id: 'rank_trader',
      name: 'Licensed to Trade',
      description: 'Achieve the Trader rank',
      category: 'wealth',
      icon: 'badge',
      hidden: false,
      requirement: { type: 'rank_achieved', target: 1 },
    },
    {
      id: 'rank_merchant',
      name: 'Merchant Class',
      description: 'Achieve the Merchant rank',
      category: 'wealth',
      icon: 'badge_silver',
      hidden: false,
      requirement: { type: 'rank_achieved', target: 2 },
    },
    {
      id: 'rank_master',
      name: 'Master of Trade',
      description: 'Achieve the Master rank',
      category: 'wealth',
      icon: 'badge_gold',
      hidden: false,
      requirement: { type: 'rank_achieved', target: 3 },
    },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeAchievements();
    this.setupEventListeners();
  }

  private initializeAchievements(): void {
    for (const achievement of this.defaultAchievements) {
      this.achievements.set(achievement.id, achievement);
      this.progress.set(achievement.id, {
        achievementId: achievement.id,
        current: 0,
        unlocked: false,
      });
    }
  }

  private setupEventListeners(): void {
    // Track gold changes
    this.scene.events.on('goldChange', (gold: number) => {
      this.updateProgress('gold_held', gold);
    });

    // Track trades
    this.scene.events.on('playerBuy', () => {
      this.incrementProgress('trades_completed', 1);
    });
    this.scene.events.on('playerSell', () => {
      this.incrementProgress('trades_completed', 1);
    });

    // Track contracts
    this.scene.events.on('contractCompleted', () => {
      this.incrementProgress('contracts_completed', 1);
    });

    // Track trade routes
    this.scene.events.on('expeditionCompleted', () => {
      this.incrementProgress('routes_completed', 1);
    });

    // Track NPC meetings
    this.scene.events.on('npcInteraction', () => {
      this.incrementProgress('npcs_met', 1);
    });

    // Track quest completions
    this.scene.events.on('questCompleted', () => {
      this.incrementProgress('quests_completed', 1);
    });

    // Track faction reputation
    this.scene.events.on('reputationLevelChange', (data: { factionId: string; newLevel: string }) => {
      if (data.newLevel === 'honored' || data.newLevel === 'champion') {
        this.checkFactionAchievement(data.factionId);
      }
    });

    // Track rank changes
    this.scene.events.on('rankUp', (data: { newRank: number }) => {
      this.updateProgress('rank_achieved', data.newRank);
    });

    // Track days
    this.scene.events.on('newDay', (data: { dayCount: number }) => {
      this.updateProgress('days_survived', data.dayCount);
    });
  }

  private updateProgress(type: string, value: number): void {
    for (const [id, achievement] of this.achievements) {
      const prog = this.progress.get(id);
      if (!prog || prog.unlocked) continue;

      if (achievement.requirement.type === type) {
        const target = achievement.requirement.target as number;
        prog.current = value;

        if (value >= target) {
          this.unlockAchievement(id);
        }
      }
    }
  }

  private incrementProgress(type: string, amount: number): void {
    for (const [id, achievement] of this.achievements) {
      const prog = this.progress.get(id);
      if (!prog || prog.unlocked) continue;

      if (achievement.requirement.type === type) {
        const target = achievement.requirement.target as number;
        prog.current += amount;

        if (prog.current >= target) {
          this.unlockAchievement(id);
        }
      }
    }
  }

  private checkFactionAchievement(factionId: string): void {
    for (const [id, achievement] of this.achievements) {
      const prog = this.progress.get(id);
      if (!prog || prog.unlocked) continue;

      if (achievement.requirement.type === 'faction_honored' &&
          achievement.requirement.target === factionId) {
        this.unlockAchievement(id);
      }
    }
  }

  private unlockAchievement(achievementId: string): void {
    const achievement = this.achievements.get(achievementId);
    const prog = this.progress.get(achievementId);

    if (!achievement || !prog || prog.unlocked) return;

    prog.unlocked = true;
    prog.unlockedAt = this.getCurrentGameTime();

    // Grant reward
    if (achievement.reward) {
      this.grantReward(achievement.reward);
    }

    // Emit achievement unlocked event
    this.scene.events.emit('achievementUnlocked', {
      achievement,
      progress: prog,
    });

    // Show notification
    this.scene.events.emit('notification', {
      title: 'Achievement Unlocked!',
      message: `${achievement.name}: ${achievement.description}`,
      type: 'achievement',
    });
  }

  private grantReward(reward: AchievementReward): void {
    switch (reward.type) {
      case 'gold':
        this.scene.events.emit('goldChange', reward.value as number);
        break;

      case 'capacity':
        // Will be handled by ProgressionSystem
        this.scene.events.emit('capacityBonus', reward.value);
        break;

      case 'unlock':
        this.scene.events.emit('featureUnlocked', reward.value);
        break;

      case 'reputation':
        // Format: 'all_10' or 'crown_10'
        const [target, amount] = (reward.value as string).split('_');
        if (target === 'all') {
          ['crown', 'free_traders', 'old_routes'].forEach(faction => {
            this.scene.events.emit('reputationChange', {
              target: faction,
              value: parseInt(amount),
            });
          });
        } else {
          this.scene.events.emit('reputationChange', {
            target,
            value: parseInt(amount),
          });
        }
        break;

      case 'skill':
        // Format: 'negotiation_5'
        const [skill, skillAmount] = (reward.value as string).split('_');
        this.scene.events.emit('skillBonus', {
          skill,
          amount: parseInt(skillAmount),
        });
        break;
    }
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
    return 0;
  }

  public getAchievement(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }

  public getProgress(id: string): AchievementProgress | undefined {
    return this.progress.get(id);
  }

  public getUnlockedAchievements(): Achievement[] {
    const unlocked: Achievement[] = [];
    for (const [id, prog] of this.progress) {
      if (prog.unlocked) {
        const achievement = this.achievements.get(id);
        if (achievement) unlocked.push(achievement);
      }
    }
    return unlocked;
  }

  public getLockedAchievements(includeHidden: boolean = false): Achievement[] {
    const locked: Achievement[] = [];
    for (const [id, prog] of this.progress) {
      if (!prog.unlocked) {
        const achievement = this.achievements.get(id);
        if (achievement && (includeHidden || !achievement.hidden)) {
          locked.push(achievement);
        }
      }
    }
    return locked;
  }

  public getAllAchievements(): { achievement: Achievement; progress: AchievementProgress }[] {
    const all: { achievement: Achievement; progress: AchievementProgress }[] = [];
    for (const [id, achievement] of this.achievements) {
      const prog = this.progress.get(id);
      if (prog) {
        all.push({ achievement, progress: prog });
      }
    }
    return all;
  }

  public getCompletionPercentage(): number {
    const total = this.achievements.size;
    const unlocked = this.getUnlockedAchievements().length;
    return (unlocked / total) * 100;
  }

  public getSaveData(): AchievementSaveData {
    return {
      progress: Array.from(this.progress.values()),
    };
  }

  public loadSaveData(data: AchievementSaveData): void {
    if (data.progress) {
      for (const prog of data.progress) {
        this.progress.set(prog.achievementId, prog);
      }
    }

    this.scene.events.emit('achievementsLoaded', {
      unlocked: this.getUnlockedAchievements(),
      completion: this.getCompletionPercentage(),
    });
  }
}
