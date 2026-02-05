import Phaser from 'phaser';
import { Player } from './Player';

/**
 * NPC - Non-player characters in 16th century Goa
 * Includes merchants, officials, and other denizens of the marketplace
 */
// NPC Schedule entry
interface ScheduleEntry {
  hour: number;
  location: string;
  activity: 'trading' | 'walking' | 'resting' | 'praying' | 'drinking';
  position?: { x: number; y: number };
}

export class NPC extends Phaser.GameObjects.Sprite {
  private npcId: string = '';
  private npcName: string;
  private npcType: string;
  private goods: string[];
  private tileX = 0;
  private tileY = 0;
  private interactionRadius = 50;
  private nameText!: Phaser.GameObjects.Text;
  private interactionPrompt!: Phaser.GameObjects.Text;
  private questIndicator!: Phaser.GameObjects.Graphics;
  private isPlayerNear = false;
  private hasAvailableQuest = false;
  private animationsCreated = false;
  private idleTimer = 0;

  // Schedule system
  private schedule: ScheduleEntry[] = [];
  private currentActivity: string = 'trading';
  private homeLocation: string = 'ribeira_grande';
  private isMovingToTarget = false;
  private targetPosition: { x: number; y: number } | null = null;
  private moveSpeed = 30;

  // NPC type to character texture mapping
  private static readonly textureMap: { [key: string]: string } = {
    'npc_portuguese': 'char_portuguese_merchant_medium_0',
    'npc_hindu': 'char_hindu_trader_medium_0',
    'npc_arab': 'char_arab_middleman_medium_0',
    'npc_official': 'char_crown_official_medium_0',
    'npc_sailor': 'char_sailor_medium_0',
    'npc_monk': 'char_franciscan_monk_medium_0',
    'npc_soldier': 'char_portuguese_soldier_medium_0',
    'npc_porter': 'char_dock_porter_medium_0',
  };

  // NPC dialogue lines based on their type
  private dialogueLines: { [key: string]: string[] } = {
    'npc_portuguese': [
      'Bom dia, senhor! The finest goods from Lisboa!',
      'Silk and porcelain, straight from the carrack!',
      'The Viceroy himself buys from me!',
    ],
    'npc_hindu': [
      'Namaste! Fresh pepper from the Malabar coast!',
      'The finest spices in all of Hindustan!',
      'My family has traded here for generations.',
    ],
    'npc_arab': [
      'Salaam! Cloves from the Moluccas!',
      'I have traveled from Hormuz with rare treasures.',
      'Quality spices for the discerning buyer.',
    ],
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: string,
    name: string,
    goods: string[]
  ) {
    // Use mapped texture key with fallback for unknown NPC types
    const textureKey = NPC.textureMap[type] || 'char_merchant_light_0';
    super(scene, x, y, textureKey);
    
    this.npcName = name;
    this.npcType = type;
    this.goods = goods;

    scene.add.existing(this);

    // Create name label above NPC
    this.createNameLabel();
    
    // Create interaction prompt
    this.createInteractionPrompt();
    
    // Create quest indicator (exclamation mark above NPC)
    this.createQuestIndicator();

    // Make NPC interactive
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.onHover());
    this.on('pointerout', () => this.onHoverEnd());

    // Set up default schedule based on NPC type
    this.initializeSchedule();

    // Listen for time changes
    this.scene.events.on('hourChange', this.onHourChange, this);
  }

  /**
   * Initialize NPC schedule based on their type and role
   */
  private initializeSchedule(): void {
    // Default schedule for merchants - at market during trading hours
    switch (this.npcType) {
      case 'npc_portuguese':
      case 'npc_hindu':
      case 'npc_arab':
        // Merchants: trade in morning and evening, rest in afternoon
        this.schedule = [
          { hour: 7, location: 'ribeira_grande', activity: 'trading' },
          { hour: 8, location: 'ribeira_grande', activity: 'trading' },
          { hour: 9, location: 'ribeira_grande', activity: 'trading' },
          { hour: 10, location: 'ribeira_grande', activity: 'trading' },
          { hour: 11, location: 'ribeira_grande', activity: 'trading' },
          { hour: 12, location: 'ribeira_grande', activity: 'resting' },
          { hour: 13, location: 'ribeira_grande', activity: 'resting' },
          { hour: 14, location: 'ribeira_grande', activity: 'resting' },
          { hour: 15, location: 'ribeira_grande', activity: 'resting' },
          { hour: 16, location: 'ribeira_grande', activity: 'walking' },
          { hour: 17, location: 'ribeira_grande', activity: 'trading' },
          { hour: 18, location: 'ribeira_grande', activity: 'trading' },
          { hour: 19, location: 'ribeira_grande', activity: 'trading' },
          { hour: 20, location: 'tavern', activity: 'drinking' },
          { hour: 21, location: 'tavern', activity: 'drinking' },
        ];
        break;

      case 'npc_official':
        // Officials: work at customs/alfandega
        this.schedule = [
          { hour: 7, location: 'ribeira_grande', activity: 'walking' },
          { hour: 8, location: 'alfandega', activity: 'trading' },
          { hour: 9, location: 'alfandega', activity: 'trading' },
          { hour: 10, location: 'alfandega', activity: 'trading' },
          { hour: 11, location: 'alfandega', activity: 'trading' },
          { hour: 12, location: 'alfandega', activity: 'resting' },
          { hour: 13, location: 'ribeira_grande', activity: 'walking' },
          { hour: 14, location: 'ribeira_grande', activity: 'trading' },
          { hour: 15, location: 'alfandega', activity: 'trading' },
          { hour: 16, location: 'alfandega', activity: 'trading' },
          { hour: 17, location: 'alfandega', activity: 'trading' },
          { hour: 18, location: 'ribeira_grande', activity: 'walking' },
        ];
        break;

      case 'npc_sailor':
        // Sailors: at docks during day, tavern at night
        this.schedule = [
          { hour: 6, location: 'docks', activity: 'trading' },
          { hour: 7, location: 'docks', activity: 'trading' },
          { hour: 8, location: 'docks', activity: 'trading' },
          { hour: 9, location: 'docks', activity: 'trading' },
          { hour: 10, location: 'ribeira_grande', activity: 'walking' },
          { hour: 11, location: 'ribeira_grande', activity: 'trading' },
          { hour: 12, location: 'tavern', activity: 'drinking' },
          { hour: 13, location: 'tavern', activity: 'drinking' },
          { hour: 14, location: 'docks', activity: 'trading' },
          { hour: 15, location: 'docks', activity: 'trading' },
          { hour: 16, location: 'docks', activity: 'trading' },
          { hour: 17, location: 'tavern', activity: 'drinking' },
          { hour: 18, location: 'tavern', activity: 'drinking' },
          { hour: 19, location: 'tavern', activity: 'drinking' },
          { hour: 20, location: 'tavern', activity: 'drinking' },
        ];
        break;

      case 'npc_monk':
        // Monks: prayer and cathedral
        this.schedule = [
          { hour: 5, location: 'se_cathedral', activity: 'praying' },
          { hour: 6, location: 'se_cathedral', activity: 'praying' },
          { hour: 7, location: 'se_cathedral', activity: 'praying' },
          { hour: 8, location: 'ribeira_grande', activity: 'walking' },
          { hour: 9, location: 'ribeira_grande', activity: 'trading' },
          { hour: 10, location: 'ribeira_grande', activity: 'trading' },
          { hour: 11, location: 'se_cathedral', activity: 'praying' },
          { hour: 12, location: 'se_cathedral', activity: 'praying' },
          { hour: 13, location: 'se_cathedral', activity: 'resting' },
          { hour: 14, location: 'old_quarter', activity: 'walking' },
          { hour: 15, location: 'old_quarter', activity: 'trading' },
          { hour: 16, location: 'ribeira_grande', activity: 'walking' },
          { hour: 17, location: 'se_cathedral', activity: 'praying' },
          { hour: 18, location: 'se_cathedral', activity: 'praying' },
        ];
        break;

      case 'npc_porter':
        // Porters: at docks and warehouse
        this.schedule = [
          { hour: 6, location: 'docks', activity: 'trading' },
          { hour: 7, location: 'docks', activity: 'trading' },
          { hour: 8, location: 'warehouse_district', activity: 'trading' },
          { hour: 9, location: 'warehouse_district', activity: 'trading' },
          { hour: 10, location: 'ribeira_grande', activity: 'trading' },
          { hour: 11, location: 'ribeira_grande', activity: 'trading' },
          { hour: 12, location: 'ribeira_grande', activity: 'resting' },
          { hour: 13, location: 'docks', activity: 'trading' },
          { hour: 14, location: 'docks', activity: 'trading' },
          { hour: 15, location: 'warehouse_district', activity: 'trading' },
          { hour: 16, location: 'warehouse_district', activity: 'trading' },
          { hour: 17, location: 'docks', activity: 'trading' },
          { hour: 18, location: 'tavern', activity: 'drinking' },
        ];
        break;

      case 'npc_soldier':
        // Soldiers: patrol routes
        this.schedule = [
          { hour: 6, location: 'docks', activity: 'walking' },
          { hour: 7, location: 'ribeira_grande', activity: 'trading' },
          { hour: 8, location: 'ribeira_grande', activity: 'trading' },
          { hour: 9, location: 'alfandega', activity: 'trading' },
          { hour: 10, location: 'alfandega', activity: 'trading' },
          { hour: 11, location: 'ribeira_grande', activity: 'trading' },
          { hour: 12, location: 'ribeira_grande', activity: 'resting' },
          { hour: 13, location: 'ribeira_grande', activity: 'trading' },
          { hour: 14, location: 'docks', activity: 'trading' },
          { hour: 15, location: 'docks', activity: 'trading' },
          { hour: 16, location: 'ribeira_grande', activity: 'trading' },
          { hour: 17, location: 'ribeira_grande', activity: 'trading' },
          { hour: 18, location: 'ribeira_grande', activity: 'trading' },
          { hour: 19, location: 'old_quarter', activity: 'walking' },
          { hour: 20, location: 'ribeira_grande', activity: 'trading' },
        ];
        break;

      default:
        // Default: stay at market
        this.schedule = [
          { hour: 7, location: 'ribeira_grande', activity: 'trading' },
          { hour: 8, location: 'ribeira_grande', activity: 'trading' },
          { hour: 9, location: 'ribeira_grande', activity: 'trading' },
          { hour: 17, location: 'ribeira_grande', activity: 'trading' },
          { hour: 18, location: 'ribeira_grande', activity: 'trading' },
        ];
    }
  }

  /**
   * Handle hour change - update NPC activity based on schedule
   */
  private onHourChange(timeData: { hour: number }): void {
    // Find schedule entry for current hour
    const entry = this.schedule.find(s => s.hour === timeData.hour);
    if (entry) {
      this.currentActivity = entry.activity;

      // Check if NPC should move to a different location
      const currentLocation = this.scene.registry.get('currentLocation') || 'ribeira_grande';
      if (entry.location !== currentLocation) {
        // NPC should be in a different location - they'll "disappear" from here
        // This is handled by the location system checking NPC schedules
      }
    }
  }

  /**
   * Check if NPC should be visible at current location and time
   */
  public shouldBeVisibleAt(location: string, hour: number): boolean {
    const entry = this.schedule.find(s => s.hour === hour);
    if (!entry) {
      // No schedule entry - default to home location during market hours
      if (hour >= 7 && hour <= 19) {
        return location === this.homeLocation;
      }
      return false;
    }
    return entry.location === location;
  }

  /**
   * Get current activity for dialogue/interaction purposes
   */
  public getCurrentActivity(): string {
    return this.currentActivity;
  }

  /**
   * Set NPC home location
   */
  public setHomeLocation(location: string): void {
    this.homeLocation = location;
  }

  /**
   * Set custom schedule for this NPC
   */
  public setSchedule(schedule: ScheduleEntry[]): void {
    this.schedule = schedule;
  }

  public setNpcId(id: string): void {
    this.npcId = id;
    // Check for quests immediately
    this.checkForQuests();
  }

  public getNpcId(): string {
    return this.npcId;
  }

  private createNameLabel(): void {
    this.nameText = this.scene.add.text(this.x, this.y - 35, this.npcName, {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#F5E6D3',
      backgroundColor: '#2C1810',
      padding: { x: 4, y: 2 },
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.nameText.setDepth(1000);
  }

  private createInteractionPrompt(): void {
    this.interactionPrompt = this.scene.add.text(this.x, this.y - 50, '[E] Talk', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#FFD700',
      backgroundColor: '#2C1810',
      padding: { x: 4, y: 2 },
    });
    this.interactionPrompt.setOrigin(0.5, 0.5);
    this.interactionPrompt.setDepth(1001);
    this.interactionPrompt.setVisible(false);
  }

  private createQuestIndicator(): void {
    this.questIndicator = this.scene.add.graphics();
    this.questIndicator.setDepth(1002);
    this.questIndicator.setPosition(this.x, this.y);
    this.drawQuestIndicator();
    this.questIndicator.setVisible(false);

    // Animate the quest indicator with a bobbing motion
    this.scene.tweens.add({
      targets: this.questIndicator,
      y: { from: this.y, to: this.y - 5 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawQuestIndicator(): void {
    this.questIndicator.clear();

    // Draw at relative position (0, -55) since graphics position is set to NPC position
    // Draw exclamation mark inside a golden circle
    this.questIndicator.fillStyle(0xffd700, 1);
    this.questIndicator.fillCircle(0, -55, 8);

    // Exclamation mark body
    this.questIndicator.fillStyle(0x2c1810, 1);
    this.questIndicator.fillRect(-1, -61, 3, 7);

    // Exclamation mark dot
    this.questIndicator.fillRect(-1, -52, 3, 2);
  }

  private checkForQuests(): void {
    if (!this.npcId) return;
    
    // Get quest system from scene registry
    const questSystem = this.scene.registry.get('questSystem');
    if (!questSystem) return;
    
    // Check if this NPC has any available quests
    const availableQuests = questSystem.getQuestsFromNPC?.(this.npcId) || [];
    this.hasAvailableQuest = availableQuests.length > 0;
    
    // Show/hide quest indicator
    if (this.questIndicator) {
      this.questIndicator.setVisible(this.hasAvailableQuest);
    }
  }

  private onHover(): void {
    this.setTint(0xcccccc);
  }

  private onHoverEnd(): void {
    this.clearTint();
  }

  public setTilePosition(x: number, y: number): void {
    this.tileX = x;
    this.tileY = y;
  }

  public getTilePosition(): { x: number; y: number } {
    return { x: this.tileX, y: this.tileY };
  }

  update(_time: number, delta: number): void {
    // Update name label position
    this.nameText.setPosition(this.x, this.y - 35);
    this.interactionPrompt.setPosition(this.x, this.y - 50);

    // Update quest indicator position (only the base position, let tween handle animation)
    if (this.questIndicator) {
      this.questIndicator.setPosition(this.x, this.y);
    }

    // Periodically check for quests (every few seconds)
    if (Math.random() < 0.01) {
      this.checkForQuests();
    }

    // Handle movement if NPC is walking to a target
    if (this.isMovingToTarget && this.targetPosition) {
      this.updateMovement(delta);
    }

    // Check if player is nearby
    this.checkPlayerProximity();

    // Update idle animation
    this.updateIdleAnimation(delta);

    // Activity-based behaviors
    this.updateActivityBehavior(delta);
  }

  /**
   * Update NPC movement towards target
   */
  private updateMovement(delta: number): void {
    if (!this.targetPosition) return;

    const dx = this.targetPosition.x - this.x;
    const dy = this.targetPosition.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      // Reached target
      this.isMovingToTarget = false;
      this.targetPosition = null;
      return;
    }

    // Move towards target
    const moveAmount = (this.moveSpeed * delta) / 1000;
    const ratio = moveAmount / distance;

    this.x += dx * ratio;
    this.y += dy * ratio;
  }

  /**
   * Set target position for NPC to walk to
   */
  public walkTo(x: number, y: number): void {
    this.targetPosition = { x, y };
    this.isMovingToTarget = true;
  }

  /**
   * Update behavior based on current activity
   */
  private updateActivityBehavior(_delta: number): void {
    // Different behaviors for different activities
    switch (this.currentActivity) {
      case 'walking':
        // Occasional random movement when walking
        if (Math.random() < 0.001 && !this.isMovingToTarget) {
          const offsetX = (Math.random() - 0.5) * 40;
          const offsetY = (Math.random() - 0.5) * 20;
          this.walkTo(this.x + offsetX, this.y + offsetY);
        }
        break;

      case 'resting':
        // NPCs rest more quietly, less animation
        break;

      case 'praying':
        // Could add prayer animation
        break;

      case 'drinking':
        // Could add drinking animation, swaying
        break;

      case 'trading':
      default:
        // Normal merchant behavior - handled by idle animation
        break;
    }
  }

  /**
   * Create NPC animations from spritesheet if available
   */
  private createAnimations(): void {
    if (this.animationsCreated) return;

    // Get the animated texture key for this NPC type
    const textureKey = NPC.textureMap[this.npcType];
    if (!textureKey || !this.scene.textures.exists(textureKey)) {
      // Fallback to static sprite
      return;
    }

    // Create idle animation (uses first row, south-facing)
    const idleKey = `${this.npcType}_idle`;
    if (!this.scene.anims.exists(idleKey)) {
      this.scene.anims.create({
        key: idleKey,
        frames: this.scene.anims.generateFrameNumbers(textureKey, {
          start: 0,
          end: 3,
        }),
        frameRate: 2,
        repeat: -1,
      });
    }

    this.animationsCreated = true;
  }

  /**
   * Play idle animation with occasional variation
   */
  private updateIdleAnimation(delta: number): void {
    // Create animations if needed
    this.createAnimations();

    if (!this.animationsCreated) return;

    // Play idle animation
    const idleKey = `${this.npcType}_idle`;
    if (this.anims.currentAnim?.key !== idleKey && this.scene.anims.exists(idleKey)) {
      this.play(idleKey, true);
    }

    // Occasional idle variation (look around)
    this.idleTimer += delta;
    if (this.idleTimer > 5000 + Math.random() * 3000) {
      this.idleTimer = 0;
      // Could add look-around behavior here
    }
  }

  private checkPlayerProximity(): void {
    // Get player from scene
    const marketScene = this.scene as any;
    if (!marketScene.getPlayer) return;
    
    const player = marketScene.getPlayer();
    if (!player) return;

    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      player.x, player.y
    );

    const wasNear = this.isPlayerNear;
    this.isPlayerNear = distance < this.interactionRadius;

    if (this.isPlayerNear !== wasNear) {
      this.interactionPrompt.setVisible(this.isPlayerNear);
    }
    
    // Note: E key handling is now centralized in MarketScene.setupInput()
    // to avoid conflicts with transition zones
  }

  public interact(_player: Player): void {
    // Notify quest system about NPC interaction (for talk objectives)
    if (this.npcId) {
      const questSystem = this.scene.registry.get('questSystem');
      if (questSystem && questSystem.handleNPCInteraction) {
        questSystem.handleNPCInteraction(this.npcId);
      }
      
      // Emit event for quest progress tracking
      this.scene.events.emit('npcInteraction', { npcId: this.npcId, npcName: this.npcName });
    }

    // First check if NPC has quests to offer
    if (this.hasAvailableQuest && this.npcId) {
      const questSystem = this.scene.registry.get('questSystem');
      if (questSystem) {
        const availableQuests = questSystem.getQuestsFromNPC?.(this.npcId) || [];
        if (availableQuests.length > 0) {
          // Emit quest offer event for UI to handle
          this.scene.events.emit('questOffer', {
            npcId: this.npcId,
            npcName: this.npcName,
            quests: availableQuests,
          });
          return;
        }
      }
    }

    // Use DialogueSystem for proper dialogue trees
    const dialogueSystem = this.scene.registry.get('dialogueSystem');
    if (dialogueSystem) {
      // Store current NPC info in registry for dialogue system to use
      this.scene.registry.set('currentDialogueNPC', {
        name: this.npcName,
        type: this.npcType,
        goods: this.goods,
      });
      // Start dialogue using the NPC type and name
      dialogueSystem.startDialogue(this.npcType, this.npcName);
    } else {
      // Fallback: open trade panel directly for NPCs with goods
      if (this.goods.length > 0) {
        this.scene.events.emit('openTrade', {
          npcName: this.npcName,
          goods: this.goods,
        });
      } else {
        // Show simple dialogue
        const lines = this.dialogueLines[this.npcType] || ['...'];
        const randomLine = lines[Math.floor(Math.random() * lines.length)];
        console.log(`${this.npcName}: "${randomLine}"`);
        this.showDialogue(randomLine);
      }
    }
  }

  private showDialogue(text: string): void {
    // Create temporary dialogue bubble
    const dialogue = this.scene.add.text(this.x, this.y - 70, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#F5E6D3',
      backgroundColor: '#2C1810',
      padding: { x: 8, y: 4 },
      wordWrap: { width: 150 },
    });
    dialogue.setOrigin(0.5, 1);
    dialogue.setDepth(2000);

    // Fade out after 3 seconds
    this.scene.tweens.add({
      targets: dialogue,
      alpha: 0,
      y: dialogue.y - 20,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => dialogue.destroy(),
    });
  }

  public getName(): string {
    return this.npcName;
  }

  public getGoods(): string[] {
    return [...this.goods];
  }

  public getType(): string {
    return this.npcType;
  }

  public isNearPlayer(): boolean {
    return this.isPlayerNear;
  }

  public destroy(fromScene?: boolean): void {
    // Remove event listeners
    this.scene.events.off('hourChange', this.onHourChange, this);

    // Clean up child objects
    if (this.nameText) {
      this.nameText.destroy();
    }
    if (this.interactionPrompt) {
      this.interactionPrompt.destroy();
    }
    if (this.questIndicator) {
      this.questIndicator.destroy();
    }

    // Call parent destroy
    super.destroy(fromScene);
  }
}
