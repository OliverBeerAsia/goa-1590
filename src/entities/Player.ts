import Phaser from 'phaser';

/**
 * Player - The player character representing a trader in 16th century Goa
 * Handles movement, animation, and interaction with the game world
 */
export class Player extends Phaser.GameObjects.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private speed = 100;
  private tileX = 0;
  private tileY = 0;
  private isMoving = false;
  private direction: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right' = 'down';
  private animationsCreated = false;

  // Inventory and resources
  private gold = 100;
  private inventory: { item: string; quantity: number }[] = [];
  private maxCarryCapacity = 20;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set up physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(16, 8);
    body.setOffset(8, 40);

    // Set up input
    this.setupInput();
  }

  private setupInput(): void {
    // Cursor keys
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    
    // WASD keys
    this.wasd = {
      W: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(_time: number, _delta: number): void {
    this.handleMovement();
    this.updateAnimation();
  }

  /**
   * Create character animations from spritesheet if available
   */
  private createAnimations(): void {
    if (this.animationsCreated) return;

    // Check if the animated spritesheet exists
    const textureKey = 'char_player_light_0';
    if (!this.scene.textures.exists(textureKey)) {
      // Fallback to static sprite - animations not available
      return;
    }

    // Animation frame data for 4-direction walk cycle
    // The CharacterGenerator creates a 256x192 spritesheet with 32x48 frames
    // Layout: 8 columns (walk frames) x 4 rows (directions: south, west, east, north)
    const directions = ['south', 'west', 'east', 'north'];

    directions.forEach((dir, rowIndex) => {
      // Walk animation (frames 0-7)
      const walkKey = `player_walk_${dir}`;
      if (!this.scene.anims.exists(walkKey)) {
        this.scene.anims.create({
          key: walkKey,
          frames: this.scene.anims.generateFrameNumbers(textureKey, {
            start: rowIndex * 8,
            end: rowIndex * 8 + 7,
          }),
          frameRate: 10,
          repeat: -1,
        });
      }

      // Idle animation (single frame - first frame of walk)
      const idleKey = `player_idle_${dir}`;
      if (!this.scene.anims.exists(idleKey)) {
        this.scene.anims.create({
          key: idleKey,
          frames: [{ key: textureKey, frame: rowIndex * 8 }],
          frameRate: 1,
          repeat: 0,
        });
      }
    });

    this.animationsCreated = true;
  }

  /**
   * Update character animation based on movement state and direction
   */
  private updateAnimation(): void {
    // Ensure animations are created
    this.createAnimations();

    if (!this.animationsCreated) {
      // No animated spritesheet available, use static texture
      return;
    }

    // Map 8 directions to 4 animation directions
    const animDir = this.getAnimationDirection();
    const animKey = this.isMoving ? `player_walk_${animDir}` : `player_idle_${animDir}`;

    // Only change animation if different from current
    if (this.anims.currentAnim?.key !== animKey) {
      this.play(animKey, true);
    }
  }

  /**
   * Map 8-directional movement to 4-directional animation
   */
  private getAnimationDirection(): 'north' | 'south' | 'east' | 'west' {
    switch (this.direction) {
      case 'up':
      case 'up-left':
      case 'up-right':
        return 'north';
      case 'down':
      case 'down-left':
      case 'down-right':
        return 'south';
      case 'left':
        return 'west';
      case 'right':
        return 'east';
      default:
        return 'south';
    }
  }

  private handleMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Reset velocity
    body.setVelocity(0);

    // Check input for 8-directional movement
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;

    // Isometric movement requires diagonal screen movement
    // for cardinal tile directions
    let velocityX = 0;
    let velocityY = 0;

    if (up && left) {
      // Move up-left in isometric (straight left on screen)
      velocityX = -this.speed;
      this.direction = 'up-left';
    } else if (up && right) {
      // Move up-right in isometric (straight up on screen)
      velocityY = -this.speed;
      this.direction = 'up-right';
    } else if (down && left) {
      // Move down-left in isometric (straight down on screen)
      velocityY = this.speed;
      this.direction = 'down-left';
    } else if (down && right) {
      // Move down-right in isometric (straight right on screen)
      velocityX = this.speed;
      this.direction = 'down-right';
    } else if (up) {
      // Move up in isometric (up-left on screen)
      velocityX = -this.speed * 0.707;
      velocityY = -this.speed * 0.707;
      this.direction = 'up';
    } else if (down) {
      // Move down in isometric (down-right on screen)
      velocityX = this.speed * 0.707;
      velocityY = this.speed * 0.707;
      this.direction = 'down';
    } else if (left) {
      // Move left in isometric (down-left on screen)
      velocityX = -this.speed * 0.707;
      velocityY = this.speed * 0.707;
      this.direction = 'left';
    } else if (right) {
      // Move right in isometric (up-right on screen)
      velocityX = this.speed * 0.707;
      velocityY = -this.speed * 0.707;
      this.direction = 'right';
    }

    body.setVelocity(velocityX, velocityY);
    this.isMoving = velocityX !== 0 || velocityY !== 0;

    // Update tile position based on current screen position
    this.updateTilePosition();
  }

  private updateTilePosition(): void {
    // Convert screen position to tile position
    // Uses 2x scale tile dimensions for Ultima 8 style
    const tileWidth = 64;
    const tileHeight = 32;
    const centerX = this.scene.cameras.main.width / 2;
    
    const adjustedX = this.x - centerX;
    const adjustedY = this.y - 100;
    
    const newTileX = Math.floor((adjustedX / (tileWidth / 2) + adjustedY / (tileHeight / 2)) / 2);
    const newTileY = Math.floor((adjustedY / (tileHeight / 2) - adjustedX / (tileWidth / 2)) / 2);
    
    this.tileX = newTileX;
    this.tileY = newTileY;
  }

  public setTilePosition(x: number, y: number): void {
    this.tileX = x;
    this.tileY = y;
  }

  public getTilePosition(): { x: number; y: number } {
    return { x: this.tileX, y: this.tileY };
  }

  public getDirection(): string {
    return this.direction;
  }

  public isPlayerMoving(): boolean {
    return this.isMoving;
  }

  // Inventory management
  public getGold(): number {
    return this.gold;
  }

  public addGold(amount: number): void {
    this.gold += amount;
    this.scene.events.emit('goldChange', this.gold);
  }

  public removeGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.scene.events.emit('goldChange', this.gold);
      return true;
    }
    return false;
  }

  public getInventory(): { item: string; quantity: number }[] {
    return [...this.inventory];
  }

  public addToInventory(item: string, quantity: number = 1): boolean {
    const currentTotal = this.inventory.reduce((sum, i) => sum + i.quantity, 0);
    if (currentTotal + quantity > this.maxCarryCapacity) {
      return false; // Inventory full
    }

    const existingItem = this.inventory.find(i => i.item === item);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.inventory.push({ item, quantity });
    }
    
    this.scene.events.emit('inventoryChange', this.getInventory());
    return true;
  }

  public removeFromInventory(item: string, quantity: number = 1): boolean {
    const existingItem = this.inventory.find(i => i.item === item);
    if (!existingItem || existingItem.quantity < quantity) {
      return false;
    }

    existingItem.quantity -= quantity;
    if (existingItem.quantity <= 0) {
      this.inventory = this.inventory.filter(i => i.item !== item);
    }

    this.scene.events.emit('inventoryChange', this.getInventory());
    return true;
  }

  public getCarryCapacity(): { current: number; max: number } {
    const current = this.inventory.reduce((sum, item) => sum + item.quantity, 0);
    return { current, max: this.maxCarryCapacity };
  }
}
