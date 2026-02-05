# Pixel Art Prompt Templates for Goa 1590

This document contains prompt templates for generating historically-accurate pixel art assets for the Goa 1590 trading game. All prompts should produce art consistent with the 16th century Portuguese India setting.

---

## Historical Context

### Setting: Goa, 1590

The game is set in **Goa during the late 16th century**, at the height of Portuguese colonial presence in India. Goa (officially "Estado da Índia") served as the capital of the Portuguese Eastern Empire, a bustling entrepôt where spices, textiles, gemstones, and goods from across Asia, Africa, and Europe converged.

**Key Visual Elements:**
- Whitewashed Portuguese-style buildings with red terracotta roofs
- Tropical vegetation interspersed with European architecture
- Diverse population: Portuguese merchants, Indian traders, African slaves, Arab sailors, Chinese traders
- Open-air markets with awnings and parasols
- Churches and convents with Renaissance/Manueline architecture
- Ox-carts, palanquins, and river boats

### Primary Historical Sources

All pixel art should reference these authenticated visual sources:

#### 1. Jan Huyghen van Linschoten's *Itinerario* (1595-96)
Linschoten lived in Goa from 1583-1588 as secretary to the Archbishop. His published work contains 36 detailed engravings of Goan life by engraver Johannes van Doetecum.

**Key Reference:** "Rua Direita na Cidade de Goa" - Shows the main commercial street with:
- Market stalls with fabric awnings
- Parasol-bearers providing shade
- Social hierarchy visible in dress
- Mixed crowds of various ethnicities

**Historical Detail:** The market operated only 7-9 AM due to intense afternoon heat.

#### 2. Códice Casanatense (~1540)
A 76-page watercolor album painted by an Indian artist for a Portuguese patron. Many scenes bear the inscription "tirado polo natural" (taken from life).

**Coverage Includes:**
- Costumes from East Africa, Arabia, Persia, India, Ceylon, Malaysia, China
- Period arms and garments
- Daily activities: farming, dining, bathing, commerce
- Regional merchants and pilgrims

**Use For:** Character sprite reference, NPC designs, costume accuracy

---

## Color Palette

All generated art must use this historically-derived color palette:

| Color | Hex Code | Usage |
|-------|----------|-------|
| Dark Wood | `#2C1810` | Shadows, dark timber, outlines |
| Terracotta | `#8B4513` | Roof tiles, pottery, brick |
| Ochre/Sand | `#D4A574` | Streets, desert tones, natural stone |
| Whitewash | `#F5E6D3` | Building facades, walls, light areas |
| Portuguese Blue | `#1E3A5F` | Azulejo tiles, water, Portuguese elements |
| Tropical Green | `#2D5016` | Vegetation, palm trees, muted foliage |
| Pepper/Spice | `#4A1C1C` | Dried goods, dark accents |
| Hemp/Fiber | `#C19A6B` | Rope, baskets, natural textiles |

**Palette Rules:**
- Limit each sprite to 8-16 colors from this palette (plus transparency)
- Use `#2C1810` for all hard outlines
- Dithering is acceptable for gradients but use sparingly
- Shadows should use `#2C1810` at 50% opacity or blend with base color

---

## Prompt Templates

### 1. Isometric Tilesets (32x16 pixels)

**Base Prompt Structure:**
```
Pixel art isometric tile, 32x16 pixels, 16th century Portuguese Goa style.
[TILE DESCRIPTION]
Limited palette: dark wood #2C1810, terracotta #8B4513, ochre #D4A574, whitewash #F5E6D3.
Clean pixel edges, no anti-aliasing, game-ready sprite.
Isometric perspective at 2:1 ratio.
```

**Ground Tiles:**
```
Pixel art isometric tile, 32x16 pixels, 16th century Portuguese Goa style.
Cobblestone street tile, worn granite stones with sand between gaps.
Ochre and terracotta tones, subtle weathering, tropical climate wear.
Limited palette: #2C1810, #8B4513, #D4A574, #F5E6D3.
Clean pixel edges, no anti-aliasing, seamlessly tileable.
```

```
Pixel art isometric tile, 32x16 pixels, 16th century Portuguese Goa style.
Dusty laterite earth tile, reddish-brown packed earth common in Goa.
Subtle grass tufts at edges, tropical weathering.
Limited palette: #8B4513, #D4A574, #2D5016.
Clean pixel edges, seamlessly tileable.
```

```
Pixel art isometric tile, 32x16 pixels, 16th century Portuguese Goa style.
Shallow water/harbor tile, Mandovi River style.
Portuguese blue #1E3A5F with subtle wave animation frames.
Reflection highlights in #F5E6D3.
```

**Transition Tiles:**
```
Pixel art isometric tile, 32x16 pixels.
Cobblestone to dirt transition, corner piece.
Portuguese Goa street style, worn edges where stone meets earth.
Seamless connection on two sides.
```

---

### 2. Character Sprites (32x48 pixels, 4-direction walk cycles)

**Base Prompt Structure:**
```
Pixel art character sprite, 32x48 pixels, 16th century Portuguese Goa.
[CHARACTER DESCRIPTION - based on Códice Casanatense reference]
4-direction walk cycle (8 frames per direction: 2 idle + 6 walk).
Isometric perspective matching 2:1 ratio tiles.
Limited palette from Goa 1590 game palette.
Clear silhouette, 1-pixel dark outline.
```

**Portuguese Merchant:**
```
Pixel art character sprite, 32x48 pixels, 16th century Portuguese Goa.
Portuguese merchant/factor, based on Linschoten engravings.
Doublet and hose in dark colors, wide-brimmed hat, short cape.
Pale skin, beard typical of period. Carries ledger or small chest.
4-direction walk cycle (8 frames per direction).
Palette: #2C1810, #4A1C1C, #F5E6D3, #1E3A5F.
```

**Indian Merchant (Banyan/Gujarati):**
```
Pixel art character sprite, 32x48 pixels, 16th century Portuguese Goa.
Gujarati Banyan merchant, based on Códice Casanatense.
White cotton dhoti and angarkha, turban, no shoes.
Carries cloth bundle or spice pouch. Lean build.
4-direction walk cycle (8 frames per direction).
Palette: #F5E6D3, #D4A574, #2C1810, #C19A6B.
```

**Arab Trader:**
```
Pixel art character sprite, 32x48 pixels, 16th century Portuguese Goa.
Arab trader/sailor, based on Códice Casanatense.
Long white thobe/kaftan, keffiyeh or turban, curved dagger at waist.
Weathered skin, short beard. Gesturing hand pose.
4-direction walk cycle (8 frames per direction).
Palette: #F5E6D3, #D4A574, #2C1810, #8B4513.
```

**Market Woman (Fish Seller):**
```
Pixel art character sprite, 32x48 pixels, 16th century Portuguese Goa.
Goan fish seller woman, period-accurate dress.
Sari draped in Goan style, basket on head or hip.
Bare feet, jewelry (nose ring, bangles visible at this scale).
4-direction walk cycle (8 frames per direction).
Palette: #8B4513, #D4A574, #F5E6D3, #2C1810.
```

**Portuguese Soldier:**
```
Pixel art character sprite, 32x48 pixels, 16th century Portuguese Goa.
Portuguese soldier/guard, morion helmet, breastplate.
Halberd or arquebus, period-accurate armor and clothing.
Standing guard pose variant, patrol walk cycle.
4-direction walk cycle (8 frames per direction).
Palette: #2C1810, #4A1C1C, #C19A6B, #F5E6D3.
```

---

### 3. Building Sprites (Multi-tile Structures)

**Base Prompt Structure:**
```
Pixel art isometric building, [DIMENSIONS], 16th century Portuguese Goa architecture.
[BUILDING DESCRIPTION - based on Linschoten/historical records]
Whitewashed walls, terracotta roof tiles, wooden shutters.
Matches 32x16 tile grid. Portuguese colonial style with tropical adaptations.
Limited palette from Goa 1590 game palette.
```

**Merchant's House (3x2 tiles = 96x64 pixels):**
```
Pixel art isometric building, 96x64 pixels (3x2 tile footprint).
Portuguese merchant's townhouse, Rua Direita style.
Two stories, whitewashed facade, terracotta tile roof.
Wooden balcony (balcão), shuttered windows, arched doorway.
Small awning over entrance for shade.
Palette: #F5E6D3, #8B4513, #2C1810, #D4A574.
```

**Market Stall (2x1 tiles = 64x32 pixels):**
```
Pixel art isometric structure, 64x32 pixels (2x1 tile footprint).
Open-air market stall, fabric awning for shade.
Wooden counter displaying goods, baskets of spices visible.
Based on Linschoten's Rua Direita market scene.
Palette: #C19A6B, #8B4513, #2C1810, #D4A574.
```

**Church/Chapel (4x3 tiles = 128x96 pixels):**
```
Pixel art isometric building, 128x96 pixels (4x3 tile footprint).
Small Portuguese chapel, Renaissance/Manueline style.
Whitewashed walls, prominent bell tower, arched entrance.
Red terracotta roof, stone cross atop. Period-accurate to 1590 Goa.
Palette: #F5E6D3, #8B4513, #2C1810, #1E3A5F for azulejo accents.
```

**Warehouse/Godown (4x2 tiles = 128x64 pixels):**
```
Pixel art isometric building, 128x64 pixels (4x2 tile footprint).
Portuguese trading warehouse (godown), Ribeira Grande style.
Stone foundation, heavy wooden doors, loading dock.
Terracotta roof, small windows for ventilation.
Storage for spices, textiles. Practical colonial architecture.
Palette: #D4A574, #8B4513, #2C1810, #C19A6B.
```

---

### 4. UI Elements (Parchment/Ledger Style)

**Base Prompt Structure:**
```
Pixel art UI element, [DIMENSIONS], 16th century Portuguese ledger/parchment style.
[ELEMENT DESCRIPTION]
Aged paper texture, hand-drawn aesthetic, period-appropriate ornamentation.
Muted colors: ochre, sepia, dark brown for text areas.
```

**Trade Ledger Panel (256x192 pixels):**
```
Pixel art UI panel, 256x192 pixels, 16th century Portuguese ledger.
Aged parchment background with leather binding edges.
Decorative border with simple period flourishes.
Clear text areas for trade information.
Palette: #F5E6D3, #D4A574, #2C1810, #8B4513.
```

**Button (48x16 pixels):**
```
Pixel art UI button, 48x16 pixels, 16th century style.
Parchment button with subtle raised edge.
Three states: normal, hover (slightly lighter), pressed (darker).
Ornate corners, space for text label.
Palette: #D4A574, #F5E6D3, #2C1810.
```

**Inventory Slot (32x32 pixels):**
```
Pixel art UI element, 32x32 pixels, trade goods inventory slot.
Wooden crate or woven basket appearance.
Empty state shows interior, filled state accommodates item sprite.
Subtle shadow to indicate depth.
Palette: #8B4513, #C19A6B, #2C1810.
```

**Currency Icon (16x16 pixels):**
```
Pixel art icon, 16x16 pixels, Portuguese xerafim coin.
Period-accurate coin design, royal crest visible.
Gold/silver variant. Slight 3D beveling.
Palette: #D4A574 (gold), #F5E6D3 (silver), #2C1810 outline.
```

**Dialogue Box (288x80 pixels):**
```
Pixel art UI panel, 288x80 pixels, 16th century manuscript style.
Scroll/parchment with rolled edges at top and bottom.
Ornate capital letter area on left for speaker portrait.
Aged paper texture, sepia tones.
Palette: #F5E6D3, #D4A574, #2C1810, #8B4513.
```

---

### 5. Weather Effects (Animated Sprites)

**Rain Particle (8x16 pixels, animated):**
```
Pixel art effect sprite, 8x16 pixels, rain drop for tropical monsoon.
3-frame animation: falling streak, splash on ground.
Semi-transparent, tileable as particle system.
Palette: #1E3A5F at 70% opacity, #F5E6D3 highlight.
```

**Dust Particle (16x16 pixels, animated):**
```
Pixel art effect sprite, 16x16 pixels, dust mote for dry season.
4-frame animation: drifting particle with slight rotation.
Very subtle, used in particle system for atmosphere.
Palette: #D4A574 at 40% opacity, #8B4513 at 20%.
```

**Monsoon Rain Overlay (full screen tiled, 64x64 pixels):**
```
Pixel art tile, 64x64 pixels, heavy monsoon rain effect.
Dense rain streaks at slight angle (northeast wind).
Semi-transparent overlay, 4-frame animation loop.
Palette: #1E3A5F, #2C1810 at varying opacity.
```

**Heat Shimmer (32x32 pixels, animated):**
```
Pixel art effect, 32x32 pixels, heat distortion for hot season.
4-frame subtle wave distortion effect.
Applied as overlay during peak heat hours (noon-3pm game time).
Very subtle warping, nearly transparent.
```

**Smoke/Incense (16x32 pixels, animated):**
```
Pixel art effect sprite, 16x32 pixels, rising smoke/incense.
8-frame animation: wisps rising and dissipating.
For cooking fires, incense at temples, market atmosphere.
Palette: #F5E6D3 at 50% opacity, #D4A574 at 30%.
```

---

## Generation Guidelines

### Quality Checklist
- [ ] Correct pixel dimensions (no scaling artifacts)
- [ ] Colors strictly from the defined palette
- [ ] Clean 1-pixel outlines in `#2C1810`
- [ ] No anti-aliasing or smoothing
- [ ] Transparent background (PNG format)
- [ ] Historically accurate details per reference sources

### Animation Notes
- Walk cycles: Use 2-frame idle + 6-frame walk per direction
- Effects: Prefer 4 or 8 frame loops for smooth animation
- Keep animation subtle—this is a trading game, not action

### Historical Accuracy Reminders
- Portuguese wore dark, conservative clothing (Counter-Reformation era)
- Indian merchants often barefoot; Portuguese wore shoes/boots
- Women's dress varies by ethnicity and class
- Parasols common for shade—include in some character designs
- Buildings adapted to tropical climate: thick walls, small windows, verandas
