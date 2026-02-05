# Sprite Assets

This folder contains all pixel art sprite assets for the Goa 1590 trading game. All sprites follow the isometric style and historically-accurate design principles documented in `tools/art-generator/`.

---

## Folder Structure

```
sprites/
├── characters/     # Player and NPC sprites
├── tiles/          # Ground, water, and transition tiles
├── ui/             # Interface elements, buttons, icons
└── effects/        # Weather, particles, lighting
```

---

## Quick Reference

| Asset Type | Dimensions | Location |
|------------|------------|----------|
| Isometric tile | 32×16 px | `tiles/` |
| Character sprite | 32×48 px | `characters/` |
| Building (small) | 64×32 px | `tiles/buildings/` |
| Building (large) | 128×96 px | `tiles/buildings/` |
| UI icon | 16×16 or 24×24 px | `ui/icons/` |
| Effect particle | varies | `effects/` |

---

## Adding New Assets

### 1. Generate or Create the Asset

**Option A: AI Generation**
1. Open `tools/art-generator/prompts.md`
2. Find the appropriate prompt template for your asset type
3. Customize the prompt for your specific asset
4. Generate using your preferred AI image tool
5. Clean up in a pixel editor (Aseprite, Piskel, or similar)

**Option B: Manual Creation**
1. Review `tools/art-generator/asset-specs.md` for exact dimensions
2. Create in your pixel editor using the defined color palette
3. Follow the isometric 2:1 ratio for tiles/buildings

### 2. Verify the Asset

Before adding to the repository:

- [ ] **Dimensions:** Match the specs in `asset-specs.md`
- [ ] **Palette:** Uses only colors from the approved palette:
  - `#2C1810` Dark wood
  - `#8B4513` Terracotta
  - `#D4A574` Ochre/sand
  - `#F5E6D3` Whitewash
  - `#1E3A5F` Portuguese blue
  - `#2D5016` Tropical green
  - `#4A1C1C` Pepper/spice
  - `#C19A6B` Hemp/fiber
- [ ] **Format:** PNG with transparency
- [ ] **Outline:** 1px dark outline (`#2C1810`)
- [ ] **No anti-aliasing:** Clean pixel edges only

### 3. Name the File

Follow the naming convention:
```
[category]-[subcategory]-[descriptor]-[variant].png
```

Examples:
- `merchant-portuguese-factor.png`
- `tile-ground-cobble-worn-02.png`
- `bldg-warehouse-large-active.png`

See `asset-specs.md` for complete naming rules.

### 4. Place in Correct Folder

| Asset Type | Folder |
|------------|--------|
| Player sprites | `characters/player/` |
| NPC sprites | `characters/npcs/` |
| Ground tiles | `tiles/ground/` |
| Water tiles | `tiles/water/` |
| Buildings | `tiles/buildings/` |
| UI panels | `ui/panels/` |
| UI buttons | `ui/buttons/` |
| Icons | `ui/icons/` |
| Weather effects | `effects/weather/` |
| Particles | `effects/particles/` |

### 5. Update the Atlas (if applicable)

For game-ready assets:
1. Add to the appropriate TexturePacker project
2. Regenerate the atlas PNG and JSON
3. Update any references in game code

---

## Spritesheets

### Character Spritesheet Format

All character sprites use a consistent spritesheet layout:

```
┌────────────────────────────────────────┐
│ South: idle1 idle2 walk1-6             │  Row 0
├────────────────────────────────────────┤
│ West:  idle1 idle2 walk1-6             │  Row 1
├────────────────────────────────────────┤
│ East:  idle1 idle2 walk1-6             │  Row 2
├────────────────────────────────────────┤
│ North: idle1 idle2 walk1-6             │  Row 3
└────────────────────────────────────────┘
  8 frames × 4 directions = 32 total frames
  Spritesheet size: 256×192 px
```

### Animation Frame Counts

| Animation | Frames | Notes |
|-----------|--------|-------|
| Idle | 2 | Subtle breathing motion |
| Walk | 6 | Full step cycle |
| Water (tile) | 4 | Wave animation |
| Rain | 3-4 | Fall + splash |
| Smoke | 8 | Rise + dissipate |

---

## Historical Accuracy

All sprites should be historically authentic to 1590s Goa. Reference materials:

1. **Linschoten's Itinerario** (1595-96) - Market scenes, Portuguese dress
2. **Códice Casanatense** (~1540) - Indian costumes, daily life

See `assets/reference/SOURCES.md` for detailed source information and download links.

**Key Historical Details:**
- Portuguese wore dark, conservative clothing (doublets, hose, capes)
- Indian merchants often barefoot; traders in white cotton
- Women's dress varies significantly by ethnicity and caste
- Parasols common for shade—a sign of status
- Buildings: whitewashed walls, terracotta roofs, wooden balconies

---

## Tools & Resources

### Recommended Editors
- **Aseprite** - Professional pixel art editor (paid)
- **Piskel** - Free browser-based editor
- **GraphicsGale** - Free Windows editor

### Palette Files
The game palette is available in multiple formats:
- `tools/art-generator/palette.gpl` (GIMP)
- `tools/art-generator/palette.ase` (Aseprite)
- `tools/art-generator/palette.png` (Visual reference)

### Documentation
- `tools/art-generator/prompts.md` - AI prompt templates
- `tools/art-generator/asset-specs.md` - Technical specifications
- `assets/reference/SOURCES.md` - Historical references

---

## Current Asset Status

### Completed
- [ ] Ground tiles (basic set)
- [ ] Player character
- [ ] Core UI panels

### In Progress
- [ ] NPC character set
- [ ] Building sprites

### Planned
- [ ] Weather effects
- [ ] Trade goods icons
- [ ] Animated decorations

---

## Contact

For questions about art direction or asset specifications, refer to the design documentation or discuss in the project's art channel.
