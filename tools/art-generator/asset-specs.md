# Asset Specifications

Technical specifications for all pixel art assets in the Goa 1590 game. This document defines exact dimensions, animation frame counts, file naming conventions, and generation methods.

---

## Tile Assets

### Base Tiles (Isometric)

| Asset Type | Dimensions | Frames | Format |
|------------|------------|--------|--------|
| Ground tile | 32×16 px | 1 | PNG |
| Ground tile (animated) | 32×16 px | 4 | Spritesheet |
| Transition tile | 32×16 px | 1 | PNG |
| Water tile | 32×16 px | 4 | Spritesheet |

**Isometric Ratio:** 2:1 (32 width : 16 height)

**Grid System:**
- Each tile occupies 32×16 pixels in isometric view
- World grid uses 32×32 logical tiles, rendered isometrically
- Z-height increment: 8 pixels per level

### Tile Categories

```
tiles/
├── ground/          # Walkable surfaces
│   ├── cobble-*.png
│   ├── dirt-*.png
│   ├── sand-*.png
│   └── grass-*.png
├── water/           # Water tiles (animated)
│   ├── river-*.png
│   └── harbor-*.png
├── transitions/     # Edge/corner pieces
│   └── [from]-to-[to]-[position].png
└── decorative/      # Non-walkable overlays
    ├── debris-*.png
    └── puddle-*.png
```

---

## Character Sprites

### Player Character

| Aspect | Specification |
|--------|---------------|
| Dimensions | 32×48 px |
| Directions | 4 (N, E, S, W) |
| Idle frames | 2 per direction |
| Walk frames | 6 per direction |
| Total frames | 32 |
| Spritesheet | 256×192 px (8 cols × 4 rows) |

**Spritesheet Layout:**
```
Row 0: South (idle1, idle2, walk1, walk2, walk3, walk4, walk5, walk6)
Row 1: West  (idle1, idle2, walk1, walk2, walk3, walk4, walk5, walk6)
Row 2: East  (idle1, idle2, walk1, walk2, walk3, walk4, walk5, walk6)
Row 3: North (idle1, idle2, walk1, walk2, walk3, walk4, walk5, walk6)
```

### NPCs

| NPC Type | Dimensions | Directions | Frames/Dir | Total |
|----------|------------|------------|------------|-------|
| Standard NPC | 32×48 px | 4 | 8 | 32 |
| Stationary NPC | 32×48 px | 1 | 2 | 2 |
| Large NPC (ox, cart) | 64×48 px | 4 | 8 | 32 |

### Character Categories

```
characters/
├── player/
│   └── player-[outfit].png
├── merchants/
│   ├── portuguese-merchant.png
│   ├── banyan-merchant.png
│   ├── arab-trader.png
│   └── chinese-trader.png
├── locals/
│   ├── fish-seller.png
│   ├── water-carrier.png
│   ├── parasol-bearer.png
│   └── dock-worker.png
├── officials/
│   ├── portuguese-soldier.png
│   ├── customs-officer.png
│   └── priest.png
└── special/
    ├── ox-cart.png
    └── palanquin.png
```

---

## Building Sprites

### Size Categories

| Category | Footprint | Pixel Size | Examples |
|----------|-----------|------------|----------|
| Small | 2×1 tiles | 64×32 px | Stalls, wells |
| Medium | 2×2 tiles | 64×64 px | Houses, shops |
| Large | 3×2 tiles | 96×64 px | Merchant houses |
| X-Large | 4×3 tiles | 128×96 px | Churches, warehouses |
| Landmark | 6×4 tiles | 192×128 px | Cathedral, palace |

### Building States

Buildings may have multiple states:
- **Default:** Standard appearance
- **Active:** Showing commerce activity (open door, customers)
- **Night:** Lit windows, lanterns
- **Closed:** Shuttered, no activity

| State | Suffix | Frames |
|-------|--------|--------|
| Default | (none) | 1 |
| Active | `-active` | 2-4 |
| Night | `-night` | 1-2 |
| Closed | `-closed` | 1 |

### Building Categories

```
buildings/
├── residential/
│   ├── house-small-*.png
│   ├── house-medium-*.png
│   └── mansion-*.png
├── commercial/
│   ├── market-stall-*.png
│   ├── shop-*.png
│   └── warehouse-*.png
├── religious/
│   ├── chapel-*.png
│   ├── church-*.png
│   └── temple-*.png
├── civic/
│   ├── customs-house.png
│   ├── town-hall.png
│   └── prison.png
└── port/
    ├── dock-*.png
    ├── crane.png
    └── lighthouse.png
```

---

## UI Elements

### Panels & Frames

| Element | Dimensions | Variants |
|---------|------------|----------|
| Main trade panel | 256×192 px | 1 |
| Inventory panel | 192×256 px | 1 |
| Dialogue box | 288×80 px | 1 |
| Tooltip | 128×48 px | 1 |
| Mini-map frame | 128×128 px | 1 |

### Buttons

| Element | Dimensions | States |
|---------|------------|--------|
| Large button | 64×24 px | 3 (normal, hover, pressed) |
| Medium button | 48×16 px | 3 |
| Small button | 32×16 px | 3 |
| Icon button | 24×24 px | 3 |

### Icons

| Category | Dimensions | Count |
|----------|------------|-------|
| Trade goods | 24×24 px | ~30 |
| Currency | 16×16 px | 3 |
| Status effects | 16×16 px | ~10 |
| Action icons | 16×16 px | ~12 |
| Map markers | 12×12 px | ~8 |

### UI File Structure

```
ui/
├── panels/
│   ├── trade-panel.png
│   ├── inventory-panel.png
│   └── dialogue-box.png
├── buttons/
│   ├── btn-large.png       # Spritesheet: 3 states
│   ├── btn-medium.png
│   └── btn-small.png
├── icons/
│   ├── goods/
│   │   ├── pepper.png
│   │   ├── silk.png
│   │   └── ...
│   ├── currency/
│   │   ├── xerafim.png
│   │   ├── cruzado.png
│   │   └── real.png
│   └── status/
│       ├── hunger.png
│       └── reputation.png
└── fonts/
    └── goa-pixel-8px.png   # Bitmap font
```

---

## Effect Sprites

### Particles

| Effect | Dimensions | Frames | Loop |
|--------|------------|--------|------|
| Rain drop | 8×16 px | 3 | Yes |
| Rain splash | 16×8 px | 4 | No |
| Dust mote | 16×16 px | 4 | Yes |
| Smoke wisp | 16×32 px | 8 | Yes |
| Spark | 8×8 px | 4 | No |

### Overlays

| Effect | Dimensions | Frames | Usage |
|--------|------------|--------|-------|
| Light rain | 64×64 px tile | 4 | Screen overlay |
| Heavy rain | 64×64 px tile | 4 | Screen overlay |
| Heat shimmer | 32×32 px | 4 | Ground overlay |
| Fog | 64×64 px tile | 2 | Screen overlay |

### Effect File Structure

```
effects/
├── particles/
│   ├── rain-drop.png
│   ├── rain-splash.png
│   ├── dust.png
│   └── smoke.png
├── overlays/
│   ├── rain-light.png
│   ├── rain-heavy.png
│   └── heat-shimmer.png
└── lighting/
    ├── shadow-small.png
    ├── shadow-medium.png
    └── lantern-glow.png
```

---

## File Naming Conventions

### General Rules

1. Use lowercase with hyphens: `portuguese-merchant.png`
2. No spaces or underscores in filenames
3. Always include file extension: `.png`
4. Spritesheets use same name as single assets

### Naming Patterns

```
[category]-[subcategory]-[descriptor]-[variant].[ext]

Examples:
tile-ground-cobble-worn.png
char-merchant-portuguese.png
bldg-shop-spice-active.png
ui-btn-large-pressed.png
fx-rain-drop.png
```

### Variant Suffixes

| Suffix | Meaning |
|--------|---------|
| `-01`, `-02` | Numbered variants |
| `-n`, `-e`, `-s`, `-w` | Directional |
| `-active`, `-idle` | State |
| `-day`, `-night` | Time of day |
| `-damaged`, `-pristine` | Condition |

---

## Generation Methods

### AI Generation (Nano Banana / Image Gen)

Best suited for:
- Character sprites (complex, varied designs)
- Building facades (architectural detail)
- Unique landmark structures
- Trade goods icons
- UI panel decorative elements

**Workflow:**
1. Use prompt templates from `prompts.md`
2. Generate at 2× size for detail, then downscale
3. Manual cleanup in pixel editor (Aseprite/Piskel)
4. Verify palette compliance
5. Export as indexed PNG

### Procedural Generation

Best suited for:
- Ground tile variations
- Transition tiles (generated from base tiles)
- Water animations (shader-based or tiled)
- Particle effects
- Shadow sprites

**Implementation:**
- Use `tools/tile-generator.ts` for tile variations
- Perlin noise for natural variation
- Color shifting within palette for variants
- Programmatic animation frame generation

### Manual Creation

Required for:
- Bitmap fonts
- Precise UI element alignment
- Animation frame cleanup
- Palette-critical assets
- Final polish on all assets

---

## Export Requirements

### File Format

- **Format:** PNG-8 (indexed color) or PNG-24 with transparency
- **Compression:** Maximum (lossless)
- **Color profile:** sRGB
- **Transparency:** Index 0 or alpha channel

### Spritesheet Packing

- Use TexturePacker or similar for final atlases
- Maintain 1px padding between sprites
- Power-of-two dimensions preferred (256, 512, 1024)
- Generate JSON metadata for Phaser

### Quality Validation

Before committing any asset:
- [ ] Dimensions match specification
- [ ] Colors within defined palette (±5% tolerance for anti-aliasing)
- [ ] No stray pixels outside sprite bounds
- [ ] Consistent outline weight (1px)
- [ ] Animation loops smoothly
- [ ] Transparent background (no matte color)
- [ ] File size reasonable (<50KB per sprite)
