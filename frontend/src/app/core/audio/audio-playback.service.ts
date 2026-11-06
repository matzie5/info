import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioPlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private synthOscillator: OscillatorNode | null = null;
  private synthGain: GainNode | null = null;

  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(1);
  readonly currentUrl = signal<string | null>(null);
  readonly volume = signal<number>(0.85);
  readonly progressPercent = computed(() => {
    const d = this.duration();
    return d > 0 ? Math.min(100, Math.round((this.currentTime() / d) * 100)) : 0;
  });

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioElement(): void {
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.currentTime.set(this.audioElement.currentTime);
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement && !isNaN(this.audioElement.duration)) {
        this.duration.set(this.audioElement.duration || 1);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.currentTime.set(0);
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio element source error, triggering Web Audio API synthetic fallback', e);
      this.playSyntheticFallback();
    });
  }

  async play(url: string): Promise<void> {
    if (!this.audioElement) {
      this.playSyntheticFallback();
      return;
    }

    try {
      if (this.currentUrl() !== url) {
        this.audioElement.src = url;
        this.currentUrl.set(url);
      }
      this.audioElement.volume = this.volume();
      await this.audioElement.play();
      this.isPlaying.set(true);
    } catch (err) {
      console.warn('HTML5 Audio playback failed or blocked, falling back to Web Audio API:', err);
      this.playSyntheticFallback();
    }
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopSynthetic();
    this.isPlaying.set(false);
  }

  stop(): void {
    this.pause();
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
    }
    this.currentTime.set(0);
  }

  toggle(url: string): void {
    if (this.isPlaying() && this.currentUrl() === url) {
      this.pause();
    } else {
      this.play(url);
    }
  }

  seek(percent: number): void {
    const targetTime = (percent / 100) * this.duration();
    if (this.audioElement) {
      this.audioElement.currentTime = targetTime;
    }
    this.currentTime.set(targetTime);
  }

  setVolume(val: number): void {
    const clamped = Math.max(0, Math.min(1, val));
    this.volume.set(clamped);
    if (this.audioElement) {
      this.audioElement.volume = clamped;
    }
    if (this.synthGain) {
      this.synthGain.gain.setValueAtTime(clamped * 0.2, (this.audioContext?.currentTime || 0));
    }
  }

  private playSyntheticFallback(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.stopSynthetic();

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, this.audioContext.currentTime);
      // Simulate formant modulation
      osc.frequency.exponentialRampToValueAtTime(320, this.audioContext.currentTime + 1.5);
      osc.frequency.exponentialRampToValueAtTime(240, this.audioContext.currentTime + 3.0);

      gain.gain.setValueAtTime(this.volume() * 0.2, this.audioContext.currentTime);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      this.synthOscillator = osc;
      this.synthGain = gain;
      this.isPlaying.set(true);
      this.duration.set(6);

      const startTime = Date.now();
      const timer = setInterval(() => {
        if (!this.isPlaying()) {
          clearInterval(timer);
          return;
        }
        const elapsed = (Date.now() - startTime) / 1000;
        this.currentTime.set(elapsed);
        if (elapsed >= 6) {
          this.stopSynthetic();
          this.isPlaying.set(false);
          this.currentTime.set(0);
          clearInterval(timer);
        }
      }, 100);
    } catch (e) {
      console.error('Web Audio API fallback error:', e);
    }
  }

  private stopSynthetic(): void {
    if (this.synthOscillator) {
      try {
        this.synthOscillator.stop();
        this.synthOscillator.disconnect();
      } catch {
        // Ignored
      }
      this.synthOscillator = null;
    }
  }
}
