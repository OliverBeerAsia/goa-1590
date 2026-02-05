import Phaser from 'phaser';
import { IntroArtGenerator } from '../art/generators/IntroArtGenerator';
import { GOLD, WATER_HARBOR } from '../art/palette';

/**
 * IntroScene - Cinematic opening sequence inspired by late 90s RPGs
 *
 * A dramatic, atmospheric presentation featuring:
 * - Title cards with period artwork
 * - Historical quotes from Linschoten
 * - Portuguese carrack silhouette
 * - Goa cityscape
 * - Cross-dissolve transitions
 *
 * References: Baldur's Gate, Diablo II opening cinematics
 */

interface CardConfig {
  type: 'text' | 'artwork' | 'title';
  duration: number;
  content?: string;
  subContent?: string;
  artworkType?: 'carrack' | 'cityscape';
}

export class IntroScene extends Phaser.Scene {
  private artGenerator!: IntroArtGenerator;
  private currentCardIndex: number = 0;
  private cardContainer!: Phaser.GameObjects.Container;
  private isTransitioning: boolean = false;
  private skipText!: Phaser.GameObjects.Text;
  private dustParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Card sequence configuration
  private readonly cards: CardConfig[] = [
    {
      type: 'text',
      duration: 3000,
      content: 'The Year of Our Lord',
      subContent: '1590',
    },
    {
      type: 'text',
      duration: 4000,
      content: '"In Goa, all the nations of the world\ncome to trade."',
      subContent: '— Jan Huygen van Linschoten, 1596',
    },
    {
      type: 'artwork',
      duration: 4000,
      artworkType: 'carrack',
    },
    {
      type: 'artwork',
      duration: 4000,
      artworkType: 'cityscape',
    },
    {
      type: 'title',
      duration: 5000,
      content: 'GOA 1590',
      subContent: 'The Rome of the East',
    },
  ];

  constructor() {
    super({ key: 'IntroScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Initialize art generator
    this.artGenerator = new IntroArtGenerator(this);

    // Create black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // Create container for card content
    this.cardContainer = this.add.container(0, 0);

    // Create dust particles for atmosphere
    this.createDustParticles();

    // Create skip prompt
    this.skipText = this.add.text(width - 20, height - 20, 'Press SPACE or ESC to skip', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#666666',
    });
    this.skipText.setOrigin(1, 1);
    this.skipText.setAlpha(0.5);

    // Setup input handlers
    this.setupInput();

    // Start fade in from black
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Begin card sequence after fade
    this.time.delayedCall(800, () => {
      this.showCard(0);
    });
  }

  private createDustParticles(): void {
    // Check if dust texture exists
    if (!this.textures.exists('effect_dust')) {
      // Create a simple dust particle texture
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xd4a574, 0.4);
      g.fillCircle(2, 2, 2);
      g.generateTexture('effect_dust', 4, 4);
      g.destroy();
    }

    // Create particle emitter
    this.dustParticles = this.add.particles(0, 0, 'effect_dust', {
      x: { min: 0, max: this.scale.width },
      y: { min: 0, max: this.scale.height },
      lifespan: 8000,
      speedX: { min: -8, max: 8 },
      speedY: { min: -5, max: 5 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.25, end: 0 },
      frequency: 300,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  private setupInput(): void {
    // Skip with SPACE
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.skipToMenu();
    });

    // Skip with ESC
    this.input.keyboard?.on('keydown-ESC', () => {
      this.skipToMenu();
    });

    // Skip with click
    this.input.on('pointerdown', () => {
      this.skipToMenu();
    });
  }

  private skipToMenu(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Stop particles
    this.dustParticles.stop();

    // Fade out and go to main menu
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private showCard(index: number): void {
    if (this.isTransitioning) return;

    if (index >= this.cards.length) {
      // End of sequence, go to main menu
      this.skipToMenu();
      return;
    }

    this.currentCardIndex = index;
    const card = this.cards[index];

    // Clear previous card content
    this.cardContainer.removeAll(true);

    // Create card content based on type
    switch (card.type) {
      case 'text':
        this.createTextCard(card.content!, card.subContent);
        break;
      case 'artwork':
        this.createArtworkCard(card.artworkType!);
        break;
      case 'title':
        this.createTitleCard(card.content!, card.subContent);
        break;
    }

    // Fade in the card
    this.cardContainer.setAlpha(0);
    this.tweens.add({
      targets: this.cardContainer,
      alpha: 1,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        // Hold for duration, then fade out and show next
        this.time.delayedCall(card.duration, () => {
          this.transitionToNextCard();
        });
      },
    });
  }

  private transitionToNextCard(): void {
    if (this.isTransitioning) return;

    // Fade out current card
    this.tweens.add({
      targets: this.cardContainer,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        // Show next card
        this.showCard(this.currentCardIndex + 1);
      },
    });
  }

  private createTextCard(text: string, subText?: string): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Parchment vignette background
    const vignette = this.add.graphics();
    vignette.fillStyle(0xf4e4bc, 0.08);
    vignette.fillEllipse(width / 2, height / 2, width * 0.7, height * 0.5);
    this.cardContainer.add(vignette);

    // Main text
    const mainText = this.add.text(width / 2, height / 2 - 20, text, {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '32px',
      color: '#c9a227',
      align: 'center',
      lineSpacing: 10,
    });
    mainText.setOrigin(0.5);
    this.cardContainer.add(mainText);

    // Sub text (if provided)
    if (subText) {
      const sub = this.add.text(width / 2, height / 2 + 50, subText, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '18px',
        color: '#8b6914',
        fontStyle: 'italic',
        align: 'center',
      });
      sub.setOrigin(0.5);
      this.cardContainer.add(sub);
    }
  }

  private createArtworkCard(artworkType: 'carrack' | 'cityscape'): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create water background for both artwork types
    const waterHeight = height * 0.35;
    const waterY = height - waterHeight;

    // Water gradient
    const water = this.add.graphics();
    for (let i = 0; i < waterHeight; i += 4) {
      const ratio = i / waterHeight;
      const color = this.lerpColor(WATER_HARBOR.deep, WATER_HARBOR.base, ratio * 0.5);
      water.fillStyle(color, 0.8);
      water.fillRect(0, waterY + i, width, 4);
    }
    this.cardContainer.add(water);

    // Add subtle wave animation
    const waveGraphics = this.add.graphics();
    waveGraphics.lineStyle(1, WATER_HARBOR.highlight, 0.3);
    for (let row = 0; row < 5; row++) {
      waveGraphics.beginPath();
      const rowY = waterY + 20 + row * 25;
      for (let x = 0; x <= width; x += 8) {
        const y = rowY + Math.sin(x * 0.02 + row) * 3;
        if (x === 0) {
          waveGraphics.moveTo(x, y);
        } else {
          waveGraphics.lineTo(x, y);
        }
      }
      waveGraphics.strokePath();
    }
    this.cardContainer.add(waveGraphics);

    // Create the main artwork
    if (artworkType === 'carrack') {
      // Draw carrack
      const carrack = this.artGenerator.generatePortugueseCarrack(width * 0.5, height * 0.6);
      carrack.setPosition(width * 0.25, height * 0.15);
      this.cardContainer.add(carrack);

      // Caption
      const caption = this.add.text(width / 2, height - 40, 'The Carreira da Índia', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#c9a227',
        fontStyle: 'italic',
      });
      caption.setOrigin(0.5);
      this.cardContainer.add(caption);
    } else if (artworkType === 'cityscape') {
      // Draw cityscape
      const cityscape = this.artGenerator.generateGoaCityscape(width, height * 0.7);
      cityscape.setPosition(0, height * 0.15);
      this.cardContainer.add(cityscape);

      // Caption
      const caption = this.add.text(width / 2, height - 40, 'Golden Goa', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#c9a227',
        fontStyle: 'italic',
      });
      caption.setOrigin(0.5);
      this.cardContainer.add(caption);
    }
  }

  private createTitleCard(title: string, subtitle?: string): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Ornate frame background
    const frame = this.artGenerator.generateOrnateFrame(width, height);
    this.cardContainer.add(frame);

    // Parchment inner glow
    const glow = this.add.graphics();
    glow.fillStyle(0xf4e4bc, 0.05);
    glow.fillEllipse(width / 2, height / 2, width * 0.6, height * 0.4);
    this.cardContainer.add(glow);

    // Title shadow
    const shadow = this.add.text(width / 2 + 4, height / 2 - 26, title, {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '72px',
      color: '#000000',
      fontStyle: 'bold',
    });
    shadow.setOrigin(0.5);
    shadow.setAlpha(0.4);
    this.cardContainer.add(shadow);

    // Main title
    const titleText = this.add.text(width / 2, height / 2 - 30, title, {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '72px',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5);
    this.cardContainer.add(titleText);

    // Gold emboss effect (highlight line above text)
    const emboss = this.add.graphics();
    emboss.lineStyle(2, 0xfff0a0, 0.6);
    emboss.lineBetween(width / 2 - 180, height / 2 - 65, width / 2 + 180, height / 2 - 65);
    this.cardContainer.add(emboss);

    // Subtitle with decorative line
    if (subtitle) {
      // Decorative line above subtitle
      const decorLine = this.add.graphics();
      decorLine.lineStyle(1, GOLD.shadow, 0.6);
      decorLine.lineBetween(width / 2 - 120, height / 2 + 20, width / 2 + 120, height / 2 + 20);
      decorLine.fillStyle(GOLD.shadow, 1);
      decorLine.fillCircle(width / 2, height / 2 + 20, 4);
      this.cardContainer.add(decorLine);

      const subtitleText = this.add.text(width / 2, height / 2 + 50, subtitle, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '24px',
        color: '#c9a227',
        fontStyle: 'italic',
      });
      subtitleText.setOrigin(0.5);
      this.cardContainer.add(subtitleText);
    }

    // Animate title with slight scale pulse
    this.tweens.add({
      targets: titleText,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Helper function to linearly interpolate between two hex colors
   */
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
    this.input.keyboard?.off('keydown-SPACE');
    this.input.keyboard?.off('keydown-ESC');

    // Remove input event listeners
    this.input.off('pointerdown');

    // Destroy particle emitter (not just stop)
    if (this.dustParticles) {
      this.dustParticles.destroy();
    }
  }
}
