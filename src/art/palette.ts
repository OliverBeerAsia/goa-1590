/**
 * Goa 1590 Color Palette and Pixel Art Utilities
 *
 * A comprehensive color system and pixel art toolkit for the Goa 1590 trading game.
 * All colors are historically derived from period sources including:
 * - Linschoten's Itinerario (1595-96) engravings
 * - Codice Casanatense (~1540) watercolors
 * - Portuguese colonial architecture documentation
 *
 * The palette reflects the visual character of 16th century Portuguese India:
 * whitewashed buildings, terracotta roofs, tropical vegetation, and the diverse
 * populations that made Goa the "Rome of the East."
 *
 * @module art/palette
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Represents an RGBA color with values from 0-255 */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Represents an HSL color (hue: 0-360, saturation: 0-1, lightness: 0-1) */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

/** A named color entry with hex, RGB, and usage description */
export interface ColorEntry {
  name: string;
  hex: string;
  rgb: RGBA;
  usage: string;
  historicalNote?: string;
}

/**
 * Legacy color ramp interface for backward compatibility
 * Used by existing game systems
 */
export interface ColorRamp {
  highlight: number;
  base: number;
  shadow: number;
  deep: number;
}

/**
 * Extended color ramp with five levels for detailed pixel art
 */
export interface ExtendedColorRamp {
  name: string;
  highlight: ColorEntry;
  light: ColorEntry;
  mid: ColorEntry;
  dark: ColorEntry;
  shadow: ColorEntry;
}

/** Pattern generation options */
export interface PatternOptions {
  width: number;
  height: number;
  scale?: number;
  variation?: number;
  seed?: number;
}

/** Dithering pattern type */
export type DitherPattern = 'bayer2x2' | 'bayer4x4' | 'ordered' | 'noise';

// =============================================================================
// COLOR CONVERSION UTILITIES
// =============================================================================

/**
 * Converts a hex color string to RGBA
 * @param hex - Color in format "#RRGGBB" or "#RGB"
 * @param alpha - Optional alpha value (0-255), defaults to 255
 */
export function hexToRGBA(hex: string, alpha: number = 255): RGBA {
  const cleanHex = hex.replace('#', '');

  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
      a: alpha,
    };
  }

  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
    a: alpha,
  };
}

/**
 * Converts RGBA to hex string
 * @param rgba - RGBA color object
 * @param includeAlpha - Whether to include alpha in output
 */
export function rgbaToHex(rgba: RGBA, includeAlpha: boolean = false): string {
  const r = rgba.r.toString(16).padStart(2, '0');
  const g = rgba.g.toString(16).padStart(2, '0');
  const b = rgba.b.toString(16).padStart(2, '0');

  if (includeAlpha) {
    const a = rgba.a.toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`.toUpperCase();
  }

  return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Converts RGBA to HSL
 * @param rgba - RGBA color object
 */
export function rgbaToHSL(rgba: RGBA): HSL {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s, l };
}

/**
 * Converts HSL to RGBA
 * @param hsl - HSL color object
 * @param alpha - Alpha value (0-255)
 */
export function hslToRGBA(hsl: HSL, alpha: number = 255): RGBA {
  const { h, s, l } = hsl;
  const hNorm = h / 360;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val, a: alpha };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
    a: alpha,
  };
}

/**
 * Converts a color to a 32-bit integer for Phaser/Canvas operations
 * @param color - Hex string or RGBA object
 */
export function colorToInt(color: string | RGBA): number {
  const rgba = typeof color === 'string' ? hexToRGBA(color) : color;
  return (rgba.r << 16) | (rgba.g << 8) | rgba.b;
}

/**
 * Converts a 32-bit integer to RGBA
 * @param int - 32-bit color integer
 */
export function intToRGBA(int: number): RGBA {
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
    a: 255,
  };
}

/**
 * Converts a 32-bit integer to hex string
 * @param int - 32-bit color integer
 */
export function intToHex(int: number): string {
  return '#' + int.toString(16).padStart(6, '0').toUpperCase();
}

// =============================================================================
// HISTORICAL COLOR PALETTE - PRIMARY COLORS
// =============================================================================

/**
 * The core palette derived from historical sources.
 * These eight colors form the foundation of all visual assets in the game.
 *
 * Historical context: These colors were commonly found in Portuguese India due to
 * available pigments and materials - whitewash from lime, terracotta from local
 * clay, natural dyes from plants and minerals.
 */
export const PRIMARY_PALETTE = {
  /**
   * Dark Wood (#2C1810)
   * Used for: Shadows, dark timber, outlines, text
   * Source: Ebony and dark hardwoods imported through Goa
   */
  DARK_WOOD: {
    name: 'Dark Wood',
    hex: '#2C1810',
    rgb: hexToRGBA('#2C1810'),
    usage: 'Shadows, dark timber, outlines, text',
    historicalNote: 'Represents ebony and dark hardwoods traded through Goa from Ceylon and Malacca',
  } as ColorEntry,

  /**
   * Terracotta (#8B4513)
   * Used for: Roof tiles, pottery, brick, leather
   * Source: Local laterite clay fired into tiles and ceramics
   */
  TERRACOTTA: {
    name: 'Terracotta',
    hex: '#8B4513',
    rgb: hexToRGBA('#8B4513'),
    usage: 'Roof tiles, pottery, brick, leather',
    historicalNote: 'Goan laterite clay produced distinctive red-orange terracotta used throughout Portuguese India',
  } as ColorEntry,

  /**
   * Ochre/Sand (#D4A574)
   * Used for: Streets, desert tones, natural stone, parchment
   * Source: Natural ochre pigments and sun-bleached stone
   */
  OCHRE: {
    name: 'Ochre',
    hex: '#D4A574',
    rgb: hexToRGBA('#D4A574'),
    usage: 'Streets, desert tones, natural stone, parchment',
    historicalNote: 'Ochre pigments were readily available and used in Portuguese colonial painting',
  } as ColorEntry,

  /**
   * Whitewash (#F5E6D3)
   * Used for: Building facades, walls, light areas, highlights
   * Source: Lime-based whitewash coating all Portuguese buildings
   */
  WHITEWASH: {
    name: 'Whitewash',
    hex: '#F5E6D3',
    rgb: hexToRGBA('#F5E6D3'),
    usage: 'Building facades, walls, light areas, highlights',
    historicalNote: 'Lime whitewash was mandatory on Portuguese colonial buildings for heat reflection and hygiene',
  } as ColorEntry,

  /**
   * Portuguese Blue (#1E3A5F)
   * Used for: Azulejo tiles, water, Portuguese cultural elements
   * Source: Iconic blue glazed tiles (azulejos) imported from Portugal
   */
  PORTUGUESE_BLUE: {
    name: 'Portuguese Blue',
    hex: '#1E3A5F',
    rgb: hexToRGBA('#1E3A5F'),
    usage: 'Azulejo tiles, water, Portuguese cultural elements',
    historicalNote: 'The distinctive blue of azulejo tiles became a symbol of Portuguese presence globally',
  } as ColorEntry,

  /**
   * Tropical Green (#2D5016)
   * Used for: Vegetation, palm trees, muted foliage
   * Source: Dense tropical vegetation of the Konkan coast
   */
  TROPICAL_GREEN: {
    name: 'Tropical Green',
    hex: '#2D5016',
    rgb: hexToRGBA('#2D5016'),
    usage: 'Vegetation, palm trees, muted foliage',
    historicalNote: 'The lush monsoon vegetation distinguished Goa from arid Portuguese territories',
  } as ColorEntry,

  /**
   * Pepper/Spice (#4A1C1C)
   * Used for: Dried goods, dark accents, shadows with warmth
   * Source: Black pepper, the "black gold" that drove the spice trade
   */
  PEPPER: {
    name: 'Pepper',
    hex: '#4A1C1C',
    rgb: hexToRGBA('#4A1C1C'),
    usage: 'Dried goods, dark accents, warm shadows',
    historicalNote: 'Black pepper from Malabar was the primary commodity driving Portuguese presence in India',
  } as ColorEntry,

  /**
   * Hemp/Fiber (#C19A6B)
   * Used for: Rope, baskets, natural textiles, light wood
   * Source: Coir and hemp fibers used in shipbuilding and trade goods
   */
  HEMP: {
    name: 'Hemp',
    hex: '#C19A6B',
    rgb: hexToRGBA('#C19A6B'),
    usage: 'Rope, baskets, natural textiles, light wood',
    historicalNote: 'Coir rope from coconut fiber was a major Goan export used in maritime rigging',
  } as ColorEntry,
};

// =============================================================================
// LEGACY COLOR RAMPS (backward compatibility)
// =============================================================================

// Ground and earth tones
export const COBBLESTONE: ColorRamp = {
  highlight: 0xe8c8a0,
  base: 0xd4a574,
  shadow: 0xb08050,
  deep: 0x8a6040,
};

export const DIRT: ColorRamp = {
  highlight: 0xc9a070,
  base: 0xa88050,
  shadow: 0x886030,
  deep: 0x604020,
};

export const SAND: ColorRamp = {
  highlight: 0xf5e6d3,
  base: 0xe8d4b8,
  shadow: 0xd4c0a0,
  deep: 0xb8a080,
};

export const GRASS: ColorRamp = {
  highlight: 0x4a8030,
  base: 0x3d6020,
  shadow: 0x2a4010,
  deep: 0x1a2808,
};

// Water colors
export const WATER_HARBOR: ColorRamp = {
  highlight: 0x80c0e0,
  base: 0x4a8ab0,
  shadow: 0x2a6a8f,
  deep: 0x1a4a6f,
};

export const WATER_DEEP: ColorRamp = {
  highlight: 0x4a8ab0,
  base: 0x2a6a8f,
  shadow: 0x1a4a6f,
  deep: 0x0a2840,
};

export const WATER_RIVER: ColorRamp = {
  highlight: 0x6aa0c0,
  base: 0x4080a0,
  shadow: 0x306080,
  deep: 0x204060,
};

// Building materials
export const WHITEWASH: ColorRamp = {
  highlight: 0xfffef8,
  base: 0xf8f0e0,
  shadow: 0xe0d4c0,
  deep: 0xc8b8a0,
};

export const TERRACOTTA: ColorRamp = {
  highlight: 0xd08050,
  base: 0xa85530,
  shadow: 0x8b4020,
  deep: 0x6a3018,
};

export const WOOD_DARK: ColorRamp = {
  highlight: 0x4a3828,
  base: 0x3c2818,
  shadow: 0x2c1810,
  deep: 0x1a0a05,
};

export const WOOD_LIGHT: ColorRamp = {
  highlight: 0x8b6443,
  base: 0x6b4423,
  shadow: 0x5a3413,
  deep: 0x3a2008,
};

export const STONE: ColorRamp = {
  highlight: 0xa0a0a0,
  base: 0x7a7a7a,
  shadow: 0x5b5b5b,
  deep: 0x3a3a3a,
};

// Vegetation
export const PALM_FROND: ColorRamp = {
  highlight: 0x4a8030,
  base: 0x2d5016,
  shadow: 0x1a3008,
  deep: 0x0a1804,
};

export const PALM_TRUNK: ColorRamp = {
  highlight: 0x8b5a33,
  base: 0x6b4423,
  shadow: 0x4a2f15,
  deep: 0x2a1a08,
};

// Fabric and textiles
export const SILK_GOLD: ColorRamp = {
  highlight: 0xffd700,
  base: 0xe0b000,
  shadow: 0xc19a27,
  deep: 0x8b6914,
};

export const FABRIC_RED: ColorRamp = {
  highlight: 0xc04040,
  base: 0xa02020,
  shadow: 0x701010,
  deep: 0x500808,
};

export const FABRIC_BLUE: ColorRamp = {
  highlight: 0x3a5a7f,
  base: 0x1e3a5f,
  shadow: 0x0a2040,
  deep: 0x040a20,
};

export const FABRIC_GREEN: ColorRamp = {
  highlight: 0x4a7030,
  base: 0x2d5016,
  shadow: 0x1a3008,
  deep: 0x0a1804,
};

export const FABRIC_CREAM: ColorRamp = {
  highlight: 0xfff8f0,
  base: 0xf5e8d0,
  shadow: 0xe0d4c0,
  deep: 0xc8b8a0,
};

// Skin tones
export const SKIN_LIGHT: ColorRamp = {
  highlight: 0xf0d8c0,
  base: 0xe8c8a0,
  shadow: 0xd4a574,
  deep: 0xb08050,
};

export const SKIN_MEDIUM: ColorRamp = {
  highlight: 0xe8c8a0,
  base: 0xd4a574,
  shadow: 0xb08050,
  deep: 0x8a6040,
};

export const SKIN_DARK: ColorRamp = {
  highlight: 0xc09060,
  base: 0xa07040,
  shadow: 0x805030,
  deep: 0x603020,
};

// Metals
export const GOLD: ColorRamp = {
  highlight: 0xfff0a0,
  base: 0xffd700,
  shadow: 0xc9a227,
  deep: 0x8b6914,
};

export const IRON: ColorRamp = {
  highlight: 0x6a6a6a,
  base: 0x4a4a4a,
  shadow: 0x3a3a3a,
  deep: 0x2a2a2a,
};

// Special colors
export const PORTUGUESE_BLUE = 0x1e3a5f;
export const INDIGO_DYE = 0x1e3a5f;
export const PEPPER_BLACK = 0x2c1810;
export const CINNAMON = 0x8b4513;
export const CLOVES = 0x4a1c1c;
export const NUTMEG = 0x8b4513;

// Shadow and transparency
export const SHADOW_COLOR = 0x000000;
export const SHADOW_ALPHA = 0.3;

// Moss and weathering
export const MOSS: ColorRamp = {
  highlight: 0x4a7040,
  base: 0x3a5030,
  shadow: 0x2a4020,
  deep: 0x1a2810,
};

// Market floor decorative patterns
export const MARKET_TILE_LIGHT = 0xf5e6d3;
export const MARKET_TILE_DARK = 0xd4a574;
export const MARKET_TILE_ACCENT = 0xa85530;

// =============================================================================
// EXTENDED PALETTE - COLOR RAMPS
// =============================================================================

/**
 * Extended color ramps providing highlight, light, mid, dark, and shadow variants
 * for each primary color. Essential for creating depth in pixel art sprites.
 */
export const EXTENDED_RAMPS: Record<string, ExtendedColorRamp> = {
  /**
   * Wood ramp - from weathered grey to deep mahogany
   * Used for timber structures, furniture, ship elements
   */
  WOOD: {
    name: 'Wood',
    highlight: { name: 'Wood Highlight', hex: '#6B5344', rgb: hexToRGBA('#6B5344'), usage: 'Wood highlights, weathered grain' },
    light: { name: 'Wood Light', hex: '#5A4231', rgb: hexToRGBA('#5A4231'), usage: 'Light wood areas' },
    mid: { name: 'Wood Mid', hex: '#3D2A1C', rgb: hexToRGBA('#3D2A1C'), usage: 'Standard wood tone' },
    dark: { name: 'Wood Dark', hex: '#2C1810', rgb: hexToRGBA('#2C1810'), usage: 'Dark wood, shadows' },
    shadow: { name: 'Wood Shadow', hex: '#1A0E09', rgb: hexToRGBA('#1A0E09'), usage: 'Deep wood shadows' },
  },

  /**
   * Terracotta ramp - from sunlit roof to deep shadow
   * Used for roof tiles, pottery, brick walls
   */
  TERRACOTTA: {
    name: 'Terracotta',
    highlight: { name: 'Terracotta Highlight', hex: '#C47A4A', rgb: hexToRGBA('#C47A4A'), usage: 'Sunlit terracotta' },
    light: { name: 'Terracotta Light', hex: '#A65D2E', rgb: hexToRGBA('#A65D2E'), usage: 'Light terracotta' },
    mid: { name: 'Terracotta Mid', hex: '#8B4513', rgb: hexToRGBA('#8B4513'), usage: 'Standard terracotta' },
    dark: { name: 'Terracotta Dark', hex: '#6B350F', rgb: hexToRGBA('#6B350F'), usage: 'Shaded terracotta' },
    shadow: { name: 'Terracotta Shadow', hex: '#4A240A', rgb: hexToRGBA('#4A240A'), usage: 'Deep terracotta shadow' },
  },

  /**
   * Stone/Ochre ramp - natural limestone and sandstone
   * Used for streets, walls, natural rock, parchment
   */
  STONE: {
    name: 'Stone',
    highlight: { name: 'Stone Highlight', hex: '#F5E6D3', rgb: hexToRGBA('#F5E6D3'), usage: 'Bright stone, highlights' },
    light: { name: 'Stone Light', hex: '#E8D4B8', rgb: hexToRGBA('#E8D4B8'), usage: 'Light stone' },
    mid: { name: 'Stone Mid', hex: '#D4A574', rgb: hexToRGBA('#D4A574'), usage: 'Standard stone/ochre' },
    dark: { name: 'Stone Dark', hex: '#B8895A', rgb: hexToRGBA('#B8895A'), usage: 'Shaded stone' },
    shadow: { name: 'Stone Shadow', hex: '#8B6B43', rgb: hexToRGBA('#8B6B43'), usage: 'Deep stone shadow' },
  },

  /**
   * Whitewash ramp - pristine white to shadowed cream
   * Used for Portuguese colonial building facades
   */
  WHITEWASH: {
    name: 'Whitewash',
    highlight: { name: 'Whitewash Highlight', hex: '#FFFDF8', rgb: hexToRGBA('#FFFDF8'), usage: 'Brightest white' },
    light: { name: 'Whitewash Light', hex: '#FAF3E8', rgb: hexToRGBA('#FAF3E8'), usage: 'Light facade' },
    mid: { name: 'Whitewash Mid', hex: '#F5E6D3', rgb: hexToRGBA('#F5E6D3'), usage: 'Standard whitewash' },
    dark: { name: 'Whitewash Dark', hex: '#E8D8C4', rgb: hexToRGBA('#E8D8C4'), usage: 'Shaded wall' },
    shadow: { name: 'Whitewash Shadow', hex: '#D4C4A8', rgb: hexToRGBA('#D4C4A8'), usage: 'Deep wall shadow' },
  },

  /**
   * Blue ramp - from sky to deep ocean
   * Used for water, azulejo tiles, Portuguese elements
   */
  BLUE: {
    name: 'Blue',
    highlight: { name: 'Blue Highlight', hex: '#4A6B8F', rgb: hexToRGBA('#4A6B8F'), usage: 'Light blue, reflections' },
    light: { name: 'Blue Light', hex: '#3A5A7A', rgb: hexToRGBA('#3A5A7A'), usage: 'Light water, sky' },
    mid: { name: 'Blue Mid', hex: '#1E3A5F', rgb: hexToRGBA('#1E3A5F'), usage: 'Standard Portuguese blue' },
    dark: { name: 'Blue Dark', hex: '#152A45', rgb: hexToRGBA('#152A45'), usage: 'Dark water' },
    shadow: { name: 'Blue Shadow', hex: '#0D1A2A', rgb: hexToRGBA('#0D1A2A'), usage: 'Deep water shadow' },
  },

  /**
   * Green ramp - tropical vegetation from sunlit to deep jungle
   * Used for palm trees, foliage, grass
   */
  GREEN: {
    name: 'Green',
    highlight: { name: 'Green Highlight', hex: '#5A8A3A', rgb: hexToRGBA('#5A8A3A'), usage: 'Sunlit foliage' },
    light: { name: 'Green Light', hex: '#446B28', rgb: hexToRGBA('#446B28'), usage: 'Light vegetation' },
    mid: { name: 'Green Mid', hex: '#2D5016', rgb: hexToRGBA('#2D5016'), usage: 'Standard tropical green' },
    dark: { name: 'Green Dark', hex: '#1E3A0E', rgb: hexToRGBA('#1E3A0E'), usage: 'Shaded foliage' },
    shadow: { name: 'Green Shadow', hex: '#122408', rgb: hexToRGBA('#122408'), usage: 'Deep jungle shadow' },
  },

  /**
   * Pepper/Spice ramp - warm dark tones
   * Used for spice trade goods and warm shadows
   */
  PEPPER: {
    name: 'Pepper',
    highlight: { name: 'Pepper Highlight', hex: '#7A3A3A', rgb: hexToRGBA('#7A3A3A'), usage: 'Light spice tones' },
    light: { name: 'Pepper Light', hex: '#6A2A2A', rgb: hexToRGBA('#6A2A2A'), usage: 'Light pepper' },
    mid: { name: 'Pepper Mid', hex: '#4A1C1C', rgb: hexToRGBA('#4A1C1C'), usage: 'Standard pepper/spice' },
    dark: { name: 'Pepper Dark', hex: '#3A1414', rgb: hexToRGBA('#3A1414'), usage: 'Dark spice' },
    shadow: { name: 'Pepper Shadow', hex: '#2A0C0C', rgb: hexToRGBA('#2A0C0C'), usage: 'Deep spice shadow' },
  },

  /**
   * Hemp/Fiber ramp - natural rope and basket tones
   * Used for trade goods and rustic elements
   */
  HEMP: {
    name: 'Hemp',
    highlight: { name: 'Hemp Highlight', hex: '#E8C8A0', rgb: hexToRGBA('#E8C8A0'), usage: 'Light fiber' },
    light: { name: 'Hemp Light', hex: '#D4B088', rgb: hexToRGBA('#D4B088'), usage: 'Light hemp' },
    mid: { name: 'Hemp Mid', hex: '#C19A6B', rgb: hexToRGBA('#C19A6B'), usage: 'Standard hemp/fiber' },
    dark: { name: 'Hemp Dark', hex: '#A07850', rgb: hexToRGBA('#A07850'), usage: 'Shaded fiber' },
    shadow: { name: 'Hemp Shadow', hex: '#7A5838', rgb: hexToRGBA('#7A5838'), usage: 'Deep fiber shadow' },
  },
};

// =============================================================================
// SKIN TONE PALETTES
// =============================================================================

/**
 * Historically accurate skin tone palettes for the diverse population of 16th century Goa.
 *
 * Historical context: Goa was one of the most cosmopolitan cities of its era, with:
 * - Portuguese colonizers and their descendants
 * - Hindu and Muslim Indians from various regions
 * - Arab, Persian, and Ottoman traders
 * - African slaves and freedmen
 * - Chinese and Southeast Asian merchants
 */
export const SKIN_TONES = {
  /**
   * Portuguese/European skin tones
   * Historical note: Portuguese in Goa ranged from fair to olive-skinned,
   * often tanned from tropical sun exposure
   */
  PORTUGUESE: {
    name: 'Portuguese/European',
    highlight: { name: 'Portuguese Highlight', hex: '#FFE4C4', rgb: hexToRGBA('#FFE4C4'), usage: 'Skin highlights' },
    light: { name: 'Portuguese Light', hex: '#EBCDAA', rgb: hexToRGBA('#EBCDAA'), usage: 'Light skin areas' },
    mid: { name: 'Portuguese Mid', hex: '#D4B896', rgb: hexToRGBA('#D4B896'), usage: 'Base skin tone' },
    dark: { name: 'Portuguese Dark', hex: '#B89B78', rgb: hexToRGBA('#B89B78'), usage: 'Shaded skin' },
    shadow: { name: 'Portuguese Shadow', hex: '#8B7355', rgb: hexToRGBA('#8B7355'), usage: 'Deep shadows' },
  } as ExtendedColorRamp,

  /**
   * Indian skin tones (varied regional representation)
   * Historical note: Indian population included Konkani locals, Gujarati merchants,
   * Deccani Muslims, and travelers from across the subcontinent
   */
  INDIAN: {
    name: 'Indian',
    highlight: { name: 'Indian Highlight', hex: '#D4A574', rgb: hexToRGBA('#D4A574'), usage: 'Skin highlights' },
    light: { name: 'Indian Light', hex: '#C19A6B', rgb: hexToRGBA('#C19A6B'), usage: 'Light skin areas' },
    mid: { name: 'Indian Mid', hex: '#A67B5B', rgb: hexToRGBA('#A67B5B'), usage: 'Base skin tone' },
    dark: { name: 'Indian Dark', hex: '#8B6B4A', rgb: hexToRGBA('#8B6B4A'), usage: 'Shaded skin' },
    shadow: { name: 'Indian Shadow', hex: '#6B5338', rgb: hexToRGBA('#6B5338'), usage: 'Deep shadows' },
  } as ExtendedColorRamp,

  /**
   * Arab/Persian skin tones
   * Historical note: Arab and Persian traders were vital to the spice trade,
   * with long-established trading communities in Goa
   */
  ARAB: {
    name: 'Arab/Persian',
    highlight: { name: 'Arab Highlight', hex: '#E8C8A8', rgb: hexToRGBA('#E8C8A8'), usage: 'Skin highlights' },
    light: { name: 'Arab Light', hex: '#D4B090', rgb: hexToRGBA('#D4B090'), usage: 'Light skin areas' },
    mid: { name: 'Arab Mid', hex: '#B89878', rgb: hexToRGBA('#B89878'), usage: 'Base skin tone' },
    dark: { name: 'Arab Dark', hex: '#9A7B5A', rgb: hexToRGBA('#9A7B5A'), usage: 'Shaded skin' },
    shadow: { name: 'Arab Shadow', hex: '#7A5D42', rgb: hexToRGBA('#7A5D42'), usage: 'Deep shadows' },
  } as ExtendedColorRamp,

  /**
   * African skin tones
   * Historical note: African presence in Goa included slaves brought from
   * Mozambique and East Africa, as well as freedmen who formed distinct communities
   */
  AFRICAN: {
    name: 'African',
    highlight: { name: 'African Highlight', hex: '#8B6B4A', rgb: hexToRGBA('#8B6B4A'), usage: 'Skin highlights' },
    light: { name: 'African Light', hex: '#6B5338', rgb: hexToRGBA('#6B5338'), usage: 'Light skin areas' },
    mid: { name: 'African Mid', hex: '#5A4230', rgb: hexToRGBA('#5A4230'), usage: 'Base skin tone' },
    dark: { name: 'African Dark', hex: '#4A3525', rgb: hexToRGBA('#4A3525'), usage: 'Shaded skin' },
    shadow: { name: 'African Shadow', hex: '#3A2818', rgb: hexToRGBA('#3A2818'), usage: 'Deep shadows' },
  } as ExtendedColorRamp,

  /**
   * Southeast Asian/Chinese skin tones
   * Historical note: Chinese and Malay traders were present in Goa,
   * trading porcelain, silk, and other goods from the Far East
   */
  ASIAN: {
    name: 'Southeast Asian',
    highlight: { name: 'Asian Highlight', hex: '#F5DEB3', rgb: hexToRGBA('#F5DEB3'), usage: 'Skin highlights' },
    light: { name: 'Asian Light', hex: '#E8D098', rgb: hexToRGBA('#E8D098'), usage: 'Light skin areas' },
    mid: { name: 'Asian Mid', hex: '#D4B87A', rgb: hexToRGBA('#D4B87A'), usage: 'Base skin tone' },
    dark: { name: 'Asian Dark', hex: '#B89B5F', rgb: hexToRGBA('#B89B5F'), usage: 'Shaded skin' },
    shadow: { name: 'Asian Shadow', hex: '#8B7543', rgb: hexToRGBA('#8B7543'), usage: 'Deep shadows' },
  } as ExtendedColorRamp,
};

// =============================================================================
// MATERIAL COLORS
// =============================================================================

/**
 * Colors for various materials found in 16th century Goan trade and architecture
 */
export const MATERIAL_COLORS = {
  /** Stone types found in Goan architecture */
  STONE: {
    LATERITE: { name: 'Laterite', hex: '#A0522D', rgb: hexToRGBA('#A0522D'), usage: 'Local red-brown building stone' },
    GRANITE: { name: 'Granite', hex: '#808080', rgb: hexToRGBA('#808080'), usage: 'Grey stone for foundations' },
    LIMESTONE: { name: 'Limestone', hex: '#E8E4D9', rgb: hexToRGBA('#E8E4D9'), usage: 'Light decorative stone' },
    BASALT: { name: 'Basalt', hex: '#4A4A4A', rgb: hexToRGBA('#4A4A4A'), usage: 'Dark volcanic stone' },
  },

  /** Wood types used in construction and trade */
  WOOD: {
    TEAK: { name: 'Teak', hex: '#8B7355', rgb: hexToRGBA('#8B7355'), usage: 'Ship building, fine furniture' },
    EBONY: { name: 'Ebony', hex: '#2C1810', rgb: hexToRGBA('#2C1810'), usage: 'Luxury items, inlay work' },
    BAMBOO: { name: 'Bamboo', hex: '#C4B896', rgb: hexToRGBA('#C4B896'), usage: 'Construction, everyday items' },
    PALM: { name: 'Palm', hex: '#8B6B4A', rgb: hexToRGBA('#8B6B4A'), usage: 'Roofing, rural construction' },
  },

  /** Textile and cloth colors (natural dyes) */
  CLOTH: {
    RAW_COTTON: { name: 'Raw Cotton', hex: '#F5F5DC', rgb: hexToRGBA('#F5F5DC'), usage: 'Undyed cotton fabric' },
    INDIGO: { name: 'Indigo', hex: '#4B0082', rgb: hexToRGBA('#4B0082'), usage: 'Blue-dyed textiles' },
    MADDER_RED: { name: 'Madder Red', hex: '#E32636', rgb: hexToRGBA('#E32636'), usage: 'Red-dyed textiles' },
    SAFFRON: { name: 'Saffron', hex: '#F4C430', rgb: hexToRGBA('#F4C430'), usage: 'Yellow-dyed textiles, religious' },
    TURMERIC: { name: 'Turmeric', hex: '#FFD700', rgb: hexToRGBA('#FFD700'), usage: 'Yellow dye, auspicious color' },
  },

  /** Metal colors */
  METAL: {
    GOLD: { name: 'Gold', hex: '#FFD700', rgb: hexToRGBA('#FFD700'), usage: 'Gold jewelry, coins, decoration' },
    GOLD_SHADOW: { name: 'Gold Shadow', hex: '#B8860B', rgb: hexToRGBA('#B8860B'), usage: 'Shaded gold areas' },
    SILVER: { name: 'Silver', hex: '#C0C0C0', rgb: hexToRGBA('#C0C0C0'), usage: 'Silver items, coins' },
    SILVER_SHADOW: { name: 'Silver Shadow', hex: '#808080', rgb: hexToRGBA('#808080'), usage: 'Shaded silver' },
    COPPER: { name: 'Copper', hex: '#B87333', rgb: hexToRGBA('#B87333'), usage: 'Copper vessels, coins' },
    IRON: { name: 'Iron', hex: '#434343', rgb: hexToRGBA('#434343'), usage: 'Weapons, tools, hardware' },
    BRONZE: { name: 'Bronze', hex: '#CD7F32', rgb: hexToRGBA('#CD7F32'), usage: 'Bells, statues, hardware' },
  },

  /** Ceramic and pottery colors */
  CERAMIC: {
    UNGLAZED: { name: 'Unglazed', hex: '#BC8F8F', rgb: hexToRGBA('#BC8F8F'), usage: 'Plain terracotta pottery' },
    BLUE_GLAZE: { name: 'Blue Glaze', hex: '#1E3A5F', rgb: hexToRGBA('#1E3A5F'), usage: 'Portuguese azulejo' },
    WHITE_GLAZE: { name: 'White Glaze', hex: '#FFFAF0', rgb: hexToRGBA('#FFFAF0'), usage: 'Chinese porcelain' },
    GREEN_GLAZE: { name: 'Green Glaze', hex: '#228B22', rgb: hexToRGBA('#228B22'), usage: 'Islamic ceramics' },
  },
};

// =============================================================================
// ENVIRONMENTAL COLORS
// =============================================================================

/**
 * Colors for environmental elements - sky, water, and natural features
 */
export const ENVIRONMENT_COLORS = {
  /** Sky colors for different times and weather */
  SKY: {
    DAWN: { name: 'Dawn Sky', hex: '#FFB6C1', rgb: hexToRGBA('#FFB6C1'), usage: 'Early morning sky' },
    MORNING: { name: 'Morning Sky', hex: '#87CEEB', rgb: hexToRGBA('#87CEEB'), usage: 'Clear morning' },
    NOON: { name: 'Noon Sky', hex: '#ADD8E6', rgb: hexToRGBA('#ADD8E6'), usage: 'Midday, washed out' },
    AFTERNOON: { name: 'Afternoon Sky', hex: '#6CB4EE', rgb: hexToRGBA('#6CB4EE'), usage: 'Afternoon blue' },
    SUNSET: { name: 'Sunset Sky', hex: '#FF7F50', rgb: hexToRGBA('#FF7F50'), usage: 'Evening colors' },
    DUSK: { name: 'Dusk Sky', hex: '#483D8B', rgb: hexToRGBA('#483D8B'), usage: 'Twilight' },
    NIGHT: { name: 'Night Sky', hex: '#191970', rgb: hexToRGBA('#191970'), usage: 'Night time' },
    OVERCAST: { name: 'Overcast', hex: '#778899', rgb: hexToRGBA('#778899'), usage: 'Cloudy weather' },
    MONSOON: { name: 'Monsoon Sky', hex: '#4A5568', rgb: hexToRGBA('#4A5568'), usage: 'Heavy rain clouds' },
  },

  /** Water colors for the Mandovi River and Arabian Sea */
  WATER: {
    SHALLOW: { name: 'Shallow Water', hex: '#40E0D0', rgb: hexToRGBA('#40E0D0'), usage: 'Beach, river edges' },
    RIVER: { name: 'River Water', hex: '#1E3A5F', rgb: hexToRGBA('#1E3A5F'), usage: 'Mandovi River' },
    DEEP: { name: 'Deep Water', hex: '#0D1A2A', rgb: hexToRGBA('#0D1A2A'), usage: 'Deep ocean' },
    REFLECTION: { name: 'Water Reflection', hex: '#4A6B8F', rgb: hexToRGBA('#4A6B8F'), usage: 'Light reflections' },
    FOAM: { name: 'Sea Foam', hex: '#F5FFFA', rgb: hexToRGBA('#F5FFFA'), usage: 'Wave crests' },
  },

  /** Vegetation colors for tropical Goa */
  FOLIAGE: {
    PALM_LIGHT: { name: 'Palm Light', hex: '#5A8A3A', rgb: hexToRGBA('#5A8A3A'), usage: 'Sunlit palm fronds' },
    PALM_DARK: { name: 'Palm Dark', hex: '#2D5016', rgb: hexToRGBA('#2D5016'), usage: 'Shaded palm' },
    GRASS: { name: 'Tropical Grass', hex: '#7CFC00', rgb: hexToRGBA('#7CFC00'), usage: 'Fresh grass' },
    DRIED_GRASS: { name: 'Dried Grass', hex: '#DAA520', rgb: hexToRGBA('#DAA520'), usage: 'Dry season grass' },
    JUNGLE: { name: 'Jungle Deep', hex: '#122408', rgb: hexToRGBA('#122408'), usage: 'Dense forest shadow' },
  },

  /** Ground and sand colors */
  GROUND: {
    BEACH_SAND: { name: 'Beach Sand', hex: '#F5DEB3', rgb: hexToRGBA('#F5DEB3'), usage: 'Coastal sand' },
    LATERITE_SOIL: { name: 'Laterite Soil', hex: '#A0522D', rgb: hexToRGBA('#A0522D'), usage: 'Red Goan soil' },
    MUD: { name: 'Mud', hex: '#8B4513', rgb: hexToRGBA('#8B4513'), usage: 'Wet earth, monsoon' },
    DUST: { name: 'Dust', hex: '#D4A574', rgb: hexToRGBA('#D4A574'), usage: 'Dry season dust' },
  },
};

// =============================================================================
// COLOR BLENDING UTILITIES
// =============================================================================

/**
 * Utility function to interpolate between two colors (integer format)
 * @deprecated Use lerpColorRGBA for RGBA support
 */
export function lerpColor(color1: number, color2: number, t: number): number {
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
 * Linearly interpolates between two colors (RGBA format)
 * @param color1 - First color (hex string or RGBA)
 * @param color2 - Second color (hex string or RGBA)
 * @param t - Interpolation factor (0 = color1, 1 = color2)
 */
export function lerpColorRGBA(color1: string | RGBA, color2: string | RGBA, t: number): RGBA {
  const c1 = typeof color1 === 'string' ? hexToRGBA(color1) : color1;
  const c2 = typeof color2 === 'string' ? hexToRGBA(color2) : color2;

  const clampedT = Math.max(0, Math.min(1, t));

  return {
    r: Math.round(c1.r + (c2.r - c1.r) * clampedT),
    g: Math.round(c1.g + (c2.g - c1.g) * clampedT),
    b: Math.round(c1.b + (c2.b - c1.b) * clampedT),
    a: Math.round(c1.a + (c2.a - c1.a) * clampedT),
  };
}

/**
 * Get a color from a ramp at a specific position (0-1)
 */
export function getRampColor(ramp: ColorRamp, position: number): number {
  if (position <= 0.33) {
    return lerpColor(ramp.deep, ramp.shadow, position / 0.33);
  } else if (position <= 0.66) {
    return lerpColor(ramp.shadow, ramp.base, (position - 0.33) / 0.33);
  } else {
    return lerpColor(ramp.base, ramp.highlight, (position - 0.66) / 0.34);
  }
}

/**
 * Add noise variation to a color
 */
export function addColorNoise(color: number, intensity: number = 0.1): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  const noise = (Math.random() - 0.5) * 2 * intensity * 255;

  const newR = Math.max(0, Math.min(255, Math.round(r + noise)));
  const newG = Math.max(0, Math.min(255, Math.round(g + noise)));
  const newB = Math.max(0, Math.min(255, Math.round(b + noise)));

  return (newR << 16) | (newG << 8) | newB;
}

/**
 * Blends two colors using alpha compositing (over operation)
 * @param foreground - Foreground color with alpha
 * @param background - Background color
 */
export function blendAlpha(foreground: RGBA, background: RGBA): RGBA {
  const alpha = foreground.a / 255;
  const invAlpha = 1 - alpha;

  return {
    r: Math.round(foreground.r * alpha + background.r * invAlpha),
    g: Math.round(foreground.g * alpha + background.g * invAlpha),
    b: Math.round(foreground.b * alpha + background.b * invAlpha),
    a: 255,
  };
}

/**
 * Blends multiple colors together with equal weight
 * @param colors - Array of colors to blend
 */
export function blendColors(colors: (string | RGBA)[]): RGBA {
  if (colors.length === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const rgbaColors = colors.map(c => typeof c === 'string' ? hexToRGBA(c) : c);

  const sum = rgbaColors.reduce(
    (acc, c) => ({
      r: acc.r + c.r,
      g: acc.g + c.g,
      b: acc.b + c.b,
      a: acc.a + c.a,
    }),
    { r: 0, g: 0, b: 0, a: 0 }
  );

  return {
    r: Math.round(sum.r / colors.length),
    g: Math.round(sum.g / colors.length),
    b: Math.round(sum.b / colors.length),
    a: Math.round(sum.a / colors.length),
  };
}

/**
 * Multiplies two colors together (multiply blend mode)
 * @param color1 - First color
 * @param color2 - Second color
 */
export function multiplyColors(color1: string | RGBA, color2: string | RGBA): RGBA {
  const c1 = typeof color1 === 'string' ? hexToRGBA(color1) : color1;
  const c2 = typeof color2 === 'string' ? hexToRGBA(color2) : color2;

  return {
    r: Math.round((c1.r * c2.r) / 255),
    g: Math.round((c1.g * c2.g) / 255),
    b: Math.round((c1.b * c2.b) / 255),
    a: Math.round((c1.a * c2.a) / 255),
  };
}

/**
 * Screen blend mode - lightens colors
 * @param color1 - First color
 * @param color2 - Second color
 */
export function screenColors(color1: string | RGBA, color2: string | RGBA): RGBA {
  const c1 = typeof color1 === 'string' ? hexToRGBA(color1) : color1;
  const c2 = typeof color2 === 'string' ? hexToRGBA(color2) : color2;

  return {
    r: 255 - Math.round(((255 - c1.r) * (255 - c2.r)) / 255),
    g: 255 - Math.round(((255 - c1.g) * (255 - c2.g)) / 255),
    b: 255 - Math.round(((255 - c1.b) * (255 - c2.b)) / 255),
    a: c1.a,
  };
}

// =============================================================================
// DITHERING PATTERNS
// =============================================================================

/**
 * 2x2 Bayer dithering matrix
 * Classic ordered dithering for pixel art gradients
 */
export const BAYER_2X2: number[][] = [
  [0, 2],
  [3, 1],
];

/**
 * 4x4 Bayer dithering matrix
 * More detailed ordered dithering for smoother gradients
 */
export const BAYER_4X4: number[][] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * 8x8 Bayer dithering matrix
 * Maximum detail ordered dithering
 */
export const BAYER_8X8: number[][] = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/**
 * Gets the threshold value from a Bayer matrix at a given position
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param matrix - Bayer matrix to use
 */
export function getBayerThreshold(x: number, y: number, matrix: number[][] = BAYER_4X4): number {
  const size = matrix.length;
  const maxValue = size * size;
  return matrix[y % size][x % size] / maxValue;
}

/**
 * Applies ordered dithering to determine which of two colors to use at a pixel
 * @param x - Pixel X coordinate
 * @param y - Pixel Y coordinate
 * @param ratio - Blend ratio (0-1) - higher values favor color2
 * @param color1 - First color
 * @param color2 - Second color
 * @param pattern - Dithering pattern to use
 */
export function ditherPixel(
  x: number,
  y: number,
  ratio: number,
  color1: string | RGBA,
  color2: string | RGBA,
  pattern: DitherPattern = 'bayer4x4'
): RGBA {
  let threshold: number;

  switch (pattern) {
    case 'bayer2x2':
      threshold = getBayerThreshold(x, y, BAYER_2X2);
      break;
    case 'bayer4x4':
      threshold = getBayerThreshold(x, y, BAYER_4X4);
      break;
    case 'ordered':
      threshold = getBayerThreshold(x, y, BAYER_8X8);
      break;
    case 'noise':
      threshold = Math.random();
      break;
    default:
      threshold = getBayerThreshold(x, y, BAYER_4X4);
  }

  const c1 = typeof color1 === 'string' ? hexToRGBA(color1) : color1;
  const c2 = typeof color2 === 'string' ? hexToRGBA(color2) : color2;

  return ratio > threshold ? c2 : c1;
}

/**
 * Creates a dithered gradient between two colors
 * @param width - Width of the gradient in pixels
 * @param height - Height of the gradient in pixels
 * @param color1 - Starting color
 * @param color2 - Ending color
 * @param horizontal - True for horizontal gradient, false for vertical
 * @param pattern - Dithering pattern to use
 */
export function createDitheredGradient(
  width: number,
  height: number,
  color1: string | RGBA,
  color2: string | RGBA,
  horizontal: boolean = true,
  pattern: DitherPattern = 'bayer4x4'
): RGBA[][] {
  const result: RGBA[][] = [];

  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) {
      const ratio = horizontal ? x / (width - 1) : y / (height - 1);
      row.push(ditherPixel(x, y, ratio, color1, color2, pattern));
    }
    result.push(row);
  }

  return result;
}

// =============================================================================
// SHADING UTILITIES
// =============================================================================

/**
 * Generates a highlight color by lightening and slightly desaturating
 * @param baseColor - The base color to highlight
 * @param intensity - Highlight intensity (0-1)
 */
export function generateHighlight(baseColor: string | RGBA, intensity: number = 0.3): RGBA {
  const rgba = typeof baseColor === 'string' ? hexToRGBA(baseColor) : baseColor;
  const hsl = rgbaToHSL(rgba);

  // Increase lightness, slightly decrease saturation
  hsl.l = Math.min(1, hsl.l + intensity * (1 - hsl.l));
  hsl.s = hsl.s * (1 - intensity * 0.2);

  return hslToRGBA(hsl, rgba.a);
}

/**
 * Generates a shadow color by darkening and shifting hue slightly toward blue
 * @param baseColor - The base color to shadow
 * @param intensity - Shadow intensity (0-1)
 */
export function generateShadow(baseColor: string | RGBA, intensity: number = 0.3): RGBA {
  const rgba = typeof baseColor === 'string' ? hexToRGBA(baseColor) : baseColor;
  const hsl = rgbaToHSL(rgba);

  // Decrease lightness, shift hue slightly toward blue for natural shadow
  hsl.l = Math.max(0, hsl.l - intensity * hsl.l);
  hsl.h = (hsl.h + intensity * 15) % 360; // Slight blue shift
  hsl.s = Math.min(1, hsl.s * (1 + intensity * 0.1));

  return hslToRGBA(hsl, rgba.a);
}

/**
 * Generates a complete shading ramp from a base color
 * @param baseColor - The mid-tone color to build the ramp from
 * @param steps - Number of shading steps (default 5)
 */
export function generateShadingRamp(baseColor: string | RGBA, steps: number = 5): RGBA[] {
  const ramp: RGBA[] = [];
  const mid = Math.floor(steps / 2);

  for (let i = 0; i < steps; i++) {
    if (i < mid) {
      // Shadows
      const intensity = (mid - i) / mid * 0.5;
      ramp.push(generateShadow(baseColor, intensity));
    } else if (i === mid) {
      // Base color
      ramp.push(typeof baseColor === 'string' ? hexToRGBA(baseColor) : baseColor);
    } else {
      // Highlights
      const intensity = (i - mid) / (steps - mid - 1) * 0.5;
      ramp.push(generateHighlight(baseColor, intensity));
    }
  }

  return ramp;
}

/**
 * Applies ambient occlusion shading based on surrounding pixel information
 * Useful for adding depth to pixel art edges
 * @param centerColor - The center pixel color
 * @param neighborColors - Array of 8 neighboring pixel colors (clockwise from top)
 * @param strength - AO strength (0-1)
 */
export function applyAmbientOcclusion(
  centerColor: RGBA,
  neighborColors: (RGBA | null)[],
  strength: number = 0.15
): RGBA {
  // Count solid (non-transparent) neighbors
  const solidNeighbors = neighborColors.filter(c => c !== null && c.a > 128).length;
  const aoFactor = (solidNeighbors / 8) * strength;

  return generateShadow(centerColor, aoFactor);
}

// =============================================================================
// COLOR DISTANCE AND MATCHING
// =============================================================================

/**
 * Calculates the Euclidean distance between two colors in RGB space
 * @param color1 - First color
 * @param color2 - Second color
 */
export function colorDistanceRGB(color1: string | RGBA, color2: string | RGBA): number {
  const c1 = typeof color1 === 'string' ? hexToRGBA(color1) : color1;
  const c2 = typeof color2 === 'string' ? hexToRGBA(color2) : color2;

  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;

  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Calculates weighted color distance accounting for human perception
 * (red-mean weighted Euclidean distance)
 * @param color1 - First color
 * @param color2 - Second color
 */
export function colorDistancePerceptual(color1: string | RGBA, color2: string | RGBA): number {
  const c1 = typeof color1 === 'string' ? hexToRGBA(color1) : color1;
  const c2 = typeof color2 === 'string' ? hexToRGBA(color2) : color2;

  const rmean = (c1.r + c2.r) / 2;
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;

  const rWeight = 2 + rmean / 256;
  const gWeight = 4;
  const bWeight = 2 + (255 - rmean) / 256;

  return Math.sqrt(rWeight * dr * dr + gWeight * dg * dg + bWeight * db * db);
}

/**
 * Finds the closest color in a palette to a given target color
 * @param targetColor - The color to match
 * @param palette - Array of palette colors to search
 * @param usePerceptual - Whether to use perceptual color distance
 */
export function findClosestColor(
  targetColor: string | RGBA,
  palette: (string | RGBA)[],
  usePerceptual: boolean = true
): RGBA {
  const target = typeof targetColor === 'string' ? hexToRGBA(targetColor) : targetColor;

  let closestColor = typeof palette[0] === 'string' ? hexToRGBA(palette[0]) : palette[0];
  let minDistance = Infinity;

  const distanceFn = usePerceptual ? colorDistancePerceptual : colorDistanceRGB;

  for (const color of palette) {
    const rgba = typeof color === 'string' ? hexToRGBA(color) : color;
    const distance = distanceFn(target, rgba);

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = rgba;
    }
  }

  return closestColor;
}

/**
 * Quantizes an image to use only colors from a specified palette
 * @param pixels - 2D array of pixel colors
 * @param palette - Palette to quantize to
 * @param useDithering - Whether to apply dithering
 */
export function quantizeToPalette(
  pixels: RGBA[][],
  palette: (string | RGBA)[],
  useDithering: boolean = true
): RGBA[][] {
  const result: RGBA[][] = [];
  const paletteRGBA = palette.map(c => typeof c === 'string' ? hexToRGBA(c) : c);

  for (let y = 0; y < pixels.length; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < pixels[y].length; x++) {
      const pixel = pixels[y][x];

      if (useDithering) {
        // Find two closest colors and dither between them
        let closest1 = paletteRGBA[0];
        let closest2 = paletteRGBA[1] || paletteRGBA[0];
        let dist1 = Infinity;
        let dist2 = Infinity;

        for (const paletteColor of paletteRGBA) {
          const dist = colorDistancePerceptual(pixel, paletteColor);
          if (dist < dist1) {
            dist2 = dist1;
            closest2 = closest1;
            dist1 = dist;
            closest1 = paletteColor;
          } else if (dist < dist2) {
            dist2 = dist;
            closest2 = paletteColor;
          }
        }

        // Calculate ratio for dithering
        const totalDist = dist1 + dist2;
        const ratio = totalDist > 0 ? dist1 / totalDist : 0;

        row.push(ditherPixel(x, y, ratio, closest1, closest2));
      } else {
        row.push(findClosestColor(pixel, paletteRGBA));
      }
    }
    result.push(row);
  }

  return result;
}

// =============================================================================
// PIXEL ART ANTI-ALIASING
// =============================================================================

/**
 * Applies limited-palette anti-aliasing to pixel art edges
 * This creates smoother edges while respecting palette constraints
 * @param pixels - 2D array of pixel colors
 * @param palette - Allowed palette colors
 */
export function applyPixelArtAA(pixels: RGBA[][], palette: (string | RGBA)[]): RGBA[][] {
  const result: RGBA[][] = [];
  const height = pixels.length;
  const width = pixels[0]?.length || 0;
  const paletteRGBA = palette.map(c => typeof c === 'string' ? hexToRGBA(c) : c);

  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) {
      const current = pixels[y][x];

      // Check if this is an edge pixel (different from neighbors)
      const neighbors: (RGBA | null)[] = [
        y > 0 ? pixels[y - 1][x] : null,                    // top
        y > 0 && x < width - 1 ? pixels[y - 1][x + 1] : null, // top-right
        x < width - 1 ? pixels[y][x + 1] : null,            // right
        y < height - 1 && x < width - 1 ? pixels[y + 1][x + 1] : null, // bottom-right
        y < height - 1 ? pixels[y + 1][x] : null,           // bottom
        y < height - 1 && x > 0 ? pixels[y + 1][x - 1] : null, // bottom-left
        x > 0 ? pixels[y][x - 1] : null,                    // left
        y > 0 && x > 0 ? pixels[y - 1][x - 1] : null,       // top-left
      ];

      // Count different colors among neighbors
      const differentNeighbors = neighbors.filter(
        n => n !== null && colorDistanceRGB(current, n) > 30
      );

      // If this is an edge pixel, blend with neighbors
      if (differentNeighbors.length >= 2 && differentNeighbors.length <= 4) {
        const validNeighbors = neighbors.filter(n => n !== null) as RGBA[];
        const blended = blendColors([current, ...validNeighbors.slice(0, 2)]);
        row.push(findClosestColor(blended, paletteRGBA));
      } else {
        row.push(findClosestColor(current, paletteRGBA));
      }
    }
    result.push(row);
  }

  return result;
}

// =============================================================================
// PATTERN GENERATORS
// =============================================================================

/** Simple pseudo-random number generator with seed */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

/**
 * Generates a wood grain pattern
 *
 * Historical context: Wood was essential in Portuguese Goa - teak from India,
 * ebony from Ceylon, and various hardwoods for shipbuilding and construction.
 *
 * @param options - Pattern generation options
 */
export function generateWoodGrainPattern(options: PatternOptions): RGBA[][] {
  const { width, height, scale = 4, variation = 0.3, seed = 12345 } = options;
  const random = new SeededRandom(seed);
  const result: RGBA[][] = [];

  const woodRamp = EXTENDED_RAMPS.WOOD;
  const colors = [
    woodRamp.shadow.rgb,
    woodRamp.dark.rgb,
    woodRamp.mid.rgb,
    woodRamp.light.rgb,
    woodRamp.highlight.rgb,
  ];

  // Generate base grain lines
  const grainLines: number[] = [];
  for (let i = 0; i < height; i++) {
    grainLines.push(random.next() * variation);
  }

  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) {
      // Create grain effect with sine wave modulation
      const grainOffset = grainLines[y];
      const grainValue = Math.sin((x / scale) + grainOffset * 10) * 0.5 + 0.5;

      // Add knots occasionally
      const knotChance = random.next();
      let finalValue = grainValue;

      if (knotChance > 0.995) {
        finalValue = 0.2; // Dark knot
      }

      // Add variation
      finalValue += (random.next() - 0.5) * variation * 0.5;
      finalValue = Math.max(0, Math.min(1, finalValue));

      // Map to color ramp
      const colorIndex = Math.floor(finalValue * (colors.length - 1));
      row.push(colors[colorIndex]);
    }
    result.push(row);
  }

  return result;
}

/**
 * Generates a cobblestone/paving pattern
 *
 * Historical context: The streets of Portuguese Goa were paved with local
 * granite and laterite stone, worn smooth by generations of foot traffic.
 *
 * @param options - Pattern generation options
 */
export function generateStonePattern(options: PatternOptions): RGBA[][] {
  const { width, height, scale = 8, variation = 0.2, seed = 54321 } = options;
  const random = new SeededRandom(seed);
  const result: RGBA[][] = [];

  const stoneRamp = EXTENDED_RAMPS.STONE;
  const mortarColor = generateShadow(stoneRamp.dark.rgb, 0.3);

  // Generate stone positions
  const stoneGrid: { color: RGBA; offsetX: number; offsetY: number }[][] = [];
  for (let gy = 0; gy < Math.ceil(height / scale) + 1; gy++) {
    const row: { color: RGBA; offsetX: number; offsetY: number }[] = [];
    for (let gx = 0; gx < Math.ceil(width / scale) + 1; gx++) {
      // Each stone has slight color variation and position offset
      const colorVariation = random.next();
      let stoneColor: RGBA;

      if (colorVariation < 0.2) {
        stoneColor = stoneRamp.dark.rgb;
      } else if (colorVariation < 0.5) {
        stoneColor = stoneRamp.mid.rgb;
      } else if (colorVariation < 0.8) {
        stoneColor = stoneRamp.light.rgb;
      } else {
        stoneColor = stoneRamp.highlight.rgb;
      }

      row.push({
        color: stoneColor,
        offsetX: (random.next() - 0.5) * scale * variation,
        offsetY: (random.next() - 0.5) * scale * variation,
      });
    }
    stoneGrid.push(row);
  }

  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) {
      const gx = Math.floor(x / scale);
      const gy = Math.floor(y / scale);
      const localX = x % scale;
      const localY = y % scale;

      // Check if we're at a mortar line
      const stone = stoneGrid[gy]?.[gx];
      if (!stone) {
        row.push(mortarColor);
        continue;
      }

      const edgeThreshold = 1;
      const isEdge = localX < edgeThreshold ||
                     localY < edgeThreshold ||
                     localX >= scale - edgeThreshold ||
                     localY >= scale - edgeThreshold;

      if (isEdge) {
        row.push(mortarColor);
      } else {
        // Add subtle variation within stone
        const stoneVariation = (random.next() - 0.5) * 0.1;
        const variedColor = lerpColorRGBA(stone.color, stoneRamp.shadow.rgb, Math.abs(stoneVariation));
        row.push(variedColor);
      }
    }
    result.push(row);
  }

  return result;
}

/**
 * Generates a fabric/textile pattern
 *
 * Historical context: Goa was a major textile trading hub. Cotton from Gujarat,
 * silk from China, and fine muslins were among the most valuable trade goods.
 *
 * @param options - Pattern generation options
 * @param primaryColor - Primary thread color
 * @param secondaryColor - Secondary thread color (for weave pattern)
 */
export function generateFabricPattern(
  options: PatternOptions,
  primaryColor: string | RGBA = MATERIAL_COLORS.CLOTH.RAW_COTTON.hex,
  secondaryColor: string | RGBA = PRIMARY_PALETTE.OCHRE.hex
): RGBA[][] {
  const { width, height, scale = 2, seed = 11111 } = options;
  const random = new SeededRandom(seed);
  const result: RGBA[][] = [];

  const primary = typeof primaryColor === 'string' ? hexToRGBA(primaryColor) : primaryColor;
  const secondary = typeof secondaryColor === 'string' ? hexToRGBA(secondaryColor) : secondaryColor;

  // Generate weave pattern
  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) {
      // Simple plain weave pattern
      const weaveX = Math.floor(x / scale) % 2;
      const weaveY = Math.floor(y / scale) % 2;

      let color: RGBA;
      if ((weaveX + weaveY) % 2 === 0) {
        color = primary;
      } else {
        color = secondary;
      }

      // Add subtle thread variation
      const threadVariation = (random.next() - 0.5) * 0.1;
      color = lerpColorRGBA(color, generateShadow(color, 0.2), Math.abs(threadVariation));

      row.push(color);
    }
    result.push(row);
  }

  return result;
}

/**
 * Generates a water ripple pattern
 *
 * Historical context: The Mandovi River was the lifeblood of Portuguese Goa,
 * with the harbor filled with ships from around the world.
 *
 * @param options - Pattern generation options
 * @param frame - Animation frame (0-7) for animated water
 */
export function generateWaterRipplePattern(
  options: PatternOptions,
  frame: number = 0
): RGBA[][] {
  const { width, height, scale = 4, seed = 99999 } = options;
  const random = new SeededRandom(seed);
  const result: RGBA[][] = [];

  const waterRamp = EXTENDED_RAMPS.BLUE;
  const frameOffset = (frame / 8) * Math.PI * 2;

  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) {
      // Create ripple effect with multiple sine waves
      const wave1 = Math.sin((x / scale + frameOffset) * 0.5) * 0.3;
      const wave2 = Math.sin((y / scale + x / (scale * 2) + frameOffset * 0.7) * 0.8) * 0.2;
      const wave3 = Math.sin((x + y) / (scale * 1.5) + frameOffset * 0.5) * 0.15;

      let rippleValue = 0.5 + wave1 + wave2 + wave3;

      // Add slight random variation for texture
      rippleValue += (random.next() - 0.5) * 0.1;
      rippleValue = Math.max(0, Math.min(1, rippleValue));

      // Map to color
      let color: RGBA;
      if (rippleValue < 0.2) {
        color = waterRamp.shadow.rgb;
      } else if (rippleValue < 0.4) {
        color = waterRamp.dark.rgb;
      } else if (rippleValue < 0.6) {
        color = waterRamp.mid.rgb;
      } else if (rippleValue < 0.8) {
        color = waterRamp.light.rgb;
      } else {
        // Highlights represent light reflections
        color = lerpColorRGBA(waterRamp.highlight.rgb, PRIMARY_PALETTE.WHITEWASH.rgb, (rippleValue - 0.8) * 2);
      }

      row.push(color);
    }
    result.push(row);
  }

  return result;
}

/**
 * Generates a laterite/red earth pattern typical of Goan soil
 *
 * Historical context: Goan soil is characteristically red due to high iron
 * content in the laterite rock that covers much of the region.
 *
 * @param options - Pattern generation options
 */
export function generateLateritePattern(options: PatternOptions): RGBA[][] {
  const { width, height, scale = 3, variation = 0.25, seed = 77777 } = options;
  const random = new SeededRandom(seed);
  const result: RGBA[][] = [];

  const baseColor = ENVIRONMENT_COLORS.GROUND.LATERITE_SOIL.rgb;
  const lightColor = generateHighlight(baseColor, 0.2);
  const darkColor = generateShadow(baseColor, 0.3);

  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) {
      // Create clumpy earth texture
      const noiseValue = random.next();
      const clumpX = Math.floor(x / scale);
      const clumpY = Math.floor(y / scale);
      const clumpSeed = (clumpX * 1000 + clumpY) % 10000;
      const clumpRandom = new SeededRandom(clumpSeed + seed);
      const clumpValue = clumpRandom.next();

      let finalValue = clumpValue * 0.7 + noiseValue * 0.3;
      finalValue += (random.next() - 0.5) * variation;
      finalValue = Math.max(0, Math.min(1, finalValue));

      // Map to colors
      let color: RGBA;
      if (finalValue < 0.3) {
        color = darkColor;
      } else if (finalValue < 0.7) {
        color = baseColor;
      } else {
        color = lightColor;
      }

      row.push(color);
    }
    result.push(row);
  }

  return result;
}

/**
 * Generates a terracotta roof tile pattern
 *
 * Historical context: Portuguese colonial buildings in Goa featured
 * distinctive curved terracotta roof tiles, creating a characteristic
 * red-orange roofscape visible from the harbor.
 *
 * @param options - Pattern generation options
 */
export function generateRoofTilePattern(options: PatternOptions): RGBA[][] {
  const { width, height, scale = 6, variation = 0.15, seed = 33333 } = options;
  const random = new SeededRandom(seed);
  const result: RGBA[][] = [];

  const terracottaRamp = EXTENDED_RAMPS.TERRACOTTA;

  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    const tileRow = Math.floor(y / scale);
    const rowOffset = (tileRow % 2) * (scale / 2); // Offset alternate rows

    for (let x = 0; x < width; x++) {
      const adjustedX = x + rowOffset;
      const localY = y % scale;
      const tileX = Math.floor(adjustedX / scale);

      // Create curved tile appearance
      const curvePosition = localY / scale;
      const curveValue = Math.sin(curvePosition * Math.PI) * 0.3 + 0.5;

      // Tile edge detection
      const localX = adjustedX % scale;
      const isEdge = localX === 0 || localY === 0;

      // Calculate final color value
      let colorValue = curveValue;
      colorValue += (random.next() - 0.5) * variation;

      // Add per-tile color variation
      const tileSeed = tileX * 1000 + tileRow;
      const tileRandom = new SeededRandom(tileSeed + seed);
      colorValue += (tileRandom.next() - 0.5) * 0.2;

      colorValue = Math.max(0, Math.min(1, colorValue));

      // Map to color
      let color: RGBA;
      if (isEdge) {
        color = terracottaRamp.shadow.rgb;
      } else if (colorValue < 0.25) {
        color = terracottaRamp.shadow.rgb;
      } else if (colorValue < 0.45) {
        color = terracottaRamp.dark.rgb;
      } else if (colorValue < 0.65) {
        color = terracottaRamp.mid.rgb;
      } else if (colorValue < 0.85) {
        color = terracottaRamp.light.rgb;
      } else {
        color = terracottaRamp.highlight.rgb;
      }

      row.push(color);
    }
    result.push(row);
  }

  return result;
}

// =============================================================================
// UTILITY FUNCTIONS FOR PHASER INTEGRATION
// =============================================================================

/**
 * Creates a Phaser-compatible color integer array from a pattern
 * @param pattern - 2D array of RGBA colors
 */
export function patternToColorInts(pattern: RGBA[][]): number[][] {
  return pattern.map(row => row.map(pixel => colorToInt(pixel)));
}

/**
 * Flattens a pattern to a Uint8ClampedArray for canvas ImageData
 * @param pattern - 2D array of RGBA colors
 */
export function patternToImageData(pattern: RGBA[][]): Uint8ClampedArray {
  const height = pattern.length;
  const width = pattern[0]?.length || 0;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = pattern[y][x];
      const index = (y * width + x) * 4;
      data[index] = pixel.r;
      data[index + 1] = pixel.g;
      data[index + 2] = pixel.b;
      data[index + 3] = pixel.a;
    }
  }

  return data;
}

/**
 * Gets all primary palette colors as an array of hex strings
 */
export function getPrimaryPaletteHex(): string[] {
  return Object.values(PRIMARY_PALETTE).map(entry => entry.hex);
}

/**
 * Gets all primary palette colors as an array of RGBA objects
 */
export function getPrimaryPaletteRGBA(): RGBA[] {
  return Object.values(PRIMARY_PALETTE).map(entry => entry.rgb);
}

/**
 * Gets the complete extended palette (all color ramps) as hex strings
 */
export function getExtendedPaletteHex(): string[] {
  const colors: string[] = [];

  for (const ramp of Object.values(EXTENDED_RAMPS)) {
    colors.push(ramp.highlight.hex);
    colors.push(ramp.light.hex);
    colors.push(ramp.mid.hex);
    colors.push(ramp.dark.hex);
    colors.push(ramp.shadow.hex);
  }

  return colors;
}

/**
 * Gets skin tone colors for a specific ethnicity
 * @param ethnicity - The ethnicity key from SKIN_TONES
 */
export function getSkinToneRamp(ethnicity: keyof typeof SKIN_TONES): ExtendedColorRamp {
  return SKIN_TONES[ethnicity];
}

/**
 * Converts a legacy ColorRamp to ExtendedColorRamp format
 * @param ramp - Legacy 4-level color ramp
 * @param name - Name for the converted ramp
 */
export function legacyRampToExtended(ramp: ColorRamp, name: string): ExtendedColorRamp {
  const highlightRGBA = intToRGBA(ramp.highlight);
  const baseRGBA = intToRGBA(ramp.base);
  const shadowRGBA = intToRGBA(ramp.shadow);
  const deepRGBA = intToRGBA(ramp.deep);

  // Generate a light color between highlight and base
  const lightRGBA = lerpColorRGBA(highlightRGBA, baseRGBA, 0.5);

  return {
    name,
    highlight: { name: `${name} Highlight`, hex: intToHex(ramp.highlight), rgb: highlightRGBA, usage: 'Brightest areas' },
    light: { name: `${name} Light`, hex: rgbaToHex(lightRGBA), rgb: lightRGBA, usage: 'Light areas' },
    mid: { name: `${name} Mid`, hex: intToHex(ramp.base), rgb: baseRGBA, usage: 'Base tone' },
    dark: { name: `${name} Dark`, hex: intToHex(ramp.shadow), rgb: shadowRGBA, usage: 'Shaded areas' },
    shadow: { name: `${name} Shadow`, hex: intToHex(ramp.deep), rgb: deepRGBA, usage: 'Deepest shadows' },
  };
}

// =============================================================================
// DEFAULT EXPORTS
// =============================================================================

/**
 * Complete Goa 1590 palette system export
 */
export const GoaPalette = {
  // Primary colors
  primary: PRIMARY_PALETTE,

  // Extended color ramps
  ramps: EXTENDED_RAMPS,

  // Skin tones
  skinTones: SKIN_TONES,

  // Material colors
  materials: MATERIAL_COLORS,

  // Environmental colors
  environment: ENVIRONMENT_COLORS,

  // Legacy ramps (backward compatibility)
  legacy: {
    COBBLESTONE,
    DIRT,
    SAND,
    GRASS,
    WATER_HARBOR,
    WATER_DEEP,
    WATER_RIVER,
    WHITEWASH,
    TERRACOTTA,
    WOOD_DARK,
    WOOD_LIGHT,
    STONE,
    PALM_FROND,
    PALM_TRUNK,
    SILK_GOLD,
    FABRIC_RED,
    FABRIC_BLUE,
    FABRIC_GREEN,
    FABRIC_CREAM,
    SKIN_LIGHT,
    SKIN_MEDIUM,
    SKIN_DARK,
    GOLD,
    IRON,
    MOSS,
  },

  // Utility functions
  utils: {
    hexToRGBA,
    rgbaToHex,
    rgbaToHSL,
    hslToRGBA,
    colorToInt,
    intToRGBA,
    intToHex,
    lerpColor,
    lerpColorRGBA,
    getRampColor,
    addColorNoise,
    blendAlpha,
    blendColors,
    multiplyColors,
    screenColors,
    generateHighlight,
    generateShadow,
    generateShadingRamp,
    colorDistanceRGB,
    colorDistancePerceptual,
    findClosestColor,
    quantizeToPalette,
    applyPixelArtAA,
    applyAmbientOcclusion,
    legacyRampToExtended,
  },

  // Dithering
  dither: {
    BAYER_2X2,
    BAYER_4X4,
    BAYER_8X8,
    getBayerThreshold,
    ditherPixel,
    createDitheredGradient,
  },

  // Pattern generators
  patterns: {
    generateWoodGrainPattern,
    generateStonePattern,
    generateFabricPattern,
    generateWaterRipplePattern,
    generateLateritePattern,
    generateRoofTilePattern,
    patternToColorInts,
    patternToImageData,
  },

  // Palette helpers
  getPrimaryPaletteHex,
  getPrimaryPaletteRGBA,
  getExtendedPaletteHex,
  getSkinToneRamp,
};

export default GoaPalette;
