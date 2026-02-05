import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';
import { TileGenerator } from '../art/generators/TileGenerator';
import { CharacterGenerator, CharacterType, SkinTone } from '../art/generators/CharacterGenerator';
import { BuildingGenerator, BuildingType, MarketStallVariant } from '../art/generators/BuildingGenerator';
import { UIGenerator } from '../art/generators/UIGenerator';

/**
 * BootScene - Handles procedural asset generation and initialization
 *
 * Shows a beautiful parchment-style loading screen while generating
 * all game assets using the new procedural art pipeline.
 */

// Historical quotes for the loading screen
const HISTORICAL_QUOTES = [
  '"Goa is the Rome of the East." - Contemporary description, 1590',
  '"Whoever is lord of Malacca has his hand on the throat of Venice." - Tome Pires',
  '"The pepper trade is the soul of this commerce." - Portuguese merchant',
  '"In Goa, all the nations of the world come to trade." - Jan Huygen van Linschoten',
  '"Gold is the most excellent thing in the world." - Christopher Columbus',
  '"The sea unites what the land divides." - Portuguese proverb',
  '"Fortune favors the bold." - Portuguese merchant wisdom',
  '"The monsoon determines all commerce." - Arab trader saying',
];

// Loading stage messages
interface LoadingStage {
  message: string;
  weight: number; // Relative weight for progress calculation
}

const LOADING_STAGES: LoadingStage[] = [
  { message: 'Preparing the palette...', weight: 5 },
  { message: 'Preparing the streets of Goa...', weight: 20 },
  { message: 'The merchants gather...', weight: 25 },
  { message: 'Building the marketplace...', weight: 20 },
  { message: 'Preparing your ledger...', weight: 15 },
  { message: 'The monsoon approaches...', weight: 15 },
];

export class BootScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private backgroundGraphics!: Phaser.GameObjects.Graphics;
  private audioSystem!: AudioSystem;

  // Loading screen elements
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private quoteText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  // Progress tracking
  private totalWeight: number = 0;
  private completedWeight: number = 0;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Calculate total weight for progress tracking
    this.totalWeight = LOADING_STAGES.reduce((sum, stage) => sum + stage.weight, 0);

    // Create the loading screen (using basic graphics for bootstrapping)
    this.createLoadingScreen();
  }

  private createLoadingScreen(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create parchment-style background
    this.backgroundGraphics = this.add.graphics();
    this.drawParchmentBackground(width, height);

    // Create decorative border
    this.drawDecorativeBorder(width, height);

    // Title: "Goa 1590" in period font style
    this.titleText = this.add.text(width / 2, height / 3 - 40, 'GOA 1590', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '48px',
      color: '#2C1810', // Dark wood color (ink)
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);

    // Add drop shadow effect to title
    const titleShadow = this.add.text(width / 2 + 2, height / 3 - 38, 'GOA 1590', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '48px',
      color: '#000000',
      fontStyle: 'bold',
    });
    titleShadow.setOrigin(0.5);
    titleShadow.setAlpha(0.2);
    titleShadow.setDepth(-1);

    // Subtitle
    this.subtitleText = this.add.text(width / 2, height / 3 + 10, 'The Rome of the East', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '20px',
      color: '#4A3020', // Brown ink
      fontStyle: 'italic',
    });
    this.subtitleText.setOrigin(0.5);

    // Loading bar background (dark wood frame)
    this.loadingBar = this.add.graphics();
    const barWidth = width * 0.6;
    const barHeight = 24;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 + 20;

    // Outer frame (dark wood)
    this.loadingBar.fillStyle(0x2c1810, 1);
    this.loadingBar.fillRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);

    // Inner frame (lighter wood)
    this.loadingBar.fillStyle(0x4a3020, 1);
    this.loadingBar.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // Background (parchment inside)
    this.loadingBar.fillStyle(0xf4e4bc, 1);
    this.loadingBar.fillRect(barX, barY, barWidth, barHeight);

    // Progress bar (will be drawn dynamically)
    this.progressBar = this.add.graphics();

    // Store bar dimensions for progress updates
    this.registry.set('progressBar', { x: barX, y: barY, width: barWidth, height: barHeight });

    // Status text (current loading stage)
    this.statusText = this.add.text(width / 2, barY + barHeight + 20, 'Initializing...', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '16px',
      color: '#4A3020',
    });
    this.statusText.setOrigin(0.5);

    // Percentage text
    this.percentText = this.add.text(width / 2, barY - 20, '0%', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '14px',
      color: '#2C1810',
    });
    this.percentText.setOrigin(0.5);

    // Historical quote (at the bottom)
    const randomQuote = HISTORICAL_QUOTES[Math.floor(Math.random() * HISTORICAL_QUOTES.length)];
    this.quoteText = this.add.text(width / 2, height - 60, randomQuote, {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '14px',
      color: '#6a5040',
      fontStyle: 'italic',
      wordWrap: { width: width * 0.8 },
      align: 'center',
    });
    this.quoteText.setOrigin(0.5);

    // Add decorative elements
    this.drawCompassRose(80, height - 80, 40);
    this.drawCompassRose(width - 80, height - 80, 40);
  }

  private drawParchmentBackground(width: number, height: number): void {
    // Base parchment color
    this.backgroundGraphics.fillStyle(0xf4e4bc, 1);
    this.backgroundGraphics.fillRect(0, 0, width, height);

    // Add aging texture with subtle stains
    this.backgroundGraphics.fillStyle(0xe8d4a8, 0.3);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 10 + Math.random() * 30;
      this.backgroundGraphics.fillCircle(x, y, size);
    }

    // Darker edges (vignette effect)
    this.backgroundGraphics.fillStyle(0xd4c4a0, 0.4);
    this.backgroundGraphics.fillRect(0, 0, width, 20);
    this.backgroundGraphics.fillRect(0, height - 20, width, 20);
    this.backgroundGraphics.fillRect(0, 0, 20, height);
    this.backgroundGraphics.fillRect(width - 20, 0, 20, height);

    // Corner aging
    this.backgroundGraphics.fillStyle(0xc8b080, 0.3);
    this.backgroundGraphics.fillTriangle(0, 0, 80, 0, 0, 80);
    this.backgroundGraphics.fillTriangle(width, 0, width - 80, 0, width, 80);
    this.backgroundGraphics.fillTriangle(0, height, 80, height, 0, height - 80);
    this.backgroundGraphics.fillTriangle(width, height, width - 80, height, width, height - 80);
  }

  private drawDecorativeBorder(width: number, height: number): void {
    const borderWidth = 8;

    // Outer border (dark wood)
    this.backgroundGraphics.fillStyle(0x2c1810, 1);
    this.backgroundGraphics.fillRect(0, 0, width, borderWidth);
    this.backgroundGraphics.fillRect(0, height - borderWidth, width, borderWidth);
    this.backgroundGraphics.fillRect(0, 0, borderWidth, height);
    this.backgroundGraphics.fillRect(width - borderWidth, 0, borderWidth, height);

    // Inner gold accent line
    this.backgroundGraphics.lineStyle(2, 0xc9a227, 0.8);
    this.backgroundGraphics.strokeRect(borderWidth + 4, borderWidth + 4, width - borderWidth * 2 - 8, height - borderWidth * 2 - 8);

    // Corner ornaments
    this.drawCornerOrnament(borderWidth + 2, borderWidth + 2);
    this.drawCornerOrnament(width - borderWidth - 22, borderWidth + 2, true);
    this.drawCornerOrnament(borderWidth + 2, height - borderWidth - 22, false, true);
    this.drawCornerOrnament(width - borderWidth - 22, height - borderWidth - 22, true, true);
  }

  private drawCornerOrnament(x: number, y: number, flipX: boolean = false, flipY: boolean = false): void {
    const size = 20;
    const sx = flipX ? -1 : 1;
    const sy = flipY ? -1 : 1;
    const ox = flipX ? x + size : x;
    const oy = flipY ? y + size : y;

    this.backgroundGraphics.fillStyle(0xc9a227, 0.9);

    // L-shape ornament
    this.backgroundGraphics.fillRect(ox, oy, sx * 16, sy * 3);
    this.backgroundGraphics.fillRect(ox, oy, sx * 3, sy * 16);

    // Inner accent
    this.backgroundGraphics.fillRect(ox + sx * 5, oy + sy * 5, sx * 8, sy * 2);
    this.backgroundGraphics.fillRect(ox + sx * 5, oy + sy * 5, sx * 2, sy * 8);

    // Flourish dot
    this.backgroundGraphics.fillCircle(ox + sx * 8, oy + sy * 8, 2);
  }

  private drawCompassRose(cx: number, cy: number, size: number): void {
    const g = this.backgroundGraphics;

    // Outer circle
    g.lineStyle(2, 0xc9a227, 0.6);
    g.strokeCircle(cx, cy, size);

    // Cardinal points
    const points = [
      { angle: -Math.PI / 2, length: size * 0.9, isNorth: true }, // North
      { angle: Math.PI / 2, length: size * 0.9, isNorth: false }, // South
      { angle: 0, length: size * 0.9, isNorth: false }, // East
      { angle: Math.PI, length: size * 0.9, isNorth: false }, // West
    ];

    for (const point of points) {
      const tipX = cx + Math.cos(point.angle) * point.length;
      const tipY = cy + Math.sin(point.angle) * point.length;
      const baseWidth = 4;

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
    g.fillCircle(cx, cy, 3);
    g.fillStyle(0xc9a227, 1);
    g.fillCircle(cx, cy, 1.5);
  }

  private updateProgress(progress: number, message: string): void {
    const barData = this.registry.get('progressBar');
    if (!barData) return;

    // progress stored for potential future use in external progress tracking
    void progress;

    // Update progress bar
    this.progressBar.clear();

    // Gold gradient fill for progress
    const fillWidth = barData.width * progress;
    if (fillWidth > 0) {
      // Base gold color
      this.progressBar.fillStyle(0xc9a227, 1);
      this.progressBar.fillRect(barData.x, barData.y, fillWidth, barData.height);

      // Highlight on top
      this.progressBar.fillStyle(0xffd700, 0.4);
      this.progressBar.fillRect(barData.x, barData.y, fillWidth, 4);

      // Shadow on bottom
      this.progressBar.fillStyle(0x8b6914, 0.4);
      this.progressBar.fillRect(barData.x, barData.y + barData.height - 4, fillWidth, 4);
    }

    // Update status text
    this.statusText.setText(message);

    // Update percentage
    this.percentText.setText(`${Math.floor(progress * 100)}%`);
  }

  async create(): Promise<void> {
    // Generate assets using the new procedural art pipeline
    await this.generateAllAssets();

    // Initialize audio system and generate placeholder sounds
    this.audioSystem = new AudioSystem(this);
    this.audioSystem.generatePlaceholderAudio();

    // Store audio system in registry for other scenes to access
    this.registry.set('audioSystem', this.audioSystem);

    // Brief delay to show completed loading screen
    await new Promise(resolve => setTimeout(resolve, 500));

    // Transition to the main game scene directly
    this.scene.start('MarketScene');
    this.scene.launch('UIScene');
  }

  private async generateAllAssets(): Promise<void> {
    let stageIndex = 0;

    // Stage 1: Core palette/utilities
    this.updateProgress(0, LOADING_STAGES[stageIndex].message);
    await this.delay(100);
    this.completedWeight += LOADING_STAGES[stageIndex].weight;
    stageIndex++;

    // Stage 2: Generate tiles
    this.updateProgress(this.completedWeight / this.totalWeight, LOADING_STAGES[stageIndex].message);
    await this.generateTiles();
    this.completedWeight += LOADING_STAGES[stageIndex].weight;
    stageIndex++;

    // Stage 3: Generate characters
    this.updateProgress(this.completedWeight / this.totalWeight, LOADING_STAGES[stageIndex].message);
    await this.generateCharacters();
    this.completedWeight += LOADING_STAGES[stageIndex].weight;
    stageIndex++;

    // Stage 4: Generate buildings
    this.updateProgress(this.completedWeight / this.totalWeight, LOADING_STAGES[stageIndex].message);
    await this.generateBuildings();
    this.completedWeight += LOADING_STAGES[stageIndex].weight;
    stageIndex++;

    // Stage 5: Generate UI elements
    this.updateProgress(this.completedWeight / this.totalWeight, LOADING_STAGES[stageIndex].message);
    await this.generateUIElements();
    this.completedWeight += LOADING_STAGES[stageIndex].weight;
    stageIndex++;

    // Stage 6: Generate effects and legacy compatibility textures
    this.updateProgress(this.completedWeight / this.totalWeight, LOADING_STAGES[stageIndex].message);
    await this.generateEffectsAndLegacy();
    this.completedWeight += LOADING_STAGES[stageIndex].weight;

    // Final progress update
    this.updateProgress(1, 'Ready to trade...');
  }

  private async generateTiles(): Promise<void> {
    const tileGenerator = new TileGenerator(this);

    // Generate all tile types
    tileGenerator.generateAllTiles();

    // Generate legacy texture aliases for backward compatibility
    this.createLegacyTileAliases(tileGenerator);

    await this.delay(50);
  }

  private createLegacyTileAliases(_tileGenerator: TileGenerator): void {
    // Create aliases for the original texture keys used by other scenes
    // Map new tile generator outputs to legacy keys

    // Ground tiles - create variants from the new generator
    this.createTextureAlias('tile_cobble_worn', 'tile_ground');
    this.createTextureAlias('tile_cobble_worn', 'tile_ground_1');
    this.createTextureAlias('tile_cobble_mossy', 'tile_ground_2');
    this.createTextureAlias('tile_cobble_new', 'tile_ground_3');

    // Water tiles - map animated frames
    this.createTextureAlias('tile_harbor_water_0', 'tile_water');
    this.createTextureAlias('tile_harbor_water_1', 'tile_water_1');
    this.createTextureAlias('tile_harbor_water_2', 'tile_water_2');
    this.createTextureAlias('tile_harbor_water_3', 'tile_water_3');

    // Building tiles from cobblestone with whitewash overlay
    this.createBuildingTileTexture('tile_building', 0);
    this.createBuildingTileTexture('tile_building_1', 1);
    this.createBuildingTileTexture('tile_building_2', 2);

    // Roof tile - generate terracotta-style
    this.createRoofTileTexture('tile_roof');

    // Dock tile - map from wood texture
    this.createDockTileTexture('tile_dock');

    // Market tiles - map from stall bases
    this.createTextureAlias('tile_stall_base_red', 'tile_market');
    this.createTextureAlias('tile_stall_base_blue', 'tile_market_1');
    this.createTextureAlias('tile_stall_base_green', 'tile_market_2');
    this.createTextureAlias('tile_stall_base_gold', 'tile_market_3');

    // Decorative tiles - generate or map
    this.createPalmTreeTexture('tile_palm');
    this.createWellTexture('tile_well');
    this.createTextureAlias('tile_crates', 'tile_crates');
    this.createPlanterTexture('tile_planter');
    this.createTextureAlias('tile_barrels', 'tile_barrel');
    this.createFountainTexture('tile_fountain');
  }

  private createTextureAlias(sourceKey: string, aliasKey: string): void {
    // If the source texture exists and alias doesn't, create a reference
    if (this.textures.exists(sourceKey) && !this.textures.exists(aliasKey)) {
      const sourceTexture = this.textures.get(sourceKey);
      const frame = sourceTexture.get();

      // Create a new texture from the same canvas/source
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(0, 0, frame.width, frame.height);

      // Draw the source texture onto new graphics
      const tempImage = this.add.image(0, 0, sourceKey).setVisible(false);
      const rt = this.add.renderTexture(0, 0, frame.width, frame.height);
      rt.draw(tempImage);
      rt.saveTexture(aliasKey);

      tempImage.destroy();
      rt.destroy();
      graphics.destroy();
    }
  }

  private createBuildingTileTexture(key: string, variant: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Whitewashed wall colors
    const wallColors = {
      highlight: 0xfffef8,
      base: 0xf8f0e0,
      shadow: 0xe0d4c0,
      deep: 0xc8b8a0,
    };

    // Draw isometric diamond - 64x32
    graphics.fillStyle(wallColors.base, 1);
    graphics.beginPath();
    graphics.moveTo(32, 0);
    graphics.lineTo(64, 16);
    graphics.lineTo(32, 32);
    graphics.lineTo(0, 16);
    graphics.closePath();
    graphics.fillPath();

    // Gradient shading
    graphics.fillStyle(wallColors.highlight, 0.4);
    graphics.beginPath();
    graphics.moveTo(32, 0);
    graphics.lineTo(48, 8);
    graphics.lineTo(32, 16);
    graphics.lineTo(16, 8);
    graphics.closePath();
    graphics.fillPath();

    // Light edge
    graphics.lineStyle(2, 0xffffff, 0.35);
    graphics.beginPath();
    graphics.moveTo(32, 1);
    graphics.lineTo(1, 16);
    graphics.strokePath();

    // Shadow edge
    graphics.lineStyle(2, wallColors.deep, 0.4);
    graphics.beginPath();
    graphics.moveTo(63, 16);
    graphics.lineTo(32, 31);
    graphics.strokePath();

    // Add window based on variant
    switch (variant) {
      case 0: // Arched window
        graphics.fillStyle(0x1a3550, 1);
        graphics.fillRect(26, 10, 12, 14);
        graphics.fillCircle(32, 10, 6);
        graphics.lineStyle(2, 0x4a3020, 1);
        graphics.strokeRect(26, 10, 12, 14);
        graphics.lineBetween(32, 10, 32, 24);
        graphics.lineBetween(26, 16, 38, 16);
        break;
      case 1: // Shuttered window
        graphics.fillStyle(0x1a3550, 1);
        graphics.fillRect(28, 10, 8, 12);
        graphics.fillStyle(0x3d6020, 1);
        graphics.fillRect(18, 10, 8, 12);
        graphics.fillRect(38, 10, 8, 12);
        break;
      case 2: // Balcony
        graphics.fillStyle(0x1a3550, 1);
        graphics.fillRect(28, 4, 8, 8);
        graphics.fillStyle(0x3a3a3a, 1);
        graphics.fillRect(18, 14, 28, 2);
        graphics.fillRect(18, 16, 2, 10);
        graphics.fillRect(44, 16, 2, 10);
        break;
    }

    graphics.generateTexture(key, 64, 32);
    graphics.destroy();
  }

  private createRoofTileTexture(key: string): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    const roofColors = {
      highlight: 0xd08050,
      base: 0xa85530,
      shadow: 0x8b4020,
      deep: 0x6a3018,
    };

    // Draw isometric diamond
    graphics.fillStyle(roofColors.base, 1);
    graphics.beginPath();
    graphics.moveTo(32, 0);
    graphics.lineTo(64, 16);
    graphics.lineTo(32, 32);
    graphics.lineTo(0, 16);
    graphics.closePath();
    graphics.fillPath();

    // Tile rows
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 5 - row; i++) {
        const x = 8 + row * 4 + i * 10;
        const y = 4 + row * 6;
        graphics.fillStyle(row % 2 === 0 ? roofColors.shadow : roofColors.base, 0.7);
        graphics.fillRoundedRect(x, y, 8, 4, 1);
        graphics.fillStyle(roofColors.highlight, 0.25);
        graphics.fillRect(x + 1, y, 3, 2);
      }
    }

    // Light edge
    graphics.lineStyle(2, roofColors.highlight, 0.5);
    graphics.beginPath();
    graphics.moveTo(32, 1);
    graphics.lineTo(1, 16);
    graphics.strokePath();

    graphics.generateTexture(key, 64, 32);
    graphics.destroy();
  }

  private createDockTileTexture(key: string): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    const woodColors = {
      highlight: 0x4a3828,
      base: 0x3c2818,
      shadow: 0x2c1810,
      deep: 0x1a0a05,
    };

    // Draw isometric diamond
    graphics.fillStyle(woodColors.base, 1);
    graphics.beginPath();
    graphics.moveTo(32, 0);
    graphics.lineTo(64, 16);
    graphics.lineTo(32, 32);
    graphics.lineTo(0, 16);
    graphics.closePath();
    graphics.fillPath();

    // Plank gaps
    graphics.lineStyle(2, woodColors.deep, 0.7);
    graphics.lineBetween(8, 8, 40, 24);
    graphics.lineBetween(24, 0, 56, 16);
    graphics.lineBetween(0, 16, 32, 32);

    // Wood grain
    graphics.lineStyle(1, woodColors.highlight, 0.25);
    graphics.lineBetween(12, 6, 36, 18);
    graphics.lineBetween(28, 2, 52, 14);

    // Nail holes
    graphics.fillStyle(woodColors.deep, 0.6);
    graphics.fillCircle(16, 10, 2);
    graphics.fillCircle(40, 14, 2);
    graphics.fillCircle(24, 20, 2);

    graphics.generateTexture(key, 64, 32);
    graphics.destroy();
  }

  private createPalmTreeTexture(key: string): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Ground base - 64x64
    graphics.fillStyle(0xd4a574, 1);
    graphics.beginPath();
    graphics.moveTo(32, 32);
    graphics.lineTo(64, 48);
    graphics.lineTo(32, 64);
    graphics.lineTo(0, 48);
    graphics.closePath();
    graphics.fillPath();

    // Trunk
    graphics.fillStyle(0x6b4423, 1);
    graphics.fillRect(28, 16, 8, 44);
    graphics.fillStyle(0x4a2f15, 0.6);
    graphics.fillRect(34, 16, 2, 44);

    // Trunk texture
    graphics.lineStyle(2, 0x2a1a08, 0.6);
    for (let y = 20; y < 56; y += 8) {
      graphics.lineBetween(28, y, 36, y);
    }

    // Fronds
    const frondColors = { highlight: 0x4a8030, base: 0x2d5016, shadow: 0x1a3008 };

    // Left fronds
    graphics.fillStyle(frondColors.base, 1);
    graphics.beginPath();
    graphics.moveTo(32, 12);
    graphics.lineTo(4, 20);
    graphics.lineTo(10, 16);
    graphics.lineTo(32, 8);
    graphics.closePath();
    graphics.fillPath();

    // Right fronds
    graphics.beginPath();
    graphics.moveTo(32, 12);
    graphics.lineTo(60, 20);
    graphics.lineTo(54, 16);
    graphics.lineTo(32, 8);
    graphics.closePath();
    graphics.fillPath();

    // Center fronds
    graphics.beginPath();
    graphics.moveTo(32, 8);
    graphics.lineTo(24, 0);
    graphics.lineTo(32, 4);
    graphics.lineTo(40, 0);
    graphics.closePath();
    graphics.fillPath();

    graphics.generateTexture(key, 64, 64);
    graphics.destroy();
  }

  private createWellTexture(key: string): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Ground base
    graphics.fillStyle(0xd4a574, 1);
    graphics.beginPath();
    graphics.moveTo(32, 32);
    graphics.lineTo(64, 48);
    graphics.lineTo(32, 64);
    graphics.lineTo(0, 48);
    graphics.closePath();
    graphics.fillPath();

    // Stone well base
    graphics.fillStyle(0x7a7a7a, 1);
    graphics.fillCircle(32, 44, 20);
    graphics.fillStyle(0x9a9a9a, 0.5);
    graphics.fillCircle(30, 42, 18);

    // Well interior (dark water)
    graphics.fillStyle(0x0d3050, 1);
    graphics.fillCircle(32, 44, 14);

    // Stone rim
    graphics.lineStyle(3, 0xa0a0a0, 0.7);
    graphics.strokeCircle(32, 44, 18);

    // Rope holder posts
    graphics.fillStyle(0x3a2010, 1);
    graphics.fillRect(12, 20, 4, 28);
    graphics.fillRect(48, 20, 4, 28);

    // Crossbeam
    graphics.fillRect(12, 16, 40, 4);

    // Rope and bucket
    graphics.lineStyle(2, 0xc19a6b, 0.9);
    graphics.lineBetween(32, 18, 32, 36);
    graphics.fillStyle(0x4a3020, 1);
    graphics.fillRect(28, 36, 8, 6);

    graphics.generateTexture(key, 64, 64);
    graphics.destroy();
  }

  private createPlanterTexture(key: string): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Ground base
    graphics.fillStyle(0xd4a574, 1);
    graphics.beginPath();
    graphics.moveTo(32, 48);
    graphics.lineTo(56, 56);
    graphics.lineTo(32, 64);
    graphics.lineTo(8, 56);
    graphics.closePath();
    graphics.fillPath();

    // Terracotta pot
    graphics.fillStyle(0x985020, 1);
    graphics.fillRect(16, 36, 32, 20);
    graphics.fillStyle(0x8b4520, 1);
    graphics.fillRect(12, 32, 40, 6);

    // Soil
    graphics.fillStyle(0x3d2314, 1);
    graphics.fillRect(16, 28, 32, 8);

    // Plants
    graphics.fillStyle(0x2a4010, 1);
    graphics.fillRect(22, 12, 4, 20);
    graphics.fillRect(30, 8, 4, 24);
    graphics.fillRect(38, 16, 4, 16);

    // Leaves
    graphics.fillStyle(0x3d6020, 1);
    graphics.fillCircle(20, 12, 6);
    graphics.fillCircle(32, 8, 8);
    graphics.fillCircle(40, 14, 6);

    graphics.generateTexture(key, 64, 64);
    graphics.destroy();
  }

  private createFountainTexture(key: string): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Base pool
    graphics.fillStyle(0x7a7a7a, 1);
    graphics.fillEllipse(32, 52, 28, 12);
    graphics.lineStyle(3, 0xa0a0a0, 0.7);
    graphics.strokeEllipse(32, 52, 24, 10);

    // Water in pool
    graphics.fillStyle(0x3a7a9f, 1);
    graphics.fillEllipse(32, 52, 20, 8);
    graphics.fillStyle(0x5a9abf, 0.5);
    graphics.fillEllipse(30, 50, 14, 6);

    // Center pedestal
    graphics.fillStyle(0x7a7a7a, 1);
    graphics.fillRect(28, 24, 8, 28);

    // Top basin
    graphics.fillStyle(0x9a9a9a, 1);
    graphics.fillEllipse(32, 24, 16, 8);
    graphics.fillStyle(0x4a8ab0, 0.8);
    graphics.fillEllipse(32, 24, 12, 6);

    // Water spout
    graphics.fillStyle(0x6090c0, 0.7);
    graphics.fillRect(30, 28, 4, 16);

    // Water drops
    graphics.fillStyle(0x80c0e0, 0.6);
    graphics.fillCircle(28, 40, 3);
    graphics.fillCircle(36, 36, 2);

    graphics.generateTexture(key, 64, 64);
    graphics.destroy();
  }

  private async generateCharacters(): Promise<void> {
    const charGenerator = new CharacterGenerator(this);

    // Generate player character
    charGenerator.generateCharacter({
      type: CharacterType.PLAYER,
      skinTone: SkinTone.LIGHT,
    });

    // Create legacy 'player' texture (single frame static sprite for compatibility)
    this.createLegacyPlayerSprite();

    // Generate NPC spritesheets
    const npcTypes = [
      { type: CharacterType.PORTUGUESE_MERCHANT, legacyKey: 'npc_portuguese' },
      { type: CharacterType.HINDU_TRADER, legacyKey: 'npc_hindu' },
      { type: CharacterType.ARAB_MIDDLEMAN, legacyKey: 'npc_arab' },
      { type: CharacterType.CROWN_OFFICIAL, legacyKey: 'npc_official' },
      { type: CharacterType.SAILOR, legacyKey: 'npc_sailor' },
      { type: CharacterType.FRANCISCAN_MONK, legacyKey: 'npc_monk' },
      { type: CharacterType.PORTUGUESE_SOLDIER, legacyKey: 'npc_soldier' },
      { type: CharacterType.DOCK_PORTER, legacyKey: 'npc_porter' },
    ];

    for (const npc of npcTypes) {
      charGenerator.generateCharacter({
        type: npc.type,
        skinTone: SkinTone.MEDIUM,
      });

      // Create legacy static sprite for backward compatibility
      this.createLegacyNPCSprite(npc.type, npc.legacyKey);
    }

    // Generate trade goods icons
    this.generateTradeGoodsIcons();

    await this.delay(50);
  }

  private createLegacyPlayerSprite(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Skin and cloth colors
    const skinColors = { highlight: 0xe8c8a0, base: 0xd4a574, shadow: 0xb08050, deep: 0x8a6040 };
    const clothColors = { highlight: 0x3a3a3a, base: 0x1a1a1a, shadow: 0x0a0a0a, deep: 0x000000 };

    // Ground shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(32, 92, 24, 8);

    // Doublet body
    graphics.fillStyle(clothColors.base, 1);
    graphics.fillRect(20, 36, 24, 32);

    // Gold trim
    graphics.fillStyle(0xffd700, 1);
    graphics.fillRect(20, 36, 2, 32);
    graphics.fillRect(42, 36, 2, 32);

    // White ruff collar
    graphics.fillStyle(0xf0f0f0, 1);
    graphics.fillRect(18, 32, 28, 6);

    // Head
    graphics.fillStyle(skinColors.base, 1);
    graphics.fillCircle(32, 22, 12);

    // Eyes
    graphics.fillStyle(skinColors.deep, 1);
    graphics.fillCircle(28, 22, 2);
    graphics.fillCircle(36, 22, 2);

    // Wide-brimmed hat
    graphics.fillStyle(clothColors.base, 1);
    graphics.fillRect(12, 10, 40, 6);
    graphics.fillRect(22, 4, 20, 10);
    graphics.fillStyle(0x4a3020, 1);
    graphics.fillRect(22, 12, 20, 2);

    // Cape
    graphics.fillStyle(0x3c2810, 1);
    graphics.fillRect(12, 40, 8, 24);
    graphics.fillRect(44, 40, 8, 24);

    // Arms
    graphics.fillStyle(clothColors.base, 1);
    graphics.fillRect(14, 38, 6, 20);
    graphics.fillRect(44, 38, 6, 20);

    // Hands
    graphics.fillStyle(skinColors.base, 1);
    graphics.fillCircle(17, 60, 4);
    graphics.fillCircle(47, 60, 4);

    // Legs
    graphics.fillStyle(clothColors.base, 1);
    graphics.fillRect(22, 68, 8, 20);
    graphics.fillRect(34, 68, 8, 20);

    // Shoes
    graphics.fillStyle(0x2c1810, 1);
    graphics.fillRect(20, 88, 10, 6);
    graphics.fillRect(34, 88, 10, 6);

    graphics.generateTexture('player', 64, 96);
    graphics.destroy();
  }

  private createLegacyNPCSprite(type: CharacterType, key: string): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Ground shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(32, 92, 20, 6);

    // Draw based on NPC type (simplified versions for legacy compatibility)
    switch (type) {
      case CharacterType.PORTUGUESE_MERCHANT:
        this.drawPortugueseMerchantLegacy(graphics);
        break;
      case CharacterType.HINDU_TRADER:
        this.drawHinduTraderLegacy(graphics);
        break;
      case CharacterType.ARAB_MIDDLEMAN:
        this.drawArabMiddlemanLegacy(graphics);
        break;
      case CharacterType.CROWN_OFFICIAL:
        this.drawCrownOfficialLegacy(graphics);
        break;
      case CharacterType.SAILOR:
        this.drawSailorLegacy(graphics);
        break;
      case CharacterType.FRANCISCAN_MONK:
        this.drawMonkLegacy(graphics);
        break;
      case CharacterType.PORTUGUESE_SOLDIER:
        this.drawSoldierLegacy(graphics);
        break;
      case CharacterType.DOCK_PORTER:
        this.drawPorterLegacy(graphics);
        break;
    }

    graphics.generateTexture(key, 64, 96);
    graphics.destroy();
  }

  private drawPortugueseMerchantLegacy(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x2c1810, 1);
    graphics.fillRect(20, 36, 24, 32);
    graphics.fillStyle(0xffd700, 1);
    graphics.fillRect(20, 36, 2, 32);
    graphics.fillRect(42, 36, 2, 32);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(20, 32, 24, 6);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(32, 22, 12);
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(12, 10, 40, 6);
    graphics.fillRect(22, 4, 20, 10);
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(22, 68, 8, 20);
    graphics.fillRect(34, 68, 8, 20);
    graphics.fillStyle(0x2c1810, 1);
    graphics.fillRect(20, 88, 10, 4);
    graphics.fillRect(34, 88, 10, 4);
  }

  private drawHinduTraderLegacy(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0xf5e6d3, 1);
    graphics.fillRect(16, 40, 32, 40);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillRect(20, 28, 24, 16);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(32, 20, 12);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(20, 4, 24, 16);
    graphics.fillStyle(0xc19a6b, 0.6);
    graphics.fillRect(20, 8, 24, 4);
    graphics.fillStyle(0xffd700, 1);
    graphics.fillRect(30, 28, 4, 4);
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(20, 84, 10, 4);
    graphics.fillRect(34, 84, 10, 4);
  }

  private drawArabMiddlemanLegacy(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x4a1c1c, 1);
    graphics.fillRect(16, 32, 32, 52);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(32, 20, 12);
    graphics.fillStyle(0x2c1810, 1);
    graphics.fillRect(26, 24, 12, 8);
    graphics.fillStyle(0xf5e6d3, 1);
    graphics.fillRect(16, 4, 32, 16);
    graphics.fillStyle(0x8b0000, 0.6);
    graphics.fillRect(16, 8, 32, 4);
    graphics.fillStyle(0x2c1810, 1);
    graphics.fillRect(20, 84, 10, 6);
    graphics.fillRect(34, 84, 10, 6);
  }

  private drawCrownOfficialLegacy(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x0a0a0a, 1);
    graphics.fillRect(16, 32, 32, 44);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(16, 28, 32, 8);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(32, 20, 12);
    graphics.fillStyle(0x0a0a0a, 1);
    graphics.fillRect(20, 4, 24, 16);
    graphics.fillStyle(0xffd700, 1);
    graphics.fillRect(24, 36, 16, 2);
    graphics.fillCircle(32, 40, 4);
    graphics.fillStyle(0x0a0a0a, 1);
    graphics.fillRect(22, 76, 8, 16);
    graphics.fillRect(34, 76, 8, 16);
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(20, 88, 10, 4);
    graphics.fillRect(34, 88, 10, 4);
  }

  private drawSailorLegacy(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x4a3728, 1);
    graphics.fillRect(20, 32, 24, 36);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(32, 20, 12);
    graphics.fillStyle(0x1e3a5f, 1);
    graphics.fillRect(20, 6, 24, 12);
    graphics.fillStyle(0x8b7355, 1);
    graphics.fillRect(20, 68, 10, 20);
    graphics.fillRect(34, 68, 10, 20);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillRect(22, 88, 8, 4);
    graphics.fillRect(36, 88, 8, 4);
  }

  private drawMonkLegacy(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x6b4423, 1);
    graphics.fillRect(16, 28, 32, 56);
    graphics.fillStyle(0x5b3413, 1);
    graphics.fillRect(20, 16, 24, 16);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(32, 24, 10);
    graphics.fillStyle(0xe0c0a0, 1);
    graphics.fillCircle(32, 16, 6);
    graphics.fillStyle(0xc19a6b, 1);
    graphics.fillRect(16, 52, 32, 4);
    graphics.fillRect(30, 56, 4, 12);
    graphics.fillStyle(0xffd700, 1);
    graphics.fillRect(30, 32, 4, 10);
    graphics.fillRect(28, 36, 8, 4);
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(20, 84, 10, 4);
    graphics.fillRect(34, 84, 10, 4);
  }

  private drawSoldierLegacy(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillRect(20, 32, 24, 36);
    graphics.fillStyle(0x8b0000, 1);
    graphics.fillRect(16, 52, 32, 6);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(32, 20, 10);
    graphics.fillStyle(0x3a3a3a, 1);
    graphics.fillRect(16, 6, 32, 12);
    graphics.fillRect(20, 0, 24, 8);
    graphics.fillStyle(0x8b0000, 1);
    graphics.fillRect(30, 0, 4, 10);
    graphics.fillStyle(0x6b4423, 1);
    graphics.fillRect(52, 8, 4, 80);
    graphics.fillStyle(0x6a6a6a, 1);
    graphics.fillRect(48, 4, 12, 8);
    graphics.fillStyle(0x2a2a2a, 1);
    graphics.fillRect(22, 68, 8, 20);
    graphics.fillRect(34, 68, 8, 20);
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(20, 84, 10, 8);
    graphics.fillRect(34, 84, 10, 8);
  }

  private drawPorterLegacy(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0xc19a6b, 1);
    graphics.fillRect(20, 40, 24, 36);
    graphics.fillStyle(0xc09060, 1);
    graphics.fillRect(20, 24, 24, 20);
    graphics.fillStyle(0xc09060, 1);
    graphics.fillCircle(32, 16, 10);
    graphics.fillStyle(0xf5e6d3, 1);
    graphics.fillRect(20, 4, 24, 10);
    graphics.fillStyle(0x8b7355, 1);
    graphics.fillCircle(16, 32, 16);
    graphics.fillCircle(48, 32, 12);
    graphics.lineStyle(3, 0xa08050, 1);
    graphics.lineBetween(16, 20, 48, 20);
    graphics.fillStyle(0xc09060, 1);
    graphics.fillRect(22, 76, 8, 12);
    graphics.fillRect(34, 76, 8, 12);
    graphics.fillRect(20, 88, 10, 4);
    graphics.fillRect(34, 88, 10, 4);
  }

  private generateTradeGoodsIcons(): void {
    // Generate trade goods icons using the UIGenerator approach
    this.createGoodIcon('good_pepper', 0x2c1810, 'pepper');
    this.createGoodIcon('good_cinnamon', 0x8b4513, 'cinnamon');
    this.createGoodIcon('good_cloves', 0x4a1c1c, 'cloves');
    this.createGoodIcon('good_silk', 0xc19a6b, 'silk');
    this.createGoodIcon('good_porcelain', 0xf5e6d3, 'porcelain');
    this.createGoodIcon('good_nutmeg', 0x8b4513, 'nutmeg');
    this.createGoodIcon('good_ginger', 0xd4a574, 'ginger');
    this.createGoodIcon('good_indigo', 0x1e3a5f, 'indigo');
  }

  private createGoodIcon(key: string, color: number, type: string): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    switch (type) {
      case 'pepper':
        graphics.fillStyle(color, 1);
        graphics.fillCircle(12, 12, 10);
        graphics.fillStyle(0x0a0a0a, 1);
        graphics.fillCircle(8, 8, 2);
        graphics.fillCircle(14, 7, 2);
        graphics.fillCircle(10, 13, 2);
        graphics.fillCircle(16, 12, 2);
        graphics.lineStyle(2, 0x0a0a0a, 1);
        graphics.strokeCircle(12, 12, 10);
        break;
      case 'cinnamon':
        graphics.fillStyle(color, 1);
        graphics.fillRect(4, 8, 16, 8);
        graphics.fillStyle(0x6b3503, 1);
        graphics.fillRect(4, 10, 16, 2);
        graphics.fillRect(4, 14, 16, 2);
        graphics.fillStyle(0xa0522d, 1);
        graphics.fillCircle(4, 12, 4);
        graphics.fillCircle(20, 12, 4);
        break;
      case 'cloves':
        graphics.fillStyle(color, 1);
        graphics.fillCircle(12, 14, 6);
        graphics.fillRect(11, 4, 2, 10);
        graphics.lineStyle(1, 0x2c1810, 1);
        graphics.strokeCircle(12, 14, 6);
        break;
      case 'silk':
        graphics.fillStyle(color, 1);
        graphics.fillRect(4, 6, 16, 12);
        graphics.fillStyle(0xffd700, 0.3);
        graphics.fillRect(8, 8, 8, 8);
        graphics.lineStyle(2, 0x2c1810, 1);
        graphics.strokeRect(4, 6, 16, 12);
        break;
      case 'porcelain':
        graphics.fillStyle(color, 1);
        graphics.fillCircle(12, 14, 8);
        graphics.fillRect(10, 4, 4, 6);
        graphics.fillStyle(0x1e3a5f, 0.6);
        graphics.fillCircle(12, 14, 4);
        graphics.lineStyle(1, 0x2c1810, 1);
        graphics.strokeCircle(12, 14, 8);
        break;
      case 'nutmeg':
        graphics.fillStyle(color, 1);
        graphics.fillEllipse(12, 12, 14, 10);
        graphics.fillStyle(0xff6633, 0.6);
        graphics.fillRect(6, 10, 12, 4);
        graphics.lineStyle(1, 0x2c1810, 1);
        graphics.strokeEllipse(12, 12, 14, 10);
        break;
      case 'ginger':
        graphics.fillStyle(color, 1);
        graphics.fillCircle(10, 12, 6);
        graphics.fillCircle(16, 10, 5);
        graphics.fillCircle(14, 16, 4);
        graphics.lineStyle(1, 0x8b4513, 0.5);
        graphics.strokeCircle(10, 12, 6);
        break;
      case 'indigo':
        graphics.fillStyle(color, 1);
        graphics.fillRect(4, 6, 16, 12);
        graphics.fillStyle(0x0a1a3f, 0.5);
        graphics.fillRect(6, 8, 12, 8);
        graphics.lineStyle(2, 0x0a0a2f, 1);
        graphics.strokeRect(4, 6, 16, 12);
        break;
    }

    graphics.generateTexture(key, 24, 24);
    graphics.destroy();
  }

  private async generateBuildings(): Promise<void> {
    const buildingGenerator = new BuildingGenerator(this);

    // Generate all building types
    const buildingTypes: BuildingType[] = [
      'marketStall',
      'merchantHouse',
      'customsHouse',
      'warehouse',
      'tavern',
      'cathedral',
      'chapel',
      'hinduShrine',
      'portugueseTownhouse',
      'localDwelling',
      'arabMerchantHouse',
    ];

    for (const type of buildingTypes) {
      if (type === 'marketStall') {
        // Generate market stall variants
        const variants: MarketStallVariant[] = ['spice', 'cloth', 'pottery', 'food'];
        for (const variant of variants) {
          buildingGenerator.generateBuilding({ type, variant, state: 'day' });
        }
      } else {
        buildingGenerator.generateBuilding({ type, state: 'day' });
      }
    }

    await this.delay(50);
  }

  private async generateUIElements(): Promise<void> {
    const uiGenerator = new UIGenerator(this);

    // Generate all standard UI textures
    uiGenerator.generateAllTextures();

    await this.delay(50);
  }

  private async generateEffectsAndLegacy(): Promise<void> {
    // Generate any additional effect textures or legacy compatibility textures
    // that weren't covered by the generators

    // Weather effects, particle textures, etc. can be added here
    this.generateEffectTextures();

    await this.delay(50);
  }

  private generateEffectTextures(): void {
    // Rain drop
    const rainGraphics = this.make.graphics({ x: 0, y: 0 });
    rainGraphics.fillStyle(0x80c0e0, 0.6);
    rainGraphics.fillRect(0, 0, 2, 8);
    rainGraphics.generateTexture('effect_raindrop', 2, 8);
    rainGraphics.destroy();

    // Dust particle
    const dustGraphics = this.make.graphics({ x: 0, y: 0 });
    dustGraphics.fillStyle(0xd4a574, 0.4);
    dustGraphics.fillCircle(2, 2, 2);
    dustGraphics.generateTexture('effect_dust', 4, 4);
    dustGraphics.destroy();

    // Sparkle/gold coin glint
    const sparkleGraphics = this.make.graphics({ x: 0, y: 0 });
    sparkleGraphics.fillStyle(0xffd700, 0.8);
    sparkleGraphics.fillCircle(4, 4, 2);
    sparkleGraphics.fillStyle(0xffffff, 0.6);
    sparkleGraphics.fillCircle(3, 3, 1);
    sparkleGraphics.generateTexture('effect_sparkle', 8, 8);
    sparkleGraphics.destroy();

    // Smoke/fog
    const smokeGraphics = this.make.graphics({ x: 0, y: 0 });
    smokeGraphics.fillStyle(0x808080, 0.3);
    smokeGraphics.fillCircle(8, 8, 8);
    smokeGraphics.fillStyle(0xa0a0a0, 0.2);
    smokeGraphics.fillCircle(6, 6, 6);
    smokeGraphics.generateTexture('effect_smoke', 16, 16);
    smokeGraphics.destroy();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
