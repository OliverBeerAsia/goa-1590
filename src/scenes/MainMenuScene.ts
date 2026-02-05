import Phaser from 'phaser';
import { IntroArtGenerator } from '../art/generators/IntroArtGenerator';
import { GOLD, WATER_HARBOR, WOOD_DARK } from '../art/palette';

/**
 * MainMenuScene - Atmospheric late 90s RPG-style main menu
 *
 * Features:
 * - Dark gradient sky background
 * - Goa cityscape silhouette
 * - Distant ship silhouettes
 * - Gothic frame with gold inlay
 * - Torch flicker effects
 * - Beveled metal menu buttons
 * - Dust particle ambiance
 *
 * Inspired by: Baldur's Gate, Diablo II menu screens
 */
export class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private menuContainer!: Phaser.GameObjects.Container;
  private selectedIndex = 0;
  private menuItems: Phaser.GameObjects.Container[] = [];
  private hasSaveData = false;
  private artGenerator!: IntroArtGenerator;
  private dustParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private torchLights: Phaser.GameObjects.PointLight[] = [];

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    // Check for existing save data
    this.hasSaveData = this.checkForSaveData();

    // Initialize art generator
    this.artGenerator = new IntroArtGenerator(this);

    // Create the atmospheric background
    this.createAtmosphericBackground();

    // Create gothic frame
    this.createGothicFrame();

    // Create title
    this.createTitle();

    // Create menu options
    this.createMenu();

    // Set up input handlers
    this.setupInput();

    // Create ambient effects
    this.createAmbientEffects();

    // Add historical quote
    this.createQuote();

    // Play ambient sound if available
    this.playAmbientSound();

    // Fade in
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private checkForSaveData(): boolean {
    try {
      const autoSave = localStorage.getItem('goa_trade_autosave');
      const manualSave1 = localStorage.getItem('goa_trade_save_1');
      const manualSave2 = localStorage.getItem('goa_trade_save_2');
      const manualSave3 = localStorage.getItem('goa_trade_save_3');
      return autoSave !== null || manualSave1 !== null || manualSave2 !== null || manualSave3 !== null;
    } catch {
      return false;
    }
  }

  private createAtmosphericBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Sky gradient (dark blue to near-black)
    const sky = this.add.graphics();
    const skySteps = 40;
    for (let i = 0; i < skySteps; i++) {
      const ratio = i / skySteps;
      const color = this.lerpColor(0x040810, 0x0a1a2a, 1 - ratio);
      sky.fillStyle(color, 1);
      sky.fillRect(0, (i / skySteps) * height * 0.65, width, (height * 0.65) / skySteps + 1);
    }

    // Stars (subtle)
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.3);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.5;
      const size = Math.random() > 0.9 ? 2 : 1;
      stars.fillCircle(x, y, size);
    }

    // Moon (subtle glow)
    const moonX = width * 0.85;
    const moonY = height * 0.15;
    const moonGlow = this.add.graphics();
    moonGlow.fillStyle(0xf0e8d0, 0.03);
    moonGlow.fillCircle(moonX, moonY, 60);
    moonGlow.fillStyle(0xf0e8d0, 0.05);
    moonGlow.fillCircle(moonX, moonY, 40);
    moonGlow.fillStyle(0xf0e8d0, 0.1);
    moonGlow.fillCircle(moonX, moonY, 20);

    // Distant ship silhouettes on horizon
    this.createDistantShips(width, height);

    // Water layer
    const waterY = height * 0.65;
    const water = this.add.graphics();
    for (let i = 0; i < height - waterY; i += 3) {
      const ratio = i / (height - waterY);
      const color = this.lerpColor(WATER_HARBOR.deep, WATER_HARBOR.shadow, ratio * 0.3);
      water.fillStyle(color, 0.9);
      water.fillRect(0, waterY + i, width, 3);
    }

    // Water shimmer effect (animated in update if needed)
    const shimmer = this.add.graphics();
    shimmer.lineStyle(1, WATER_HARBOR.highlight, 0.15);
    for (let row = 0; row < 8; row++) {
      shimmer.beginPath();
      const rowY = waterY + 15 + row * 12;
      for (let x = 0; x <= width; x += 10) {
        const y = rowY + Math.sin(x * 0.015 + row * 0.5) * 2;
        if (x === 0) shimmer.moveTo(x, y);
        else shimmer.lineTo(x, y);
      }
      shimmer.strokePath();
    }

    // Moon reflection on water
    const moonReflection = this.add.graphics();
    moonReflection.fillStyle(0xf0e8d0, 0.05);
    for (let i = 0; i < 15; i++) {
      const reflectY = waterY + 10 + i * 8;
      const reflectWidth = 20 - i * 1;
      moonReflection.fillRect(moonX - reflectWidth / 2, reflectY, reflectWidth, 3);
    }

    // Cityscape silhouette
    const cityscape = this.artGenerator.generateGoaCityscape(width, height * 0.4);
    cityscape.setPosition(0, height * 0.45);
  }

  private createDistantShips(width: number, height: number): void {
    const horizonY = height * 0.62;
    const g = this.add.graphics();
    g.fillStyle(0x0a0a0a, 0.6);

    // Ship 1 (left)
    this.drawSmallShipSilhouette(g, width * 0.15, horizonY, 0.5);

    // Ship 2 (right)
    this.drawSmallShipSilhouette(g, width * 0.78, horizonY, 0.4);
  }

  private drawSmallShipSilhouette(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
    // Simple ship silhouette
    g.beginPath();
    g.moveTo(x - 30 * scale, y);
    g.lineTo(x - 35 * scale, y - 5 * scale);
    g.lineTo(x - 25 * scale, y - 10 * scale);
    g.lineTo(x + 25 * scale, y - 10 * scale);
    g.lineTo(x + 35 * scale, y - 5 * scale);
    g.lineTo(x + 30 * scale, y);
    g.closePath();
    g.fillPath();

    // Mast
    g.fillRect(x - 2 * scale, y - 45 * scale, 4 * scale, 40 * scale);

    // Sail
    g.beginPath();
    g.moveTo(x, y - 42 * scale);
    g.lineTo(x + 20 * scale, y - 25 * scale);
    g.lineTo(x, y - 15 * scale);
    g.closePath();
    g.fillPath();
  }

  private createGothicFrame(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const frameWidth = 14;

    const frame = this.add.graphics();

    // Outer dark wood frame
    frame.fillStyle(WOOD_DARK.deep, 1);
    frame.fillRect(0, 0, width, frameWidth);
    frame.fillRect(0, height - frameWidth, width, frameWidth);
    frame.fillRect(0, 0, frameWidth, height);
    frame.fillRect(width - frameWidth, 0, frameWidth, height);

    // Gold inlay lines
    frame.lineStyle(2, GOLD.shadow, 0.7);
    frame.strokeRect(frameWidth + 6, frameWidth + 6, width - frameWidth * 2 - 12, height - frameWidth * 2 - 12);

    // Corner ornaments
    this.drawCornerOrnament(frame, frameWidth, frameWidth, 1, 1);
    this.drawCornerOrnament(frame, width - frameWidth, frameWidth, -1, 1);
    this.drawCornerOrnament(frame, frameWidth, height - frameWidth, 1, -1);
    this.drawCornerOrnament(frame, width - frameWidth, height - frameWidth, -1, -1);

    // Torch brackets
    this.createTorchBracket(width * 0.2, frameWidth);
    this.createTorchBracket(width * 0.8, frameWidth);
  }

  private drawCornerOrnament(g: Phaser.GameObjects.Graphics, x: number, y: number, flipX: number, flipY: number): void {
    const size = 30;

    g.fillStyle(GOLD.shadow, 0.9);
    g.fillRect(x, y, flipX * size, flipY * 5);
    g.fillRect(x, y, flipX * 5, flipY * size);

    g.fillStyle(GOLD.base, 0.8);
    g.fillRect(x + flipX * 8, y + flipY * 8, flipX * 16, flipY * 3);
    g.fillRect(x + flipX * 8, y + flipY * 8, flipX * 3, flipY * 16);

    g.fillCircle(x + flipX * 14, y + flipY * 14, 4);
    g.fillStyle(WOOD_DARK.base, 1);
    g.fillCircle(x + flipX * 14, y + flipY * 14, 2);
  }

  private createTorchBracket(x: number, frameTop: number): void {
    const g = this.add.graphics();
    const y = frameTop + 25;

    // Bracket
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(x - 6, frameTop + 5, 12, 8);
    g.fillRect(x - 4, frameTop + 13, 8, 15);

    // Torch cup
    g.fillStyle(0x2a2a2a, 1);
    g.beginPath();
    g.moveTo(x - 8, y + 3);
    g.lineTo(x + 8, y + 3);
    g.lineTo(x + 5, y + 15);
    g.lineTo(x - 5, y + 15);
    g.closePath();
    g.fillPath();

    // Add point light for torch glow
    const light = this.add.pointlight(x, y + 5, 0xffaa33, 80, 0.4);
    this.torchLights.push(light);

    // Animate torch flicker
    this.tweens.add({
      targets: light,
      intensity: { from: 0.3, to: 0.5 },
      radius: { from: 70, to: 90 },
      duration: 150 + Math.random() * 100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createTitle(): void {
    const width = this.cameras.main.width;

    // Title shadow
    const shadowText = this.add.text(width / 2 + 3, 83, 'GOA 1590', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '64px',
      color: '#000000',
      fontStyle: 'bold',
    });
    shadowText.setOrigin(0.5);
    shadowText.setAlpha(0.5);

    // Embossed gold title
    this.titleText = this.add.text(width / 2, 80, 'GOA 1590', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '64px',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);

    // Highlight line above title
    const highlight = this.add.graphics();
    highlight.lineStyle(1, 0xfff0a0, 0.5);
    highlight.lineBetween(width / 2 - 160, 48, width / 2 + 160, 48);

    // Subtitle with parchment banner
    const bannerWidth = 280;
    const bannerHeight = 32;
    const banner = this.add.graphics();
    banner.fillStyle(0xf4e4bc, 0.85);
    banner.fillRoundedRect(width / 2 - bannerWidth / 2, 130, bannerWidth, bannerHeight, 4);
    banner.lineStyle(2, GOLD.shadow, 0.6);
    banner.strokeRoundedRect(width / 2 - bannerWidth / 2, 130, bannerWidth, bannerHeight, 4);

    this.subtitleText = this.add.text(width / 2, 146, 'The Rome of the East', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '18px',
      color: '#4a3020',
      fontStyle: 'italic',
    });
    this.subtitleText.setOrigin(0.5);

    // Decorative line under title section
    const decorLine = this.add.graphics();
    decorLine.lineStyle(2, GOLD.shadow, 0.5);
    decorLine.lineBetween(width / 2 - 150, 175, width / 2 + 150, 175);
    decorLine.fillStyle(GOLD.base, 1);
    decorLine.fillCircle(width / 2, 175, 4);
  }

  private createMenu(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.menuContainer = this.add.container(width / 2, height / 2 + 40);

    const menuOptions = [
      { text: 'New Game', action: () => this.startNewGame() },
      { text: 'Continue', action: () => this.continueGame(), enabled: this.hasSaveData },
      { text: 'Settings', action: () => this.openSettings() },
      { text: 'Credits', action: () => this.showCredits() },
    ];

    menuOptions.forEach((option, index) => {
      const isEnabled = option.enabled !== false;
      const yOffset = index * 55;

      const buttonContainer = this.add.container(0, yOffset);

      // Create metal-style button
      const button = this.createMetalButton(220, 40, isEnabled);
      buttonContainer.add(button);

      // Button text
      const text = this.add.text(0, 0, option.text, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        color: isEnabled ? '#2c1810' : '#6a6a6a',
        fontStyle: isEnabled ? 'normal' : 'italic',
      });
      text.setOrigin(0.5);
      buttonContainer.add(text);

      buttonContainer.setData('action', option.action);
      buttonContainer.setData('enabled', isEnabled);
      buttonContainer.setData('index', index);
      buttonContainer.setData('text', text);
      buttonContainer.setData('button', button);

      if (isEnabled) {
        const hitZone = this.add.zone(0, 0, 220, 40).setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => this.highlightMenuItem(index));
        hitZone.on('pointerout', () => this.unhighlightMenuItem(index));
        hitZone.on('pointerdown', () => {
          this.pressMenuItem(index);
          option.action();
        });
        buttonContainer.add(hitZone);
      }

      this.menuContainer.add(buttonContainer);
      this.menuItems.push(buttonContainer);
    });

    // Highlight first enabled item
    const firstEnabled = menuOptions.findIndex(o => o.enabled !== false);
    this.selectedIndex = firstEnabled >= 0 ? firstEnabled : 0;
    this.highlightMenuItem(this.selectedIndex);
  }

  private createMetalButton(width: number, height: number, enabled: boolean): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    const hw = width / 2;
    const hh = height / 2;

    // Button base colors
    const frameColor = enabled ? 0x3a3a3a : 0x2a2a2a;
    const lightBevel = enabled ? 0x5a5a5a : 0x3a3a3a;
    const darkBevel = enabled ? 0x1a1a1a : 0x1a1a1a;
    const fillColor = enabled ? 0xf4e4bc : 0xd8d0c0;

    // Outer metal frame
    g.fillStyle(frameColor, 1);
    g.fillRoundedRect(-hw - 4, -hh - 4, width + 8, height + 8, 4);

    // Light bevel (top-left)
    g.fillStyle(lightBevel, 1);
    g.fillRect(-hw - 2, -hh - 2, width + 2, 3);
    g.fillRect(-hw - 2, -hh - 2, 3, height + 2);

    // Dark bevel (bottom-right)
    g.fillStyle(darkBevel, 1);
    g.fillRect(-hw - 1, hh - 1, width + 3, 3);
    g.fillRect(hw - 1, -hh - 1, 3, height + 3);

    // Inner parchment fill
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(-hw, -hh, width, height, 2);

    return g;
  }

  private highlightMenuItem(index: number): void {
    const container = this.menuItems[index];
    if (!container || !container.getData('enabled')) return;

    this.selectedIndex = index;

    this.menuItems.forEach((item, i) => {
      const isSelected = i === index;
      const isEnabled = item.getData('enabled');
      const text = item.getData('text') as Phaser.GameObjects.Text;
      const button = item.getData('button') as Phaser.GameObjects.Graphics;

      if (isEnabled) {
        text.setColor(isSelected ? '#c9a227' : '#2c1810');
        item.setScale(isSelected ? 1.05 : 1);

        // Redraw button with highlight
        button.clear();
        const hw = 110;
        const hh = 20;
        const frameColor = isSelected ? 0x4a4a4a : 0x3a3a3a;
        const lightBevel = isSelected ? 0x6a6a6a : 0x5a5a5a;
        const darkBevel = 0x1a1a1a;
        const fillColor = isSelected ? 0xfff8e8 : 0xf4e4bc;

        button.fillStyle(frameColor, 1);
        button.fillRoundedRect(-hw - 4, -hh - 4, 220 + 8, 40 + 8, 4);
        button.fillStyle(lightBevel, 1);
        button.fillRect(-hw - 2, -hh - 2, 220 + 2, 3);
        button.fillRect(-hw - 2, -hh - 2, 3, 40 + 2);
        button.fillStyle(darkBevel, 1);
        button.fillRect(-hw - 1, hh - 1, 220 + 3, 3);
        button.fillRect(hw - 1, -hh - 1, 3, 40 + 3);
        button.fillStyle(fillColor, 1);
        button.fillRoundedRect(-hw, -hh, 220, 40, 2);

        // Add gold border on selected
        if (isSelected) {
          button.lineStyle(2, GOLD.shadow, 0.8);
          button.strokeRoundedRect(-hw, -hh, 220, 40, 2);
        }
      }
    });
  }

  private unhighlightMenuItem(index: number): void {
    if (this.selectedIndex === index) return;

    const container = this.menuItems[index];
    if (!container || !container.getData('enabled')) return;

    container.setScale(1);
    const text = container.getData('text') as Phaser.GameObjects.Text;
    text.setColor('#2c1810');
  }

  private pressMenuItem(index: number): void {
    const container = this.menuItems[index];
    if (!container) return;

    // Animate button press (invert bevel briefly)
    this.tweens.add({
      targets: container,
      scaleX: 0.98,
      scaleY: 0.98,
      duration: 50,
      yoyo: true,
      ease: 'Power2',
    });
  }

  private setupInput(): void {
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
      if (action) {
        this.pressMenuItem(this.selectedIndex);
        action();
      }
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      const action = this.menuItems[this.selectedIndex].getData('action');
      if (action) {
        this.pressMenuItem(this.selectedIndex);
        action();
      }
    });
  }

  private createAmbientEffects(): void {
    // Dust particles
    if (!this.textures.exists('effect_dust')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xd4a574, 0.4);
      g.fillCircle(2, 2, 2);
      g.generateTexture('effect_dust', 4, 4);
      g.destroy();
    }

    this.dustParticles = this.add.particles(0, 0, 'effect_dust', {
      x: { min: 0, max: this.scale.width },
      y: { min: 0, max: this.scale.height },
      lifespan: 10000,
      speedX: { min: -5, max: 5 },
      speedY: { min: -3, max: 3 },
      scale: { start: 0.4, end: 0.1 },
      alpha: { start: 0.2, end: 0 },
      frequency: 400,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  private createQuote(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const quotes = [
      '"In Goa, all the nations of the world come to trade." — Linschoten',
      '"The pepper trade is the soul of this commerce." — Portuguese merchant',
      '"Whoever is lord of Malacca has his hand on the throat of Venice." — Tome Pires',
      '"Goa is the Rome of the East." — Contemporary description',
      '"Fortune favors the bold." — Portuguese merchant wisdom',
    ];

    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    const quoteText = this.add.text(width / 2, height - 45, quote, {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '13px',
      color: '#8b7355',
      fontStyle: 'italic',
      wordWrap: { width: width * 0.7 },
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
    this.dustParticles?.stop();
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MarketScene');
      this.scene.launch('UIScene');
    });
  }

  private continueGame(): void {
    if (!this.hasSaveData) return;

    this.dustParticles?.stop();
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.registry.set('loadSaveOnStart', true);
      this.scene.start('MarketScene');
      this.scene.launch('UIScene');
    });
  }

  private openSettings(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2a, 0.95);
    panel.fillRoundedRect(width / 2 - 150, height / 2 - 100, 300, 200, 10);
    panel.lineStyle(2, GOLD.shadow, 0.8);
    panel.strokeRoundedRect(width / 2 - 150, height / 2 - 100, 300, 200, 10);

    const settingsTitle = this.add.text(width / 2, height / 2 - 70, 'Settings', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    settingsTitle.setOrigin(0.5);

    const comingSoon = this.add.text(width / 2, height / 2, 'Settings coming soon...', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#a0a0a0',
      fontStyle: 'italic',
    });
    comingSoon.setOrigin(0.5);

    const closeBtn = this.add.text(width / 2, height / 2 + 60, '[ Close ]', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#c9a227',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffd700'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#c9a227'));

    const closeDialog = () => {
      overlay.destroy();
      panel.destroy();
      settingsTitle.destroy();
      comingSoon.destroy();
      closeBtn.destroy();
    };

    closeBtn.on('pointerdown', closeDialog);

    // ESC key to close dialog
    this.input.keyboard?.once('keydown-ESC', closeDialog);
  }

  private showCredits(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2a, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 10);
    panel.lineStyle(2, GOLD.shadow, 0.8);
    panel.strokeRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 10);

    const creditsTitle = this.add.text(width / 2, height / 2 - 120, 'Credits', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#ffd700',
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
      color: '#c0c0c0',
      align: 'center',
    });
    creditsText.setOrigin(0.5);

    const closeBtn = this.add.text(width / 2, height / 2 + 110, '[ Close ]', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#c9a227',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffd700'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#c9a227'));

    const closeDialog = () => {
      overlay.destroy();
      panel.destroy();
      creditsTitle.destroy();
      creditsText.destroy();
      closeBtn.destroy();
    };

    closeBtn.on('pointerdown', closeDialog);

    // ESC key to close dialog
    this.input.keyboard?.once('keydown-ESC', closeDialog);
  }

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Clean up all event listeners and resources when scene shuts down
   */
  shutdown(): void {
    // Remove keyboard event listeners
    this.input.keyboard?.off('keydown-UP');
    this.input.keyboard?.off('keydown-DOWN');
    this.input.keyboard?.off('keydown-ENTER');
    this.input.keyboard?.off('keydown-SPACE');

    // Destroy particle emitter
    if (this.dustParticles) {
      this.dustParticles.destroy();
    }

    // Clean up torch lights
    for (const light of this.torchLights) {
      if (light && light.active) {
        light.destroy();
      }
    }
    this.torchLights = [];

    // Clean up menu items
    this.menuItems = [];
  }
}
