import Phaser from 'phaser';
import { Season } from './WeatherSystem';

/**
 * EventSystem - Manages world events, particularly ship arrivals and departures
 * 
 * Historical context: 16th century Goa was a major trading hub. Ships from
 * Lisbon, Arabia, China, and local ports brought goods that dramatically
 * affected market prices. Monsoon season (June-September) severely limited
 * maritime traffic.
 */

export type EventType = 'ship_arrival' | 'ship_departure' | 'cargo_unloaded' | 'cargo_demand';

export interface ShipType {
  id: string;
  name: string;
  origin: string;
  description: string;
  typicalCargo: { goodId: string; quantity: number }[];
  arrivalProbability: number; // Base probability per day (0-1)
  stayDuration: { min: number; max: number }; // Days
}

export interface ScheduledEvent {
  id: string;
  type: EventType;
  scheduledFor: number; // Day count when event should trigger
  data: any;
}

export interface ActiveEvent {
  id: string;
  type: EventType;
  startedAt: number; // Day count when event started
  expiresAt: number; // Day count when event expires
  data: any;
}

export interface ShipArrivalData {
  shipType: ShipType;
  cargo: { goodId: string; quantity: number }[];
  captainName: string;
  stayDuration: number;
}

export interface ShipDepartureData {
  shipType: ShipType;
  captainName: string;
  exportOpportunity: { goodId: string; demandPrice: number }[]; // Goods captain wants to buy
}

export interface CargoUnloadedData {
  goods: { goodId: string; quantity: number }[];
  priceImpact: number; // Price drop multiplier (0-1)
}

export interface CargoDemandData {
  goodId: string;
  demandPrice: number; // Price captain is willing to pay (above market)
  quantity: number;
  expiresAt: number;
}

export class EventSystem {
  private scene: Phaser.Scene;
  private scheduledEvents: ScheduledEvent[] = [];
  private activeEvents: ActiveEvent[] = [];
  private eventIdCounter = 0;
  private currentDay = 1;
  private weatherSystem?: any; // WeatherSystem reference
  private tradeSystem?: any; // TradeSystem reference
  
  // Ship type definitions
  private readonly shipTypes: ShipType[] = [
    {
      id: 'portuguese_carrack',
      name: 'Portuguese Carrack',
      origin: 'Lisbon',
      description: 'A large merchant vessel from Portugal, laden with European goods and seeking spices.',
      typicalCargo: [
        { goodId: 'good_pepper', quantity: 0 }, // They come to buy, not sell
        { goodId: 'good_cinnamon', quantity: 0 },
        { goodId: 'good_cloves', quantity: 0 },
      ],
      arrivalProbability: 0.15, // Base 15% chance per day in dry season
      stayDuration: { min: 2, max: 4 },
    },
    {
      id: 'arab_dhow',
      name: 'Arab Dhow',
      origin: 'Oman / Yemen',
      description: 'A traditional Arab trading vessel carrying dates, frankincense, and textiles.',
      typicalCargo: [
        { goodId: 'good_pepper', quantity: 5 },
        { goodId: 'good_cinnamon', quantity: 3 },
      ],
      arrivalProbability: 0.20, // More frequent than carracks
      stayDuration: { min: 1, max: 3 },
    },
    {
      id: 'chinese_junk',
      name: 'Chinese Junk',
      origin: 'Macau / Canton',
      description: 'A massive Chinese trading ship bringing silk, porcelain, and tea.',
      typicalCargo: [
        { goodId: 'good_silk', quantity: 8 },
        { goodId: 'good_porcelain', quantity: 6 },
        { goodId: 'good_pepper', quantity: 4 },
      ],
      arrivalProbability: 0.12, // Less frequent but valuable
      stayDuration: { min: 2, max: 5 },
    },
    {
      id: 'local_coaster',
      name: 'Local Coaster',
      origin: 'Malabar Coast / Coromandel',
      description: 'A small coastal trader bringing regional goods.',
      typicalCargo: [
        { goodId: 'good_pepper', quantity: 10 },
        { goodId: 'good_cinnamon', quantity: 5 },
      ],
      arrivalProbability: 0.25, // Most frequent
      stayDuration: { min: 1, max: 2 },
    },
  ];

  // Captain names for flavor
  private readonly captainNames = {
    portuguese: ['Dom João', 'Capitão Silva', 'Fernão Mendes', 'Pedro Alvares'],
    arab: ['Ahmed ibn Rashid', 'Hassan al-Mansur', 'Omar al-Zahra', 'Yusuf al-Bahri'],
    chinese: ['Li Wei', 'Zhang Ming', 'Wang Fu', 'Chen Long'],
    local: ['Krishna', 'Ravi', 'Vijay', 'Arjun'],
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
  }

  /**
   * Set references to other systems for integration
   */
  public setWeatherSystem(weatherSystem: any): void {
    this.weatherSystem = weatherSystem;
  }

  public setTradeSystem(tradeSystem: any): void {
    this.tradeSystem = tradeSystem;
  }

  private setupEventListeners(): void {
    // Listen for day changes to check for ship arrivals
    this.scene.events.on('newDay', (data: { dayCount: number }) => {
      this.currentDay = data.dayCount;
      this.checkScheduledEvents();
      this.checkShipArrivals();
      this.updateActiveEvents();
    });

    // Listen for season changes to adjust arrival probabilities
    this.scene.events.on('seasonChange', () => {
      // Reschedule any pending arrivals based on new season
      this.adjustScheduledEventsForSeason();
    });
  }

  /**
   * Main update loop - called every frame
   */
  public update(_delta: number): void {
    // Most event logic happens on day changes, but we can add
    // real-time event processing here if needed
  }

  /**
   * Check if any ships should arrive today
   */
  private checkShipArrivals(): void {
    const season = this.weatherSystem?.getCurrentSeason() || 'dry';
    const tradeModifier = this.weatherSystem?.getTradeModifier() || 1.0;
    
    // Check each ship type
    for (const shipType of this.shipTypes) {
      const arrivalProbability = this.calculateArrivalProbability(shipType, season, tradeModifier);
      
      if (Math.random() < arrivalProbability) {
        this.triggerShipArrival(shipType);
      }
    }
  }

  /**
   * Calculate arrival probability based on ship type, season, and weather
   */
  private calculateArrivalProbability(shipType: ShipType, season: Season, tradeModifier: number): number {
    let probability = shipType.arrivalProbability;
    
    // Apply season modifier (monsoon severely reduces arrivals)
    probability *= tradeModifier;
    
    // Additional monsoon penalty for long-distance ships
    if (season === 'monsoon') {
      if (shipType.id === 'portuguese_carrack' || shipType.id === 'chinese_junk') {
        probability *= 0.05; // Almost no long-distance ships during monsoon
      } else {
        probability *= 0.2; // Local ships still come, but rarely
      }
    }
    
    // Pre-monsoon and post-monsoon reduce arrivals
    if (season === 'preMonsoon' || season === 'postMonsoon') {
      probability *= 0.7;
    }
    
    return Math.min(1.0, probability);
  }

  /**
   * Trigger a ship arrival event
   */
  private triggerShipArrival(shipType: ShipType): void {
    const stayDuration = shipType.stayDuration.min + 
      Math.floor(Math.random() * (shipType.stayDuration.max - shipType.stayDuration.min + 1));
    
    const captainName = this.getRandomCaptainName(shipType.id);
    
    // Generate cargo (with some randomness)
    const cargo = shipType.typicalCargo.map(cargoItem => ({
      goodId: cargoItem.goodId,
      quantity: cargoItem.quantity > 0 
        ? Math.max(1, cargoItem.quantity + Math.floor((Math.random() - 0.5) * cargoItem.quantity))
        : 0, // Ships that come to buy don't bring cargo
    })).filter(c => c.quantity > 0); // Only include goods with quantity > 0
    
    const arrivalData: ShipArrivalData = {
      shipType,
      cargo,
      captainName,
      stayDuration,
    };

    const eventId = `ship_arrival_${this.generateEventId()}`;
    
    // Create active event
    const activeEvent: ActiveEvent = {
      id: eventId,
      type: 'ship_arrival',
      startedAt: this.currentDay,
      expiresAt: this.currentDay + stayDuration,
      data: arrivalData,
    };
    
    this.activeEvents.push(activeEvent);
    
    // Emit ship arrival event
    this.scene.events.emit('ship_arrival', arrivalData);
    
    // If ship has cargo, trigger cargo_unloaded event
    if (cargo.length > 0) {
      this.triggerCargoUnloaded(cargo);
    }
    
    // Schedule departure event
    this.scheduleEvent({
      type: 'ship_departure',
      scheduledFor: this.currentDay + stayDuration,
      data: {
        shipType,
        captainName,
        exportOpportunity: this.generateExportOpportunity(shipType),
      } as ShipDepartureData,
    });
    
    console.log(`Ship arrived: ${shipType.name} from ${shipType.origin}, Captain ${captainName}, staying ${stayDuration} days`);
  }

  /**
   * Trigger cargo unloaded event (affects market prices)
   */
  private triggerCargoUnloaded(cargo: { goodId: string; quantity: number }[]): void {
    const unloadData: CargoUnloadedData = {
      goods: cargo,
      priceImpact: 0.85, // Prices drop by 15% when cargo is unloaded
    };
    
    const eventId = `cargo_unloaded_${this.generateEventId()}`;
    
    const activeEvent: ActiveEvent = {
      id: eventId,
      type: 'cargo_unloaded',
      startedAt: this.currentDay,
      expiresAt: this.currentDay + 1, // Price impact lasts 1 day
      data: unloadData,
    };
    
    this.activeEvents.push(activeEvent);
    
    // Notify TradeSystem
    if (this.tradeSystem) {
      this.tradeSystem.shipArrival(cargo);
    }
    
    // Emit event for UI notifications
    this.scene.events.emit('cargo_unloaded', unloadData);
    
    console.log(`Cargo unloaded: ${cargo.map(c => `${c.quantity}x ${c.goodId}`).join(', ')}`);
  }

  /**
   * Generate export opportunity when ship departs
   */
  private generateExportOpportunity(shipType: ShipType): { goodId: string; demandPrice: number }[] {
    const opportunities: { goodId: string; demandPrice: number }[] = [];
    
    // Different ship types want different goods
    if (shipType.id === 'portuguese_carrack') {
      // Portuguese ships want spices to take back to Europe
      opportunities.push(
        { goodId: 'good_pepper', demandPrice: 1.3 }, // 30% above market
        { goodId: 'good_cinnamon', demandPrice: 1.4 },
        { goodId: 'good_cloves', demandPrice: 1.5 },
      );
    } else if (shipType.id === 'chinese_junk') {
      // Chinese ships want spices and luxury goods
      opportunities.push(
        { goodId: 'good_pepper', demandPrice: 1.2 },
        { goodId: 'good_cinnamon', demandPrice: 1.3 },
      );
    } else if (shipType.id === 'arab_dhow') {
      // Arab ships want spices
      opportunities.push(
        { goodId: 'good_pepper', demandPrice: 1.15 },
        { goodId: 'good_cloves', demandPrice: 1.25 },
      );
    }
    
    return opportunities;
  }

  /**
   * Check scheduled events and trigger them if their time has come
   */
  private checkScheduledEvents(): void {
    const eventsToTrigger = this.scheduledEvents.filter(
      event => event.scheduledFor <= this.currentDay
    );
    
    for (const event of eventsToTrigger) {
      this.triggerEvent(event.type, event.data);
      this.scheduledEvents = this.scheduledEvents.filter(e => e.id !== event.id);
    }
  }

  /**
   * Update active events and remove expired ones
   */
  private updateActiveEvents(): void {
    const expiredEvents = this.activeEvents.filter(event => event.expiresAt < this.currentDay);
    
    for (const event of expiredEvents) {
      if (event.type === 'ship_arrival') {
        // Ship departure happens automatically via scheduled event
        const arrivalData = event.data as ShipArrivalData;
        console.log(`Ship departed: ${arrivalData.shipType.name}, Captain ${arrivalData.captainName}`);
      } else if (event.type === 'cargo_demand') {
        // Cargo demand expired
        const demandData = event.data as CargoDemandData;
        console.log(`Export opportunity expired: ${demandData.goodId}`);
      }
      
      this.activeEvents = this.activeEvents.filter(e => e.id !== event.id);
    }
  }

  /**
   * Trigger a ship departure event
   */
  private triggerShipDeparture(departureData: ShipDepartureData): void {
    // Remove the corresponding arrival event
    this.activeEvents = this.activeEvents.filter(
      event => !(event.type === 'ship_arrival' && 
        (event.data as ShipArrivalData).shipType.id === departureData.shipType.id &&
        (event.data as ShipArrivalData).captainName === departureData.captainName)
    );
    
    // Create cargo demand events for export opportunities
    if (departureData.exportOpportunity.length > 0) {
      for (const opportunity of departureData.exportOpportunity) {
        const demandData: CargoDemandData = {
          goodId: opportunity.goodId,
          demandPrice: opportunity.demandPrice,
          quantity: 5 + Math.floor(Math.random() * 10), // 5-15 units
          expiresAt: this.currentDay + 1, // Opportunity lasts 1 day
        };
        
        const eventId = `cargo_demand_${this.generateEventId()}`;
        const activeEvent: ActiveEvent = {
          id: eventId,
          type: 'cargo_demand',
          startedAt: this.currentDay,
          expiresAt: demandData.expiresAt,
          data: demandData,
        };
        
        this.activeEvents.push(activeEvent);
        
        // Emit event for UI
        this.scene.events.emit('cargo_demand', demandData);
      }
    }
    
    // Emit departure event
    this.scene.events.emit('ship_departure', departureData);
    
    console.log(`Ship departed: ${departureData.shipType.name}, Captain ${departureData.captainName}`);
  }

  /**
   * Schedule an event to occur at a specific day
   */
  public scheduleEvent(event: Omit<ScheduledEvent, 'id'>): string {
    const eventId = `scheduled_${this.generateEventId()}`;
    const scheduledEvent: ScheduledEvent = {
      ...event,
      id: eventId,
    };
    
    this.scheduledEvents.push(scheduledEvent);
    return eventId;
  }

  /**
   * Manually trigger an event
   */
  public triggerEvent(type: EventType, data: any): void {
    switch (type) {
      case 'ship_arrival':
        this.triggerShipArrival(data.shipType);
        break;
      case 'ship_departure':
        this.triggerShipDeparture(data);
        break;
      case 'cargo_unloaded':
        this.triggerCargoUnloaded(data.goods);
        break;
      case 'cargo_demand':
        // Cargo demand is typically created by ship departures
        const demandData: CargoDemandData = data;
        const eventId = `cargo_demand_${this.generateEventId()}`;
        const activeEvent: ActiveEvent = {
          id: eventId,
          type: 'cargo_demand',
          startedAt: this.currentDay,
          expiresAt: demandData.expiresAt,
          data: demandData,
        };
        this.activeEvents.push(activeEvent);
        this.scene.events.emit('cargo_demand', demandData);
        break;
      default:
        console.warn(`Unknown event type: ${type}`);
    }
  }

  /**
   * Get all currently active events
   */
  public getActiveEvents(): ActiveEvent[] {
    return [...this.activeEvents];
  }

  /**
   * Get active events of a specific type
   */
  public getActiveEventsByType(type: EventType): ActiveEvent[] {
    return this.activeEvents.filter(event => event.type === type);
  }

  /**
   * Get all scheduled events
   */
  public getScheduledEvents(): ScheduledEvent[] {
    return [...this.scheduledEvents];
  }

  /**
   * Get ship type by ID
   */
  public getShipType(shipTypeId: string): ShipType | undefined {
    return this.shipTypes.find(st => st.id === shipTypeId);
  }

  /**
   * Get all ship types
   */
  public getAllShipTypes(): ShipType[] {
    return [...this.shipTypes];
  }

  /**
   * Adjust scheduled events when season changes
   */
  private adjustScheduledEventsForSeason(): void {
    const season = this.weatherSystem?.getCurrentSeason() || 'dry';
    
    // During monsoon, cancel some scheduled arrivals
    if (season === 'monsoon') {
      this.scheduledEvents = this.scheduledEvents.filter(event => {
        if (event.type === 'ship_arrival' || event.type === 'ship_departure') {
          // 80% chance to cancel during monsoon
          return Math.random() > 0.8;
        }
        return true;
      });
    }
  }

  /**
   * Get random captain name based on ship type
   */
  private getRandomCaptainName(shipTypeId: string): string {
    let nameList: string[] = [];
    
    if (shipTypeId === 'portuguese_carrack') {
      nameList = this.captainNames.portuguese;
    } else if (shipTypeId === 'arab_dhow') {
      nameList = this.captainNames.arab;
    } else if (shipTypeId === 'chinese_junk') {
      nameList = this.captainNames.chinese;
    } else {
      nameList = this.captainNames.local;
    }
    
    return nameList[Math.floor(Math.random() * nameList.length)];
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): number {
    return ++this.eventIdCounter;
  }

  /**
   * Clean up event listeners and data to prevent memory leaks
   */
  public destroy(): void {
    this.scene.events.off('newDay');
    this.scene.events.off('seasonChange');
    this.scheduledEvents = [];
    this.activeEvents = [];
  }
}
