import Phaser from 'phaser';

/**
 * UIScene - Handles all UI elements overlaid on the game
 * Includes inventory, trade dialogs, minimap, and status displays
 */
export class UIScene extends Phaser.Scene {
  private timeText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private rankText!: Phaser.GameObjects.Text;
  private inventoryPanel!: Phaser.GameObjects.Container;
  private tradePanel!: Phaser.GameObjects.Container;
  private transitionPrompt!: Phaser.GameObjects.Container;
  private questOfferPanel!: Phaser.GameObjects.Container;
  private questLogPanel!: Phaser.GameObjects.Container;
  private contractPanel!: Phaser.GameObjects.Container;
  private bottomBar!: Phaser.GameObjects.Container;
  private actionButtons: Map<string, Phaser.GameObjects.Container> = new Map();
  private isInventoryOpen = false;
  private isTradeOpen = false;
  private isQuestOfferOpen = false;
  private isQuestLogOpen = false;
  private isContractPanelOpen = false;
  private currentQuestOffer: { npcId: string; npcName: string; quests: any[] } | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.createStatusBar();
    this.createBottomActionBar();
    this.createInventoryPanel();
    this.createTradePanel();
    this.createTransitionPrompt();
    this.createQuestOfferPanel();
    this.createQuestLogPanel();
    this.createContractPanel();
    this.setupEventListeners();
    this.setupInputHandlers();

    // Sync initial state from player after a short delay to ensure MarketScene is ready
    this.time.delayedCall(100, () => {
      this.syncFromPlayer();
    });
  }

  /**
   * Get current gold from Player (source of truth)
   */
  private getGold(): number {
    try {
      const marketScene = this.scene.get('MarketScene') as any;
      if (marketScene?.getPlayer) {
        const player = marketScene.getPlayer();
        if (player?.getGold) {
          return player.getGold();
        }
      }
    } catch (e) {
      console.warn('Could not get gold from player:', e);
    }
    return 100; // Fallback default
  }

  /**
   * Get current inventory from Player (source of truth)
   */
  private getInventory(): { item: string; quantity: number }[] {
    try {
      const marketScene = this.scene.get('MarketScene') as any;
      if (marketScene?.getPlayer) {
        const player = marketScene.getPlayer();
        if (player?.getInventory) {
          return player.getInventory();
        }
      }
    } catch (e) {
      console.warn('Could not get inventory from player:', e);
    }
    return []; // Fallback default
  }

  /**
   * Sync UI state from Player - called on scene create and after load
   */
  private syncFromPlayer(): void {
    try {
      const gold = this.getGold();
      this.goldText?.setText(`${gold}`);
      this.updateInventoryDisplay();
    } catch (e) {
      console.warn('Could not sync from player:', e);
    }
  }

  private createTransitionPrompt(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    this.transitionPrompt = this.add.container(width / 2, height - 60);
    this.transitionPrompt.setVisible(false);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x3d2314, 0.9);
    bg.fillRoundedRect(-120, -20, 240, 40, 8);
    bg.lineStyle(2, 0xc9a227, 0.8);
    bg.strokeRoundedRect(-120, -20, 240, 40, 8);
    this.transitionPrompt.add(bg);
    
    // Text
    const text = this.add.text(0, 0, 'Press E to enter', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#f4e4bc',
    });
    text.setOrigin(0.5, 0.5);
    text.setName('promptText');
    this.transitionPrompt.add(text);
  }

  private createQuestOfferPanel(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    this.questOfferPanel = this.add.container(width / 2, height / 2);
    this.questOfferPanel.setVisible(false);
    this.questOfferPanel.setDepth(2000);
    
    // Larger parchment background for Ultima 8 style
    const bg = this.add.graphics();
    bg.fillStyle(0xf4e4bc, 0.98);
    bg.fillRoundedRect(-250, -180, 500, 360, 12);
    
    // NPC portrait placeholder (left side)
    bg.fillStyle(0x3d2314, 1);
    bg.fillRect(-230, -160, 80, 80);
    bg.fillStyle(0xd4a574, 1); // Skin tone placeholder
    bg.fillRect(-226, -156, 72, 72);
    bg.fillStyle(0x2c1810, 0.3);
    bg.fillCircle(-190, -120, 25); // Face silhouette
    bg.lineStyle(2, 0xc9a227, 1);
    bg.strokeRect(-230, -160, 80, 80);
    
    // Wood frame
    bg.fillStyle(0x3d2314, 1);
    bg.fillRect(-200, -150, 400, 5);
    bg.fillRect(-200, 145, 400, 5);
    bg.fillRect(-200, -150, 5, 300);
    bg.fillRect(195, -150, 5, 300);
    
    // Gold accent
    bg.fillStyle(0xc9a227, 0.7);
    bg.fillRect(-195, -145, 390, 2);
    this.questOfferPanel.add(bg);
    
    // Title
    const title = this.add.text(0, -120, 'Quest Available', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#2c1810',
      fontStyle: 'italic',
    });
    title.setOrigin(0.5, 0.5);
    title.setName('questTitle');
    this.questOfferPanel.add(title);
    
    // Quest name
    const questName = this.add.text(0, -80, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2c1810',
      fontStyle: 'bold',
    });
    questName.setOrigin(0.5, 0.5);
    questName.setName('questName');
    this.questOfferPanel.add(questName);
    
    // Quest description
    const questDesc = this.add.text(0, -20, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#4a3020',
      wordWrap: { width: 360 },
      align: 'center',
    });
    questDesc.setOrigin(0.5, 0.5);
    questDesc.setName('questDesc');
    this.questOfferPanel.add(questDesc);
    
    // Accept button
    const acceptBg = this.add.graphics();
    acceptBg.fillStyle(0x2d5a27, 1);
    acceptBg.fillRoundedRect(-80, 80, 70, 30, 5);
    this.questOfferPanel.add(acceptBg);
    
    const acceptBtn = this.add.text(-45, 95, 'Accept', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#f4e4bc',
    });
    acceptBtn.setOrigin(0.5, 0.5);
    acceptBtn.setInteractive({ useHandCursor: true });
    acceptBtn.on('pointerdown', () => this.acceptQuest());
    acceptBtn.on('pointerover', () => acceptBg.clear().fillStyle(0x4a8a42, 1).fillRoundedRect(-80, 80, 70, 30, 5));
    acceptBtn.on('pointerout', () => acceptBg.clear().fillStyle(0x2d5a27, 1).fillRoundedRect(-80, 80, 70, 30, 5));
    this.questOfferPanel.add(acceptBtn);
    
    // Decline button
    const declineBg = this.add.graphics();
    declineBg.fillStyle(0x8b2500, 1);
    declineBg.fillRoundedRect(10, 80, 70, 30, 5);
    this.questOfferPanel.add(declineBg);
    
    const declineBtn = this.add.text(45, 95, 'Decline', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#f4e4bc',
    });
    declineBtn.setOrigin(0.5, 0.5);
    declineBtn.setInteractive({ useHandCursor: true });
    declineBtn.on('pointerdown', () => this.closeQuestOffer());
    declineBtn.on('pointerover', () => declineBg.clear().fillStyle(0xa83000, 1).fillRoundedRect(10, 80, 70, 30, 5));
    declineBtn.on('pointerout', () => declineBg.clear().fillStyle(0x8b2500, 1).fillRoundedRect(10, 80, 70, 30, 5));
    this.questOfferPanel.add(declineBtn);
  }

  private createQuestLogPanel(): void {
    this.questLogPanel = this.add.container(20, 70);
    this.questLogPanel.setVisible(false);
    this.questLogPanel.setDepth(1500);
    
    // Larger parchment background for Ultima 8 style
    const bg = this.add.graphics();
    bg.fillStyle(0xf4e4bc, 0.95);
    bg.fillRoundedRect(0, 0, 320, 280, 8);
    
    // Aged paper texture
    bg.fillStyle(0xe8d4a8, 0.3);
    for (let i = 0; i < 320; i += 12) {
      if (Math.random() > 0.5) {
        bg.fillRect(i, Math.random() * 270, 6, 2);
      }
    }
    
    // Wood frame
    bg.fillStyle(0x3d2314, 1);
    bg.fillRect(0, 0, 320, 5);
    bg.fillRect(0, 275, 320, 5);
    bg.fillRect(0, 0, 5, 280);
    bg.fillRect(315, 0, 5, 280);
    
    // Gold accent
    bg.fillStyle(0xc9a227, 0.8);
    bg.fillRect(5, 5, 310, 2);
    bg.fillRect(5, 273, 310, 2);
    this.questLogPanel.add(bg);
    
    // Ornate title
    const title = this.add.text(160, 20, '- Quest Log -', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#2c1810',
      fontStyle: 'bold italic',
    });
    title.setOrigin(0.5, 0.5);
    this.questLogPanel.add(title);
    
    // Press J to close hint
    const closeHint = this.add.text(160, 260, 'Press J to close', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#5a4030',
      fontStyle: 'italic',
    });
    closeHint.setOrigin(0.5, 0.5);
    this.questLogPanel.add(closeHint);
    
    // Decorative separator
    const sep = this.add.graphics();
    sep.lineStyle(2, 0x8b6914, 0.6);
    sep.lineBetween(20, 35, 300, 35);
    sep.fillStyle(0xc9a227, 1);
    sep.fillCircle(160, 35, 4); // Center ornament
    this.questLogPanel.add(sep);
    
    // Quest list container - larger
    const questList = this.add.container(15, 50);
    questList.setName('questList');
    this.questLogPanel.add(questList);
  }

  private showQuestOffer(data: { npcId: string; npcName: string; quests: any[] }): void {
    if (data.quests.length === 0) return;
    
    this.currentQuestOffer = data;
    const quest = data.quests[0]; // Show first available quest
    
    // Update panel content
    const questName = this.questOfferPanel.getByName('questName') as Phaser.GameObjects.Text;
    const questDesc = this.questOfferPanel.getByName('questDesc') as Phaser.GameObjects.Text;
    
    if (questName) questName.setText(quest.title || 'Untitled Quest');
    if (questDesc) questDesc.setText(quest.description || '');
    
    this.questOfferPanel.setVisible(true);
    this.isQuestOfferOpen = true;
  }

  private acceptQuest(): void {
    if (!this.currentQuestOffer || this.currentQuestOffer.quests.length === 0) return;
    
    const quest = this.currentQuestOffer.quests[0];
    const questSystem = this.registry.get('questSystem');
    
    if (questSystem && quest.id) {
      questSystem.startQuest(quest.id);
      this.updateQuestLog();
    }
    
    this.closeQuestOffer();
  }

  private closeQuestOffer(): void {
    this.questOfferPanel.setVisible(false);
    this.isQuestOfferOpen = false;
    this.currentQuestOffer = null;
  }

  private toggleQuestLog(): void {
    this.isQuestLogOpen = !this.isQuestLogOpen;
    this.questLogPanel.setVisible(this.isQuestLogOpen);

    if (this.isQuestLogOpen) {
      // Close other panels when opening quest log
      if (this.isInventoryOpen) {
        this.isInventoryOpen = false;
        this.inventoryPanel.setVisible(false);
      }
      if (this.isContractPanelOpen) {
        this.isContractPanelOpen = false;
        this.contractPanel.setVisible(false);
      }
      this.updateQuestLog();
    }
  }

  private updateQuestLog(): void {
    const questList = this.questLogPanel.getByName('questList') as Phaser.GameObjects.Container;
    if (!questList) return;
    
    // Clear existing entries
    questList.removeAll(true);
    
    const questSystem = this.registry.get('questSystem');
    if (!questSystem) {
      const noQuests = this.add.text(0, 0, 'No active quests', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#8a7a60',
        fontStyle: 'italic',
      });
      questList.add(noQuests);
      return;
    }
    
    const activeQuests = questSystem.getActiveQuests?.() || [];
    
    if (activeQuests.length === 0) {
      const noQuests = this.add.text(0, 0, 'No active quests', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#8a7a60',
        fontStyle: 'italic',
      });
      questList.add(noQuests);
      return;
    }
    
    let yOffset = 0;
    for (const { quest, state } of activeQuests) {
      // Quest title
      const titleText = this.add.text(0, yOffset, quest.title, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#2c1810',
        fontStyle: 'bold',
      });
      questList.add(titleText);
      yOffset += 18;

      // Find current stage by ID (fix: use currentStageId, not currentStage index)
      const currentStage = quest.stages.find((s: any) => s.id === state.currentStageId);
      if (currentStage) {
        // Build objective text with progress if applicable
        let objectiveText = `• ${currentStage.objective}`;

        // Add progress display for quantity objectives
        if (currentStage.quantity && currentStage.quantity > 1) {
          const progress = state.progress || 0;
          objectiveText += ` (${progress}/${currentStage.quantity})`;
        }

        const objText = this.add.text(10, yOffset, objectiveText, {
          fontFamily: 'Georgia, serif',
          fontSize: '10px',
          color: '#5a4020',
          wordWrap: { width: 280 },
        });
        questList.add(objText);
        yOffset += objText.height + 6;

        // Show available choices if stage has them
        if (currentStage.choices && currentStage.choices.length > 0) {
          const choiceHint = this.add.text(15, yOffset, '↳ Choices available - talk to NPC', {
            fontFamily: 'Georgia, serif',
            fontSize: '9px',
            color: '#8b6914',
            fontStyle: 'italic',
          });
          questList.add(choiceHint);
          yOffset += choiceHint.height + 4;
        }
      }
      yOffset += 8; // Spacing between quests
    }
  }

  private createStatusBar(): void {
    const width = this.cameras.main.width;

    // Larger parchment-style status bar for Ultima 8 style
    const statusBar = this.add.graphics();

    // Base parchment color - taller for portrait
    statusBar.fillStyle(0xf4e4bc, 0.95);
    statusBar.fillRect(0, 0, width, 56);

    // Aged paper texture effect (subtle noise)
    statusBar.fillStyle(0xe8d4a8, 0.3);
    for (let i = 0; i < width; i += 8) {
      if (Math.random() > 0.5) {
        statusBar.fillRect(i, Math.random() * 50, 4, 2);
      }
    }

    // Dark wood frame top and bottom
    statusBar.fillStyle(0x3d2314, 1);
    statusBar.fillRect(0, 0, width, 4);
    statusBar.fillRect(0, 52, width, 4);

    // Gold leaf accent line
    statusBar.fillStyle(0xc9a227, 0.8);
    statusBar.fillRect(0, 4, width, 2);
    statusBar.fillRect(0, 50, width, 2);

    // Portrait frame with metal studs (enhanced 90s RPG style)
    const portraitBg = this.add.graphics();
    // Outer metal frame
    portraitBg.fillStyle(0x4a4a4a, 1);
    portraitBg.fillRect(6, 6, 44, 44);
    // Inner bevel (light top-left, dark bottom-right)
    portraitBg.fillStyle(0x6a6a6a, 1);
    portraitBg.fillRect(6, 6, 44, 2);
    portraitBg.fillRect(6, 6, 2, 44);
    portraitBg.fillStyle(0x2a2a2a, 1);
    portraitBg.fillRect(6, 48, 44, 2);
    portraitBg.fillRect(48, 6, 2, 44);
    // Portrait background
    portraitBg.fillStyle(0x1a1a2e, 1);
    portraitBg.fillRect(10, 10, 36, 36);
    // Character silhouette
    portraitBg.fillStyle(0xd4a574, 1);
    portraitBg.fillCircle(28, 22, 8); // Head
    portraitBg.fillRect(20, 30, 16, 14); // Body
    // Metal corner studs
    portraitBg.fillStyle(0x8b8b8b, 1);
    portraitBg.fillCircle(10, 10, 3);
    portraitBg.fillCircle(46, 10, 3);
    portraitBg.fillCircle(10, 46, 3);
    portraitBg.fillCircle(46, 46, 3);
    // Stud highlights
    portraitBg.fillStyle(0xb0b0b0, 1);
    portraitBg.fillCircle(9, 9, 1);
    portraitBg.fillCircle(45, 9, 1);
    portraitBg.fillCircle(9, 45, 1);
    portraitBg.fillCircle(45, 45, 1);

    // Corner ornaments (simple flourishes)
    this.drawCornerOrnament(statusBar, 58, 8);

    // Time display with larger quill-written style
    this.timeText = this.add.text(64, 12, 'Market Hours - 7:00 AM (Day 1)', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2c1810',
    });

    // Location hint below time
    const locationText = this.add.text(64, 32, 'Ribeira Grande - The Great Waterfront', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#5a4030',
      fontStyle: 'italic',
    });
    locationText.setName('locationText');

    // Rank display (positioned after location)
    this.rankText = this.add.text(340, 32, 'Peddler', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#5a4030',
      fontStyle: 'italic',
    });

    // Gold display with coin icon
    this.createGoldDisplay(width - 140, 18);
  }

  /**
   * Create gold coin icon and text display
   */
  private createGoldDisplay(x: number, y: number): void {
    const coinContainer = this.add.container(x, y);

    // Draw gold coin icon (16x16)
    const coin = this.add.graphics();

    // Coin base (gold)
    coin.fillStyle(0xffd700, 1);
    coin.fillCircle(0, 0, 10);

    // Coin edge shadow (darker gold)
    coin.fillStyle(0xb8860b, 1);
    coin.fillCircle(1, 1, 10);

    // Coin face (bright gold)
    coin.fillStyle(0xffd700, 1);
    coin.fillCircle(0, 0, 9);

    // Highlight (top-left shine)
    coin.fillStyle(0xffec8b, 1);
    coin.fillCircle(-3, -3, 4);

    // Inner detail (cross or pattern)
    coin.fillStyle(0xb8860b, 0.6);
    coin.fillRect(-1, -6, 2, 12);
    coin.fillRect(-6, -1, 12, 2);

    // Center dot
    coin.fillStyle(0xffd700, 1);
    coin.fillCircle(0, 0, 2);

    coinContainer.add(coin);

    // Gold text next to coin
    this.goldText = this.add.text(16, -10, '100', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#8b6914',
      fontStyle: 'bold',
      stroke: '#3d2314',
      strokeThickness: 1,
    });
    coinContainer.add(this.goldText);
  }

  private drawCornerOrnament(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    graphics.fillStyle(0x8b6914, 0.7);
    graphics.fillRect(x, y, 15, 2);
    graphics.fillRect(x, y, 2, 15);
    graphics.fillRect(x + 3, y + 3, 8, 1);
    graphics.fillRect(x + 3, y + 3, 1, 8);
  }

  /**
   * Create bottom action bar with icon buttons (90s RPG style)
   */
  private createBottomActionBar(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const barHeight = 52;
    const barY = height - barHeight;

    this.bottomBar = this.add.container(0, barY);
    this.bottomBar.setDepth(100);

    // Main bar background (dark wood with metal trim)
    const barBg = this.add.graphics();

    // Wood base
    barBg.fillStyle(0x2c1810, 0.95);
    barBg.fillRect(0, 0, width, barHeight);

    // Wood grain texture
    barBg.fillStyle(0x3d2314, 0.4);
    for (let i = 0; i < width; i += 20) {
      barBg.fillRect(i, 0, 2, barHeight);
    }

    // Metal frame top edge
    barBg.fillStyle(0x4a4a4a, 1);
    barBg.fillRect(0, 0, width, 4);
    // Bevel highlight
    barBg.fillStyle(0x6a6a6a, 1);
    barBg.fillRect(0, 0, width, 2);
    // Bevel shadow
    barBg.fillStyle(0x2a2a2a, 1);
    barBg.fillRect(0, 3, width, 1);

    // Gold inlay line
    barBg.fillStyle(0xc9a227, 0.6);
    barBg.fillRect(0, 5, width, 1);

    // Metal frame bottom
    barBg.fillStyle(0x4a4a4a, 1);
    barBg.fillRect(0, barHeight - 3, width, 3);

    this.bottomBar.add(barBg);

    // Create action buttons
    const buttons = [
      { id: 'inventory', icon: 'bag', label: 'Inventory', hotkey: 'I', action: () => this.toggleInventory() },
      { id: 'quests', icon: 'scroll', label: 'Quests', hotkey: 'J', action: () => this.toggleQuestLog() },
      { id: 'contracts', icon: 'contract', label: 'Contracts', hotkey: 'C', action: () => this.toggleContractPanel() },
      { id: 'map', icon: 'map', label: 'Map', hotkey: 'M', action: () => this.showMapPlaceholder() },
      { id: 'skills', icon: 'star', label: 'Skills', hotkey: 'K', action: () => this.showSkillsPlaceholder() },
    ];

    const buttonSize = 40;
    const buttonSpacing = 8;
    const totalWidth = buttons.length * buttonSize + (buttons.length - 1) * buttonSpacing;
    const startX = (width - totalWidth) / 2;

    buttons.forEach((btnConfig, index) => {
      const btnX = startX + index * (buttonSize + buttonSpacing);
      const btnY = 6;
      const btn = this.createActionButton(btnX, btnY, buttonSize, btnConfig);
      this.bottomBar.add(btn);
      this.actionButtons.set(btnConfig.id, btn);
    });

    // Decorative corner pieces
    this.drawBarCorner(barBg, 0, 0, false);
    this.drawBarCorner(barBg, width - 20, 0, true);
  }

  /**
   * Create a single action button with icon
   */
  private createActionButton(
    x: number,
    y: number,
    size: number,
    config: { id: string; icon: string; label: string; hotkey: string; action: () => void }
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);

    // Button background (beveled metal)
    const bg = this.add.graphics();

    // Outer shadow
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRect(2, 2, size, size);

    // Button base
    bg.fillStyle(0x4a4a4a, 1);
    bg.fillRect(0, 0, size, size);

    // Top-left bevel (light)
    bg.fillStyle(0x6a6a6a, 1);
    bg.fillRect(0, 0, size, 2);
    bg.fillRect(0, 0, 2, size);

    // Bottom-right bevel (dark)
    bg.fillStyle(0x2a2a2a, 1);
    bg.fillRect(0, size - 2, size, 2);
    bg.fillRect(size - 2, 0, 2, size);

    // Inner face
    bg.fillStyle(0x3d3d3d, 1);
    bg.fillRect(3, 3, size - 6, size - 6);

    btn.add(bg);

    // Draw icon
    const icon = this.drawButtonIcon(config.icon, size);
    icon.setPosition(size / 2, size / 2);
    btn.add(icon);

    // Hotkey hint (small text in corner)
    const hotkey = this.add.text(size - 4, size - 4, config.hotkey, {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#c9a227',
      fontStyle: 'bold',
    });
    hotkey.setOrigin(1, 1);
    btn.add(hotkey);

    // Tooltip (shown on hover)
    const tooltip = this.add.container(size / 2, -8);
    tooltip.setVisible(false);

    const tooltipBg = this.add.graphics();
    const tooltipText = this.add.text(0, 0, config.label, {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#f4e4bc',
    });
    tooltipText.setOrigin(0.5, 1);

    const tooltipWidth = tooltipText.width + 12;
    tooltipBg.fillStyle(0x2c1810, 0.95);
    tooltipBg.fillRoundedRect(-tooltipWidth / 2, -tooltipText.height - 6, tooltipWidth, tooltipText.height + 6, 4);
    tooltipBg.lineStyle(1, 0xc9a227, 0.8);
    tooltipBg.strokeRoundedRect(-tooltipWidth / 2, -tooltipText.height - 6, tooltipWidth, tooltipText.height + 6, 4);

    tooltip.add(tooltipBg);
    tooltip.add(tooltipText);
    btn.add(tooltip);

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(0, 0, size, size);
    btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    btn.on('pointerover', () => {
      // Highlight effect
      bg.clear();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRect(2, 2, size, size);
      bg.fillStyle(0x5a5a5a, 1);
      bg.fillRect(0, 0, size, size);
      bg.fillStyle(0x7a7a7a, 1);
      bg.fillRect(0, 0, size, 2);
      bg.fillRect(0, 0, 2, size);
      bg.fillStyle(0x3a3a3a, 1);
      bg.fillRect(0, size - 2, size, 2);
      bg.fillRect(size - 2, 0, 2, size);
      bg.fillStyle(0x4d4d4d, 1);
      bg.fillRect(3, 3, size - 6, size - 6);
      tooltip.setVisible(true);
    });

    btn.on('pointerout', () => {
      // Normal state
      bg.clear();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRect(2, 2, size, size);
      bg.fillStyle(0x4a4a4a, 1);
      bg.fillRect(0, 0, size, size);
      bg.fillStyle(0x6a6a6a, 1);
      bg.fillRect(0, 0, size, 2);
      bg.fillRect(0, 0, 2, size);
      bg.fillStyle(0x2a2a2a, 1);
      bg.fillRect(0, size - 2, size, 2);
      bg.fillRect(size - 2, 0, 2, size);
      bg.fillStyle(0x3d3d3d, 1);
      bg.fillRect(3, 3, size - 6, size - 6);
      tooltip.setVisible(false);
    });

    btn.on('pointerdown', () => {
      // Pressed effect (invert bevel)
      bg.clear();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRect(2, 2, size, size);
      bg.fillStyle(0x3a3a3a, 1);
      bg.fillRect(0, 0, size, size);
      bg.fillStyle(0x2a2a2a, 1);
      bg.fillRect(0, 0, size, 2);
      bg.fillRect(0, 0, 2, size);
      bg.fillStyle(0x5a5a5a, 1);
      bg.fillRect(0, size - 2, size, 2);
      bg.fillRect(size - 2, 0, 2, size);
      bg.fillStyle(0x353535, 1);
      bg.fillRect(3, 3, size - 6, size - 6);

      config.action();
    });

    btn.on('pointerup', () => {
      // Return to hover state
      bg.clear();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRect(2, 2, size, size);
      bg.fillStyle(0x5a5a5a, 1);
      bg.fillRect(0, 0, size, size);
      bg.fillStyle(0x7a7a7a, 1);
      bg.fillRect(0, 0, size, 2);
      bg.fillRect(0, 0, 2, size);
      bg.fillStyle(0x3a3a3a, 1);
      bg.fillRect(0, size - 2, size, 2);
      bg.fillRect(size - 2, 0, 2, size);
      bg.fillStyle(0x4d4d4d, 1);
      bg.fillRect(3, 3, size - 6, size - 6);
    });

    return btn;
  }

  /**
   * Draw icon graphics for buttons
   */
  private drawButtonIcon(iconType: string, _btnSize: number): Phaser.GameObjects.Graphics {
    const icon = this.add.graphics();
    const center = 0;

    switch (iconType) {
      case 'bag': // Inventory bag
        icon.fillStyle(0x8b4513, 1);
        icon.fillRect(center - 8, center - 4, 16, 14);
        icon.fillStyle(0xa0522d, 1);
        icon.fillRect(center - 7, center - 3, 14, 12);
        // Bag opening
        icon.fillStyle(0x654321, 1);
        icon.fillRect(center - 5, center - 6, 10, 4);
        // Strap
        icon.lineStyle(2, 0x654321, 1);
        icon.strokeCircle(center, center - 8, 4);
        break;

      case 'scroll': // Quest scroll
        icon.fillStyle(0xf4e4bc, 1);
        icon.fillRect(center - 6, center - 8, 12, 16);
        // Scroll ends
        icon.fillStyle(0xc9a227, 1);
        icon.fillCircle(center - 6, center - 6, 3);
        icon.fillCircle(center - 6, center + 6, 3);
        icon.fillCircle(center + 6, center - 6, 3);
        icon.fillCircle(center + 6, center + 6, 3);
        // Text lines
        icon.fillStyle(0x2c1810, 0.6);
        icon.fillRect(center - 4, center - 4, 8, 1);
        icon.fillRect(center - 4, center - 1, 8, 1);
        icon.fillRect(center - 4, center + 2, 6, 1);
        break;

      case 'contract': // Contract document
        icon.fillStyle(0xf4e4bc, 1);
        icon.fillRect(center - 7, center - 9, 14, 18);
        // Folded corner
        icon.fillStyle(0xe8d4a8, 1);
        icon.beginPath();
        icon.moveTo(center + 3, center - 9);
        icon.lineTo(center + 7, center - 5);
        icon.lineTo(center + 7, center - 9);
        icon.closePath();
        icon.fillPath();
        // Wax seal
        icon.fillStyle(0x8b2500, 1);
        icon.fillCircle(center, center + 4, 4);
        icon.fillStyle(0xa83000, 0.5);
        icon.fillCircle(center - 1, center + 3, 2);
        break;

      case 'map': // Map icon
        icon.fillStyle(0xd4a574, 1);
        icon.fillRect(center - 8, center - 6, 16, 12);
        // Map border
        icon.lineStyle(1, 0x654321, 1);
        icon.strokeRect(center - 8, center - 6, 16, 12);
        // Map markings
        icon.fillStyle(0x2c1810, 0.5);
        icon.fillRect(center - 5, center - 3, 2, 6);
        icon.fillRect(center + 2, center - 2, 3, 4);
        // X marks the spot
        icon.lineStyle(2, 0x8b2500, 1);
        icon.lineBetween(center - 2, center, center + 1, center + 3);
        icon.lineBetween(center + 1, center, center - 2, center + 3);
        break;

      case 'star': // Skills star
        icon.fillStyle(0xffd700, 1);
        // 5-pointed star
        const points: number[] = [];
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? 10 : 5;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          points.push(center + Math.cos(angle) * radius);
          points.push(center + Math.sin(angle) * radius);
        }
        icon.fillPoints(points, true);
        // Inner glow
        icon.fillStyle(0xffec8b, 1);
        icon.fillCircle(center, center, 3);
        break;
    }

    return icon;
  }

  /**
   * Draw decorative corner piece for the bar
   */
  private drawBarCorner(graphics: Phaser.GameObjects.Graphics, x: number, y: number, flip: boolean): void {
    const dir = flip ? -1 : 1;
    const startX = flip ? x + 20 : x;

    // Corner bracket
    graphics.fillStyle(0x6a6a6a, 1);
    graphics.fillRect(startX, y + 4, 20 * dir, 8);
    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillRect(startX + 2 * dir, y + 6, 16 * dir, 4);

    // Rivet
    graphics.fillStyle(0x8b8b8b, 1);
    graphics.fillCircle(startX + 10 * dir, y + 8, 3);
    graphics.fillStyle(0xb0b0b0, 1);
    graphics.fillCircle(startX + 9 * dir, y + 7, 1);
  }

  /**
   * Placeholder for map functionality
   */
  private showMapPlaceholder(): void {
    // TODO: Implement map panel
    console.log('Map functionality coming soon');
  }

  /**
   * Placeholder for skills functionality
   */
  private showSkillsPlaceholder(): void {
    // TODO: Implement skills panel
    console.log('Skills functionality coming soon');
  }

  private createInventoryPanel(): void {
    const width = this.cameras.main.width;

    this.inventoryPanel = this.add.container(width - 230, 55);
    this.inventoryPanel.setVisible(false);

    // Parchment panel background
    const bg = this.add.graphics();
    
    // Main parchment
    bg.fillStyle(0xf4e4bc, 0.98);
    bg.fillRect(0, 0, 210, 320);
    
    // Aged texture
    bg.fillStyle(0xe8d4a8, 0.2);
    for (let i = 0; i < 30; i++) {
      bg.fillRect(Math.random() * 200, Math.random() * 310, 3 + Math.random() * 5, 1);
    }
    
    // Dark wood frame
    bg.fillStyle(0x3d2314, 1);
    bg.fillRect(0, 0, 210, 4);
    bg.fillRect(0, 316, 210, 4);
    bg.fillRect(0, 0, 4, 320);
    bg.fillRect(206, 0, 4, 320);
    
    // Gold accent
    bg.fillStyle(0xc9a227, 0.6);
    bg.fillRect(4, 4, 202, 1);
    bg.fillRect(4, 315, 202, 1);
    bg.fillRect(4, 4, 1, 312);
    bg.fillRect(205, 4, 1, 312);
    
    this.inventoryPanel.add(bg);

    // Title styled as ledger header
    const title = this.add.text(105, 18, 'Merchant Ledger', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2c1810',
      fontStyle: 'italic',
    });
    title.setOrigin(0.5, 0.5);
    this.inventoryPanel.add(title);

    // Decorative separator line with flourish
    const separator = this.add.graphics();
    separator.lineStyle(1, 0x8b6914, 0.6);
    separator.lineBetween(15, 35, 195, 35);
    separator.fillStyle(0x8b6914, 0.6);
    separator.fillCircle(105, 35, 3);
    this.inventoryPanel.add(separator);

    // Inventory slots (will be populated dynamically)
    this.updateInventoryDisplay();

    // Close button styled as wax seal
    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0x8b2500, 1);
    closeBtn.fillCircle(195, 15, 10);
    closeBtn.fillStyle(0xa83000, 0.5);
    closeBtn.fillCircle(193, 13, 6);
    this.inventoryPanel.add(closeBtn);
    
    const closeX = this.add.text(195, 15, 'X', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#f4e4bc',
    });
    closeX.setOrigin(0.5, 0.5);
    closeX.setInteractive({ useHandCursor: true });
    closeX.on('pointerdown', () => this.toggleInventory());
    this.inventoryPanel.add(closeX);
  }

  private createTradePanel(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.tradePanel = this.add.container(width / 2 - 220, height / 2 - 175);
    this.tradePanel.setVisible(false);

    // Parchment trade ledger background
    const bg = this.add.graphics();
    
    // Main parchment
    bg.fillStyle(0xf4e4bc, 0.98);
    bg.fillRect(0, 0, 440, 350);
    
    // Aged paper texture
    bg.fillStyle(0xe8d4a8, 0.15);
    for (let i = 0; i < 50; i++) {
      bg.fillRect(Math.random() * 430, Math.random() * 340, 4 + Math.random() * 8, 1);
    }
    
    // Ledger lines (horizontal ruling)
    bg.lineStyle(1, 0xd4c4a8, 0.4);
    for (let y = 60; y < 320; y += 35) {
      bg.lineBetween(20, y, 420, y);
    }
    
    // Dark wood frame
    bg.fillStyle(0x3d2314, 1);
    bg.fillRect(0, 0, 440, 5);
    bg.fillRect(0, 345, 440, 5);
    bg.fillRect(0, 0, 5, 350);
    bg.fillRect(435, 0, 5, 350);
    
    // Gold accent border
    bg.fillStyle(0xc9a227, 0.7);
    bg.fillRect(5, 5, 430, 2);
    bg.fillRect(5, 343, 430, 2);
    bg.fillRect(5, 5, 2, 340);
    bg.fillRect(433, 5, 2, 340);
    
    // Corner ornaments
    this.drawPanelCorner(bg, 8, 8);
    this.drawPanelCorner(bg, 412, 8);
    this.drawPanelCorner(bg, 8, 322);
    this.drawPanelCorner(bg, 412, 322);
    
    this.tradePanel.add(bg);

    // Title styled as ledger header
    const title = this.add.text(220, 28, 'Trade Agreement', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#2c1810',
      fontStyle: 'italic',
    });
    title.setOrigin(0.5, 0.5);
    title.setName('tradeTitle');
    this.tradePanel.add(title);
    
    // Header separator with flourish
    const headerLine = this.add.graphics();
    headerLine.lineStyle(1, 0x8b6914, 0.6);
    headerLine.lineBetween(60, 48, 380, 48);
    headerLine.fillStyle(0x8b6914, 0.6);
    headerLine.fillCircle(220, 48, 4);
    this.tradePanel.add(headerLine);

    // Close button as wax seal
    const closeSeal = this.add.graphics();
    closeSeal.fillStyle(0x8b2500, 1);
    closeSeal.fillCircle(415, 25, 12);
    closeSeal.fillStyle(0xa83000, 0.5);
    closeSeal.fillCircle(413, 23, 8);
    this.tradePanel.add(closeSeal);
    
    const closeBtn = this.add.text(415, 25, 'X', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#f4e4bc',
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeTrade());
    this.tradePanel.add(closeBtn);
  }

  private drawPanelCorner(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    graphics.fillStyle(0x8b6914, 0.5);
    graphics.fillRect(x, y, 20, 2);
    graphics.fillRect(x, y, 2, 20);
  }

  private createContractPanel(): void {
    this.contractPanel = this.add.container(20, 70);
    this.contractPanel.setVisible(false);
    this.contractPanel.setDepth(1500);

    // Parchment background
    const bg = this.add.graphics();
    bg.fillStyle(0xf4e4bc, 0.95);
    bg.fillRoundedRect(0, 0, 350, 320, 8);

    // Aged paper texture
    bg.fillStyle(0xe8d4a8, 0.3);
    for (let i = 0; i < 350; i += 12) {
      if (Math.random() > 0.5) {
        bg.fillRect(i, Math.random() * 310, 6, 2);
      }
    }

    // Wood frame
    bg.fillStyle(0x3d2314, 1);
    bg.fillRect(0, 0, 350, 5);
    bg.fillRect(0, 315, 350, 5);
    bg.fillRect(0, 0, 5, 320);
    bg.fillRect(345, 0, 5, 320);

    // Gold accent
    bg.fillStyle(0xc9a227, 0.8);
    bg.fillRect(5, 5, 340, 2);
    bg.fillRect(5, 313, 340, 2);
    this.contractPanel.add(bg);

    // Title
    const title = this.add.text(175, 20, '- Trade Contracts -', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#2c1810',
      fontStyle: 'bold italic',
    });
    title.setOrigin(0.5, 0.5);
    this.contractPanel.add(title);

    // Press C to close hint
    const closeHint = this.add.text(175, 300, 'Press C to close', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#5a4030',
      fontStyle: 'italic',
    });
    closeHint.setOrigin(0.5, 0.5);
    this.contractPanel.add(closeHint);

    // Decorative separator
    const sep = this.add.graphics();
    sep.lineStyle(2, 0x8b6914, 0.6);
    sep.lineBetween(20, 35, 330, 35);
    sep.fillStyle(0xc9a227, 1);
    sep.fillCircle(175, 35, 4);
    this.contractPanel.add(sep);

    // Contract list container
    const contractList = this.add.container(15, 50);
    contractList.setName('contractList');
    this.contractPanel.add(contractList);
  }

  private toggleContractPanel(): void {
    this.isContractPanelOpen = !this.isContractPanelOpen;
    this.contractPanel.setVisible(this.isContractPanelOpen);

    if (this.isContractPanelOpen) {
      // Close other panels when opening contract panel
      if (this.isInventoryOpen) {
        this.isInventoryOpen = false;
        this.inventoryPanel.setVisible(false);
      }
      if (this.isQuestLogOpen) {
        this.isQuestLogOpen = false;
        this.questLogPanel.setVisible(false);
      }
      this.updateContractPanel();
    }
  }

  private updateContractPanel(): void {
    const contractList = this.contractPanel.getByName('contractList') as Phaser.GameObjects.Container;
    if (!contractList) return;

    // Clear existing entries
    contractList.removeAll(true);

    const contractSystem = this.registry.get('contractSystem');
    if (!contractSystem) {
      const noContracts = this.add.text(0, 0, 'Contract system not available', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#8a7a60',
        fontStyle: 'italic',
      });
      contractList.add(noContracts);
      return;
    }

    let yOffset = 0;

    // Active contracts section
    const activeContracts = contractSystem.getActiveContracts?.() || [];
    if (activeContracts.length > 0) {
      const activeHeader = this.add.text(0, yOffset, 'Active Contracts:', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#2c1810',
        fontStyle: 'bold',
      });
      contractList.add(activeHeader);
      yOffset += 20;

      for (const contract of activeContracts) {
        // Contract name and client
        const contractText = this.add.text(10, yOffset, `${contract.clientName}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '11px',
          color: '#2c1810',
        });
        contractList.add(contractText);
        yOffset += 14;

        // Requirement
        const goodName = this.formatGoodName(contract.goods);
        const reqText = this.add.text(20, yOffset, `Deliver ${contract.quantity} ${goodName}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '10px',
          color: '#5a4020',
        });
        contractList.add(reqText);
        yOffset += 12;

        // Progress
        const progress = `Progress: ${contract.delivered}/${contract.quantity}`;
        const timeRemaining = contractSystem.getContractTimeRemaining?.(contract.id) || 0;
        const timeText = `Time left: ${timeRemaining}h`;
        const statusText = this.add.text(20, yOffset, `${progress} | ${timeText}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '9px',
          color: timeRemaining < 6 ? '#a83000' : '#5a4020',
        });
        contractList.add(statusText);
        yOffset += 16;
      }
    }

    // Available contracts section
    const availableContracts = contractSystem.getAvailableContracts?.() || [];
    if (availableContracts.length > 0) {
      yOffset += 10;
      const availHeader = this.add.text(0, yOffset, 'Available Contracts:', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#2c1810',
        fontStyle: 'bold',
      });
      contractList.add(availHeader);
      yOffset += 20;

      for (const contract of availableContracts) {
        // Contract info
        const goodName = this.formatGoodName(contract.goods);
        const contractInfo = this.add.text(10, yOffset,
          `${contract.clientName}: ${contract.quantity} ${goodName}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '11px',
          color: '#2c1810',
        });
        contractList.add(contractInfo);
        yOffset += 14;

        // Details
        const details = this.add.text(20, yOffset,
          `Reward: ${contract.reward}g | Deadline: ${contract.deadline}h`, {
          fontFamily: 'Georgia, serif',
          fontSize: '9px',
          color: '#5a4020',
        });
        contractList.add(details);
        yOffset += 12;

        // Accept button
        const acceptBtn = this.add.text(20, yOffset, '[Accept]', {
          fontFamily: 'Georgia, serif',
          fontSize: '10px',
          color: '#2d5a27',
        });
        acceptBtn.setInteractive({ useHandCursor: true });
        acceptBtn.on('pointerover', () => acceptBtn.setColor('#4a8a42'));
        acceptBtn.on('pointerout', () => acceptBtn.setColor('#2d5a27'));
        acceptBtn.on('pointerdown', () => {
          contractSystem.acceptContract(contract.id);
          this.updateContractPanel();
        });
        contractList.add(acceptBtn);
        yOffset += 18;
      }
    }

    if (activeContracts.length === 0 && availableContracts.length === 0) {
      const noContracts = this.add.text(0, 0, 'No contracts available.\nCheck back later or increase your rank.', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#8a7a60',
        fontStyle: 'italic',
      });
      contractList.add(noContracts);
    }
  }

  private setupEventListeners(): void {
    // Listen for time updates from MarketScene
    const marketScene = this.scene.get('MarketScene');
    marketScene.events.on('timeUpdate', (timeData: { hour: number; period: string; dayCount: number }) => {
      this.updateTimeDisplay(timeData);
    });

    // Listen for trade events
    marketScene.events.on('openTrade', (data: { npcName: string; goods: string[] }) => {
      this.openTrade(data.npcName, data.goods);
    });

    // Listen for gold changes from Player
    marketScene.events.on('goldChange', (newGold: number) => {
      this.goldText.setText(`${newGold}`);
    });

    // Listen for inventory changes from Player
    marketScene.events.on('inventoryChange', () => {
      this.updateInventoryDisplay();
    });

    // Listen for transition zone proximity
    marketScene.events.on('showTransitionPrompt', (label: string) => {
      this.showTransitionPrompt(label);
    });
    marketScene.events.on('hideTransitionPrompt', () => {
      this.hideTransitionPrompt();
    });
    
    // Listen for quest events
    marketScene.events.on('questOffer', (data: { npcId: string; npcName: string; quests: any[] }) => {
      this.showQuestOffer(data);
    });

    marketScene.events.on('questStateChange', () => {
      this.updateQuestLog();
    });

    // Listen for rank changes
    marketScene.events.on('rankUp', (data: { rankInfo: { title: string } }) => {
      this.rankText.setText(data.rankInfo.title);
    });

    // Listen for progression updates
    marketScene.events.on('progressionUpdate', (data: { title: string }) => {
      if (this.rankText && data.title) {
        this.rankText.setText(data.title);
      }
    });

    // Listen for contract updates
    marketScene.events.on('contractAccepted', () => {
      if (this.isContractPanelOpen) {
        this.updateContractPanel();
      }
    });

    marketScene.events.on('contractCompleted', () => {
      if (this.isContractPanelOpen) {
        this.updateContractPanel();
      }
    });

    marketScene.events.on('contractFailed', () => {
      if (this.isContractPanelOpen) {
        this.updateContractPanel();
      }
    });

    marketScene.events.on('contractsRefreshed', () => {
      if (this.isContractPanelOpen) {
        this.updateContractPanel();
      }
    });
  }

  private showTransitionPrompt(label: string): void {
    const promptText = this.transitionPrompt.getByName('promptText') as Phaser.GameObjects.Text;
    if (promptText) {
      promptText.setText(`Press E - ${label}`);
    }
    this.transitionPrompt.setVisible(true);
  }

  private hideTransitionPrompt(): void {
    this.transitionPrompt.setVisible(false);
  }

  private setupInputHandlers(): void {
    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-I', () => {
      this.toggleInventory();
    });

    this.input.keyboard?.on('keydown-J', () => {
      this.toggleQuestLog();
    });

    this.input.keyboard?.on('keydown-C', () => {
      this.toggleContractPanel();
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.isQuestOfferOpen) {
        this.closeQuestOffer();
      } else if (this.isTradeOpen) {
        this.closeTrade();
      } else if (this.isQuestLogOpen) {
        this.toggleQuestLog();
      } else if (this.isContractPanelOpen) {
        this.toggleContractPanel();
      } else if (this.isInventoryOpen) {
        this.toggleInventory();
      }
    });
  }

  private toggleInventory(): void {
    this.isInventoryOpen = !this.isInventoryOpen;
    this.inventoryPanel.setVisible(this.isInventoryOpen);

    if (this.isInventoryOpen) {
      // Close other panels when opening inventory
      if (this.isQuestLogOpen) {
        this.isQuestLogOpen = false;
        this.questLogPanel.setVisible(false);
      }
      if (this.isContractPanelOpen) {
        this.isContractPanelOpen = false;
        this.contractPanel.setVisible(false);
      }
      this.updateInventoryDisplay();
    }
  }

  private updateInventoryDisplay(): void {
    // Remove old inventory items (keep bg, title, separator, close button)
    const children = this.inventoryPanel.getAll();
    for (let i = children.length - 1; i >= 5; i--) {
      const child = children[i];
      if (child instanceof Phaser.GameObjects.Text && child.name?.startsWith('invItem')) {
        child.destroy();
      }
    }

    // Get inventory from Player (source of truth)
    const inventory = this.getInventory();

    // Add inventory items (ledger entry style)
    if (inventory.length === 0) {
      const emptyText = this.add.text(105, 150, 'No goods in possession', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#8a7a60',
        fontStyle: 'italic',
      });
      emptyText.setOrigin(0.5, 0.5);
      emptyText.setName('invItemEmpty');
      this.inventoryPanel.add(emptyText);
    } else {
      inventory.forEach((item, index) => {
        const itemName = this.formatGoodName(item.item);
        const itemText = this.add.text(20, 50 + index * 28, `${itemName}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: '#2c1810',
        });
        itemText.setName(`invItem${index}`);
        this.inventoryPanel.add(itemText);

        // Quantity in a different style (like a tally)
        const qtyText = this.add.text(170, 50 + index * 28, `×${item.quantity}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: '#8b6914',
          fontStyle: 'bold',
        });
        qtyText.setName(`invItemQty${index}`);
        this.inventoryPanel.add(qtyText);
      });
    }
  }

  private openTrade(npcName: string, goods: string[]): void {
    this.isTradeOpen = true;
    this.tradePanel.setVisible(true);

    // Update title
    const title = this.tradePanel.getByName('tradeTitle') as Phaser.GameObjects.Text;
    if (title) {
      title.setText(`Trading with ${npcName}`);
    }

    // Clear old trade items
    const children = this.tradePanel.getAll();
    for (let i = children.length - 1; i >= 5; i--) {
      const child = children[i];
      if (child instanceof Phaser.GameObjects.Text && child.name?.startsWith('trade')) {
        child.destroy();
      }
      if (child instanceof Phaser.GameObjects.Graphics && child.name?.startsWith('trade')) {
        child.destroy();
      }
    }

    // Column headers (ledger style)
    const headerGoods = this.add.text(30, 65, 'Commodity', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#5a4020',
      fontStyle: 'italic',
    });
    headerGoods.setName('tradeHeader1');
    this.tradePanel.add(headerGoods);
    
    const headerPrice = this.add.text(180, 65, 'Price', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#5a4020',
      fontStyle: 'italic',
    });
    headerPrice.setName('tradeHeader2');
    this.tradePanel.add(headerPrice);
    
    const headerActions = this.add.text(300, 65, 'Transaction', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#5a4020',
      fontStyle: 'italic',
    });
    headerActions.setName('tradeHeader3');
    this.tradePanel.add(headerActions);

    // Display available goods
    if (goods.length === 0) {
      const noGoodsText = this.add.text(220, 160, 'No commodities available', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#8a7a60',
        fontStyle: 'italic',
      });
      noGoodsText.setOrigin(0.5, 0.5);
      noGoodsText.setName('tradeNoGoods');
      this.tradePanel.add(noGoodsText);
    } else {
      // Add trade goods with buy/sell buttons (ledger entry style)
      goods.forEach((good, index) => {
        const goodName = this.formatGoodName(good);
        const price = this.getGoodPrice(good);
        const yPos = 95 + index * 35;

        // Good name (quill-written style)
        const goodText = this.add.text(30, yPos, goodName, {
          fontFamily: 'Georgia, serif',
          fontSize: '15px',
          color: '#2c1810',
        });
        goodText.setName(`tradeGood${index}`);
        this.tradePanel.add(goodText);

        // Price (gold ink style)
        const priceText = this.add.text(180, yPos, `${price} reis`, {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: '#8b6914',
        });
        priceText.setName(`tradePrice${index}`);
        this.tradePanel.add(priceText);

        // Buy button (green wax seal style)
        const buyBtn = this.add.text(290, yPos, 'Purchase', {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: '#2d5a27',
        });
        buyBtn.setInteractive({ useHandCursor: true });
        buyBtn.on('pointerover', () => buyBtn.setColor('#4a8a42'));
        buyBtn.on('pointerout', () => buyBtn.setColor('#2d5a27'));
        buyBtn.on('pointerdown', () => this.buyGood(good, price));
        buyBtn.setName(`tradeBuy${index}`);
        this.tradePanel.add(buyBtn);

        // Sell button
        const sellBtn = this.add.text(370, yPos, 'Sell', {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: '#8b4513',
        });
        sellBtn.setInteractive({ useHandCursor: true });
        sellBtn.on('pointerover', () => sellBtn.setColor('#c06020'));
        sellBtn.on('pointerout', () => sellBtn.setColor('#8b4513'));
        sellBtn.on('pointerdown', () => this.sellGood(good, price));
        sellBtn.setName(`tradeSell${index}`);
        this.tradePanel.add(sellBtn);
      });
    }

    // Instructions (aged ink style)
    const instructions = this.add.text(220, 320, 'Press ESC to conclude dealings', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#8a7a60',
      fontStyle: 'italic',
    });
    instructions.setOrigin(0.5, 0.5);
    instructions.setName('tradeInstructions');
    this.tradePanel.add(instructions);
  }

  private closeTrade(): void {
    this.isTradeOpen = false;
    this.tradePanel.setVisible(false);
  }

  private formatGoodName(good: string): string {
    // Convert good_pepper to Pepper, etc.
    return good.replace('good_', '').charAt(0).toUpperCase() + 
           good.replace('good_', '').slice(1);
  }

  /**
   * Get the TradeSystem from MarketScene registry
   */
  private getTradeSystem(): any {
    try {
      const marketScene = this.scene.get('MarketScene');
      return marketScene?.registry.get('tradeSystem');
    } catch (e) {
      return null;
    }
  }

  private getGoodPrice(good: string): number {
    // Try to use TradeSystem for dynamic pricing
    const tradeSystem = this.getTradeSystem();
    if (tradeSystem) {
      // Use getBasePrice for display (without vendor-specific modifiers)
      const price = tradeSystem.getBasePrice?.(good, true);
      if (price && price > 0) {
        return price;
      }
    }

    // Fallback to hardcoded base prices if TradeSystem unavailable
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
    return prices[good] || 10;
  }

  /**
   * Get sell price for a good - uses TradeSystem if available
   */
  private getSellPrice(good: string): number {
    const tradeSystem = this.getTradeSystem();
    if (tradeSystem) {
      // Use getBasePrice for selling (already applies 0.75 multiplier)
      const price = tradeSystem.getBasePrice?.(good, false);
      if (price && price > 0) {
        return price;
      }
    }

    // Fallback: use buy price * 0.75 to match TradeSystem
    const buyPrice = this.getGoodPrice(good);
    return Math.floor(buyPrice * 0.75);
  }

  private buyGood(good: string, price: number): void {
    const marketScene = this.scene.get('MarketScene') as any;
    if (!marketScene?.getPlayer) return;

    const player = marketScene.getPlayer();
    const currentGold = player.getGold();

    if (currentGold >= price) {
      // Use Player as source of truth
      player.removeGold(price);
      const success = player.addToInventory(good, 1);

      if (!success) {
        // Inventory full - refund gold and show notification
        player.addGold(price);
        this.scene.get('MarketScene')?.events.emit('notification', {
          title: 'Inventory Full',
          message: 'You cannot carry any more items.',
          type: 'warning'
        });
        return;
      }

      // Update UI to reflect new state
      this.goldText.setText(`${player.getGold()}`);
      this.updateInventoryDisplay();

      // Emit event to MarketScene
      marketScene.events.emit('playerBuy', { good, price });

      // Notify quest system about item acquisition
      const questSystem = this.registry.get('questSystem');
      if (questSystem && questSystem.handleItemAcquired) {
        questSystem.handleItemAcquired(good, 1);
      }
    }
  }

  private sellGood(good: string, _price: number): void {
    const marketScene = this.scene.get('MarketScene') as any;
    if (!marketScene?.getPlayer) return;

    const player = marketScene.getPlayer();
    const inventory = player.getInventory();
    const existingItem = inventory.find((item: { item: string; quantity: number }) => item.item === good);

    if (existingItem && existingItem.quantity > 0) {
      // Use Player as source of truth
      const success = player.removeFromInventory(good, 1);
      if (!success) return;

      // Get sell price from TradeSystem (uses 0.75 multiplier) or fallback
      const sellPrice = this.getSellPrice(good);
      player.addGold(sellPrice);

      // Update UI to reflect new state
      this.goldText.setText(`${player.getGold()}`);
      this.updateInventoryDisplay();

      // Emit event to MarketScene
      marketScene.events.emit('playerSell', { good, price: sellPrice });
    }
  }

  private updateTimeDisplay(timeData: { hour: number; period: string; dayCount: number }): void {
    const ampm = timeData.hour >= 12 ? 'PM' : 'AM';
    const displayHour = timeData.hour > 12 ? timeData.hour - 12 : (timeData.hour === 0 ? 12 : timeData.hour);

    this.timeText.setText(`${timeData.period} - ${displayHour}:00 ${ampm} (Day ${timeData.dayCount})`);

    // Change text color based on time of day (dark ink that fades slightly)
    if (timeData.period === 'Night') {
      this.timeText.setColor('#4a4a6a');
    } else if (timeData.period === 'Evening') {
      this.timeText.setColor('#6a4a30');
    } else {
      this.timeText.setColor('#2c1810');
    }
  }

  /**
   * Clean up all event listeners and resources when scene shuts down
   */
  shutdown(): void {
    // Remove MarketScene event listeners
    const marketScene = this.scene.get('MarketScene');
    if (marketScene) {
      marketScene.events.off('timeUpdate');
      marketScene.events.off('openTrade');
      marketScene.events.off('goldChange');
      marketScene.events.off('inventoryChange');
      marketScene.events.off('showTransitionPrompt');
      marketScene.events.off('hideTransitionPrompt');
      marketScene.events.off('questOffer');
      marketScene.events.off('questStateChange');
      marketScene.events.off('rankUp');
      marketScene.events.off('progressionUpdate');
      marketScene.events.off('contractAccepted');
      marketScene.events.off('contractCompleted');
      marketScene.events.off('contractFailed');
      marketScene.events.off('contractsRefreshed');
    }

    // Remove keyboard event listeners
    this.input.keyboard?.off('keydown-I');
    this.input.keyboard?.off('keydown-J');
    this.input.keyboard?.off('keydown-C');
    this.input.keyboard?.off('keydown-ESC');

    // Clean up action buttons
    this.actionButtons.clear();
  }
}
