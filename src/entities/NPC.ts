import Phaser from 'phaser';
import { Player } from './Player';

/**
 * NPC - Non-player characters in 16th century Goa
 * Includes merchants, officials, and other denizens of the marketplace
 */
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
    super(scene, x, y, type);
    
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

    // Check if player is nearby
    this.checkPlayerProximity();

    // Update idle animation
    this.updateIdleAnimation(delta);
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
