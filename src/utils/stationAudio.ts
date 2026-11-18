// Lightweight Web Audio synthesizer for warm harmonium reeds, station chimes,
// tram bells, and toy train steam whistles, zero external audio dependencies.

export interface HarmoniumNoteEvent {
  noteId: string;
  freq: number;
  startBeat: number;
  durationBeats: number;
  graceFreq?: number;
}

class StationAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private activePassageNodes: AudioNode[] = [];
  private activeOscillators: OscillatorNode[] = [];
  private passageTimers: number[] = [];
  private trainChugTimer: number | null = null;
  private trainChugStep = 0;
  private noiseBuffer: AudioBuffer | null = null;
  public enabled = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') {
      return null;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = null;
      this.compressor = null;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutputNode(ctx: AudioContext): AudioNode {
    if (!this.masterGain || !this.compressor) {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(12, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.004, ctx.currentTime);
      compressor.release.setValueAtTime(0.16, ctx.currentTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.15, ctx.currentTime);

      masterGain.connect(compressor);
      compressor.connect(ctx.destination);

      this.masterGain = masterGain;
      this.compressor = compressor;
    }
    return this.masterGain;
  }

  public playChime(freq: number, duration = 0.45, type: OscillatorType = 'triangle', gainPeak = 0.28) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const output = this.getOutputNode(ctx);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);

    const boostedPeak = Math.min(0.45, gainPeak * 2.4);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(boostedPeak, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.28, now);

    osc.connect(filter);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + duration + 0.03);
    harmonic.stop(now + duration + 0.03);
  }

  private scheduleHarmoniumReed(
    ctx: AudioContext,
    startTime: number,
    durationSec: number,
    freq: number,
    graceFreq?: number,
  ) {
    // Warm harmonium reed blend: triangle fundamental + sawtooth reed + soft octave air
    const oscMain = ctx.createOscillator();
    const oscReed = ctx.createOscillator();
    const oscOctave = ctx.createOscillator();

    const reedGain = ctx.createGain();
    const octaveGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const masterGain = ctx.createGain();
    const output = this.getOutputNode(ctx);

    oscMain.type = 'triangle';
    oscReed.type = 'sawtooth';
    oscOctave.type = 'sine';

    if (graceFreq) {
      const graceDur = Math.min(0.055, durationSec * 0.22);
      oscMain.frequency.setValueAtTime(graceFreq, startTime);
      oscMain.frequency.exponentialRampToValueAtTime(freq, startTime + graceDur);
      oscReed.frequency.setValueAtTime(graceFreq, startTime);
      oscReed.frequency.exponentialRampToValueAtTime(freq, startTime + graceDur);
      oscOctave.frequency.setValueAtTime(graceFreq * 2, startTime);
      oscOctave.frequency.exponentialRampToValueAtTime(freq * 2, startTime + graceDur);
    } else {
      oscMain.frequency.setValueAtTime(freq, startTime);
      oscReed.frequency.setValueAtTime(freq, startTime);
      oscOctave.frequency.setValueAtTime(freq * 2, startTime);
    }

    // Rich, clear reed warmth audible at normal device volume
    reedGain.gain.setValueAtTime(0.34, startTime);
    octaveGain.gain.setValueAtTime(0.18, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1950, startTime);
    filter.Q.setValueAtTime(0.7, startTime);

    const attack = Math.min(0.035, durationSec * 0.18);
    const release = Math.min(0.065, durationSec * 0.25);
    const sustainEnd = Math.max(startTime + attack + 0.01, startTime + durationSec - release);

    masterGain.gain.setValueAtTime(0.0008, startTime);
    masterGain.gain.linearRampToValueAtTime(0.44, startTime + attack);
    masterGain.gain.setValueAtTime(0.38, sustainEnd);
    masterGain.gain.exponentialRampToValueAtTime(0.0008, startTime + durationSec);

    oscMain.connect(filter);
    oscReed.connect(reedGain);
    reedGain.connect(filter);
    oscOctave.connect(octaveGain);
    octaveGain.connect(filter);

    filter.connect(masterGain);
    masterGain.connect(output);

    oscMain.start(startTime);
    oscReed.start(startTime);
    oscOctave.start(startTime);

    const stopAt = startTime + durationSec + 0.03;
    oscMain.stop(stopAt);
    oscReed.stop(stopAt);
    oscOctave.stop(stopAt);

    this.activeOscillators.push(oscMain, oscReed, oscOctave);
    this.activePassageNodes.push(masterGain);
  }

  public playHarmoniumKey(freq: number, durationSec = 0.55) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.scheduleHarmoniumReed(ctx, ctx.currentTime, durationSec, freq);
  }

  public playHarmoniumPassage(
    events: HarmoniumNoteEvent[],
    beatDurationSec: number,
    onEventStart: (event: HarmoniumNoteEvent) => void,
    onComplete: () => void,
  ) {
    this.stopHarmoniumPassage();
    const ctx = this.ensureContext();
    if (!ctx) {
      onComplete();
      return;
    }

    const baseTime = ctx.currentTime + 0.05;
    let maxEndBeat = 0;

    events.forEach((ev) => {
      const startSec = ev.startBeat * beatDurationSec;
      const durSec = Math.max(0.12, ev.durationBeats * beatDurationSec - 0.014);
      maxEndBeat = Math.max(maxEndBeat, ev.startBeat + ev.durationBeats);

      this.scheduleHarmoniumReed(ctx, baseTime + startSec, durSec, ev.freq, ev.graceFreq);

      const timerId = window.setTimeout(() => {
        onEventStart(ev);
      }, Math.max(0, startSec * 1000 + 25));
      this.passageTimers.push(timerId);
    });

    const endTimerId = window.setTimeout(() => {
      this.passageTimers = [];
      this.activeOscillators = [];
      this.activePassageNodes = [];
      onComplete();
    }, maxEndBeat * beatDurationSec * 1000 + 80);
    this.passageTimers.push(endTimerId);
  }

  public stopHarmoniumPassage() {
    this.passageTimers.forEach((id) => window.clearTimeout(id));
    this.passageTimers = [];

    const now = this.ctx?.currentTime ?? 0;
    this.activePassageNodes.forEach((node) => {
      if (node instanceof GainNode && this.ctx) {
        try {
          node.gain.cancelScheduledValues(now);
          node.gain.setValueAtTime(node.gain.value, now);
          node.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        } catch {
          // ignore already-stopped nodes
        }
      }
    });

    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop(now + 0.05);
      } catch {
        // ignore already-stopped oscillators
      }
    });

    this.activeOscillators = [];
    this.activePassageNodes = [];
  }

  public playTramBell() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const output = this.getOutputNode(ctx);

    [0, 0.16].forEach((offset) => {
      const now = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1318.5, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.45);
      osc2.stop(now + 0.45);
    });
  }

  public playTrainWhistle() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const output = this.getOutputNode(ctx);

    const notes = [
      {freq: 523.25, start: 0, dur: 0.24},
      {freq: 659.25, start: 0.04, dur: 0.24},
      {freq: 587.33, start: 0.28, dur: 0.45},
      {freq: 783.99, start: 0.28, dur: 0.45},
    ];

    notes.forEach(({freq, start, dur}) => {
      const now = ctx.currentTime + start;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 0.985, now);
      osc.frequency.linearRampToValueAtTime(freq, now + 0.06);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1850, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      osc.start(now);
      osc.stop(now + dur + 0.04);
    });
  }

  public playStampThud() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const output = this.getOutputNode(ctx);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);

    gain.gain.setValueAtTime(0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(output);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playTrainPuff(ctx: AudioContext, accent: number) {
    const now = ctx.currentTime;
    const output = this.getOutputNode(ctx);

    // 1. Clear steam puff ("chh") via bandpass-filtered noise
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(accent > 0.85 ? 820 : 980, now);
    bandpass.Q.setValueAtTime(1.05, now);

    const steamGain = ctx.createGain();
    const steamPeak = 0.24 * accent;
    steamGain.gain.setValueAtTime(0.001, now);
    steamGain.gain.linearRampToValueAtTime(steamPeak, now + 0.014);
    steamGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.11);

    noise.connect(bandpass);
    bandpass.connect(steamGain);
    steamGain.connect(output);

    noise.start(now);
    noise.stop(now + 0.12);

    // 2. Warm wooden sleeper track rhythm ("ka-chunk")
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(accent > 0.85 ? 110 : 92, now);
    thump.frequency.exponentialRampToValueAtTime(48, now + 0.055);

    thumpGain.gain.setValueAtTime(0.001, now);
    thumpGain.gain.linearRampToValueAtTime(0.16 * accent, now + 0.008);
    thumpGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.065);

    thump.connect(thumpGain);
    thumpGain.connect(output);

    thump.start(now);
    thump.stop(now + 0.07);
  }

  public startTrainChug() {
    if (this.trainChugTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const accents = [1.0, 0.56, 0.78, 0.52];
    this.trainChugStep = 0;

    // Play the opening puff immediately on user interaction
    this.playTrainPuff(ctx, accents[0]);
    this.trainChugStep = 1;

    this.trainChugTimer = window.setInterval(() => {
      const activeCtx = this.ensureContext();
      if (!activeCtx) {
        this.stopTrainChug();
        return;
      }
      const accent = accents[this.trainChugStep % accents.length];
      this.playTrainPuff(activeCtx, accent);
      this.trainChugStep = (this.trainChugStep + 1) % accents.length;
    }, 215);
  }

  public stopTrainChug() {
    if (this.trainChugTimer !== null) {
      window.clearInterval(this.trainChugTimer);
      this.trainChugTimer = null;
    }
    this.trainChugStep = 0;
  }

  public playPop() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const output = this.getOutputNode(ctx);

    // 1. Crisp bubble/cork pop pitch sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.022);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.068);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.075);

    osc.connect(gain);
    gain.connect(output);

    osc.start(now);
    osc.stop(now + 0.085);

    // 2. Subtle puff of air when flame pops out
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1150, now);
    bandpass.Q.setValueAtTime(1.2, now);

    const airGain = ctx.createGain();
    airGain.gain.setValueAtTime(0.001, now);
    airGain.gain.linearRampToValueAtTime(0.16, now + 0.008);
    airGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.055);

    noise.connect(bandpass);
    bandpass.connect(airGain);
    airGain.connect(output);

    noise.start(now);
    noise.stop(now + 0.06);
  }
}

export const stationAudio = new StationAudioEngine();
