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

export class TradeSystem {
  private scene: Phaser.Scene;
  private goods: Map<string, TradeGood> = new Map();
  private marketState: Map<string, MarketState> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private lastUpdateTime = 0;
  private updateInterval = 30000; // Update prices every 30 seconds

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

  public getPrice(goodId: string, isBuying: boolean): number {
    const state = this.marketState.get(goodId);
    if (!state) return 0;

    if (isBuying) {
      return state.currentPrice;
    } else {
      // Selling gets you less (merchant markup)
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
