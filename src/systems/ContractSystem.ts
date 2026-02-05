import Phaser from 'phaser';

/**
 * ContractSystem - Manages time-limited trade contracts
 *
 * NPCs offer contracts requiring delivery of goods within deadlines.
 * Success pays premiums; failure incurs penalties.
 * Contracts create urgency and meaningful trading decisions.
 */

export interface TradeContract {
  id: string;
  clientId: string;      // NPC ID offering the contract
  clientName: string;    // Display name
  faction: string;       // Associated faction
  goods: string;         // Required good ID
  quantity: number;      // Amount needed
  deadline: number;      // Game hours from acceptance
  reward: number;        // Gold reward on completion
  penalty: number;       // Gold penalty on failure (0 = no penalty)
  reputationReward: number;  // Faction rep on success
  reputationPenalty: number; // Faction rep on failure
  description: string;   // Flavor text
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ActiveContract extends TradeContract {
  acceptedAt: number;    // Game time when accepted (hour * 100 + day * 2400)
  expiresAt: number;     // Game time when it expires
  delivered: number;     // Amount already delivered
  status: 'active' | 'completed' | 'failed';
}

interface ContractSaveData {
  activeContracts: ActiveContract[];
  completedCount: number;
  failedCount: number;
  totalContractsOffered: number;
}

export class ContractSystem {
  private scene: Phaser.Scene;
  private availableContracts: TradeContract[] = [];
  private activeContracts: Map<string, ActiveContract> = new Map();
  private completedCount = 0;
  private failedCount = 0;
  private totalContractsOffered = 0;
  private lastContractRefresh = 0;

  // Contract templates for generation
  private readonly contractTemplates: Omit<TradeContract, 'id'>[] = [
    // Easy contracts - common goods, long deadlines
    {
      clientId: 'crown_officer',
      clientName: 'Crown Trade Officer',
      faction: 'crown',
      goods: 'good_pepper',
      quantity: 5,
      deadline: 48,
      reward: 100,
      penalty: 0,
      reputationReward: 5,
      reputationPenalty: 0,
      description: 'The Crown requires pepper for the next shipment to Lisboa.',
      difficulty: 'easy',
    },
    {
      clientId: 'silk_merchant',
      clientName: 'Silk Merchant',
      faction: 'free_traders',
      goods: 'good_silk',
      quantity: 3,
      deadline: 48,
      reward: 180,
      penalty: 0,
      reputationReward: 5,
      reputationPenalty: 0,
      description: 'A wealthy customer awaits fine silk for their wedding.',
      difficulty: 'easy',
    },
    // Medium contracts - larger quantities, shorter deadlines
    {
      clientId: 'warehouse_master',
      clientName: 'Warehouse Master',
      faction: 'crown',
      goods: 'good_cinnamon',
      quantity: 10,
      deadline: 36,
      reward: 350,
      penalty: 50,
      reputationReward: 10,
      reputationPenalty: -5,
      description: 'The royal warehouse needs cinnamon urgently.',
      difficulty: 'medium',
    },
    {
      clientId: 'arab_trader',
      clientName: 'Arab Middleman',
      faction: 'old_routes',
      goods: 'good_cloves',
      quantity: 8,
      deadline: 30,
      reward: 400,
      penalty: 75,
      reputationReward: 10,
      reputationPenalty: -5,
      description: 'A caravan departs soon and needs cloves for the journey.',
      difficulty: 'medium',
    },
    {
      clientId: 'spice_vendor_1',
      clientName: 'Spice Vendor',
      faction: 'free_traders',
      goods: 'good_pepper',
      quantity: 15,
      deadline: 24,
      reward: 300,
      penalty: 60,
      reputationReward: 8,
      reputationPenalty: -3,
      description: 'Festival season approaches - spices sell quickly!',
      difficulty: 'medium',
    },
    // Hard contracts - rare goods, tight deadlines, high stakes
    {
      clientId: 'luxury_merchant',
      clientName: 'Portuguese Merchant',
      faction: 'crown',
      goods: 'good_porcelain',
      quantity: 12,
      deadline: 24,
      reward: 600,
      penalty: 150,
      reputationReward: 15,
      reputationPenalty: -10,
      description: 'The Viceroy\'s palace needs porcelain for a state dinner.',
      difficulty: 'hard',
    },
    {
      clientId: 'yusuf_broker',
      clientName: 'Yusuf al-Rashid',
      faction: 'old_routes',
      goods: 'good_silk',
      quantity: 10,
      deadline: 18,
      reward: 700,
      penalty: 200,
      reputationReward: 15,
      reputationPenalty: -10,
      description: 'A ship bound for Hormuz departs at dawn. Don\'t be late.',
      difficulty: 'hard',
    },
    {
      clientId: 'bulk_merchant',
      clientName: 'Bulk Merchant',
      faction: 'free_traders',
      goods: 'good_ginger',
      quantity: 20,
      deadline: 20,
      reward: 400,
      penalty: 100,
      reputationReward: 12,
      reputationPenalty: -8,
      description: 'Ginger prices are soaring in Macau. Fill this order fast!',
      difficulty: 'hard',
    },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
    this.generateInitialContracts();
  }

  private setupEventListeners(): void {
    // Check deadlines on time updates
    this.scene.events.on('hourChange', (timeData: { hour: number; dayCount: number }) => {
      const currentGameTime = this.calculateGameTime(timeData.hour, timeData.dayCount);
      this.checkDeadlines(currentGameTime);
      this.maybeRefreshContracts(timeData.hour);
    });

    // Listen for item deliveries (when player sells specific goods to contract NPCs)
    this.scene.events.on('playerSell', (data: { good: string; price: number }) => {
      this.checkContractDelivery(data.good, 1);
    });
  }

  private calculateGameTime(hour: number, day: number): number {
    return hour + (day * 24);
  }

  private getCurrentGameTime(): number {
    // Get current time from TimeSystem via registry or default
    try {
      const marketScene = this.scene.scene.get('MarketScene') as any;
      if (marketScene?.getTimeSystem) {
        const timeData = marketScene.getTimeSystem().getTimeData();
        return this.calculateGameTime(timeData.hour, timeData.dayCount);
      }
    } catch (e) {
      // Fallback
    }
    return 7 + 24; // Day 1, 7 AM
  }

  private generateInitialContracts(): void {
    this.refreshContracts();
  }

  private maybeRefreshContracts(currentHour: number): void {
    // Refresh contracts at certain times (morning and evening)
    if ((currentHour === 7 || currentHour === 17) && currentHour !== this.lastContractRefresh) {
      this.lastContractRefresh = currentHour;
      this.refreshContracts();
    }
  }

  private refreshContracts(): void {
    // Generate new contracts based on player rank and faction standing
    const progressionSystem = this.scene.registry.get('progressionSystem');
    const factionSystem = this.scene.registry.get('factionSystem');

    // Clear old available contracts (keep active ones)
    this.availableContracts = [];

    // Determine how many contracts to offer based on rank
    let numContracts = 2;
    if (progressionSystem?.hasUnlock?.('contracts')) {
      numContracts = 3;
    }
    if (progressionSystem?.hasUnlock?.('special_contracts')) {
      numContracts = 4;
    }
    if (progressionSystem?.hasUnlock?.('exclusive_contracts')) {
      numContracts = 5;
    }

    // Select random contracts from templates
    const shuffled = [...this.contractTemplates].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(numContracts, shuffled.length); i++) {
      const template = shuffled[i];

      // Check faction standing - hostile factions won't offer contracts
      if (factionSystem) {
        const rep = factionSystem.getReputation(template.faction);
        if (rep < -30) continue; // Skip if hostile
      }

      // Create contract with unique ID
      const contract: TradeContract = {
        ...template,
        id: `contract_${Date.now()}_${i}`,
      };

      // Adjust reward based on faction reputation
      if (factionSystem) {
        const rep = factionSystem.getReputation(template.faction);
        if (rep > 50) {
          contract.reward = Math.floor(contract.reward * 1.2); // 20% bonus for honored
        } else if (rep > 25) {
          contract.reward = Math.floor(contract.reward * 1.1); // 10% bonus for friendly
        }
      }

      this.availableContracts.push(contract);
      this.totalContractsOffered++;
    }

    this.scene.events.emit('contractsRefreshed', this.availableContracts);
  }

  public getAvailableContracts(): TradeContract[] {
    return [...this.availableContracts];
  }

  public getActiveContracts(): ActiveContract[] {
    return Array.from(this.activeContracts.values()).filter(c => c.status === 'active');
  }

  public acceptContract(contractId: string): boolean {
    const contract = this.availableContracts.find(c => c.id === contractId);
    if (!contract) {
      return false;
    }

    // Check if player already has max active contracts
    const activeCount = this.getActiveContracts().length;
    const maxContracts = this.scene.registry.get('progressionSystem')?.hasUnlock?.('special_contracts') ? 5 : 3;

    if (activeCount >= maxContracts) {
      this.scene.events.emit('notification', {
        title: 'Too Many Contracts',
        message: `You can only have ${maxContracts} active contracts.`,
        type: 'warning',
      });
      return false;
    }

    const currentTime = this.getCurrentGameTime();

    const activeContract: ActiveContract = {
      ...contract,
      acceptedAt: currentTime,
      expiresAt: currentTime + contract.deadline,
      delivered: 0,
      status: 'active',
    };

    this.activeContracts.set(contract.id, activeContract);

    // Remove from available
    this.availableContracts = this.availableContracts.filter(c => c.id !== contractId);

    this.scene.events.emit('contractAccepted', activeContract);
    this.scene.events.emit('notification', {
      title: 'Contract Accepted',
      message: `Deliver ${contract.quantity} ${this.formatGoodName(contract.goods)} within ${contract.deadline} hours.`,
      type: 'info',
    });

    return true;
  }

  public deliverGoods(contractId: string, quantity: number): boolean {
    const contract = this.activeContracts.get(contractId);
    if (!contract || contract.status !== 'active') {
      return false;
    }

    contract.delivered += quantity;

    // Check if contract is complete
    if (contract.delivered >= contract.quantity) {
      this.completeContract(contractId);
    } else {
      this.scene.events.emit('contractProgress', {
        contractId,
        delivered: contract.delivered,
        required: contract.quantity,
      });
    }

    return true;
  }

  private checkContractDelivery(goodId: string, quantity: number): void {
    // Check if any active contract is for this good
    for (const [id, contract] of this.activeContracts) {
      if (contract.status === 'active' && contract.goods === goodId) {
        this.deliverGoods(id, quantity);
        break; // Only deliver to one contract at a time
      }
    }
  }

  private completeContract(contractId: string): void {
    const contract = this.activeContracts.get(contractId);
    if (!contract) return;

    contract.status = 'completed';
    this.completedCount++;

    // Award rewards
    this.scene.events.emit('goldChange', contract.reward);

    // Award reputation
    if (contract.reputationReward > 0) {
      this.scene.events.emit('reputationChange', {
        target: contract.faction,
        value: contract.reputationReward,
      });
    }

    this.scene.events.emit('contractCompleted', contract);
    this.scene.events.emit('notification', {
      title: 'Contract Completed!',
      message: `Earned ${contract.reward} gold and reputation with ${contract.faction}.`,
      type: 'success',
    });
  }

  private checkDeadlines(currentTime: number): void {
    for (const [id, contract] of this.activeContracts) {
      if (contract.status === 'active' && currentTime >= contract.expiresAt) {
        this.failContract(id);
      }
    }
  }

  private failContract(contractId: string): void {
    const contract = this.activeContracts.get(contractId);
    if (!contract) return;

    contract.status = 'failed';
    this.failedCount++;

    // Apply penalty
    if (contract.penalty > 0) {
      this.scene.events.emit('goldChange', -contract.penalty);
    }

    // Apply reputation penalty
    if (contract.reputationPenalty !== 0) {
      this.scene.events.emit('reputationChange', {
        target: contract.faction,
        value: contract.reputationPenalty,
      });
    }

    this.scene.events.emit('contractFailed', contract);
    this.scene.events.emit('notification', {
      title: 'Contract Failed!',
      message: `Lost ${contract.penalty} gold. ${contract.clientName} is disappointed.`,
      type: 'error',
    });
  }

  public cancelContract(contractId: string): boolean {
    const contract = this.activeContracts.get(contractId);
    if (!contract || contract.status !== 'active') {
      return false;
    }

    // Canceling has a small reputation penalty
    this.scene.events.emit('reputationChange', {
      target: contract.faction,
      value: -2,
    });

    contract.status = 'failed';
    this.failedCount++;

    this.scene.events.emit('contractCanceled', contract);
    return true;
  }

  public getContractTimeRemaining(contractId: string): number {
    const contract = this.activeContracts.get(contractId);
    if (!contract || contract.status !== 'active') {
      return 0;
    }

    const currentTime = this.getCurrentGameTime();
    return Math.max(0, contract.expiresAt - currentTime);
  }

  public getContractProgress(contractId: string): { delivered: number; required: number; percentage: number } | null {
    const contract = this.activeContracts.get(contractId);
    if (!contract) return null;

    return {
      delivered: contract.delivered,
      required: contract.quantity,
      percentage: (contract.delivered / contract.quantity) * 100,
    };
  }

  private formatGoodName(goodId: string): string {
    return goodId.replace('good_', '').charAt(0).toUpperCase() +
           goodId.replace('good_', '').slice(1);
  }

  public getStats(): { completed: number; failed: number; totalOffered: number; successRate: number } {
    const total = this.completedCount + this.failedCount;
    return {
      completed: this.completedCount,
      failed: this.failedCount,
      totalOffered: this.totalContractsOffered,
      successRate: total > 0 ? (this.completedCount / total) * 100 : 100,
    };
  }

  public getSaveData(): ContractSaveData {
    return {
      activeContracts: Array.from(this.activeContracts.values()),
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      totalContractsOffered: this.totalContractsOffered,
    };
  }

  public loadSaveData(data: ContractSaveData): void {
    this.activeContracts.clear();

    if (data.activeContracts) {
      for (const contract of data.activeContracts) {
        this.activeContracts.set(contract.id, contract);
      }
    }

    this.completedCount = data.completedCount ?? 0;
    this.failedCount = data.failedCount ?? 0;
    this.totalContractsOffered = data.totalContractsOffered ?? 0;

    // Refresh available contracts
    this.refreshContracts();

    this.scene.events.emit('contractsLoaded', {
      active: this.getActiveContracts(),
      available: this.availableContracts,
    });
  }

  /**
   * Clean up event listeners and data to prevent memory leaks
   */
  public destroy(): void {
    this.scene.events.off('hourChange');
    this.scene.events.off('playerSell');
    this.availableContracts = [];
    this.activeContracts.clear();
  }
}
