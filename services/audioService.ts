
class AudioService {
  private bgMusic: HTMLAudioElement | null = null;
  private spinSound: HTMLAudioElement | null = null;
  private winSound: HTMLAudioElement | null = null;
  private tickSound: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Background music: Fun, upbeat synth track
      this.bgMusic = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.3;

      this.spinSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3');
      this.winSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
      this.tickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/586/586-preview.mp3');
    }
  }

  toggleMusic(play: boolean) {
    if (!this.bgMusic) return;
    if (play) {
      this.bgMusic.play().catch(e => console.warn("Audio play blocked by browser", e));
    } else {
      this.bgMusic.pause();
    }
  }

  playSpin() {
    if (this.spinSound) {
      this.spinSound.currentTime = 0;
      this.spinSound.play().catch(() => {});
    }
  }

  playWin() {
    if (this.winSound) {
      this.winSound.currentTime = 0;
      this.winSound.play().catch(() => {});
    }
  }

  playTick() {
    if (this.tickSound) {
      this.tickSound.currentTime = 0;
      this.tickSound.volume = 0.2;
      this.tickSound.play().catch(() => {});
    }
  }

  setVolume(vol: number) {
    if (this.bgMusic) this.bgMusic.volume = vol;
  }
}

export const audioService = new AudioService();
