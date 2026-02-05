import Phaser from 'phaser';

/**
 * TradeRouteSystem - Manages long-distance trade expeditions
 *
 * Players can send goods on trade routes to distant markets.
 * Higher risk/reward than local trading, with time delays.
 */

export interface TradeRoute {
  id: string;
  name: string;
  from: string;           // Origin location
  to: string;             // Destination
  description: string;
  travelTime: number;     // Hours one-way
  baseRisk: number;       // 0-1, chance of cargo loss
  profitMultiplier: number; // Expected return (1.5 = 50% profit)
  goodsAffinity: string[]; // Goods that sell well on this route
  faction: string;        // Controlling faction
  unlockRequirement: string | null; // Progression unlock needed
}

interface ActiveExpedition {
  id: string;
  routeId: string;
  goods: { goodId: string; quantity: number }[];
  departureTime: number;  // Game time when departed
  returnTime: number;     // Game time when returns
  status: 'outbound' | 'returning' | 'completed' | 'lost';
  investment: number;     // Total gold value of goods sent
  expectedReturn: number; // Expected gold return
  actualReturn: number;   // Actual return (after risk calculation)
}

interface TradeRouteSaveData {
  activeExpeditions: ActiveExpedition[];
  completedExpeditions: number;
  lostExpeditions: number;
  totalProfit: number;
}

export class TradeRouteSystem {
  private scene: Phaser.Scene;
  private routes: Map<string, TradeRoute> = new Map();
  private activeExpeditions: Map<string, ActiveExpedition> = new Map();
  private completedExpeditions = 0;
  private lostExpeditions = 0;
  private totalProfit = 0;

  // Predefined trade routes
  private readonly defaultRoutes: TradeRoute[] = [
    {
      id: 'route_malabar',
      name: 'Malabar Coast Run',
      from: 'Goa',
      to: 'Cochin',
      description: 'A short voyage down the Malabar coast. Low risk, modest returns.',
      travelTime: 12,
      baseRisk: 0.05,
      profitMultiplier: 1.3,
      goodsAffinity: ['good_pepper', 'good_ginger', 'good_cinnamon'],
      faction: 'crown',
      unlockRequirement: 'trade_routes',
    },
    {
      id: 'route_hormuz',
      name: 'Hormuz Passage',
      from: 'Goa',
      to: 'Hormuz',
      description: 'Through the Arabian Sea to the Persian Gulf. Moderate risk, good profit on luxury goods.',
      travelTime: 48,
      baseRisk: 0.15,
      profitMultiplier: 1.8,
      goodsAffinity: ['good_silk', 'good_porcelain', 'good_cloves'],
      faction: 'old_routes',
      unlockRequirement: 'trade_routes',
    },
    {
      id: 'route_malacca',
      name: 'Straits of Malacca',
      from: 'Goa',
      to: 'Malacca',
      description: 'Long voyage to the eastern spice markets. High risk, high reward.',
      travelTime: 96,
      baseRisk: 0.25,
      profitMultiplier: 2.2,
      goodsAffinity: ['good_cloves', 'good_nutmeg', 'good_silk'],
      faction: 'free_traders',
      unlockRequirement: 'trade_routes',
    },
    {
      id: 'route_macau',
      name: 'China Trade',
      from: 'Goa',
      to: 'Macau',
      description: 'The legendary silk and porcelain route. Very long, risky, but immensely profitable.',
      travelTime: 144,
      baseRisk: 0.30,
      profitMultiplier: 2.8,
      goodsAffinity: ['good_silk', 'good_porcelain', 'good_pepper'],
      faction: 'crown',
      unlockRequirement: 'bulk_trading',
    },
    {
      id: 'route_africa',
      name: 'African Coast',
      from: 'Goa',
      to: 'Mozambique',
      description: 'Trade with Portuguese Africa. Moderate journey with unique goods.',
      travelTime: 72,
      baseRisk: 0.20,
      profitMultiplier: 1.6,
      goodsAffinity: ['good_indigo', 'good_cinnamon'],
      faction: 'crown',
      unlockRequirement: 'trade_routes',
    },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeRoutes();
    this.setupEventListeners();
  }

  private initializeRoutes(): void {
    for (const route of this.defaultRoutes) {
      this.routes.set(route.id, route);
    }
  }

  private setupEventListeners(): void {
    // Check for returning expeditions
    this.scene.events.on('hourChange', (timeData: { hour: number; dayCount: number }) => {
      const currentTime = this.calculateGameTime(timeData.hour, timeData.dayCount);
      this.checkExpeditionReturns(currentTime);
    });
  }

  private calculateGameTime(hour: number, day: number): number {
    return hour + (day * 24);
  }

  private getCurrentGameTime(): number {
    try {
      const marketScene = this.scene.scene.get('MarketScene') as any;
      if (marketScene?.getTimeSystem) {
        const timeData = marketScene.getTimeSystem().getTimeData();
        return this.calculateGameTime(timeData.hour, timeData.dayCount);
      }
    } catch (e) {
      // Fallback
    }
    return 7 + 24;
  }

  public getAvailableRoutes(): TradeRoute[] {
    const progressionSystem = this.scene.registry.get('progressionSystem');
    const factionSystem = this.scene.registry.get('factionSystem');

    return this.defaultRoutes.filter(route => {
      // Check unlock requirement
      if (route.unlockRequirement && progressionSystem) {
        if (!progressionSystem.hasUnlock(route.unlockRequirement)) {
          return false;
        }
      }

      // Check faction standing - need at least neutral
      if (factionSystem) {
        const rep = factionSystem.getReputation(route.faction);
        if (rep < -20) return false;
      }

      return true;
    });
  }

  public getRoute(routeId: string): TradeRoute | undefined {
    return this.routes.get(routeId);
  }

  public startExpedition(
    routeId: string,
    goods: { goodId: string; quantity: number }[]
  ): { success: boolean; expeditionId?: string; error?: string } {
    const route = this.routes.get(routeId);
    if (!route) {
      return { success: false, error: 'Route not found' };
    }

    // Check if player has the goods
    const marketScene = this.scene.scene.get('MarketScene') as any;
    const player = marketScene?.getPlayer?.();
    if (!player) {
      return { success: false, error: 'Could not access player inventory' };
    }

    const inventory = player.getInventory();

    // Validate goods
    let totalInvestment = 0;
    for (const item of goods) {
      const invItem = inventory.find((i: { item: string; quantity: number }) => i.item === item.goodId);
      if (!invItem || invItem.quantity < item.quantity) {
        return { success: false, error: `Not enough ${item.goodId}` };
      }
      totalInvestment += this.getGoodBasePrice(item.goodId) * item.quantity;
    }

    // Remove goods from inventory
    for (const item of goods) {
      player.removeFromInventory(item.goodId, item.quantity);
    }

    const currentTime = this.getCurrentGameTime();
    const expeditionId = `exp_${Date.now()}_${routeId}`;

    // Calculate expected return based on goods affinity
    let profitMultiplier = route.profitMultiplier;
    const affinityBonus = this.calculateAffinityBonus(route, goods);
    profitMultiplier += affinityBonus;

    // Faction reputation affects profit
    const factionSystem = this.scene.registry.get('factionSystem');
    if (factionSystem) {
      const rep = factionSystem.getReputation(route.faction);
      if (rep >= 50) profitMultiplier += 0.1;
      if (rep >= 80) profitMultiplier += 0.1;
    }

    const expectedReturn = Math.floor(totalInvestment * profitMultiplier);

    const expedition: ActiveExpedition = {
      id: expeditionId,
      routeId,
      goods,
      departureTime: currentTime,
      returnTime: currentTime + (route.travelTime * 2), // Round trip
      status: 'outbound',
      investment: totalInvestment,
      expectedReturn,
      actualReturn: 0,
    };

    this.activeExpeditions.set(expeditionId, expedition);

    this.scene.events.emit('expeditionStarted', {
      expeditionId,
      route,
      goods,
      returnTime: expedition.returnTime,
      expectedReturn,
    });

    this.scene.events.emit('notification', {
      title: 'Expedition Launched',
      message: `Goods sent via ${route.name}. Returns in ${route.travelTime * 2} hours.`,
      type: 'info',
    });

    return { success: true, expeditionId };
  }

  private calculateAffinityBonus(route: TradeRoute, goods: { goodId: string; quantity: number }[]): number {
    let bonus = 0;
    let totalQuantity = 0;
    let affinityQuantity = 0;

    for (const item of goods) {
      totalQuantity += item.quantity;
      if (route.goodsAffinity.includes(item.goodId)) {
        affinityQuantity += item.quantity;
      }
    }

    if (totalQuantity > 0) {
      const affinityRatio = affinityQuantity / totalQuantity;
      bonus = affinityRatio * 0.3; // Up to 30% bonus for optimal goods
    }

    return bonus;
  }

  private getGoodBasePrice(goodId: string): number {
    const prices: { [key: string]: number } = {
      'good_pepper': 15,
      'good_cinnamon': 25,
      'good_cloves': 40,
      'good_silk': 50,
      'good_porcelain': 35,
      'good_ginger': 12,
      'good_nutmeg': 45,
      'good_indigo': 30,
    };
    return prices[goodId] || 10;
  }

  private checkExpeditionReturns(currentTime: number): void {
    for (const [id, expedition] of this.activeExpeditions) {
      if (expedition.status === 'outbound') {
        // Check if reached halfway point (at destination)
        const halfwayTime = expedition.departureTime + (expedition.returnTime - expedition.departureTime) / 2;
        if (currentTime >= halfwayTime) {
          expedition.status = 'returning';
          this.scene.events.emit('expeditionReturning', { expeditionId: id });
        }
      }

      if (expedition.status === 'returning' && currentTime >= expedition.returnTime) {
        this.resolveExpedition(id);
      }
    }
  }

  private resolveExpedition(expeditionId: string): void {
    const expedition = this.activeExpeditions.get(expeditionId);
    if (!expedition) return;

    const route = this.routes.get(expedition.routeId);
    if (!route) return;

    // Calculate risk based on faction standing
    let risk = route.baseRisk;
    const factionSystem = this.scene.registry.get('factionSystem');
    if (factionSystem) {
      const rep = factionSystem.getReputation(route.faction);
      if (rep >= 50) risk -= 0.05;
      if (rep >= 80) risk -= 0.05;
      if (rep < 0) risk += 0.10;
      risk = Math.max(0.01, Math.min(0.5, risk));
    }

    // Roll for success
    const roll = Math.random();

    if (roll < risk) {
      // Cargo lost
      expedition.status = 'lost';
      expedition.actualReturn = 0;
      this.lostExpeditions++;

      this.scene.events.emit('expeditionLost', {
        expeditionId,
        route,
        investment: expedition.investment,
      });

      this.scene.events.emit('notification', {
        title: 'Expedition Lost!',
        message: `The ${route.name} expedition was lost at sea. ${expedition.investment} gold worth of goods gone.`,
        type: 'error',
      });
    } else {
      // Success - calculate actual return with some variance
      const variance = 0.8 + (Math.random() * 0.4); // 80-120% of expected
      expedition.actualReturn = Math.floor(expedition.expectedReturn * variance);
      expedition.status = 'completed';
      this.completedExpeditions++;

      const profit = expedition.actualReturn - expedition.investment;
      this.totalProfit += profit;

      // Add gold to player
      this.scene.events.emit('goldChange', expedition.actualReturn);

      this.scene.events.emit('expeditionCompleted', {
        expeditionId,
        route,
        investment: expedition.investment,
        return: expedition.actualReturn,
        profit,
      });

      this.scene.events.emit('notification', {
        title: 'Expedition Returned!',
        message: `The ${route.name} expedition returned! Earned ${expedition.actualReturn} gold (${profit > 0 ? '+' : ''}${profit} profit).`,
        type: 'success',
      });
    }

    // Remove from active after a short delay (for UI to process)
    this.scene.time.delayedCall(100, () => {
      this.activeExpeditions.delete(expeditionId);
    });
  }

  public getActiveExpeditions(): Array<{
    expedition: ActiveExpedition;
    route: TradeRoute;
    timeRemaining: number;
    progress: number;
  }> {
    const currentTime = this.getCurrentGameTime();
    const result = [];

    for (const [, expedition] of this.activeExpeditions) {
      if (expedition.status === 'completed' || expedition.status === 'lost') continue;

      const route = this.routes.get(expedition.routeId);
      if (!route) continue;

      const totalTime = expedition.returnTime - expedition.departureTime;
      const elapsed = currentTime - expedition.departureTime;

      result.push({
        expedition,
        route,
        timeRemaining: Math.max(0, expedition.returnTime - currentTime),
        progress: Math.min(100, (elapsed / totalTime) * 100),
      });
    }

    return result;
  }

  public getExpeditionCount(): number {
    return Array.from(this.activeExpeditions.values())
      .filter(e => e.status === 'outbound' || e.status === 'returning').length;
  }

  public getMaxExpeditions(): number {
    const progressionSystem = this.scene.registry.get('progressionSystem');
    if (progressionSystem?.hasUnlock?.('bulk_trading')) return 5;
    if (progressionSystem?.hasUnlock?.('trade_routes')) return 3;
    return 1;
  }

  public canStartExpedition(): boolean {
    return this.getExpeditionCount() < this.getMaxExpeditions();
  }

  public getStats(): {
    completed: number;
    lost: number;
    totalProfit: number;
    successRate: number;
    activeCount: number;
  } {
    const total = this.completedExpeditions + this.lostExpeditions;
    return {
      completed: this.completedExpeditions,
      lost: this.lostExpeditions,
      totalProfit: this.totalProfit,
      successRate: total > 0 ? (this.completedExpeditions / total) * 100 : 100,
      activeCount: this.getExpeditionCount(),
    };
  }

  public getSaveData(): TradeRouteSaveData {
    return {
      activeExpeditions: Array.from(this.activeExpeditions.values()),
      completedExpeditions: this.completedExpeditions,
      lostExpeditions: this.lostExpeditions,
      totalProfit: this.totalProfit,
    };
  }

  public loadSaveData(data: TradeRouteSaveData): void {
    this.activeExpeditions.clear();

    if (data.activeExpeditions) {
      for (const exp of data.activeExpeditions) {
        this.activeExpeditions.set(exp.id, exp);
      }
    }

    this.completedExpeditions = data.completedExpeditions ?? 0;
    this.lostExpeditions = data.lostExpeditions ?? 0;
    this.totalProfit = data.totalProfit ?? 0;

    this.scene.events.emit('tradeRoutesLoaded', {
      active: this.getActiveExpeditions(),
      stats: this.getStats(),
    });
  }
}
