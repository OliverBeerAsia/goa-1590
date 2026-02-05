import Phaser from 'phaser';

/**
 * TradePost - A location where trading can occur
 * Represents market stalls, warehouses, and trading houses in 16th century Goa
 */
export class TradePost extends Phaser.GameObjects.Container {
  private postName: string;
  private tileX = 0;
  private tileY = 0;
  private goods: Map<string, { quantity: number; basePrice: number }> = new Map();
  private stallSprite!: Phaser.GameObjects.Sprite;
  private nameLabel!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    initialGoods?: { item: string; quantity: number; basePrice: number }[]
  ) {
    super(scene, x, y);
    
    this.postName = name;
    scene.add.existing(this);

    // Initialize goods
    if (initialGoods) {
      for (const good of initialGoods) {
        this.goods.set(good.item, {
          quantity: good.quantity,
          basePrice: good.basePrice,
        });
      }
    }

    this.createVisuals();
  }

  private createVisuals(): void {
    // Create stall visual using market tile
    this.stallSprite = this.scene.add.sprite(0, 0, 'tile_market');
    this.stallSprite.setScale(1.5);
    this.add(this.stallSprite);

    // Create name label
    this.nameLabel = this.scene.add.text(0, -30, this.postName, {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#C19A6B',
      backgroundColor: '#2C1810',
      padding: { x: 3, y: 1 },
    });
    this.nameLabel.setOrigin(0.5, 0.5);
    this.add(this.nameLabel);

    // Add goods display
    this.updateGoodsDisplay();
  }

  private updateGoodsDisplay(): void {
    // Remove old goods icons if any
    this.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData && child.getData('isGoodIcon')) {
        child.destroy();
      }
    });

    // Display small icons for available goods
    let offsetX = -15;
    this.goods.forEach((data, item) => {
      if (data.quantity > 0) {
        const icon = this.scene.add.sprite(offsetX, 10, item);
        icon.setScale(0.5);
        icon.setData('isGoodIcon', true);
        this.add(icon);
        offsetX += 15;
      }
    });
  }

  public setTilePosition(x: number, y: number): void {
    this.tileX = x;
    this.tileY = y;
  }

  public getTilePosition(): { x: number; y: number } {
    return { x: this.tileX, y: this.tileY };
  }

  public getName(): string {
    return this.postName;
  }

  public getGoods(): Map<string, { quantity: number; basePrice: number }> {
    return new Map(this.goods);
  }

  public getGoodPrice(item: string, isBuying: boolean): number {
    const good = this.goods.get(item);
    if (!good) return 0;

    // Price fluctuation based on supply
    // Low supply = higher price, high supply = lower price
    const supplyFactor = Math.max(0.5, Math.min(2, 10 / (good.quantity + 1)));
    let price = Math.floor(good.basePrice * supplyFactor);

    // Selling to the post gives less gold
    if (!isBuying) {
      price = Math.floor(price * 0.8);
    }

    return price;
  }

  public buyGood(item: string): { success: boolean; price: number } {
    const good = this.goods.get(item);
    if (!good || good.quantity <= 0) {
      return { success: false, price: 0 };
    }

    const price = this.getGoodPrice(item, true);
    good.quantity--;
    this.updateGoodsDisplay();

    return { success: true, price };
  }

  public sellGood(item: string): { success: boolean; price: number } {
    const good = this.goods.get(item);
    const price = this.getGoodPrice(item, false);

    if (good) {
      good.quantity++;
    } else {
      // Create new entry for this good
      this.goods.set(item, {
        quantity: 1,
        basePrice: price,
      });
    }

    this.updateGoodsDisplay();
    return { success: true, price };
  }

  public addStock(item: string, quantity: number, basePrice: number): void {
    const existing = this.goods.get(item);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.goods.set(item, { quantity, basePrice });
    }
    this.updateGoodsDisplay();
  }

  public hasGood(item: string): boolean {
    const good = this.goods.get(item);
    return good !== undefined && good.quantity > 0;
  }

  public getStockLevel(item: string): number {
    const good = this.goods.get(item);
    return good ? good.quantity : 0;
  }
}
