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
      this.goldText?.setText(`Gold: ${gold}`);
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
    
    // Portrait placeholder (left side)
    const portraitBg = this.add.graphics();
    portraitBg.fillStyle(0x3d2314, 1);
    portraitBg.fillRect(8, 8, 40, 40);
    portraitBg.fillStyle(0xd4a574, 1); // Skin tone placeholder
    portraitBg.fillRect(10, 10, 36, 36);
    portraitBg.fillStyle(0x2c1810, 0.3);
    portraitBg.fillCircle(28, 24, 12); // Face silhouette
    portraitBg.lineStyle(2, 0xc9a227, 0.8);
    portraitBg.strokeRect(8, 8, 40, 40);
    
    // Corner ornaments (simple flourishes)
    this.drawCornerOrnament(statusBar, 55, 8);
    this.drawCornerOrnament(statusBar, width - 25, 8);

    // Time display with larger quill-written style
    this.timeText = this.add.text(60, 12, 'Market Hours - 7:00 AM (Day 1)', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2c1810',
    });
    
    // Location hint below time
    const locationText = this.add.text(60, 32, 'Ribeira Grande - The Great Waterfront', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#5a4030',
      fontStyle: 'italic',
    });
    locationText.setName('locationText');

    // Rank display
    this.rankText = this.add.text(60, 32, 'Peddler', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#5a4030',
      fontStyle: 'italic',
    });

    // Gold display styled as ledger entry - larger
    // Initial value, will be synced from Player after scene is fully created
    this.goldText = this.add.text(width - 130, 12, `Gold: 100`, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#8b6914',
      fontStyle: 'bold',
    });

    // Inventory button styled as ledger tab - larger
    const invButton = this.add.text(width - 240, 12, '[I]nventory', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#5a4020',
    });
    invButton.setInteractive({ useHandCursor: true });
    invButton.on('pointerover', () => invButton.setColor('#8b6914'));
    invButton.on('pointerout', () => invButton.setColor('#5a4020'));
    invButton.on('pointerdown', () => this.toggleInventory());

    // Contracts button
    const contractBtn = this.add.text(width - 240, 32, '[C]ontracts', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#5a4020',
    });
    contractBtn.setInteractive({ useHandCursor: true });
    contractBtn.on('pointerover', () => contractBtn.setColor('#8b6914'));
    contractBtn.on('pointerout', () => contractBtn.setColor('#5a4020'));
    contractBtn.on('pointerdown', () => this.toggleContractPanel());
  }

  private drawCornerOrnament(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    graphics.fillStyle(0x8b6914, 0.7);
    graphics.fillRect(x, y, 15, 2);
    graphics.fillRect(x, y, 2, 15);
    graphics.fillRect(x + 3, y + 3, 8, 1);
    graphics.fillRect(x + 3, y + 3, 1, 8);
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
      this.goldText.setText(`Gold: ${newGold}`);
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

  private getGoodPrice(good: string): number {
    // Base prices (in gold) - historically inspired
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
        // Inventory full - refund gold
        player.addGold(price);
        return;
      }

      // Update UI to reflect new state
      this.goldText.setText(`Gold: ${player.getGold()}`);
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

  private sellGood(good: string, price: number): void {
    const marketScene = this.scene.get('MarketScene') as any;
    if (!marketScene?.getPlayer) return;

    const player = marketScene.getPlayer();
    const inventory = player.getInventory();
    const existingItem = inventory.find((item: { item: string; quantity: number }) => item.item === good);

    if (existingItem && existingItem.quantity > 0) {
      // Use Player as source of truth
      const success = player.removeFromInventory(good, 1);
      if (!success) return;

      // Sell at 80% of buy price
      const sellPrice = Math.floor(price * 0.8);
      player.addGold(sellPrice);

      // Update UI to reflect new state
      this.goldText.setText(`Gold: ${player.getGold()}`);
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
}
