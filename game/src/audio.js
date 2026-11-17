// audio.js — procedural Web Audio sound effects: plucks, bubbles, thuds, chimes.
// No audio files, no network: every sound is synthesized. One file, one job: sound.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.45;
        this.master.connect(this.ctx.destination);
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return !!this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.45;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ensure() || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noiseBurst(dur, vol, low) {
    if (!this.ensure() || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = low || 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // Short wooden pluck (sling release, UI clicks).
  pluck() { this.tone(520, 0.12, 'triangle', 0.25, 260); }
  click() { this.tone(760, 0.06, 'square', 0.10, 700); }
  // Rising bubble (cauldron capture).
  bubble() { this.tone(300, 0.35, 'sine', 0.30, 900); this.tone(450, 0.30, 'sine', 0.15, 1200); }
  // Low thud (enemy hit).
  thud() { this.tone(140, 0.14, 'sine', 0.35, 60); this.noiseBurst(0.08, 0.12, 500); }
  // Bright chime (relic draft, victory).
  chime() { this.tone(660, 0.5, 'sine', 0.22); this.tone(880, 0.6, 'sine', 0.18); this.tone(1320, 0.7, 'sine', 0.10); }
  // Boss sting.
  sting() { this.tone(110, 0.8, 'sawtooth', 0.16, 55); this.tone(165, 0.8, 'sawtooth', 0.10, 82); }
  // Springy boing (wall ricochet).
  boing() { this.tone(220, 0.16, 'sine', 0.22, 440); }
  // Splash (frost / bomb).
  splash() { this.noiseBurst(0.3, 0.25, 1400); this.tone(500, 0.25, 'sine', 0.15, 180); }
}
