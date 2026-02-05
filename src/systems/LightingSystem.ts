/**
 * LightingSystem - Point Light Management for Goa 1590
 *
 * Manages dynamic point lights including:
 * - Torches, lanterns, and candles with flicker effects
 * - Window glow from buildings at night
 * - Interactive light sources
 *
 * Uses ADD blend mode for realistic additive lighting
 */

import Phaser from 'phaser';

export interface PointLight {
    id: string;
    x: number;
    y: number;
    radius: number;
    color: number;          // e.g., 0xFFD080 for warm candle light
    intensity: number;      // 0-1
    flicker?: boolean;
    flickerSpeed?: number;  // Frequency of flicker (default 0.1)
    flickerAmount?: number; // How much intensity varies (default 0.2)
    active: boolean;
    activateHour?: number;  // Hour when light turns on (e.g., 18 for dusk)
    deactivateHour?: number; // Hour when light turns off (e.g., 6 for dawn)
}

export interface WindowGlow {
    buildingId: string;
    windows: Array<{ x: number; y: number; width: number; height: number }>;
    color: number;
    intensity: number;
    active: boolean;
}

interface LightSprite {
    light: PointLight;
    sprite: Phaser.GameObjects.Sprite;
    baseIntensity: number;
    flickerOffset: number;
}

export class LightingSystem {
    private scene: Phaser.Scene;
    private lightLayer: Phaser.GameObjects.Container;
    private lights: Map<string, LightSprite> = new Map();
    private windowGlows: Map<string, WindowGlow> = new Map();
    private lightTextures: Map<string, string> = new Map();
    private currentHour: number = 12;
    private noiseTime: number = 0;
    private isNightMode: boolean = false;

    // Perlin-like noise for flicker
    private noiseValues: number[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // Create light layer with ADD blend mode for additive lighting
        this.lightLayer = scene.add.container(0, 0);
        this.lightLayer.setDepth(1000); // Above most game objects
        this.lightLayer.setBlendMode(Phaser.BlendModes.ADD);

        // Pre-generate noise values for smooth flicker
        this.generateNoiseTable();

        // Generate default light textures
        this.generateLightTextures();
    }

    /**
     * Generate noise lookup table for natural flicker effect
     */
    private generateNoiseTable(): void {
        const tableSize = 256;
        for (let i = 0; i < tableSize; i++) {
            // Layered sine waves for organic variation
            const v1 = Math.sin(i * 0.1) * 0.5;
            const v2 = Math.sin(i * 0.23 + 1.3) * 0.3;
            const v3 = Math.sin(i * 0.47 + 2.7) * 0.2;
            this.noiseValues.push((v1 + v2 + v3 + 1) / 2); // Normalize to 0-1
        }
    }

    /**
     * Get smooth noise value for flicker
     */
    private getNoise(offset: number): number {
        const index = Math.floor((this.noiseTime + offset) * 10) % this.noiseValues.length;
        return this.noiseValues[index];
    }

    /**
     * Generate radial gradient textures for different light sizes
     */
    private generateLightTextures(): void {
        const sizes = [64, 128, 256, 512];

        sizes.forEach(size => {
            const key = `light_${size}`;
            if (this.scene.textures.exists(key)) {
                this.lightTextures.set(size.toString(), key);
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d')!;

            // Create radial gradient (white center fading to transparent)
            const gradient = ctx.createRadialGradient(
                size / 2, size / 2, 0,
                size / 2, size / 2, size / 2
            );

            // Soft falloff curve
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
            gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            this.scene.textures.addCanvas(key, canvas);
            this.lightTextures.set(size.toString(), key);
        });
    }

    /**
     * Get appropriate texture key for light radius
     */
    private getTextureForRadius(radius: number): string {
        if (radius <= 32) return this.lightTextures.get('64') || 'light_64';
        if (radius <= 64) return this.lightTextures.get('128') || 'light_128';
        if (radius <= 128) return this.lightTextures.get('256') || 'light_256';
        return this.lightTextures.get('512') || 'light_512';
    }

    /**
     * Add a point light to the scene
     */
    addLight(config: Omit<PointLight, 'active'> & { active?: boolean }): string {
        const light: PointLight = {
            ...config,
            active: config.active ?? true,
            flickerSpeed: config.flickerSpeed ?? 0.1,
            flickerAmount: config.flickerAmount ?? 0.2
        };

        const textureKey = this.getTextureForRadius(light.radius);
        const sprite = this.scene.add.sprite(light.x, light.y, textureKey);

        // Scale to match desired radius
        const textureSize = parseInt(textureKey.split('_')[1]);
        const scale = (light.radius * 2) / textureSize;
        sprite.setScale(scale);

        // Apply color tint and initial intensity
        sprite.setTint(light.color);
        sprite.setAlpha(light.intensity);
        sprite.setVisible(light.active);

        this.lightLayer.add(sprite);

        const lightSprite: LightSprite = {
            light,
            sprite,
            baseIntensity: light.intensity,
            flickerOffset: Math.random() * 100 // Random offset for varied flicker
        };

        this.lights.set(light.id, lightSprite);

        // Check if should be active based on current hour
        this.updateLightActiveState(lightSprite);

        return light.id;
    }

    /**
     * Add a torch light with default warm settings
     */
    addTorch(x: number, y: number, id?: string): string {
        return this.addLight({
            id: id || `torch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x,
            y,
            radius: 80,
            color: 0xFFAA44,  // Warm orange
            intensity: 0.7,
            flicker: true,
            flickerSpeed: 0.15,
            flickerAmount: 0.25,
            activateHour: 18,
            deactivateHour: 6
        });
    }

    /**
     * Add a candle light with softer settings
     */
    addCandle(x: number, y: number, id?: string): string {
        return this.addLight({
            id: id || `candle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x,
            y,
            radius: 48,
            color: 0xFFD080,  // Soft warm yellow
            intensity: 0.5,
            flicker: true,
            flickerSpeed: 0.2,
            flickerAmount: 0.3,
            activateHour: 18,
            deactivateHour: 23
        });
    }

    /**
     * Add a lantern with medium settings
     */
    addLantern(x: number, y: number, id?: string): string {
        return this.addLight({
            id: id || `lantern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x,
            y,
            radius: 96,
            color: 0xFFCC66,  // Golden yellow
            intensity: 0.6,
            flicker: true,
            flickerSpeed: 0.08,
            flickerAmount: 0.15,
            activateHour: 18,
            deactivateHour: 6
        });
    }

    /**
     * Add window glow for a building
     */
    addWindowGlow(config: WindowGlow): void {
        this.windowGlows.set(config.buildingId, config);

        // Create light sprites for each window
        config.windows.forEach((window, index) => {
            this.addLight({
                id: `window_${config.buildingId}_${index}`,
                x: window.x + window.width / 2,
                y: window.y + window.height / 2,
                radius: Math.max(window.width, window.height) * 1.5,
                color: config.color,
                intensity: config.intensity,
                flicker: true,
                flickerSpeed: 0.05,
                flickerAmount: 0.1,
                activateHour: 18,
                deactivateHour: 23,
                active: config.active
            });
        });
    }

    /**
     * Remove a light by ID
     */
    removeLight(id: string): boolean {
        const lightSprite = this.lights.get(id);
        if (!lightSprite) return false;

        lightSprite.sprite.destroy();
        this.lights.delete(id);
        return true;
    }

    /**
     * Update light position
     */
    setLightPosition(id: string, x: number, y: number): void {
        const lightSprite = this.lights.get(id);
        if (lightSprite) {
            lightSprite.light.x = x;
            lightSprite.light.y = y;
            lightSprite.sprite.setPosition(x, y);
        }
    }

    /**
     * Set light intensity
     */
    setLightIntensity(id: string, intensity: number): void {
        const lightSprite = this.lights.get(id);
        if (lightSprite) {
            lightSprite.light.intensity = intensity;
            lightSprite.baseIntensity = intensity;
        }
    }

    /**
     * Toggle light on/off
     */
    setLightActive(id: string, active: boolean): void {
        const lightSprite = this.lights.get(id);
        if (lightSprite) {
            lightSprite.light.active = active;
            lightSprite.sprite.setVisible(active);
        }
    }

    /**
     * Update the current hour (affects automatic light activation)
     */
    setCurrentHour(hour: number): void {
        const wasNight = this.isNightMode;
        this.currentHour = hour;
        this.isNightMode = hour >= 18 || hour < 6;

        // Only update all lights if night mode changed
        if (wasNight !== this.isNightMode) {
            this.lights.forEach(lightSprite => {
                this.updateLightActiveState(lightSprite);
            });
        }
    }

    /**
     * Check and update light active state based on time
     */
    private updateLightActiveState(lightSprite: LightSprite): void {
        const light = lightSprite.light;

        if (light.activateHour !== undefined && light.deactivateHour !== undefined) {
            let shouldBeActive: boolean;

            if (light.activateHour < light.deactivateHour) {
                // Simple case: activate hour is before deactivate hour (same day)
                shouldBeActive = this.currentHour >= light.activateHour &&
                                this.currentHour < light.deactivateHour;
            } else {
                // Wraps around midnight: e.g., 18 to 6
                shouldBeActive = this.currentHour >= light.activateHour ||
                                this.currentHour < light.deactivateHour;
            }

            light.active = shouldBeActive;
            lightSprite.sprite.setVisible(shouldBeActive);
        }
    }

    /**
     * Main update loop - call from scene update
     */
    update(delta: number): void {
        // Update noise time for flicker
        this.noiseTime += delta * 0.001;

        // Update each light
        this.lights.forEach(lightSprite => {
            if (!lightSprite.light.active) return;

            if (lightSprite.light.flicker) {
                // Calculate flicker using noise
                const noise = this.getNoise(lightSprite.flickerOffset);
                const flickerAmount = lightSprite.light.flickerAmount || 0.2;
                const flickeredIntensity = lightSprite.baseIntensity *
                    (1 - flickerAmount + noise * flickerAmount * 2);

                lightSprite.sprite.setAlpha(Math.max(0, Math.min(1, flickeredIntensity)));
            }
        });
    }

    /**
     * Set depth of light layer
     */
    setDepth(depth: number): void {
        this.lightLayer.setDepth(depth);
    }

    /**
     * Get all lights
     */
    getLights(): PointLight[] {
        return Array.from(this.lights.values()).map(ls => ls.light);
    }

    /**
     * Get light by ID
     */
    getLight(id: string): PointLight | undefined {
        return this.lights.get(id)?.light;
    }

    /**
     * Check if it's currently night mode
     */
    isNight(): boolean {
        return this.isNightMode;
    }

    /**
     * Set global light layer visibility
     */
    setVisible(visible: boolean): void {
        this.lightLayer.setVisible(visible);
    }

    /**
     * Set global light layer alpha
     */
    setAlpha(alpha: number): void {
        this.lightLayer.setAlpha(alpha);
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.lights.forEach(lightSprite => {
            lightSprite.sprite.destroy();
        });
        this.lights.clear();
        this.windowGlows.clear();
        this.lightLayer.destroy();
    }

    /**
     * Save state for persistence
     */
    getSaveData(): object {
        return {
            currentHour: this.currentHour,
            lights: Array.from(this.lights.values()).map(ls => ({
                ...ls.light,
                baseIntensity: ls.baseIntensity
            }))
        };
    }

    /**
     * Restore state from save
     */
    loadSaveData(data: { currentHour: number; lights: PointLight[] }): void {
        this.currentHour = data.currentHour;
        this.isNightMode = data.currentHour >= 18 || data.currentHour < 6;

        // Clear existing lights
        this.lights.forEach(ls => ls.sprite.destroy());
        this.lights.clear();

        // Restore lights
        data.lights.forEach(light => {
            this.addLight(light);
        });
    }
}
