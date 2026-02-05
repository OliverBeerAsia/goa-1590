import Phaser from 'phaser';

/**
 * ProgressionSystem - Manages merchant rank progression and unlocks
 *
 * Players progress from poor peddler to wealthy merchant prince,
 * unlocking new mechanics and receiving gameplay bonuses at each rank.
 */

export enum MerchantRank {
  PEDDLER = 0,    // Start: 100 gold, 20 capacity
  TRADER = 1,     // 500+ gold: 30 capacity, unlock contracts
  MERCHANT = 2,   // 2000+ gold: 50 capacity, unlock trade routes
  MASTER = 3,     // 10000+ gold: 100 capacity, best prices
  MAGNATE = 4,    // 50000+ gold: Win condition
}

interface RankData {
  name: string;
  title: string;
  description: string;
  goldThreshold: number;
  carryCapacity: number;
  priceModifier: number; // Buy discount (0.9 = 10% off)
  sellModifier: number;  // Sell bonus (1.1 = 10% more)
  unlocks: string[];
}

interface ProgressionSaveData {
  currentRank: MerchantRank;
  highestGoldReached: number;
  totalTradesCompleted: number;
  totalGoldEarned: number;
}

export class ProgressionSystem {
  private scene: Phaser.Scene;
  private currentRank: MerchantRank = MerchantRank.PEDDLER;
  private highestGoldReached = 100;
  private totalTradesCompleted = 0;
  private totalGoldEarned = 0;

  private readonly rankData: Map<MerchantRank, RankData> = new Map([
    [MerchantRank.PEDDLER, {
      name: 'Peddler',
      title: 'Humble Peddler',
      description: 'A newcomer to the spice trade, carrying goods on foot.',
      goldThreshold: 0,
      carryCapacity: 20,
      priceModifier: 1.0,
      sellModifier: 1.0,
      unlocks: [],
    }],
    [MerchantRank.TRADER, {
      name: 'Trader',
      title: 'Licensed Trader',
      description: 'An established trader with a small warehouse.',
      goldThreshold: 500,
      carryCapacity: 30,
      priceModifier: 0.95,
      sellModifier: 1.05,
      unlocks: ['contracts', 'warehouse_access'],
    }],
    [MerchantRank.MERCHANT, {
      name: 'Merchant',
      title: 'Respected Merchant',
      description: 'A known figure in the trading community with connections.',
      goldThreshold: 2000,
      carryCapacity: 50,
      priceModifier: 0.90,
      sellModifier: 1.10,
      unlocks: ['trade_routes', 'bulk_trading', 'special_contracts'],
    }],
    [MerchantRank.MASTER, {
      name: 'Master',
      title: 'Master Merchant',
      description: 'A wealthy trader with ships and warehouses across Goa.',
      goldThreshold: 10000,
      carryCapacity: 100,
      priceModifier: 0.85,
      sellModifier: 1.15,
      unlocks: ['luxury_goods', 'exclusive_contracts', 'price_information'],
    }],
    [MerchantRank.MAGNATE, {
      name: 'Magnate',
      title: 'Trade Magnate',
      description: 'A legendary merchant whose wealth rivals the Crown.',
      goldThreshold: 50000,
      carryCapacity: 200,
      priceModifier: 0.80,
      sellModifier: 1.20,
      unlocks: ['win_condition', 'crown_audience', 'monopoly_rights'],
    }],
  ]);

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for gold changes to check rank progression
    this.scene.events.on('goldChange', (newGold: number) => {
      this.checkRankProgression(newGold);
    });

    // Track trades
    this.scene.events.on('playerBuy', () => {
      this.totalTradesCompleted++;
      this.scene.events.emit('progressionUpdate', this.getProgressionData());
    });

    this.scene.events.on('playerSell', (data: { price: number }) => {
      this.totalTradesCompleted++;
      this.totalGoldEarned += data.price;
      this.scene.events.emit('progressionUpdate', this.getProgressionData());
    });
  }

  private checkRankProgression(currentGold: number): void {
    // Track highest gold reached
    if (currentGold > this.highestGoldReached) {
      this.highestGoldReached = currentGold;
    }

    // Check for rank up based on highest gold reached (can't lose ranks)
    const newRank = this.calculateRank(this.highestGoldReached);

    if (newRank > this.currentRank) {
      const previousRank = this.currentRank;
      this.currentRank = newRank;

      const rankInfo = this.rankData.get(newRank);
      if (rankInfo) {
        // Emit rank up event
        this.scene.events.emit('rankUp', {
          previousRank,
          newRank,
          rankInfo,
        });

        // Emit notification
        this.scene.events.emit('notification', {
          title: 'Rank Achieved!',
          message: `You are now a ${rankInfo.title}!`,
          type: 'success',
        });

        // Emit unlocks
        for (const unlock of rankInfo.unlocks) {
          this.scene.events.emit('featureUnlocked', unlock);
        }
      }
    }
  }

  private calculateRank(gold: number): MerchantRank {
    // Check from highest rank down
    for (let rank = MerchantRank.MAGNATE; rank >= MerchantRank.PEDDLER; rank--) {
      const data = this.rankData.get(rank);
      if (data && gold >= data.goldThreshold) {
        return rank;
      }
    }
    return MerchantRank.PEDDLER;
  }

  public getCurrentRank(): MerchantRank {
    return this.currentRank;
  }

  public getRankData(rank?: MerchantRank): RankData | undefined {
    return this.rankData.get(rank ?? this.currentRank);
  }

  public getCurrentRankData(): RankData {
    return this.rankData.get(this.currentRank) || this.rankData.get(MerchantRank.PEDDLER)!;
  }

  public getCarryCapacity(): number {
    return this.getCurrentRankData().carryCapacity;
  }

  public getPriceModifier(): number {
    return this.getCurrentRankData().priceModifier;
  }

  public getSellModifier(): number {
    return this.getCurrentRankData().sellModifier;
  }

  public hasUnlock(unlock: string): boolean {
    // Check current rank and all lower ranks for the unlock
    for (let rank = this.currentRank; rank >= MerchantRank.PEDDLER; rank--) {
      const data = this.rankData.get(rank);
      if (data && data.unlocks.includes(unlock)) {
        return true;
      }
    }

    return false;
  }

  public getAllUnlocks(): string[] {
    const unlocks: string[] = [];

    for (let rank = MerchantRank.PEDDLER; rank <= this.currentRank; rank++) {
      const data = this.rankData.get(rank);
      if (data) {
        unlocks.push(...data.unlocks);
      }
    }

    return unlocks;
  }

  public getProgressToNextRank(): { current: number; required: number; percentage: number } | null {
    const nextRank = this.currentRank + 1;
    if (nextRank > MerchantRank.MAGNATE) {
      return null; // Already at max rank
    }

    const currentData = this.rankData.get(this.currentRank)!;
    const nextData = this.rankData.get(nextRank)!;

    const currentThreshold = currentData.goldThreshold;
    const nextThreshold = nextData.goldThreshold;
    const range = nextThreshold - currentThreshold;
    const progress = this.highestGoldReached - currentThreshold;

    return {
      current: this.highestGoldReached,
      required: nextThreshold,
      percentage: Math.min(100, Math.max(0, (progress / range) * 100)),
    };
  }

  public getProgressionData(): {
    rank: MerchantRank;
    rankName: string;
    title: string;
    carryCapacity: number;
    priceModifier: number;
    sellModifier: number;
    highestGold: number;
    totalTrades: number;
    totalEarned: number;
    nextRankProgress: { current: number; required: number; percentage: number } | null;
  } {
    const data = this.getCurrentRankData();
    return {
      rank: this.currentRank,
      rankName: data.name,
      title: data.title,
      carryCapacity: data.carryCapacity,
      priceModifier: data.priceModifier,
      sellModifier: data.sellModifier,
      highestGold: this.highestGoldReached,
      totalTrades: this.totalTradesCompleted,
      totalEarned: this.totalGoldEarned,
      nextRankProgress: this.getProgressToNextRank(),
    };
  }

  public getSaveData(): ProgressionSaveData {
    return {
      currentRank: this.currentRank,
      highestGoldReached: this.highestGoldReached,
      totalTradesCompleted: this.totalTradesCompleted,
      totalGoldEarned: this.totalGoldEarned,
    };
  }

  public loadSaveData(data: ProgressionSaveData): void {
    this.currentRank = data.currentRank ?? MerchantRank.PEDDLER;
    this.highestGoldReached = data.highestGoldReached ?? 100;
    this.totalTradesCompleted = data.totalTradesCompleted ?? 0;
    this.totalGoldEarned = data.totalGoldEarned ?? 0;

    this.scene.events.emit('progressionLoaded', this.getProgressionData());
  }

  public reset(): void {
    this.currentRank = MerchantRank.PEDDLER;
    this.highestGoldReached = 100;
    this.totalTradesCompleted = 0;
    this.totalGoldEarned = 0;
  }
}
