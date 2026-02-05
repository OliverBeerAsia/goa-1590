/**
 * Effects and Particle Generator for Goa 1590
 *
 * Procedurally generates weather particles, ambient effects, interaction feedback,
 * lighting overlays, and screen effects for the trading game set in Portuguese India.
 *
 * All effects are generated as Phaser-compatible textures with proper alpha channels.
 *
 * @module art/generators/EffectsGenerator
 */

import {
  RGBA,
  hexToRGBA,
  patternToImageData,
  ENVIRONMENT_COLORS,
  PRIMARY_PALETTE,
} from '../palette';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Configuration for generated effect textures
 */
export interface EffectConfig {
  width: number;
  height: number;
  frames: number;
  frameWidth?: number;
  frameHeight?: number;
}

/**
 * Result of generating an effect spritesheet
 */
export interface GeneratedEffect {
  name: string;
  width: number;
  height: number;
  frames: number;
  frameWidth: number;
  frameHeight: number;
  data: Uint8ClampedArray;
  loop: boolean;
}

/**
 * Options for particle generation
 */
export interface ParticleOptions {
  seed?: number;
  intensity?: number;
  angle?: number;
  speed?: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Simple seeded random number generator for reproducible effects
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Create an empty RGBA pixel array
 */
function createPixelArray(width: number, height: number): RGBA[][] {
  const pixels: RGBA[][] = [];
  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ r: 0, g: 0, b: 0, a: 0 });
    }
    pixels.push(row);
  }
  return pixels;
}

/**
 * Set a pixel with bounds checking
 */
function setPixel(pixels: RGBA[][], x: number, y: number, color: RGBA): void {
  if (x >= 0 && x < pixels[0].length && y >= 0 && y < pixels.length) {
    pixels[y][x] = color;
  }
}

/**
 * Get a pixel with bounds checking
 */
function getPixel(pixels: RGBA[][], x: number, y: number): RGBA | null {
  if (x >= 0 && x < pixels[0].length && y >= 0 && y < pixels.length) {
    return pixels[y][x];
  }
  return null;
}

/**
 * Draw a line with anti-aliasing (Xiaolin Wu's algorithm)
 */
function drawLineAA(
  pixels: RGBA[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: RGBA
): void {
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

  if (steep) {
    [x0, y0] = [y0, x0];
    [x1, y1] = [y1, x1];
  }

  if (x0 > x1) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const gradient = dx === 0 ? 1 : dy / dx;

  // Handle first endpoint
  let xend = Math.round(x0);
  let yend = y0 + gradient * (xend - x0);
  let xpxl1 = xend;
  // ypxl1 reserved for future use in endpoint drawing
  // let ypxl1 = Math.floor(yend);

  // Main loop
  let intery = yend + gradient;

  for (let x = xpxl1; x <= Math.round(x1); x++) {
    const alpha = color.a * (1 - (intery - Math.floor(intery)));
    const alpha2 = color.a * (intery - Math.floor(intery));

    if (steep) {
      setPixel(pixels, Math.floor(intery), x, { ...color, a: Math.round(alpha) });
      setPixel(pixels, Math.floor(intery) + 1, x, { ...color, a: Math.round(alpha2) });
    } else {
      setPixel(pixels, x, Math.floor(intery), { ...color, a: Math.round(alpha) });
      setPixel(pixels, x, Math.floor(intery) + 1, { ...color, a: Math.round(alpha2) });
    }
    intery += gradient;
  }
}

/**
 * Draw a filled circle with optional blur/glow
 */
function drawCircle(
  pixels: RGBA[][],
  cx: number,
  cy: number,
  radius: number,
  color: RGBA,
  glow: boolean = false
): void {
  const r2 = radius * radius;

  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const dist2 = x * x + y * y;

      if (dist2 <= r2) {
        let alpha = color.a;

        if (glow) {
          // Soft falloff for glow effect
          const dist = Math.sqrt(dist2);
          alpha = Math.round(color.a * (1 - dist / radius));
        }

        setPixel(pixels, cx + x, cy + y, { ...color, a: alpha });
      }
    }
  }
}

/**
 * Create a spritesheet from multiple frames
 */
function createSpritesheet(frames: RGBA[][][], frameWidth: number, frameHeight: number): Uint8ClampedArray {
  const numFrames = frames.length;
  const sheetWidth = frameWidth * numFrames;
  const sheetHeight = frameHeight;
  const data = new Uint8ClampedArray(sheetWidth * sheetHeight * 4);

  for (let f = 0; f < numFrames; f++) {
    const frame = frames[f];
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const pixel = frame[y]?.[x] || { r: 0, g: 0, b: 0, a: 0 };
        const sheetX = f * frameWidth + x;
        const index = (y * sheetWidth + sheetX) * 4;
        data[index] = pixel.r;
        data[index + 1] = pixel.g;
        data[index + 2] = pixel.b;
        data[index + 3] = pixel.a;
      }
    }
  }

  return data;
}

// =============================================================================
// WEATHER PARTICLES
// =============================================================================

/**
 * Generates rain drop particle sprites (8x16, 4 animation frames)
 * Creates diagonal streaks with splash effect at bottom
 */
export function generateRainDrops(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 12345, intensity = 0.8, angle = 15 } = options;
  const random = new SeededRandom(seed);

  const frameWidth = 8;
  const frameHeight = 16;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  // Rain colors - light blue-grey with transparency
  const rainHighlight: RGBA = { r: 200, g: 220, b: 255, a: Math.round(255 * intensity) };
  const rainMid: RGBA = { r: 150, g: 180, b: 220, a: Math.round(200 * intensity) };
  // rainDark reserved for future rain variations
  // const rainDark: RGBA = { r: 100, g: 140, b: 180, a: Math.round(150 * intensity) };
  const splashColor: RGBA = { r: 180, g: 200, b: 240, a: Math.round(180 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);

    // Calculate drop position based on frame (falling animation)
    const dropProgress = f / numFrames;
    const dropLength = 8;
    const startY = Math.floor(dropProgress * 4);

    // Draw the rain streak
    const angleRad = (angle * Math.PI) / 180;
    const dx = Math.sin(angleRad) * dropLength;
    const dy = Math.cos(angleRad) * dropLength;

    const startX = frameWidth / 2 - dx / 2;
    const endX = startX + dx;
    const endY = startY + dy;

    // Main streak
    drawLineAA(pixels, startX, startY, endX, Math.min(endY, frameHeight - 4), rainMid);

    // Highlight on upper portion
    if (startY < frameHeight - 6) {
      setPixel(pixels, Math.floor(startX), startY, rainHighlight);
      setPixel(pixels, Math.floor(startX), startY + 1, rainHighlight);
    }

    // Splash effect at bottom frames
    if (f >= 2) {
      const splashY = frameHeight - 2;
      const splashX = frameWidth / 2;
      // splashRadius reserved for future use in animated splashes
      // const splashRadius = f === 2 ? 1 : 2;

      // Create splash particles
      for (let i = 0; i < 3; i++) {
        const offsetX = (random.next() - 0.5) * 4;
        const offsetY = random.next() * -2;
        setPixel(
          pixels,
          Math.floor(splashX + offsetX),
          Math.floor(splashY + offsetY),
          { ...splashColor, a: Math.round(splashColor.a * (1 - i * 0.3)) }
        );
      }

      // Center splash
      setPixel(pixels, Math.floor(splashX), splashY, splashColor);
      if (f === 3) {
        setPixel(pixels, Math.floor(splashX - 1), splashY, { ...splashColor, a: 100 });
        setPixel(pixels, Math.floor(splashX + 1), splashY, { ...splashColor, a: 100 });
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'rain-drop',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates heavy rain particles (denser, more angled)
 */
export function generateHeavyRain(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 54321, intensity = 1.0, angle = 25 } = options;
  const random = new SeededRandom(seed);

  const frameWidth = 8;
  const frameHeight = 16;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  const rainColor: RGBA = { r: 180, g: 200, b: 230, a: Math.round(220 * intensity) };
  const rainHighlight: RGBA = { r: 220, g: 235, b: 255, a: Math.round(255 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);

    const dropProgress = f / numFrames;
    const dropLength = 10;
    const angleRad = (angle * Math.PI) / 180;

    // Draw multiple rain streaks for heavy rain
    for (let streak = 0; streak < 2; streak++) {
      const offsetX = streak * 3 - 1;
      const offsetY = streak * 2;

      const startY = Math.floor(dropProgress * 5) + offsetY;
      const startX = 2 + offsetX;

      const dx = Math.sin(angleRad) * dropLength;
      const dy = Math.cos(angleRad) * dropLength;

      // Draw thicker streak
      drawLineAA(pixels, startX, startY, startX + dx, Math.min(startY + dy, frameHeight - 1), rainColor);

      // Add highlight
      if (startY >= 0 && startY < frameHeight) {
        setPixel(pixels, Math.floor(startX), startY, rainHighlight);
      }
    }

    // Heavy splash at bottom
    if (f >= 2) {
      const splashY = frameHeight - 2;
      for (let i = 0; i < 5; i++) {
        const splashX = random.nextInt(1, frameWidth - 2);
        const alpha = Math.round(150 * (1 - i * 0.15) * intensity);
        setPixel(pixels, splashX, splashY, { r: 200, g: 220, b: 250, a: alpha });
        setPixel(pixels, splashX, splashY - 1, { r: 200, g: 220, b: 250, a: Math.round(alpha * 0.5) });
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'heavy-rain',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates dust particle sprites (16x16, 4 frames) - swirling motes
 */
export function generateDustParticles(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 11111, intensity = 0.6 } = options;
  // random is used indirectly via SeededRandom instances per mote
  void new SeededRandom(seed);

  const frameWidth = 16;
  const frameHeight = 16;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  // Dust colors - ochre/sand tones
  const dustColors: RGBA[] = [
    { ...hexToRGBA(PRIMARY_PALETTE.OCHRE.hex), a: Math.round(100 * intensity) },
    { ...hexToRGBA(PRIMARY_PALETTE.HEMP.hex), a: Math.round(80 * intensity) },
    { ...hexToRGBA(ENVIRONMENT_COLORS.GROUND.DUST.hex), a: Math.round(120 * intensity) },
  ];

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const frameAngle = (f / numFrames) * Math.PI * 2;

    // Generate swirling dust motes
    for (let mote = 0; mote < 5; mote++) {
      const baseSeed = seed + mote * 1000;
      const moteRandom = new SeededRandom(baseSeed);

      // Base position with swirl offset
      const baseX = moteRandom.next() * (frameWidth - 4) + 2;
      const baseY = moteRandom.next() * (frameHeight - 4) + 2;

      // Swirl around base position
      const swirlRadius = 2 + moteRandom.next() * 2;
      const swirlOffset = moteRandom.next() * Math.PI * 2;
      const x = Math.floor(baseX + Math.cos(frameAngle + swirlOffset) * swirlRadius);
      const y = Math.floor(baseY + Math.sin(frameAngle + swirlOffset) * swirlRadius);

      const color = dustColors[mote % dustColors.length];

      // Draw mote (1-2 pixels with soft edges)
      setPixel(pixels, x, y, color);

      if (moteRandom.next() > 0.5) {
        setPixel(pixels, x + 1, y, { ...color, a: Math.round(color.a * 0.5) });
      }
      if (moteRandom.next() > 0.5) {
        setPixel(pixels, x, y + 1, { ...color, a: Math.round(color.a * 0.5) });
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'dust-particles',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates heat shimmer overlay effect
 */
export function generateHeatShimmer(options: ParticleOptions = {}): GeneratedEffect {
  const { intensity = 0.3 } = options;
  // seed not used in this deterministic wave-based effect

  const frameWidth = 32;
  const frameHeight = 32;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const phase = (f / numFrames) * Math.PI * 2;

    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        // Create wavy distortion pattern
        const wave1 = Math.sin((y / 4 + phase) * 0.8) * 0.5;
        const wave2 = Math.sin((x / 6 + phase * 0.7) * 0.6) * 0.3;
        const distortion = (wave1 + wave2) * 0.5 + 0.5;

        // Very subtle warm tint with varying alpha
        const alpha = Math.round(distortion * 40 * intensity);
        if (alpha > 5) {
          // Warm yellow-orange tint
          setPixel(pixels, x, y, {
            r: 255,
            g: 240,
            b: 200,
            a: alpha,
          });
        }
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'heat-shimmer',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates fog wisp sprites (32x32, semi-transparent)
 */
export function generateFogWisps(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 33333, intensity = 0.4 } = options;
  // random is used indirectly via SeededRandom instances per blob
  void new SeededRandom(seed);

  const frameWidth = 32;
  const frameHeight = 32;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  const fogColor: RGBA = { r: 220, g: 225, b: 235, a: Math.round(80 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const framePhase = f / numFrames;

    // Generate several fog blobs
    for (let blob = 0; blob < 3; blob++) {
      const blobSeed = seed + blob * 500;
      const blobRandom = new SeededRandom(blobSeed);

      const centerX = blobRandom.next() * (frameWidth - 10) + 5;
      const centerY = blobRandom.next() * (frameHeight - 10) + 5;

      // Drift based on frame
      const driftX = Math.sin(framePhase * Math.PI * 2 + blob) * 2;
      const driftY = Math.cos(framePhase * Math.PI * 2 + blob * 0.5) * 1;

      const blobX = centerX + driftX;
      const blobY = centerY + driftY;

      const radius = 4 + blobRandom.next() * 4;

      // Draw soft blob
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const falloff = 1 - dist / radius;
            const alpha = Math.round(fogColor.a * falloff * falloff);

            const px = Math.floor(blobX + dx);
            const py = Math.floor(blobY + dy);
            const existing = getPixel(pixels, px, py);

            if (existing) {
              // Additive blending for overlapping fog
              setPixel(pixels, px, py, {
                r: fogColor.r,
                g: fogColor.g,
                b: fogColor.b,
                a: Math.min(255, existing.a + alpha),
              });
            }
          }
        }
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'fog-wisps',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

// =============================================================================
// AMBIENT PARTICLES
// =============================================================================

/**
 * Generates firefly particles (4x4, glowing, 4 frames)
 */
export function generateFireflies(options: ParticleOptions = {}): GeneratedEffect {
  const { intensity = 1.0 } = options;
  // seed not used in this simple glow animation

  const frameWidth = 4;
  const frameHeight = 4;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  // Firefly glow colors - warm yellow-green
  const glowColors: RGBA[] = [
    { r: 200, g: 255, b: 100, a: Math.round(255 * intensity) },    // Bright
    { r: 180, g: 240, b: 80, a: Math.round(200 * intensity) },     // Medium
    { r: 150, g: 220, b: 60, a: Math.round(120 * intensity) },     // Dim
    { r: 180, g: 240, b: 80, a: Math.round(200 * intensity) },     // Medium
  ];

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const glowIntensity = glowColors[f];

    // Center bright pixel
    setPixel(pixels, 1, 1, glowIntensity);
    setPixel(pixels, 2, 1, glowIntensity);
    setPixel(pixels, 1, 2, glowIntensity);
    setPixel(pixels, 2, 2, glowIntensity);

    // Glow halo (reduced alpha)
    const haloAlpha = Math.round(glowIntensity.a * 0.3);
    const haloColor = { ...glowIntensity, a: haloAlpha };

    setPixel(pixels, 0, 1, haloColor);
    setPixel(pixels, 3, 1, haloColor);
    setPixel(pixels, 0, 2, haloColor);
    setPixel(pixels, 3, 2, haloColor);
    setPixel(pixels, 1, 0, haloColor);
    setPixel(pixels, 2, 0, haloColor);
    setPixel(pixels, 1, 3, haloColor);
    setPixel(pixels, 2, 3, haloColor);

    // Corner glow (even dimmer)
    const cornerAlpha = Math.round(glowIntensity.a * 0.15);
    const cornerColor = { ...glowIntensity, a: cornerAlpha };

    setPixel(pixels, 0, 0, cornerColor);
    setPixel(pixels, 3, 0, cornerColor);
    setPixel(pixels, 0, 3, cornerColor);
    setPixel(pixels, 3, 3, cornerColor);

    frames.push(pixels);
  }

  return {
    name: 'fireflies',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates smoke wisp sprites (16x32, rising, 6 frames)
 */
export function generateSmokeWisps(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 55555, intensity = 0.7 } = options;
  // random is used indirectly via SeededRandom instances per blob
  void new SeededRandom(seed);

  const frameWidth = 16;
  const frameHeight = 32;
  const numFrames = 6;
  const frames: RGBA[][][] = [];

  // Smoke colors - grey gradient
  const smokeBase: RGBA = { r: 80, g: 80, b: 90, a: Math.round(150 * intensity) };
  const smokeLight: RGBA = { r: 120, g: 120, b: 130, a: Math.round(100 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const riseProgress = f / numFrames;

    // Generate smoke blobs that rise and dissipate
    for (let blob = 0; blob < 4; blob++) {
      const blobSeed = seed + blob * 300 + f * 50;
      const blobRandom = new SeededRandom(blobSeed);

      // Calculate blob position (rises and spreads)
      const baseY = frameHeight - 4 - riseProgress * (frameHeight - 8);
      const spreadX = (blobRandom.next() - 0.5) * (4 + riseProgress * 6);
      const centerX = frameWidth / 2 + spreadX + (blobRandom.next() - 0.5) * 2;
      const centerY = baseY - blob * 4;

      // Blob radius increases as it rises (dissipation)
      const radius = 2 + riseProgress * 2 + blobRandom.next() * 2;

      // Alpha decreases as it rises
      const blobAlpha = (1 - riseProgress * 0.7 - blob * 0.1);

      // Draw soft smoke blob
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const falloff = 1 - dist / radius;
            const color = blob % 2 === 0 ? smokeBase : smokeLight;
            const alpha = Math.round(color.a * falloff * falloff * blobAlpha);

            const px = Math.floor(centerX + dx);
            const py = Math.floor(centerY + dy);

            if (alpha > 5) {
              const existing = getPixel(pixels, px, py);
              if (existing) {
                setPixel(pixels, px, py, {
                  r: color.r,
                  g: color.g,
                  b: color.b,
                  a: Math.min(255, existing.a + alpha),
                });
              }
            }
          }
        }
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'smoke-wisps',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates incense smoke for cathedral scenes (thin wispy)
 */
export function generateIncenseSmoke(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 66666, intensity = 0.5 } = options;
  const random = new SeededRandom(seed);

  const frameWidth = 8;
  const frameHeight = 32;
  const numFrames = 8;
  const frames: RGBA[][][] = [];

  // Incense smoke - slightly blue-white
  const incenseColor: RGBA = { r: 200, g: 200, b: 220, a: Math.round(100 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const phase = (f / numFrames) * Math.PI * 2;

    // Create a thin, winding smoke trail
    const centerX = frameWidth / 2;

    for (let y = 0; y < frameHeight; y++) {
      // Sinusoidal winding pattern
      const waveAmplitude = 1 + (1 - y / frameHeight) * 2;
      const waveFreq = 0.3 + (y / frameHeight) * 0.2;
      const offsetX = Math.sin(y * waveFreq + phase) * waveAmplitude;

      const x = Math.floor(centerX + offsetX);

      // Alpha fades as it rises
      const heightFactor = 1 - y / frameHeight;
      const alpha = Math.round(incenseColor.a * heightFactor * heightFactor);

      if (alpha > 5) {
        setPixel(pixels, x, y, { ...incenseColor, a: alpha });

        // Occasional widening
        if (random.next() > 0.7 && heightFactor < 0.5) {
          setPixel(pixels, x + 1, y, { ...incenseColor, a: Math.round(alpha * 0.5) });
        }
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'incense-smoke',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates torch spark particles (tiny orange particles)
 */
export function generateTorchSparks(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 77777, intensity = 1.0 } = options;
  const random = new SeededRandom(seed);

  const frameWidth = 8;
  const frameHeight = 8;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  // Spark colors - orange to yellow
  const sparkColors: RGBA[] = [
    { r: 255, g: 200, b: 50, a: Math.round(255 * intensity) },
    { r: 255, g: 150, b: 30, a: Math.round(255 * intensity) },
    { r: 255, g: 100, b: 20, a: Math.round(200 * intensity) },
    { r: 200, g: 80, b: 20, a: Math.round(150 * intensity) },
  ];

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);

    // Generate 3-5 sparks per frame
    const numSparks = random.nextInt(3, 5);

    for (let s = 0; s < numSparks; s++) {
      const sparkSeed = seed + f * 100 + s * 10;
      const sparkRandom = new SeededRandom(sparkSeed);

      // Spark position - rising and spreading
      const baseX = frameWidth / 2;
      const baseY = frameHeight - 1;

      const riseProgress = (f + sparkRandom.next()) / numFrames;
      const spreadX = (sparkRandom.next() - 0.5) * riseProgress * 6;
      const riseY = riseProgress * (frameHeight - 2);

      const x = Math.floor(baseX + spreadX);
      const y = Math.floor(baseY - riseY);

      // Color gets dimmer as it rises
      const colorIndex = Math.min(sparkColors.length - 1, Math.floor(riseProgress * sparkColors.length));
      const sparkColor = sparkColors[colorIndex];

      // Draw single pixel spark
      setPixel(pixels, x, y, sparkColor);

      // Occasional trail pixel
      if (sparkRandom.next() > 0.5 && y < frameHeight - 1) {
        setPixel(pixels, x, y + 1, { ...sparkColor, a: Math.round(sparkColor.a * 0.3) });
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'torch-sparks',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates sea spray particles for harbor area
 */
export function generateSeaSpray(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 88888, intensity = 0.6 } = options;
  const random = new SeededRandom(seed);

  const frameWidth = 16;
  const frameHeight = 16;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  // Sea spray colors - light blue-white
  const sprayColor: RGBA = { r: 220, g: 240, b: 255, a: Math.round(180 * intensity) };
  const foamColor: RGBA = { r: 250, g: 255, b: 255, a: Math.round(200 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);

    // Generate spray droplets
    const numDroplets = 6 + random.nextInt(0, 4);
    const frameProgress = f / numFrames;

    for (let d = 0; d < numDroplets; d++) {
      const dropletSeed = seed + f * 50 + d * 20;
      const dropletRandom = new SeededRandom(dropletSeed);

      // Parabolic trajectory
      const startX = dropletRandom.next() * (frameWidth - 4) + 2;
      const startY = frameHeight - 2;
      const velocityX = (dropletRandom.next() - 0.5) * 4;
      const velocityY = -3 - dropletRandom.next() * 3;

      const time = frameProgress + dropletRandom.next() * 0.3;
      const gravity = 4;

      const x = Math.floor(startX + velocityX * time);
      const y = Math.floor(startY + velocityY * time + 0.5 * gravity * time * time);

      // Alpha decreases over time
      const alpha = Math.round(sprayColor.a * (1 - time * 0.5));

      if (y >= 0 && y < frameHeight && x >= 0 && x < frameWidth && alpha > 10) {
        const color = dropletRandom.next() > 0.3 ? sprayColor : foamColor;
        setPixel(pixels, x, y, { ...color, a: alpha });
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'sea-spray',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

// =============================================================================
// INTERACTION EFFECTS
// =============================================================================

/**
 * Generates gold coin sparkle effect for trades
 */
export function generateGoldSparkle(options: ParticleOptions = {}): GeneratedEffect {
  const { intensity = 1.0 } = options;
  // seed not used in this deterministic phase-based animation

  const frameWidth = 16;
  const frameHeight = 16;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  // Gold colors
  const goldBright: RGBA = { r: 255, g: 240, b: 150, a: Math.round(255 * intensity) };
  const goldMid: RGBA = { r: 255, g: 215, b: 0, a: Math.round(230 * intensity) };
  const goldDark: RGBA = { r: 200, g: 160, b: 0, a: Math.round(200 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const phase = (f / numFrames) * Math.PI * 2;

    const centerX = frameWidth / 2;
    const centerY = frameHeight / 2;

    // Create starburst pattern
    const numRays = 8;
    for (let ray = 0; ray < numRays; ray++) {
      const angle = (ray / numRays) * Math.PI * 2 + phase;
      const length = 4 + Math.sin(phase * 2 + ray) * 2;

      for (let dist = 0; dist < length; dist++) {
        const x = Math.floor(centerX + Math.cos(angle) * dist);
        const y = Math.floor(centerY + Math.sin(angle) * dist);

        const falloff = 1 - dist / length;
        const color = dist < 2 ? goldBright : dist < 4 ? goldMid : goldDark;

        setPixel(pixels, x, y, {
          ...color,
          a: Math.round(color.a * falloff),
        });
      }
    }

    // Central glow
    drawCircle(pixels, centerX, centerY, 2, goldBright, true);

    // Sparkle points
    const sparkleRadius = 5 + Math.sin(phase) * 2;
    for (let s = 0; s < 4; s++) {
      const sparkleAngle = (s / 4) * Math.PI * 2 + phase * 0.5;
      const sx = Math.floor(centerX + Math.cos(sparkleAngle) * sparkleRadius);
      const sy = Math.floor(centerY + Math.sin(sparkleAngle) * sparkleRadius);
      setPixel(pixels, sx, sy, goldBright);
    }

    frames.push(pixels);
  }

  return {
    name: 'gold-sparkle',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates quest complete burst effect (star particles)
 */
export function generateQuestCompleteBurst(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 11111, intensity = 1.0 } = options;
  // random is used indirectly via SeededRandom instances per star
  void new SeededRandom(seed);

  const frameWidth = 32;
  const frameHeight = 32;
  const numFrames = 8;
  const frames: RGBA[][][] = [];

  // Celebration colors - gold, white, light blue
  const starColors: RGBA[] = [
    { r: 255, g: 240, b: 150, a: Math.round(255 * intensity) },
    { r: 255, g: 255, b: 255, a: Math.round(255 * intensity) },
    { r: 200, g: 230, b: 255, a: Math.round(230 * intensity) },
  ];

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const burstProgress = f / (numFrames - 1);

    const centerX = frameWidth / 2;
    const centerY = frameHeight / 2;

    // Generate expanding star particles
    const numStars = 12;
    for (let s = 0; s < numStars; s++) {
      const starSeed = seed + s * 100;
      const starRandom = new SeededRandom(starSeed);

      const angle = (s / numStars) * Math.PI * 2 + starRandom.next() * 0.3;
      const speed = 8 + starRandom.next() * 6;
      const distance = burstProgress * speed;

      const x = Math.floor(centerX + Math.cos(angle) * distance);
      const y = Math.floor(centerY + Math.sin(angle) * distance);

      // Fade out as it expands
      const alpha = 1 - burstProgress * 0.8;
      const color = starColors[s % starColors.length];

      if (alpha > 0.1) {
        // Draw 4-pointed star shape
        setPixel(pixels, x, y, { ...color, a: Math.round(color.a * alpha) });
        setPixel(pixels, x - 1, y, { ...color, a: Math.round(color.a * alpha * 0.5) });
        setPixel(pixels, x + 1, y, { ...color, a: Math.round(color.a * alpha * 0.5) });
        setPixel(pixels, x, y - 1, { ...color, a: Math.round(color.a * alpha * 0.5) });
        setPixel(pixels, x, y + 1, { ...color, a: Math.round(color.a * alpha * 0.5) });
      }
    }

    // Central flash (only first few frames)
    if (f < 3) {
      const flashAlpha = 1 - f / 3;
      const flashRadius = 4 - f;
      drawCircle(
        pixels,
        centerX,
        centerY,
        flashRadius,
        { r: 255, g: 255, b: 255, a: Math.round(200 * flashAlpha * intensity) },
        true
      );
    }

    frames.push(pixels);
  }

  return {
    name: 'quest-complete-burst',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: false,
  };
}

/**
 * Generates reputation change indicator (up/down arrows with glow)
 */
export function generateReputationIndicator(isPositive: boolean, options: ParticleOptions = {}): GeneratedEffect {
  const { intensity = 1.0 } = options;
  // seed not used in this deterministic animation

  const frameWidth = 16;
  const frameHeight = 24;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  // Colors based on positive/negative
  const arrowColor: RGBA = isPositive
    ? { r: 100, g: 255, b: 100, a: Math.round(255 * intensity) }
    : { r: 255, g: 100, b: 100, a: Math.round(255 * intensity) };

  const glowColor: RGBA = isPositive
    ? { r: 150, g: 255, b: 150, a: Math.round(100 * intensity) }
    : { r: 255, g: 150, b: 150, a: Math.round(100 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const floatOffset = Math.sin((f / numFrames) * Math.PI * 2) * 2;

    const centerX = frameWidth / 2;
    const baseY = isPositive ? frameHeight - 6 - floatOffset : 6 + floatOffset;

    // Draw arrow shape
    const arrowHeight = 10;
    // arrowWidth reserved for future wider arrow variants
    // const arrowWidth = 6;

    if (isPositive) {
      // Up arrow
      // Triangle head
      for (let row = 0; row < 5; row++) {
        const width = 5 - row;
        for (let col = -width; col <= width; col++) {
          setPixel(pixels, Math.floor(centerX + col), Math.floor(baseY - row), arrowColor);
        }
      }
      // Shaft
      for (let row = 5; row < arrowHeight; row++) {
        setPixel(pixels, centerX - 1, Math.floor(baseY - row), arrowColor);
        setPixel(pixels, centerX, Math.floor(baseY - row), arrowColor);
        setPixel(pixels, centerX + 1, Math.floor(baseY - row), arrowColor);
      }
    } else {
      // Down arrow
      // Triangle head
      for (let row = 0; row < 5; row++) {
        const width = 5 - row;
        for (let col = -width; col <= width; col++) {
          setPixel(pixels, Math.floor(centerX + col), Math.floor(baseY + row), arrowColor);
        }
      }
      // Shaft
      for (let row = 5; row < arrowHeight; row++) {
        setPixel(pixels, centerX - 1, Math.floor(baseY + row), arrowColor);
        setPixel(pixels, centerX, Math.floor(baseY + row), arrowColor);
        setPixel(pixels, centerX + 1, Math.floor(baseY + row), arrowColor);
      }
    }

    // Add glow around arrow
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const existing = getPixel(pixels, x, y);
        if (existing && existing.a > 200) {
          // Add glow to neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const neighbor = getPixel(pixels, x + dx, y + dy);
              if (neighbor && neighbor.a < 50) {
                setPixel(pixels, x + dx, y + dy, glowColor);
              }
            }
          }
        }
      }
    }

    frames.push(pixels);
  }

  return {
    name: isPositive ? 'reputation-up' : 'reputation-down',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates footstep dust puff effect
 */
export function generateFootstepDust(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 33333, intensity = 0.5 } = options;
  // random is used indirectly via SeededRandom instances per particle
  void new SeededRandom(seed);

  const frameWidth = 12;
  const frameHeight = 8;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  const dustColor: RGBA = {
    ...hexToRGBA(ENVIRONMENT_COLORS.GROUND.DUST.hex),
    a: Math.round(120 * intensity),
  };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const puffProgress = f / (numFrames - 1);

    const centerX = frameWidth / 2;
    const baseY = frameHeight - 2;

    // Generate expanding dust puff
    const numParticles = 5;
    for (let p = 0; p < numParticles; p++) {
      const particleSeed = seed + p * 50;
      const particleRandom = new SeededRandom(particleSeed);

      const angle = (particleRandom.next() - 0.5) * Math.PI * 0.8 - Math.PI / 2;
      const speed = 2 + particleRandom.next() * 3;
      const distance = puffProgress * speed;

      const x = Math.floor(centerX + Math.cos(angle) * distance);
      const y = Math.floor(baseY + Math.sin(angle) * distance);

      // Fade out
      const alpha = (1 - puffProgress * 0.8);
      const size = 1 + Math.floor(puffProgress);

      if (alpha > 0.1) {
        for (let dy = 0; dy < size; dy++) {
          for (let dx = 0; dx < size; dx++) {
            setPixel(pixels, x + dx, y + dy, {
              ...dustColor,
              a: Math.round(dustColor.a * alpha),
            });
          }
        }
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'footstep-dust',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: false,
  };
}

// =============================================================================
// LIGHTING OVERLAYS
// =============================================================================

/**
 * Generates vignette effect (screen edge darkening)
 */
export function generateVignette(width: number, height: number, options: ParticleOptions = {}): GeneratedEffect {
  const { intensity = 0.6 } = options;

  const pixels = createPixelArray(width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Smooth falloff from center
      const normalizedDist = dist / maxDist;
      const vignetteAmount = Math.pow(normalizedDist, 2) * intensity;
      const alpha = Math.round(Math.min(255, vignetteAmount * 255));

      if (alpha > 0) {
        setPixel(pixels, x, y, { r: 0, g: 0, b: 0, a: alpha });
      }
    }
  }

  return {
    name: 'vignette',
    width,
    height,
    frames: 1,
    frameWidth: width,
    frameHeight: height,
    data: patternToImageData(pixels),
    loop: false,
  };
}

/**
 * Generates sun ray overlay (god rays for morning scenes)
 */
export function generateSunRays(width: number, height: number, options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 44444, intensity = 0.3, angle = -30 } = options;
  const random = new SeededRandom(seed);

  const pixels = createPixelArray(width, height);

  // Warm golden color for sun rays
  const rayColor: RGBA = { r: 255, g: 240, b: 200, a: Math.round(50 * intensity) };

  const angleRad = (angle * Math.PI) / 180;
  const numRays = 8;

  for (let ray = 0; ray < numRays; ray++) {
    const rayOffset = (ray / numRays) * width;
    const rayWidth = 20 + random.next() * 30;
    const rayAlphaVariation = 0.7 + random.next() * 0.3;

    for (let y = 0; y < height; y++) {
      const rayX = rayOffset + Math.tan(angleRad) * y;

      for (let x = Math.floor(rayX - rayWidth / 2); x < rayX + rayWidth / 2; x++) {
        if (x >= 0 && x < width) {
          const distFromCenter = Math.abs(x - rayX) / (rayWidth / 2);
          const falloff = 1 - distFromCenter;
          const heightFalloff = 1 - (y / height) * 0.5;

          const alpha = Math.round(
            rayColor.a * falloff * falloff * heightFalloff * rayAlphaVariation
          );

          if (alpha > 0) {
            const existing = getPixel(pixels, x, y);
            if (existing) {
              setPixel(pixels, x, y, {
                ...rayColor,
                a: Math.min(255, existing.a + alpha),
              });
            }
          }
        }
      }
    }
  }

  return {
    name: 'sun-rays',
    width,
    height,
    frames: 1,
    frameWidth: width,
    frameHeight: height,
    data: patternToImageData(pixels),
    loop: false,
  };
}

/**
 * Generates candlelight flicker overlay (4 frames for animation)
 */
export function generateCandlelightFlicker(
  width: number,
  height: number,
  options: ParticleOptions = {}
): GeneratedEffect {
  const { seed = 55555, intensity = 0.4 } = options;
  const random = new SeededRandom(seed);

  const numFrames = 4;
  const frames: RGBA[][][] = [];

  // Warm candlelight color
  const candleColor: RGBA = { r: 255, g: 200, b: 100, a: Math.round(80 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(width, height);
    const flickerIntensity = 0.8 + Math.sin((f / numFrames) * Math.PI * 2) * 0.2;

    // Create radial gradient with flicker
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.6;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxRadius) {
          const normalizedDist = dist / maxRadius;
          const falloff = 1 - normalizedDist;
          const flicker = flickerIntensity + (random.next() - 0.5) * 0.1;

          const alpha = Math.round(candleColor.a * falloff * falloff * flicker);

          if (alpha > 0) {
            setPixel(pixels, x, y, { ...candleColor, a: alpha });
          }
        }
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'candlelight-flicker',
    width: width * numFrames,
    height,
    frames: numFrames,
    frameWidth: width,
    frameHeight: height,
    data: createSpritesheet(frames, width, height),
    loop: true,
  };
}

/**
 * Generates monsoon darkness overlay
 */
export function generateMonsoonOverlay(width: number, height: number, options: ParticleOptions = {}): GeneratedEffect {
  const { intensity = 0.5 } = options;

  const pixels = createPixelArray(width, height);

  // Dark blue-grey overlay for monsoon
  const monsoonColor: RGBA = {
    ...hexToRGBA(ENVIRONMENT_COLORS.SKY.MONSOON.hex),
    a: Math.round(100 * intensity),
  };

  // Uniform overlay with slight gradient
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Slightly darker at top
      const heightFactor = 1 - (y / height) * 0.2;
      const alpha = Math.round(monsoonColor.a * heightFactor);
      setPixel(pixels, x, y, { ...monsoonColor, a: alpha });
    }
  }

  return {
    name: 'monsoon-overlay',
    width,
    height,
    frames: 1,
    frameWidth: width,
    frameHeight: height,
    data: patternToImageData(pixels),
    loop: false,
  };
}

// =============================================================================
// SCREEN EFFECTS
// =============================================================================

/**
 * Generates full-screen rain overlay (64x64 tiled, 4 frames)
 */
export function generateRainOverlay(options: ParticleOptions = {}): GeneratedEffect {
  const { seed = 66666, intensity = 0.6, angle = 15 } = options;
  const random = new SeededRandom(seed);

  const frameWidth = 64;
  const frameHeight = 64;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  const rainColor: RGBA = { r: 180, g: 200, b: 230, a: Math.round(150 * intensity) };

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const frameOffset = f * (frameHeight / numFrames);

    const numDrops = 15 + random.nextInt(0, 5);
    const angleRad = (angle * Math.PI) / 180;

    for (let d = 0; d < numDrops; d++) {
      const dropSeed = seed + d * 100 + f * 10;
      const dropRandom = new SeededRandom(dropSeed);

      const startX = dropRandom.next() * frameWidth;
      const startY = (dropRandom.next() * frameHeight + frameOffset) % frameHeight;
      const length = 6 + dropRandom.next() * 6;

      const endX = startX + Math.sin(angleRad) * length;
      const endY = (startY + Math.cos(angleRad) * length) % frameHeight;

      // Draw rain streak
      const alpha = Math.round(rainColor.a * (0.5 + dropRandom.next() * 0.5));
      drawLineAA(pixels, startX, startY, endX, endY, { ...rainColor, a: alpha });
    }

    frames.push(pixels);
  }

  return {
    name: 'rain-overlay',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates heat haze distortion pattern (for post-processing)
 */
export function generateHeatHazePattern(options: ParticleOptions = {}): GeneratedEffect {
  const { intensity = 0.5 } = options;
  // seed not used in this deterministic wave-based pattern

  const frameWidth = 64;
  const frameHeight = 64;
  const numFrames = 4;
  const frames: RGBA[][][] = [];

  for (let f = 0; f < numFrames; f++) {
    const pixels = createPixelArray(frameWidth, frameHeight);
    const phase = (f / numFrames) * Math.PI * 2;

    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        // Create wave pattern for displacement mapping
        // R channel = X displacement, G channel = Y displacement
        const waveX = Math.sin((y / 8 + phase) * 0.5) * intensity;
        const waveY = Math.sin((x / 10 + phase * 0.7) * 0.6) * intensity * 0.5;

        // Encode displacement as 128 +/- offset
        const displacementX = Math.round(128 + waveX * 10);
        const displacementY = Math.round(128 + waveY * 10);

        setPixel(pixels, x, y, {
          r: Math.max(0, Math.min(255, displacementX)),
          g: Math.max(0, Math.min(255, displacementY)),
          b: 128, // Unused
          a: 255,
        });
      }
    }

    frames.push(pixels);
  }

  return {
    name: 'heat-haze-pattern',
    width: frameWidth * numFrames,
    height: frameHeight,
    frames: numFrames,
    frameWidth,
    frameHeight,
    data: createSpritesheet(frames, frameWidth, frameHeight),
    loop: true,
  };
}

/**
 * Generates night blue tint overlay
 */
export function generateNightTintOverlay(width: number, height: number, options: ParticleOptions = {}): GeneratedEffect {
  const { intensity = 0.4 } = options;

  const pixels = createPixelArray(width, height);

  // Deep blue night tint
  const nightColor: RGBA = {
    ...hexToRGBA(ENVIRONMENT_COLORS.SKY.NIGHT.hex),
    a: Math.round(100 * intensity),
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(pixels, x, y, nightColor);
    }
  }

  return {
    name: 'night-tint-overlay',
    width,
    height,
    frames: 1,
    frameWidth: width,
    frameHeight: height,
    data: patternToImageData(pixels),
    loop: false,
  };
}

// =============================================================================
// MAIN EFFECTS GENERATOR CLASS
// =============================================================================

/**
 * Main effects generator class for Goa 1590
 * Provides a unified interface for generating all particle and effect textures
 */
export class EffectsGenerator {
  private scene: Phaser.Scene | null = null;

  constructor(scene?: Phaser.Scene) {
    this.scene = scene || null;
  }

  /**
   * Set the Phaser scene for direct texture creation
   */
  setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /**
   * Create a Phaser texture from generated effect data
   */
  private createTexture(effect: GeneratedEffect): void {
    if (!this.scene) {
      console.warn('No Phaser scene set - cannot create texture');
      return;
    }

    // Remove existing texture if present
    if (this.scene.textures.exists(effect.name)) {
      this.scene.textures.remove(effect.name);
    }

    // Create canvas and draw effect
    const canvas = document.createElement('canvas');
    canvas.width = effect.width;
    canvas.height = effect.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const imageData = ctx.createImageData(effect.width, effect.height);
      imageData.data.set(effect.data);
      ctx.putImageData(imageData, 0, 0);

      // Add to Phaser textures
      this.scene.textures.addCanvas(effect.name, canvas);

      // Add frame data for spritesheets
      if (effect.frames > 1) {
        const texture = this.scene.textures.get(effect.name);
        for (let i = 0; i < effect.frames; i++) {
          texture.add(i, 0, i * effect.frameWidth, 0, effect.frameWidth, effect.frameHeight);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Weather Particles
  // -------------------------------------------------------------------------

  generateRainDrops(options?: ParticleOptions): GeneratedEffect {
    const effect = generateRainDrops(options);
    this.createTexture(effect);
    return effect;
  }

  generateHeavyRain(options?: ParticleOptions): GeneratedEffect {
    const effect = generateHeavyRain(options);
    this.createTexture(effect);
    return effect;
  }

  generateDustParticles(options?: ParticleOptions): GeneratedEffect {
    const effect = generateDustParticles(options);
    this.createTexture(effect);
    return effect;
  }

  generateHeatShimmer(options?: ParticleOptions): GeneratedEffect {
    const effect = generateHeatShimmer(options);
    this.createTexture(effect);
    return effect;
  }

  generateFogWisps(options?: ParticleOptions): GeneratedEffect {
    const effect = generateFogWisps(options);
    this.createTexture(effect);
    return effect;
  }

  // -------------------------------------------------------------------------
  // Ambient Particles
  // -------------------------------------------------------------------------

  generateFireflies(options?: ParticleOptions): GeneratedEffect {
    const effect = generateFireflies(options);
    this.createTexture(effect);
    return effect;
  }

  generateSmokeWisps(options?: ParticleOptions): GeneratedEffect {
    const effect = generateSmokeWisps(options);
    this.createTexture(effect);
    return effect;
  }

  generateIncenseSmoke(options?: ParticleOptions): GeneratedEffect {
    const effect = generateIncenseSmoke(options);
    this.createTexture(effect);
    return effect;
  }

  generateTorchSparks(options?: ParticleOptions): GeneratedEffect {
    const effect = generateTorchSparks(options);
    this.createTexture(effect);
    return effect;
  }

  generateSeaSpray(options?: ParticleOptions): GeneratedEffect {
    const effect = generateSeaSpray(options);
    this.createTexture(effect);
    return effect;
  }

  // -------------------------------------------------------------------------
  // Interaction Effects
  // -------------------------------------------------------------------------

  generateGoldSparkle(options?: ParticleOptions): GeneratedEffect {
    const effect = generateGoldSparkle(options);
    this.createTexture(effect);
    return effect;
  }

  generateQuestCompleteBurst(options?: ParticleOptions): GeneratedEffect {
    const effect = generateQuestCompleteBurst(options);
    this.createTexture(effect);
    return effect;
  }

  generateReputationUp(options?: ParticleOptions): GeneratedEffect {
    const effect = generateReputationIndicator(true, options);
    this.createTexture(effect);
    return effect;
  }

  generateReputationDown(options?: ParticleOptions): GeneratedEffect {
    const effect = generateReputationIndicator(false, options);
    this.createTexture(effect);
    return effect;
  }

  generateFootstepDust(options?: ParticleOptions): GeneratedEffect {
    const effect = generateFootstepDust(options);
    this.createTexture(effect);
    return effect;
  }

  // -------------------------------------------------------------------------
  // Lighting Overlays
  // -------------------------------------------------------------------------

  generateVignette(width: number, height: number, options?: ParticleOptions): GeneratedEffect {
    const effect = generateVignette(width, height, options);
    this.createTexture(effect);
    return effect;
  }

  generateSunRays(width: number, height: number, options?: ParticleOptions): GeneratedEffect {
    const effect = generateSunRays(width, height, options);
    this.createTexture(effect);
    return effect;
  }

  generateCandlelightFlicker(width: number, height: number, options?: ParticleOptions): GeneratedEffect {
    const effect = generateCandlelightFlicker(width, height, options);
    this.createTexture(effect);
    return effect;
  }

  generateMonsoonOverlay(width: number, height: number, options?: ParticleOptions): GeneratedEffect {
    const effect = generateMonsoonOverlay(width, height, options);
    this.createTexture(effect);
    return effect;
  }

  // -------------------------------------------------------------------------
  // Screen Effects
  // -------------------------------------------------------------------------

  generateRainOverlay(options?: ParticleOptions): GeneratedEffect {
    const effect = generateRainOverlay(options);
    this.createTexture(effect);
    return effect;
  }

  generateHeatHazePattern(options?: ParticleOptions): GeneratedEffect {
    const effect = generateHeatHazePattern(options);
    this.createTexture(effect);
    return effect;
  }

  generateNightTintOverlay(width: number, height: number, options?: ParticleOptions): GeneratedEffect {
    const effect = generateNightTintOverlay(width, height, options);
    this.createTexture(effect);
    return effect;
  }

  // -------------------------------------------------------------------------
  // Bulk Generation
  // -------------------------------------------------------------------------

  /**
   * Generate all weather particle effects
   */
  generateAllWeatherEffects(options?: ParticleOptions): Map<string, GeneratedEffect> {
    const effects = new Map<string, GeneratedEffect>();

    effects.set('rain-drop', this.generateRainDrops(options));
    effects.set('heavy-rain', this.generateHeavyRain(options));
    effects.set('dust-particles', this.generateDustParticles(options));
    effects.set('heat-shimmer', this.generateHeatShimmer(options));
    effects.set('fog-wisps', this.generateFogWisps(options));

    return effects;
  }

  /**
   * Generate all ambient particle effects
   */
  generateAllAmbientEffects(options?: ParticleOptions): Map<string, GeneratedEffect> {
    const effects = new Map<string, GeneratedEffect>();

    effects.set('fireflies', this.generateFireflies(options));
    effects.set('smoke-wisps', this.generateSmokeWisps(options));
    effects.set('incense-smoke', this.generateIncenseSmoke(options));
    effects.set('torch-sparks', this.generateTorchSparks(options));
    effects.set('sea-spray', this.generateSeaSpray(options));

    return effects;
  }

  /**
   * Generate all interaction effects
   */
  generateAllInteractionEffects(options?: ParticleOptions): Map<string, GeneratedEffect> {
    const effects = new Map<string, GeneratedEffect>();

    effects.set('gold-sparkle', this.generateGoldSparkle(options));
    effects.set('quest-complete-burst', this.generateQuestCompleteBurst(options));
    effects.set('reputation-up', this.generateReputationUp(options));
    effects.set('reputation-down', this.generateReputationDown(options));
    effects.set('footstep-dust', this.generateFootstepDust(options));

    return effects;
  }

  /**
   * Generate all effects for a given screen size
   */
  generateAllEffects(
    screenWidth: number,
    screenHeight: number,
    options?: ParticleOptions
  ): Map<string, GeneratedEffect> {
    const effects = new Map<string, GeneratedEffect>();

    // Weather particles
    const weather = this.generateAllWeatherEffects(options);
    weather.forEach((effect, name) => effects.set(name, effect));

    // Ambient particles
    const ambient = this.generateAllAmbientEffects(options);
    ambient.forEach((effect, name) => effects.set(name, effect));

    // Interaction effects
    const interaction = this.generateAllInteractionEffects(options);
    interaction.forEach((effect, name) => effects.set(name, effect));

    // Lighting overlays (screen-sized)
    effects.set('vignette', this.generateVignette(screenWidth, screenHeight, options));
    effects.set('sun-rays', this.generateSunRays(screenWidth, screenHeight, options));
    effects.set('candlelight-flicker', this.generateCandlelightFlicker(screenWidth, screenHeight, options));
    effects.set('monsoon-overlay', this.generateMonsoonOverlay(screenWidth, screenHeight, options));

    // Screen effects
    effects.set('rain-overlay', this.generateRainOverlay(options));
    effects.set('heat-haze-pattern', this.generateHeatHazePattern(options));
    effects.set('night-tint-overlay', this.generateNightTintOverlay(screenWidth, screenHeight, options));

    return effects;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default EffectsGenerator;
