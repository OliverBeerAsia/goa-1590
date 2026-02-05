/**
 * WindSystem - Manages wind direction and speed for Goa 1590
 *
 * Provides wind data for:
 * - Rain particle angles
 * - Dust/fog drift direction
 * - Vegetation sway animations
 * - Sail movement on ships
 *
 * Based on historical monsoon wind patterns for Goa
 */

import Phaser from 'phaser';

export interface WindState {
    direction: number;    // Degrees: 0 = East, 90 = South, 180 = West, 270 = North
    speed: number;        // 0-1 normalized speed
    gustiness: number;    // 0-1 how variable the wind is
}

export type Season = 'dry' | 'preMonsoon' | 'monsoon' | 'postMonsoon';

interface SeasonalWindPattern {
    baseDirection: number;
    directionVariance: number;
    baseSpeed: number;
    speedVariance: number;
    gustiness: number;
}

export class WindSystem {
    private scene: Phaser.Scene;
    private currentWind: WindState;
    private currentSeason: Season = 'dry';

    // Noise for smooth wind variation
    private noiseTime: number = 0;
    private noiseValues: number[] = [];

    // Seasonal wind patterns (historically accurate for Goa)
    private readonly seasonalPatterns: { [key in Season]: SeasonalWindPattern } = {
        // November-May: Northeast monsoon winds, relatively calm
        dry: {
            baseDirection: 45,      // NE winds
            directionVariance: 30,
            baseSpeed: 0.3,
            speedVariance: 0.2,
            gustiness: 0.2
        },
        // May-June: Transitional, variable winds
        preMonsoon: {
            baseDirection: 90,      // Easterly shifting
            directionVariance: 60,
            baseSpeed: 0.4,
            speedVariance: 0.3,
            gustiness: 0.4
        },
        // June-September: Southwest monsoon, strong winds
        monsoon: {
            baseDirection: 225,     // SW monsoon winds
            directionVariance: 20,
            baseSpeed: 0.7,
            speedVariance: 0.2,
            gustiness: 0.6
        },
        // September-November: Retreating monsoon
        postMonsoon: {
            baseDirection: 180,     // Westerly winds
            directionVariance: 45,
            baseSpeed: 0.4,
            speedVariance: 0.25,
            gustiness: 0.3
        }
    };

    // Weather-based modifiers
    private weatherModifiers: { [weather: string]: { speedMult: number; gustMult: number } } = {
        'clear': { speedMult: 0.8, gustMult: 0.5 },
        'overcast': { speedMult: 1.0, gustMult: 0.8 },
        'rain': { speedMult: 1.2, gustMult: 1.0 },
        'heavyRain': { speedMult: 1.5, gustMult: 1.2 },
        'heatHaze': { speedMult: 0.3, gustMult: 0.2 },
        'fog': { speedMult: 0.4, gustMult: 0.3 }
    };

    private currentWeather: string = 'clear';

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // Initialize with default wind
        this.currentWind = { direction: 45, speed: 0.3, gustiness: 0.2 };

        // Generate noise table for smooth variation
        this.generateNoiseTable();

        // Setup event listeners
        this.setupEventListeners();
    }

    private generateNoiseTable(): void {
        const tableSize = 512;
        for (let i = 0; i < tableSize; i++) {
            // Layered sine waves for organic variation
            const v1 = Math.sin(i * 0.05) * 0.5;
            const v2 = Math.sin(i * 0.13 + 2.1) * 0.3;
            const v3 = Math.sin(i * 0.27 + 4.5) * 0.2;
            this.noiseValues.push((v1 + v2 + v3 + 1) / 2); // Normalize to 0-1
        }
    }

    private getNoise(offset: number): number {
        const index = Math.floor((this.noiseTime + offset) * 5) % this.noiseValues.length;
        return this.noiseValues[index];
    }

    private setupEventListeners(): void {
        // Listen for season changes
        this.scene.events.on('seasonChange', (data: { season: Season }) => {
            this.setSeason(data.season);
        });

        // Listen for weather changes
        this.scene.events.on('weatherChange', (data: { current: string }) => {
            this.setWeather(data.current);
        });
    }

    /**
     * Set the current season (affects base wind patterns)
     */
    public setSeason(season: Season): void {
        this.currentSeason = season;

        // Update current wind to reflect new season's base pattern
        const pattern = this.seasonalPatterns[season];
        this.currentWind = {
            direction: pattern.baseDirection,
            speed: pattern.baseSpeed,
            gustiness: pattern.gustiness
        };

        // Emit event for other systems
        this.scene.events.emit('windSeasonChange', { season, pattern });
    }

    /**
     * Set current weather (modifies wind speed/gustiness)
     */
    public setWeather(weather: string): void {
        this.currentWeather = weather;
    }

    /**
     * Main update loop - call from scene update
     */
    public update(delta: number): void {
        // Update noise time
        this.noiseTime += delta * 0.001;

        const pattern = this.seasonalPatterns[this.currentSeason];
        const weatherMod = this.weatherModifiers[this.currentWeather] || { speedMult: 1, gustMult: 1 };

        // Calculate wind direction with noise-based variation
        const directionNoise = (this.getNoise(0) - 0.5) * 2; // -1 to 1
        const targetDirection = pattern.baseDirection + directionNoise * pattern.directionVariance;

        // Calculate wind speed with gusts
        const speedNoise = this.getNoise(100);
        const gustNoise = this.getNoise(200) * pattern.gustiness * weatherMod.gustMult;
        const targetSpeed = (pattern.baseSpeed + speedNoise * pattern.speedVariance + gustNoise) * weatherMod.speedMult;

        // Smoothly interpolate current wind toward target
        const lerpFactor = 0.02;
        this.currentWind.direction = this.lerpAngle(this.currentWind.direction, targetDirection, lerpFactor);
        this.currentWind.speed = Phaser.Math.Linear(this.currentWind.speed, Math.min(1, targetSpeed), lerpFactor);
        this.currentWind.gustiness = Phaser.Math.Linear(this.currentWind.gustiness, pattern.gustiness * weatherMod.gustMult, lerpFactor);

        // Emit wind update event for other systems
        this.scene.events.emit('windUpdate', this.getWindState());
    }

    /**
     * Interpolate angles correctly handling wrap-around
     */
    private lerpAngle(angle1: number, angle2: number, t: number): number {
        let diff = angle2 - angle1;

        // Normalize to -180 to 180
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        return angle1 + diff * t;
    }

    /**
     * Get current wind state
     */
    public getWindState(): WindState {
        return { ...this.currentWind };
    }

    /**
     * Get wind direction in radians
     */
    public getDirectionRadians(): number {
        return (this.currentWind.direction * Math.PI) / 180;
    }

    /**
     * Get wind velocity as a vector (x, y)
     */
    public getWindVector(): { x: number; y: number } {
        const rad = this.getDirectionRadians();
        return {
            x: Math.cos(rad) * this.currentWind.speed,
            y: Math.sin(rad) * this.currentWind.speed
        };
    }

    /**
     * Get particle angle offset for rain/dust based on wind
     * Returns degrees to offset particle emission angle
     */
    public getParticleAngleOffset(): number {
        // Particles drift in wind direction
        // Stronger wind = more horizontal angle
        const windInfluence = this.currentWind.speed * 45; // Up to 45 degree offset

        // Wind from west (180) pushes particles east
        // Wind from east (0) pushes particles west
        const windAngle = this.currentWind.direction;

        if (windAngle > 90 && windAngle < 270) {
            // Wind from south/west - particles angle to the right
            return windInfluence;
        } else {
            // Wind from north/east - particles angle to the left
            return -windInfluence;
        }
    }

    /**
     * Get fog/dust drift velocity for particle systems
     */
    public getDriftVelocity(): { x: number; y: number } {
        const vector = this.getWindVector();
        // Scale for gentle drift
        return {
            x: vector.x * 20,
            y: vector.y * 10 // Less vertical influence for fog
        };
    }

    /**
     * Get vegetation sway parameters
     */
    public getVegetationSway(): { amplitude: number; frequency: number; phase: number } {
        const baseAmplitude = this.currentWind.speed * 5; // pixels
        const gustAmplitude = this.currentWind.gustiness * 3;
        const gustPhase = this.getNoise(300) * Math.PI * 2;

        return {
            amplitude: baseAmplitude + gustAmplitude * Math.sin(this.noiseTime * 2 + gustPhase),
            frequency: 0.5 + this.currentWind.speed * 0.5, // 0.5 to 1 Hz
            phase: this.noiseTime
        };
    }

    /**
     * Check if conditions are calm (good for sailing/trading)
     */
    public isCalm(): boolean {
        return this.currentWind.speed < 0.3 && this.currentWind.gustiness < 0.3;
    }

    /**
     * Check if conditions are stormy (bad for sailing/trading)
     */
    public isStormy(): boolean {
        return this.currentWind.speed > 0.7 || this.currentWind.gustiness > 0.5;
    }

    /**
     * Get trade route difficulty modifier based on wind
     * 1.0 = normal, >1 = harder, <1 = easier
     */
    public getTradeRouteDifficulty(routeDirection: number): number {
        // Calculate how much the wind opposes the route
        const windDir = this.currentWind.direction;
        let angleDiff = Math.abs(windDir - routeDirection);

        // Normalize to 0-180
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // 0 = tailwind (easier), 180 = headwind (harder)
        const headwindFactor = angleDiff / 180; // 0 to 1

        // Strong winds make headwinds worse but tailwinds better
        const speedFactor = this.currentWind.speed;

        if (headwindFactor > 0.5) {
            // Headwind - stronger wind = harder
            return 1 + headwindFactor * speedFactor;
        } else {
            // Tailwind - stronger wind = easier
            return 1 - (0.5 - headwindFactor) * speedFactor * 0.5;
        }
    }

    /**
     * Get current season
     */
    public getSeason(): Season {
        return this.currentSeason;
    }

    /**
     * Cleanup
     */
    public destroy(): void {
        this.scene.events.off('seasonChange');
        this.scene.events.off('weatherChange');
    }

    /**
     * Get save data
     */
    public getSaveData(): object {
        return {
            currentSeason: this.currentSeason,
            currentWind: this.currentWind,
            noiseTime: this.noiseTime
        };
    }

    /**
     * Load save data
     */
    public loadSaveData(data: { currentSeason: Season; currentWind: WindState; noiseTime: number }): void {
        this.currentSeason = data.currentSeason;
        this.currentWind = data.currentWind;
        this.noiseTime = data.noiseTime;
    }
}
