import Phaser from 'phaser';

/**
 * TradeSystem - Manages the economy and trade mechanics
 *
 * Historical context: 16th century Goa was the hub of the Portuguese
 * spice trade. Prices fluctuated based on ship arrivals, monsoon
 * seasons, and European demand.
 */

// Trade good definition with historical context
export interface TradeGood {
  id: string;
  name: string;
  basePrice: number;
  category: 'spice' | 'fabric' | 'luxury' | 'commodity';
  origin: string;
  description: string;
  weight: number; // Affects carry capacity
  rarity: number; // 1-10, affects price volatility
}

// Market state for a specific good
interface MarketState {
  currentPrice: number;
  supply: number;
  demand: number;
  trend: 'rising' | 'falling' | 'stable';
}

// NPC Trader that affects market dynamics
interface MarketTrader {
  id: string;
  name: string;
  faction: string;
  gold: number;
  preferences: string[];    // Goods they prefer to buy
  avoidGoods: string[];     // Goods they don't buy
  schedule: number[];       // Hours when active (e.g., [7, 8, 9, 10])
  personality: 'aggressive' | 'cautious' | 'speculator';
  lastAction: number;       // Game time of last action
}

export class TradeSystem {
  private scene: Phaser.Scene;
  private goods: Map<string, TradeGood> = new Map();
  private marketState: Map<string, MarketState> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private lastUpdateTime = 0;
  private updateInterval = 30000; // Update prices every 30 seconds

  // NPC traders that compete in the market
  private npcTraders: MarketTrader[] = [];
  private lastNPCTradeTime = 0;
  private npcTradeInterval = 15000; // NPCs trade every 15 seconds

  // Historical trade goods with approximate relative values
  private readonly defaultGoods: TradeGood[] = [
    {
      id: 'good_pepper',
      name: 'Pepper',
      basePrice: 15,
      category: 'spice',
      origin: 'Malabar Coast',
      description: 'Black gold of the East. The most traded spice.',
      weight: 1,
      rarity: 3,
    },
    {
      id: 'good_cinnamon',
      name: 'Cinnamon',
      basePrice: 25,
      category: 'spice',
      origin: 'Ceylon',
      description: 'Aromatic bark from Ceylon. Portuguese monopoly.',
      weight: 1,
      rarity: 5,
    },
    {
      id: 'good_cloves',
      name: 'Cloves',
      basePrice: 40,
      category: 'spice',
      origin: 'Moluccas',
      description: 'Precious spice from the Spice Islands.',
      weight: 1,
      rarity: 8,
    },
    {
      id: 'good_silk',
      name: 'Silk',
      basePrice: 50,
      category: 'fabric',
      origin: 'China via Macau',
      description: 'Luxurious fabric from the Middle Kingdom.',
      weight: 2,
      rarity: 6,
    },
    {
      id: 'good_porcelain',
      name: 'Porcelain',
      basePrice: 35,
      category: 'luxury',
      origin: 'China',
      description: 'Fine ceramics. Fragile but valuable.',
      weight: 3,
      rarity: 5,
    },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeGoods();
    this.initializeMarket();
    this.initializeNPCTraders();
  }

  private initializeGoods(): void {
    for (const good of this.defaultGoods) {
      this.goods.set(good.id, good);
    }
  }

  private initializeMarket(): void {
    for (const good of this.defaultGoods) {
      // Initialize market state with some randomness
      const supplyVariance = 0.5 + Math.random();
      const demandVariance = 0.5 + Math.random();

      const supply = Math.floor(10 * supplyVariance);
      const demand = Math.floor(10 * demandVariance);

      const priceFactor = this.calculatePriceFactor(supply, demand);
      const currentPrice = Math.floor(good.basePrice * priceFactor);

      this.marketState.set(good.id, {
        currentPrice,
        supply,
        demand,
        trend: 'stable',
      });

      this.priceHistory.set(good.id, [currentPrice]);
    }
  }

  private initializeNPCTraders(): void {
    // Create NPC traders with different personalities
    this.npcTraders = [
      {
        id: 'trader_aggressive_buyer',
        name: 'Eager Portuguese Factor',
        faction: 'crown',
        gold: 500,
        preferences: ['good_pepper', 'good_cinnamon'],
        avoidGoods: [],
        schedule: [7, 8, 9, 10, 11],
        personality: 'aggressive',
        lastAction: 0,
      },
      {
        id: 'trader_cautious_spice',
        name: 'Careful Spice Buyer',
        faction: 'free_traders',
        gold: 300,
        preferences: ['good_cloves', 'good_nutmeg'],
        avoidGoods: ['good_silk'],
        schedule: [8, 9, 10, 17, 18],
        personality: 'cautious',
        lastAction: 0,
      },
      {
        id: 'trader_speculator',
        name: 'Arab Speculator',
        faction: 'old_routes',
        gold: 400,
        preferences: ['good_silk', 'good_porcelain'],
        avoidGoods: [],
        schedule: [9, 10, 11, 18, 19],
        personality: 'speculator',
        lastAction: 0,
      },
      {
        id: 'trader_bulk_buyer',
        name: 'Warehouse Buyer',
        faction: 'crown',
        gold: 800,
        preferences: ['good_pepper'],
        avoidGoods: ['good_porcelain'],
        schedule: [7, 8, 14, 15, 16],
        personality: 'aggressive',
        lastAction: 0,
      },
      {
        id: 'trader_luxury',
        name: 'Luxury Goods Dealer',
        faction: 'free_traders',
        gold: 600,
        preferences: ['good_silk', 'good_porcelain', 'good_cloves'],
        avoidGoods: ['good_ginger'],
        schedule: [10, 11, 12, 17, 18, 19],
        personality: 'cautious',
        lastAction: 0,
      },
    ];
  }

  private calculatePriceFactor(supply: number, demand: number): number {
    // Price increases when demand exceeds supply
    if (supply === 0) return 2.0; // Very high price when out of stock
    
    const ratio = demand / supply;
    return Math.max(0.5, Math.min(2.0, ratio));
  }

  public update(time: number): void {
    // Periodically update market conditions
    if (time - this.lastUpdateTime > this.updateInterval) {
      this.lastUpdateTime = time;
      this.updateMarket();
    }

    // Simulate NPC trading
    if (time - this.lastNPCTradeTime > this.npcTradeInterval) {
      this.lastNPCTradeTime = time;
      this.simulateNPCTrading();
    }
  }

  private simulateNPCTrading(): void {
    // Get current hour from TimeSystem
    let currentHour = 9; // Default to market hours
    try {
      const marketScene = this.scene.scene.get('MarketScene') as any;
      if (marketScene?.getTimeSystem) {
        currentHour = marketScene.getTimeSystem().getTimeData().hour;
      }
    } catch (e) {
      // Use default
    }

    for (const trader of this.npcTraders) {
      // Check if trader is active at this hour
      if (!trader.schedule.includes(currentHour)) continue;
      if (trader.gold < 10) continue;

      // Determine action based on personality
      const action = this.determineTraderAction(trader);
      if (!action) continue;

      // Execute action
      if (action.type === 'buy') {
        this.executeNPCBuy(trader, action.goodId, action.quantity);
      } else if (action.type === 'sell') {
        this.executeNPCSell(trader, action.goodId, action.quantity);
      }
    }
  }

  private determineTraderAction(trader: MarketTrader): { type: 'buy' | 'sell'; goodId: string; quantity: number } | null {
    // Random chance to act (don't trade every cycle)
    if (Math.random() > 0.4) return null;

    // Find a preferred good with reasonable supply
    const availableGoods = trader.preferences.filter(goodId => {
      const state = this.marketState.get(goodId);
      return state && state.supply > 2;
    });

    if (availableGoods.length === 0) return null;

    const goodId = availableGoods[Math.floor(Math.random() * availableGoods.length)];
    const state = this.marketState.get(goodId);
    const good = this.goods.get(goodId);
    if (!state || !good) return null;

    switch (trader.personality) {
      case 'aggressive':
        // Buys frequently, larger quantities
        if (trader.gold >= state.currentPrice * 2) {
          return { type: 'buy', goodId, quantity: Math.min(3, Math.floor(trader.gold / state.currentPrice / 2)) };
        }
        break;

      case 'cautious':
        // Only buys when price is below average (trend stable or falling)
        if (state.trend !== 'rising' && trader.gold >= state.currentPrice) {
          return { type: 'buy', goodId, quantity: 1 };
        }
        break;

      case 'speculator':
        // Buys when trend is rising (expecting higher prices)
        if (state.trend === 'rising' && trader.gold >= state.currentPrice) {
          return { type: 'buy', goodId, quantity: 2 };
        }
        // Sells when trend is falling
        if (state.trend === 'falling' && Math.random() > 0.5) {
          return { type: 'sell', goodId, quantity: 1 };
        }
        break;
    }

    return null;
  }

  private executeNPCBuy(trader: MarketTrader, goodId: string, quantity: number): void {
    const state = this.marketState.get(goodId);
    if (!state || state.supply < quantity) return;

    const price = state.currentPrice * quantity;
    if (trader.gold < price) return;

    trader.gold -= price;
    state.supply -= quantity;
    state.demand = Math.min(20, state.demand + quantity);

    // Emit event for UI feedback (optional)
    this.scene.events.emit('npcTrade', {
      trader: trader.name,
      action: 'bought',
      goodId,
      quantity,
      price,
    });
  }

  private executeNPCSell(trader: MarketTrader, goodId: string, quantity: number): void {
    const state = this.marketState.get(goodId);
    if (!state) return;

    const sellPrice = Math.floor(state.currentPrice * 0.75) * quantity;
    trader.gold += sellPrice;
    state.supply += quantity;
    state.demand = Math.max(1, state.demand - quantity);

    this.scene.events.emit('npcTrade', {
      trader: trader.name,
      action: 'sold',
      goodId,
      quantity,
      price: sellPrice,
    });
  }

  private updateMarket(): void {
    for (const [goodId, state] of this.marketState) {
      const good = this.goods.get(goodId);
      if (!good) continue;

      // Random market fluctuations
      const supplyChange = Math.floor((Math.random() - 0.5) * 4);
      const demandChange = Math.floor((Math.random() - 0.5) * 4);

      state.supply = Math.max(0, state.supply + supplyChange);
      state.demand = Math.max(1, state.demand + demandChange);

      // Calculate new price
      const oldPrice = state.currentPrice;
      const priceFactor = this.calculatePriceFactor(state.supply, state.demand);
      
      // Add volatility based on rarity
      const volatility = 1 + (good.rarity / 100) * (Math.random() - 0.5);
      state.currentPrice = Math.floor(good.basePrice * priceFactor * volatility);
      
      // Ensure minimum price
      state.currentPrice = Math.max(1, state.currentPrice);

      // Update trend
      if (state.currentPrice > oldPrice * 1.05) {
        state.trend = 'rising';
      } else if (state.currentPrice < oldPrice * 0.95) {
        state.trend = 'falling';
      } else {
        state.trend = 'stable';
      }

      // Record price history
      const history = this.priceHistory.get(goodId)!;
      history.push(state.currentPrice);
      if (history.length > 20) history.shift(); // Keep last 20 prices
    }

    // Emit market update event
    this.scene.events.emit('marketUpdate', this.getMarketSummary());
  }

  public getPrice(goodId: string, isBuying: boolean, vendorFaction?: string, vendorNpcId?: string): number {
    const state = this.marketState.get(goodId);
    if (!state) return 0;

    let price = state.currentPrice;

    // Apply faction reputation modifier
    if (vendorFaction) {
      const repModifier = this.getReputationPriceModifier(vendorFaction, isBuying);
      price = Math.floor(price * repModifier);
    }

    // Apply NPC relationship modifier from NPCMemorySystem
    if (vendorNpcId) {
      const npcModifier = this.getNPCRelationshipModifier(vendorNpcId, isBuying);
      price = Math.floor(price * npcModifier);
    }

    // Apply progression system modifiers
    const progressionModifier = this.getProgressionModifier(isBuying);
    price = Math.floor(price * progressionModifier);

    if (!isBuying) {
      // Selling gets you less (merchant markup)
      price = Math.floor(price * 0.75);
    }

    return Math.max(1, price);
  }

  /**
   * Get price modifier based on faction reputation
   * Better reputation = better prices
   */
  private getReputationPriceModifier(factionId: string, isBuying: boolean): number {
    const factionSystem = this.scene.registry.get('factionSystem');
    if (!factionSystem) return 1.0;

    const rep = factionSystem.getReputation(factionId);

    // Reputation ranges from -100 to +100
    // Hostile (-100 to -50): 1.3x buy, 0.6x sell
    // Unfriendly (-50 to -10): 1.15x buy, 0.8x sell
    // Neutral (-10 to +10): 1.0x buy, 1.0x sell
    // Friendly (+10 to +50): 0.9x buy, 1.1x sell
    // Honored (+50 to +80): 0.85x buy, 1.15x sell
    // Champion (+80 to +100): 0.8x buy, 1.2x sell

    if (isBuying) {
      if (rep >= 80) return 0.80;
      if (rep >= 50) return 0.85;
      if (rep >= 10) return 0.90;
      if (rep >= -10) return 1.0;
      if (rep >= -50) return 1.15;
      return 1.30;
    } else {
      // Selling
      if (rep >= 80) return 1.20;
      if (rep >= 50) return 1.15;
      if (rep >= 10) return 1.10;
      if (rep >= -10) return 1.0;
      if (rep >= -50) return 0.80;
      return 0.60;
    }
  }

  /**
   * Get price modifier based on NPC relationship
   */
  private getNPCRelationshipModifier(npcId: string, isBuying: boolean): number {
    const npcMemory = this.scene.registry.get('npcMemorySystem');
    if (!npcMemory) return 1.0;

    if (isBuying) {
      return npcMemory.getPriceModifier?.(npcId) ?? 1.0;
    } else {
      return npcMemory.getSellModifier?.(npcId) ?? 1.0;
    }
  }

  /**
   * Get price modifier from player progression/rank
   */
  private getProgressionModifier(isBuying: boolean): number {
    const progressionSystem = this.scene.registry.get('progressionSystem');
    if (!progressionSystem) return 1.0;

    if (isBuying) {
      return progressionSystem.getPriceModifier?.() ?? 1.0;
    } else {
      return progressionSystem.getSellModifier?.() ?? 1.0;
    }
  }

  /**
   * Get the base price without modifiers (for display purposes)
   */
  public getBasePrice(goodId: string, isBuying: boolean): number {
    const state = this.marketState.get(goodId);
    if (!state) return 0;

    if (isBuying) {
      return state.currentPrice;
    } else {
      return Math.floor(state.currentPrice * 0.75);
    }
  }

  public buyGood(goodId: string): { success: boolean; price: number; message: string } {
    const state = this.marketState.get(goodId);
    const good = this.goods.get(goodId);

    if (!state || !good) {
      return { success: false, price: 0, message: 'Unknown good.' };
    }

    if (state.supply <= 0) {
      return { success: false, price: 0, message: `No ${good.name} available.` };
    }

    const price = this.getPrice(goodId, true);
    state.supply--;
    
    // Buying increases demand
    state.demand = Math.min(20, state.demand + 1);

    return { success: true, price, message: `Purchased ${good.name} for ${price} gold.` };
  }

  public sellGood(goodId: string): { success: boolean; price: number; message: string } {
    const state = this.marketState.get(goodId);
    const good = this.goods.get(goodId);

    if (!state || !good) {
      return { success: false, price: 0, message: 'Unknown good.' };
    }

    const price = this.getPrice(goodId, false);
    state.supply++;
    
    // Selling decreases demand
    state.demand = Math.max(1, state.demand - 1);

    return { success: true, price, message: `Sold ${good.name} for ${price} gold.` };
  }

  public getGoodInfo(goodId: string): TradeGood | undefined {
    return this.goods.get(goodId);
  }

  public getMarketState(goodId: string): MarketState | undefined {
    return this.marketState.get(goodId);
  }

  public getAllGoods(): TradeGood[] {
    return Array.from(this.goods.values());
  }

  public getMarketSummary(): { goodId: string; name: string; price: number; trend: string; supply: number }[] {
    const summary = [];
    
    for (const [goodId, state] of this.marketState) {
      const good = this.goods.get(goodId);
      if (good) {
        summary.push({
          goodId,
          name: good.name,
          price: state.currentPrice,
          trend: state.trend,
          supply: state.supply,
        });
      }
    }

    return summary;
  }

  public getPriceHistory(goodId: string): number[] {
    return this.priceHistory.get(goodId) || [];
  }

  // Simulate ship arrival with new goods
  public shipArrival(goods: { goodId: string; quantity: number }[]): void {
    for (const cargo of goods) {
      const state = this.marketState.get(cargo.goodId);
      if (state) {
        state.supply += cargo.quantity;
        // Prices drop when supply increases
        const good = this.goods.get(cargo.goodId);
        if (good) {
          state.currentPrice = Math.floor(
            state.currentPrice * (1 - cargo.quantity * 0.02)
          );
          state.currentPrice = Math.max(
            Math.floor(good.basePrice * 0.5),
            state.currentPrice
          );
        }
      }
    }

    this.scene.events.emit('shipArrival', goods);
  }

  // Time of day affects prices
  public applyTimeModifier(isMarketHours: boolean): void {
    const modifier = isMarketHours ? 1.0 : 1.15; // Higher prices outside market hours
    
    for (const state of this.marketState.values()) {
      state.currentPrice = Math.floor(state.currentPrice * modifier);
    }
  }
}
