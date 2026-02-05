import Phaser from 'phaser';

/**
 * MainMenuScene - The game's main menu
 * Features a parchment-style design with the game title and navigation options
 */
export class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private menuContainer!: Phaser.GameObjects.Container;
  private selectedIndex = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private hasSaveData = false;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    // Check for existing save data
    this.hasSaveData = this.checkForSaveData();

    // Create the parchment background
    this.createBackground();

    // Create title
    this.createTitle();

    // Create menu options
    this.createMenu();

    // Set up input handlers
    this.setupInput();

    // Add decorative elements
    this.createDecorations();

    // Add historical quote
    this.createQuote();

    // Play ambient sound if available
    this.playAmbientSound();
  }

  private checkForSaveData(): boolean {
    try {
      // Check for saves using the same key format as SaveSystem
      const autoSave = localStorage.getItem('goa_trade_autosave');
      const manualSave1 = localStorage.getItem('goa_trade_save_1');
      const manualSave2 = localStorage.getItem('goa_trade_save_2');
      const manualSave3 = localStorage.getItem('goa_trade_save_3');
      return autoSave !== null || manualSave1 !== null || manualSave2 !== null || manualSave3 !== null;
    } catch {
      return false;
    }
  }

  private createBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const graphics = this.add.graphics();

    // Base parchment color
    graphics.fillStyle(0xf4e4bc, 1);
    graphics.fillRect(0, 0, width, height);

    // Add aging texture with subtle stains
    graphics.fillStyle(0xe8d4a8, 0.3);
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 15 + Math.random() * 40;
      graphics.fillCircle(x, y, size);
    }

    // Darker edges (vignette effect)
    graphics.fillStyle(0xd4c4a0, 0.5);
    graphics.fillRect(0, 0, width, 30);
    graphics.fillRect(0, height - 30, width, 30);
    graphics.fillRect(0, 0, 30, height);
    graphics.fillRect(width - 30, 0, 30, height);

    // Corner aging
    graphics.fillStyle(0xc8b080, 0.4);
    graphics.fillTriangle(0, 0, 100, 0, 0, 100);
    graphics.fillTriangle(width, 0, width - 100, 0, width, 100);
    graphics.fillTriangle(0, height, 100, height, 0, height - 100);
    graphics.fillTriangle(width, height, width - 100, height, width, height - 100);

    // Decorative border
    this.createBorder(graphics, width, height);
  }

  private createBorder(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
    const borderWidth = 10;

    // Outer border (dark wood)
    graphics.fillStyle(0x2c1810, 1);
    graphics.fillRect(0, 0, width, borderWidth);
    graphics.fillRect(0, height - borderWidth, width, borderWidth);
    graphics.fillRect(0, 0, borderWidth, height);
    graphics.fillRect(width - borderWidth, 0, borderWidth, height);

    // Inner gold accent line
    graphics.lineStyle(3, 0xc9a227, 0.8);
    graphics.strokeRect(borderWidth + 6, borderWidth + 6, width - borderWidth * 2 - 12, height - borderWidth * 2 - 12);

    // Corner ornaments
    this.drawCornerOrnament(graphics, borderWidth + 4, borderWidth + 4);
    this.drawCornerOrnament(graphics, width - borderWidth - 28, borderWidth + 4, true);
    this.drawCornerOrnament(graphics, borderWidth + 4, height - borderWidth - 28, false, true);
    this.drawCornerOrnament(graphics, width - borderWidth - 28, height - borderWidth - 28, true, true);
  }

  private drawCornerOrnament(graphics: Phaser.GameObjects.Graphics, x: number, y: number, flipX = false, flipY = false): void {
    const size = 24;
    const sx = flipX ? -1 : 1;
    const sy = flipY ? -1 : 1;
    const ox = flipX ? x + size : x;
    const oy = flipY ? y + size : y;

    graphics.fillStyle(0xc9a227, 0.9);
    graphics.fillRect(ox, oy, sx * 20, sy * 4);
    graphics.fillRect(ox, oy, sx * 4, sy * 20);
    graphics.fillRect(ox + sx * 6, oy + sy * 6, sx * 10, sy * 2);
    graphics.fillRect(ox + sx * 6, oy + sy * 6, sx * 2, sy * 10);
    graphics.fillCircle(ox + sx * 10, oy + sy * 10, 3);
  }

  private createTitle(): void {
    const width = this.cameras.main.width;

    // Drop shadow for title
    const shadowText = this.add.text(width / 2 + 3, 83, 'GOA 1590', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '72px',
      color: '#000000',
      fontStyle: 'bold',
    });
    shadowText.setOrigin(0.5);
    shadowText.setAlpha(0.2);

    // Main title
    this.titleText = this.add.text(width / 2, 80, 'GOA 1590', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '72px',
      color: '#2c1810',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);

    // Subtitle
    this.subtitleText = this.add.text(width / 2, 150, 'The Rome of the East', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '24px',
      color: '#5a4030',
      fontStyle: 'italic',
    });
    this.subtitleText.setOrigin(0.5);

    // Decorative line under title
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xc9a227, 0.8);
    graphics.lineBetween(width / 2 - 150, 175, width / 2 + 150, 175);
    graphics.fillStyle(0xc9a227, 1);
    graphics.fillCircle(width / 2, 175, 5);
  }

  private createMenu(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.menuContainer = this.add.container(width / 2, height / 2 + 20);

    const menuOptions = [
      { text: 'New Game', action: () => this.startNewGame() },
      { text: 'Continue', action: () => this.continueGame(), enabled: this.hasSaveData },
      { text: 'Settings', action: () => this.openSettings() },
      { text: 'Credits', action: () => this.showCredits() },
    ];

    menuOptions.forEach((option, index) => {
      const isEnabled = option.enabled !== false;
      const yOffset = index * 50;

      // Menu item background (parchment button)
      const bg = this.add.graphics();
      bg.fillStyle(isEnabled ? 0xf4e4bc : 0xe8d8b0, 0.9);
      bg.fillRoundedRect(-100, yOffset - 18, 200, 36, 6);
      bg.lineStyle(2, isEnabled ? 0x8b6914 : 0xa0a090, 0.8);
      bg.strokeRoundedRect(-100, yOffset - 18, 200, 36, 6);
      this.menuContainer.add(bg);

      // Menu item text
      const text = this.add.text(0, yOffset, option.text, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        color: isEnabled ? '#2c1810' : '#8a8a80',
        fontStyle: isEnabled ? 'normal' : 'italic',
      });
      text.setOrigin(0.5);
      text.setData('action', option.action);
      text.setData('enabled', isEnabled);
      text.setData('index', index);
      text.setData('bg', bg);
      this.menuContainer.add(text);

      if (isEnabled) {
        // Create an invisible interactive zone covering the whole button area
        const hitZone = this.add.zone(0, yOffset, 200, 36).setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => this.highlightMenuItem(index));
        hitZone.on('pointerout', () => this.unhighlightMenuItem(index));
        hitZone.on('pointerdown', () => {
          console.log('Menu clicked:', option.text);
          option.action();
        });
        this.menuContainer.add(hitZone);

        // Also make text interactive as backup
        text.setInteractive({ useHandCursor: true });
        text.on('pointerover', () => this.highlightMenuItem(index));
        text.on('pointerout', () => this.unhighlightMenuItem(index));
        text.on('pointerdown', () => {
          console.log('Text clicked:', option.text);
          option.action();
        });
      }

      this.menuItems.push(text);
    });

    // Highlight first enabled item
    const firstEnabled = menuOptions.findIndex(o => o.enabled !== false);
    this.selectedIndex = firstEnabled >= 0 ? firstEnabled : 0;
    this.highlightMenuItem(this.selectedIndex);
  }

  private highlightMenuItem(index: number): void {
    const text = this.menuItems[index];
    if (!text || !text.getData('enabled')) return;

    this.selectedIndex = index;

    // Update all items
    this.menuItems.forEach((item, i) => {
      const bg = item.getData('bg') as Phaser.GameObjects.Graphics;
      const isSelected = i === index;
      const isEnabled = item.getData('enabled');

      if (isEnabled) {
        item.setColor(isSelected ? '#8b6914' : '#2c1810');
        item.setScale(isSelected ? 1.1 : 1);

        // Redraw background with highlight
        bg.clear();
        bg.fillStyle(isSelected ? 0xfff8e8 : 0xf4e4bc, 0.9);
        bg.fillRoundedRect(-100, i * 50 - 18, 200, 36, 6);
        bg.lineStyle(2, isSelected ? 0xc9a227 : 0x8b6914, isSelected ? 1 : 0.8);
        bg.strokeRoundedRect(-100, i * 50 - 18, 200, 36, 6);
      }
    });
  }

  private unhighlightMenuItem(index: number): void {
    if (this.selectedIndex === index) return;

    const text = this.menuItems[index];
    if (!text || !text.getData('enabled')) return;

    const bg = text.getData('bg') as Phaser.GameObjects.Graphics;
    text.setColor('#2c1810');
    text.setScale(1);

    bg.clear();
    bg.fillStyle(0xf4e4bc, 0.9);
    bg.fillRoundedRect(-100, index * 50 - 18, 200, 36, 6);
    bg.lineStyle(2, 0x8b6914, 0.8);
    bg.strokeRoundedRect(-100, index * 50 - 18, 200, 36, 6);
  }

  private setupInput(): void {
    // Keyboard navigation
    this.input.keyboard?.on('keydown-UP', () => {
      let newIndex = this.selectedIndex - 1;
      while (newIndex >= 0 && !this.menuItems[newIndex].getData('enabled')) {
        newIndex--;
      }
      if (newIndex >= 0) {
        this.highlightMenuItem(newIndex);
      }
    });

    this.input.keyboard?.on('keydown-DOWN', () => {
      let newIndex = this.selectedIndex + 1;
      while (newIndex < this.menuItems.length && !this.menuItems[newIndex].getData('enabled')) {
        newIndex++;
      }
      if (newIndex < this.menuItems.length) {
        this.highlightMenuItem(newIndex);
      }
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      const action = this.menuItems[this.selectedIndex].getData('action');
      if (action) action();
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      const action = this.menuItems[this.selectedIndex].getData('action');
      if (action) action();
    });
  }

  private createDecorations(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Compass rose (bottom left)
    this.drawCompassRose(80, height - 80, 45);

    // Compass rose (bottom right)
    this.drawCompassRose(width - 80, height - 80, 45);

    // Ship silhouette (subtle decoration)
    this.drawShipSilhouette(width - 150, 250);
  }

  private drawCompassRose(cx: number, cy: number, size: number): void {
    const g = this.add.graphics();

    // Outer circle
    g.lineStyle(2, 0xc9a227, 0.6);
    g.strokeCircle(cx, cy, size);

    // Inner circle
    g.lineStyle(1, 0xc9a227, 0.4);
    g.strokeCircle(cx, cy, size * 0.7);

    // Cardinal points
    const points = [
      { angle: -Math.PI / 2, isNorth: true },
      { angle: Math.PI / 2, isNorth: false },
      { angle: 0, isNorth: false },
      { angle: Math.PI, isNorth: false },
    ];

    for (const point of points) {
      const tipX = cx + Math.cos(point.angle) * (size * 0.9);
      const tipY = cy + Math.sin(point.angle) * (size * 0.9);
      const baseWidth = 5;

      const leftAngle = point.angle + Math.PI / 2;
      const rightAngle = point.angle - Math.PI / 2;
      const baseLeftX = cx + Math.cos(leftAngle) * baseWidth;
      const baseLeftY = cy + Math.sin(leftAngle) * baseWidth;
      const baseRightX = cx + Math.cos(rightAngle) * baseWidth;
      const baseRightY = cy + Math.sin(rightAngle) * baseWidth;

      g.fillStyle(point.isNorth ? 0xa02020 : 0xc9a227, 0.8);
      g.beginPath();
      g.moveTo(tipX, tipY);
      g.lineTo(baseLeftX, baseLeftY);
      g.lineTo(baseRightX, baseRightY);
      g.closePath();
      g.fillPath();
    }

    // Center dot
    g.fillStyle(0x2c1810, 1);
    g.fillCircle(cx, cy, 4);
    g.fillStyle(0xc9a227, 1);
    g.fillCircle(cx, cy, 2);
  }

  private drawShipSilhouette(x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0xc9a227, 0.15);

    // Hull
    g.beginPath();
    g.moveTo(x, y + 30);
    g.lineTo(x + 60, y + 20);
    g.lineTo(x + 80, y + 30);
    g.lineTo(x + 70, y + 40);
    g.lineTo(x + 10, y + 40);
    g.closePath();
    g.fillPath();

    // Main mast
    g.fillRect(x + 35, y - 40, 4, 70);

    // Sail
    g.beginPath();
    g.moveTo(x + 37, y - 35);
    g.lineTo(x + 65, y);
    g.lineTo(x + 37, y + 10);
    g.closePath();
    g.fillPath();

    // Fore mast
    g.fillRect(x + 55, y - 20, 3, 50);

    // Fore sail
    g.beginPath();
    g.moveTo(x + 56, y - 15);
    g.lineTo(x + 75, y);
    g.lineTo(x + 56, y + 10);
    g.closePath();
    g.fillPath();
  }

  private createQuote(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const quotes = [
      '"In Goa, all the nations of the world come to trade." - Jan Huygen van Linschoten',
      '"The pepper trade is the soul of this commerce." - Portuguese merchant',
      '"Whoever is lord of Malacca has his hand on the throat of Venice." - Tome Pires',
      '"Goa is the Rome of the East." - Contemporary description, 1590',
      '"Fortune favors the bold." - Portuguese merchant wisdom',
    ];

    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    const quoteText = this.add.text(width / 2, height - 50, quote, {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '14px',
      color: '#6a5040',
      fontStyle: 'italic',
      wordWrap: { width: width * 0.8 },
      align: 'center',
    });
    quoteText.setOrigin(0.5);
  }

  private playAmbientSound(): void {
    const audioSystem = this.registry.get('audioSystem');
    if (audioSystem?.playAmbient) {
      audioSystem.playAmbient('menu');
    }
  }

  private startNewGame(): void {
    console.log('MainMenuScene: Starting new game...');
    // Start game directly without fade (simpler)
    this.scene.start('MarketScene');
    this.scene.launch('UIScene');
  }

  private continueGame(): void {
    if (!this.hasSaveData) return;

    // Fade out and load game
    this.cameras.main.fadeOut(800, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Set flag to tell MarketScene to load saved game after initialization
      this.registry.set('loadSaveOnStart', true);
      this.scene.start('MarketScene');
      this.scene.launch('UIScene');
    });
  }

  private openSettings(): void {
    // For now, show a simple message
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(0xf4e4bc, 0.95);
    panel.fillRoundedRect(width / 2 - 150, height / 2 - 100, 300, 200, 10);
    panel.lineStyle(3, 0x2c1810, 1);
    panel.strokeRoundedRect(width / 2 - 150, height / 2 - 100, 300, 200, 10);

    const settingsTitle = this.add.text(width / 2, height / 2 - 70, 'Settings', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#2c1810',
      fontStyle: 'bold',
    });
    settingsTitle.setOrigin(0.5);

    const comingSoon = this.add.text(width / 2, height / 2, 'Settings coming soon...', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#5a4030',
      fontStyle: 'italic',
    });
    comingSoon.setOrigin(0.5);

    const closeBtn = this.add.text(width / 2, height / 2 + 60, '[Close]', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#8b6914',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      settingsTitle.destroy();
      comingSoon.destroy();
      closeBtn.destroy();
    });
  }

  private showCredits(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(0xf4e4bc, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 10);
    panel.lineStyle(3, 0x2c1810, 1);
    panel.strokeRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 10);

    const creditsTitle = this.add.text(width / 2, height / 2 - 120, 'Credits', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#2c1810',
      fontStyle: 'bold',
    });
    creditsTitle.setOrigin(0.5);

    const creditsText = this.add.text(width / 2, height / 2 - 20, [
      'GOA 1590: The Rome of the East',
      '',
      'A historical trading simulation',
      'set in 16th century Portuguese India',
      '',
      'Inspired by the writings of',
      'Jan Huygen van Linschoten',
      '',
      'Built with Phaser 3',
    ].join('\n'), {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#4a3020',
      align: 'center',
    });
    creditsText.setOrigin(0.5);

    const closeBtn = this.add.text(width / 2, height / 2 + 110, '[Close]', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#8b6914',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      creditsTitle.destroy();
      creditsText.destroy();
      closeBtn.destroy();
    });
  }
}
