# Goa 1590: Trade Simulation

An isometric pixel-art sandbox game simulating life in late 16th century Goa, the "Rome of the East" during the height of Portuguese colonial power.

## Overview

Step into the bustling marketplace of Ribeira Grande, where spices worth their weight in gold change hands between Portuguese merchants, Hindu traders, and Arab middlemen. Experience the vibrant crossroads of cultures, religions, and commerce that made Goa one of the most important trading ports in the world.

## Features

### Core Gameplay
- **Isometric exploration** of the Ribeira Grande waterfront marketplace
- **Trade system** with dynamic pricing based on supply and demand
- **Day/night cycle** affecting market activity (markets open 7-9 AM historically)
- **Multiple NPC types** representing Goa's diverse population

### Historical Authenticity
- Visual design based on **Jan Huyghen van Linschoten's Itinerario (1595-96)** engravings
- Character costumes inspired by the **Códice Casanatense (~1540)** watercolors
- Trade goods reflecting actual spice trade commodities
- Dialogue reflecting the multicultural nature of 16th century Goa

### Trade Goods
- **Pepper** - Black gold from the Malabar Coast
- **Cinnamon** - Portuguese monopoly from Ceylon
- **Cloves** - Precious spices from the Moluccas
- **Silk** - Luxury fabric from China via Macau
- **Porcelain** - Fine ceramics from China
- **Nutmeg, Ginger, Indigo** - Additional valuable commodities

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Controls
- **WASD / Arrow Keys** - Move player
- **E** - Interact with NPCs
- **I** - Toggle inventory
- **ESC** - Close dialogs

## Project Structure

```
goa-game/
├── src/
│   ├── main.ts              # Game entry point
│   ├── scenes/
│   │   ├── BootScene.ts     # Asset loading
│   │   ├── MarketScene.ts   # Main gameplay
│   │   └── UIScene.ts       # HUD overlay
│   ├── entities/
│   │   ├── Player.ts        # Player character
│   │   ├── NPC.ts           # Non-player characters
│   │   └── TradePost.ts     # Trading locations
│   ├── systems/
│   │   ├── TradeSystem.ts   # Economy logic
│   │   ├── TimeSystem.ts    # Day/night cycle
│   │   ├── DialogueSystem.ts# Conversations
│   │   └── AudioSystem.ts   # Sound management
│   └── data/
│       ├── goods.json       # Trade goods definitions
│       ├── npcs.json        # NPC configurations
│       └── maps/            # Tiled map exports
├── assets/
│   ├── reference/           # Historical reference images
│   ├── sprites/
│   ├── tilemaps/
│   └── audio/
└── index.html
```

## Historical Context

### Late 16th Century Goa

Portuguese Goa (Estado da Índia) was the administrative center of Portugal's Eastern empire. Key aspects:

- **Population**: Diverse mix of Portuguese, Hindus, Muslims, Arab traders, African enslaved peoples, and visitors from across Asia
- **Trade**: Hub of the spice trade connecting Europe, Africa, Arabia, India, and China
- **Religion**: The Inquisition arrived in 1560, creating complex social dynamics
- **Architecture**: Baroque churches, Portuguese trading houses, and traditional bazaars

### Primary Sources Used

1. **Linschoten's Itinerario (1595-96)** - 36 engravings depicting Goan life
2. **Códice Casanatense (~1540)** - 76 watercolors of daily life in Portuguese India
3. **François Pyrard's Voyage Narrative** - Descriptions of Goa's urban layout

## Technology Stack

- **Phaser 3** - HTML5 game framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server

## Development Roadmap

### Vertical Slice (Current)
- [x] Project setup with Phaser 3 + TypeScript
- [x] Isometric tilemap rendering
- [x] Player movement (8-directional)
- [x] NPC interaction system
- [x] Trade system with dynamic pricing
- [x] Day/night cycle
- [x] UI: Inventory, trade dialogs, status bar
- [x] Placeholder pixel art (historically referenced)
- [x] Audio system foundation

### Future Enhancements
- [ ] Additional locations (Se Cathedral, Customs House)
- [ ] Quest/mission system
- [ ] Ship arrival events affecting market
- [ ] Reputation system with different factions
- [ ] Save/load system
- [ ] Refined pixel art based on reference images
- [ ] Period-appropriate music and sound effects

## License

This project is for educational and historical exploration purposes.

## Acknowledgments

- Historical research based on public domain sources
- Linschoten engravings via Wikimedia Commons
- Códice Casanatense via Biblioteca Casanatense, Rome
