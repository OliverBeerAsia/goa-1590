import Phaser from 'phaser';

/**
 * AudioSystem - Manages all game audio including ambient sounds and interaction feedback
 * 
 * Historical audio design based on 16th century Goa:
 * - Church bells (Se Cathedral was under construction)
 * - Market sounds (vendors calling, crowds)
 * - Harbor sounds (waves, ship creaking, seagulls)
 * - Music from various traditions (Portuguese, Hindu, Arab)
 */

interface AmbientLayer {
  key: string;
  volume: number;
  loop: boolean;
  zones?: string[]; // Zone names where this sound plays
}

interface SoundEffect {
  key: string;
  variations?: number;
  volume: number;
  cooldown?: number;
}

export class AudioSystem {
  private scene: Phaser.Scene;
  private masterVolume = 0.7;
  private musicVolume = 0.5;
  private sfxVolume = 0.8;
  private ambientVolume = 0.6;
  
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private ambientSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private lastPlayedSfx: Map<string, number> = new Map();
  
  private currentZone = 'market_square';

  // Sound definitions based on historical period
  private readonly ambientLayers: AmbientLayer[] = [
    { key: 'ambient_market', volume: 0.4, loop: true, zones: ['market_square', 'rua_direita'] },
    { key: 'ambient_harbor', volume: 0.5, loop: true, zones: ['dock_area'] },
    { key: 'ambient_seagulls', volume: 0.3, loop: true, zones: ['dock_area', 'market_square'] },
    { key: 'ambient_church_bells', volume: 0.6, loop: false }, // Played at specific times
    { key: 'ambient_night_crickets', volume: 0.4, loop: true }, // Night only
  ];

  private readonly sfxDefinitions: { [key: string]: SoundEffect } = {
    'ui_click': { key: 'sfx_click', volume: 0.5 },
    'ui_open': { key: 'sfx_open', volume: 0.4 },
    'ui_close': { key: 'sfx_close', volume: 0.4 },
    'trade_buy': { key: 'sfx_coins', volume: 0.6 },
    'trade_sell': { key: 'sfx_coins', volume: 0.5 },
    'footstep': { key: 'sfx_footstep', variations: 4, volume: 0.3, cooldown: 200 },
    'npc_greet': { key: 'sfx_greet', volume: 0.5, cooldown: 1000 },
    'bell_toll': { key: 'sfx_bell', volume: 0.7 },
  };

  // Music tracks appropriate for the period
  private readonly musicTracks = {
    'morning': 'music_morning', // Calm, awakening
    'market': 'music_market', // Lively, trading activity
    'evening': 'music_evening', // Winding down
    'night': 'music_night', // Mysterious, quiet
    'trade': 'music_trade', // During trading interface
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for time changes
    this.scene.events.on('periodChange', (data: { current: string }) => {
      this.handleTimeChange(data.current);
    });

    // Listen for zone changes
    this.scene.events.on('zoneEnter', (zoneName: string) => {
      this.handleZoneChange(zoneName);
    });

    // Listen for trade events
    this.scene.events.on('openTrade', () => {
      this.playSfx('ui_open');
    });

    this.scene.events.on('playerBuy', () => {
      this.playSfx('trade_buy');
    });

    this.scene.events.on('playerSell', () => {
      this.playSfx('trade_sell');
    });
  }

  /**
   * Generate placeholder audio using Web Audio API
   * In production, these would be loaded from files
   */
  public generatePlaceholderAudio(): void {
    // Generate simple procedural sounds for testing
    // These are minimal placeholder beeps - real audio would be loaded

    // Create a simple click sound
    this.createToneSound('sfx_click', 800, 0.05, 'sine');
    this.createToneSound('sfx_open', 400, 0.1, 'triangle');
    this.createToneSound('sfx_close', 300, 0.1, 'triangle');
    this.createToneSound('sfx_coins', 1200, 0.15, 'sine');
    this.createToneSound('sfx_bell', 440, 0.5, 'sine');
    
    // Footstep variations
    for (let i = 0; i < 4; i++) {
      this.createToneSound(`sfx_footstep_${i}`, 100 + i * 20, 0.05, 'square');
    }
  }

  private createToneSound(key: string, frequency: number, duration: number, type: OscillatorType): void {
    // Check if Web Audio is available
    const soundManager = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
    if (!soundManager.context) return;

    const context = soundManager.context as AudioContext;
    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate waveform
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let value = 0;
      
      switch (type) {
        case 'sine':
          value = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          value = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'triangle':
          value = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
          break;
        default:
          value = Math.sin(2 * Math.PI * frequency * t);
      }

      // Apply envelope (fade in/out)
      const envelope = Math.min(1, i / (length * 0.1)) * Math.min(1, (length - i) / (length * 0.3));
      data[i] = value * envelope * 0.5;
    }

    // Cache the buffer for later use
    this.scene.cache.audio.add(key, buffer);
  }

  public playSfx(sfxName: string): void {
    const sfx = this.sfxDefinitions[sfxName];
    if (!sfx) return;

    // Check cooldown
    if (sfx.cooldown) {
      const lastPlayed = this.lastPlayedSfx.get(sfxName) || 0;
      if (Date.now() - lastPlayed < sfx.cooldown) return;
      this.lastPlayedSfx.set(sfxName, Date.now());
    }

    // Get the correct sound key
    let soundKey = sfx.key;
    if (sfx.variations) {
      const variation = Math.floor(Math.random() * sfx.variations);
      soundKey = `${sfx.key}_${variation}`;
    }

    // Try to play the sound
    try {
      if (this.scene.cache.audio.exists(soundKey)) {
        this.scene.sound.play(soundKey, {
          volume: sfx.volume * this.sfxVolume * this.masterVolume,
        });
      }
    } catch (e) {
      // Sound not loaded yet, ignore
    }
  }

  public playMusic(trackName: keyof typeof this.musicTracks): void {
    const trackKey = this.musicTracks[trackName];
    
    // Fade out current music if playing
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          this.currentMusic?.stop();
          this.startNewTrack(trackKey);
        },
      });
    } else {
      this.startNewTrack(trackKey);
    }
  }

  private startNewTrack(trackKey: string): void {
    try {
      if (this.scene.cache.audio.exists(trackKey)) {
        this.currentMusic = this.scene.sound.add(trackKey, {
          volume: this.musicVolume * this.masterVolume,
          loop: true,
        });
        this.currentMusic.play();
      }
    } catch (e) {
      // Music not loaded, ignore
    }
  }

  public startAmbient(): void {
    this.updateAmbientForZone(this.currentZone);
  }

  public stopAmbient(): void {
    this.ambientSounds.forEach((sound) => {
      sound.stop();
    });
    this.ambientSounds.clear();
  }

  private updateAmbientForZone(zoneName: string): void {
    // Stop sounds not for this zone
    this.ambientSounds.forEach((sound, key) => {
      const layer = this.ambientLayers.find((l) => l.key === key);
      if (layer?.zones && !layer.zones.includes(zoneName)) {
        sound.stop();
        this.ambientSounds.delete(key);
      }
    });

    // Start sounds for this zone
    this.ambientLayers.forEach((layer) => {
      if (!layer.zones || layer.zones.includes(zoneName)) {
        if (!this.ambientSounds.has(layer.key)) {
          try {
            if (this.scene.cache.audio.exists(layer.key)) {
              const sound = this.scene.sound.add(layer.key, {
                volume: layer.volume * this.ambientVolume * this.masterVolume,
                loop: layer.loop,
              });
              sound.play();
              this.ambientSounds.set(layer.key, sound);
            }
          } catch (e) {
            // Ambient not loaded, ignore
          }
        }
      }
    });
  }

  private handleTimeChange(period: string): void {
    // Adjust ambient based on time of day
    if (period === 'Night') {
      this.playMusic('night');
    } else if (period === 'Evening') {
      this.playMusic('evening');
    } else if (period === 'Market Hours') {
      this.playMusic('market');
    } else {
      this.playMusic('morning');
    }

    // Play church bells at certain hours
    if (period === 'Morning' || period === 'Evening') {
      this.playSfx('bell_toll');
    }
  }

  private handleZoneChange(zoneName: string): void {
    if (this.currentZone !== zoneName) {
      this.currentZone = zoneName;
      this.updateAmbientForZone(zoneName);
    }
  }

  // Volume controls
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      (this.currentMusic as any).setVolume(this.musicVolume * this.masterVolume);
    }
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    this.ambientSounds.forEach((sound) => {
      (sound as any).setVolume(this.ambientVolume * this.masterVolume);
    });
  }

  private updateAllVolumes(): void {
    if (this.currentMusic) {
      (this.currentMusic as any).setVolume(this.musicVolume * this.masterVolume);
    }
    this.ambientSounds.forEach((sound, key) => {
      const layer = this.ambientLayers.find((l) => l.key === key);
      if (layer) {
        (sound as any).setVolume(layer.volume * this.ambientVolume * this.masterVolume);
      }
    });
  }

  public mute(): void {
    this.scene.sound.mute = true;
  }

  public unmute(): void {
    this.scene.sound.mute = false;
  }

  public toggleMute(): void {
    this.scene.sound.mute = !this.scene.sound.mute;
  }
}
