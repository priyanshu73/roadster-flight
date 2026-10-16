/** Original synthesised sound only. Speech uses installed local English voices. */
export class CityAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private siren: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private rotor: OscillatorNode | null = null;
  private rotorGain: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private transients = new Set<OscillatorNode>();
  muted = false;
  paused = true;
  available = true;
  start(): void {
    if (this.context) {
      this.pause(false);
      return;
    }
    try {
      const context = (this.context = new AudioContext());
      this.master = context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.3;
      this.master.connect(context.destination);
      this.engine = context.createOscillator();
      this.engine.type = 'sawtooth';
      this.engine.frequency.value = 45;
      const gain = context.createGain();
      gain.gain.value = 0.012;
      this.engine.connect(gain).connect(this.master);
      this.engine.start();
      this.sources.push(this.engine);
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate),
        data = buffer.getChannelData(0);
      let seed = 812;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = (seed / 4294967296) * 2 - 1;
      }
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      this.filter = context.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 450;
      const ng = context.createGain();
      ng.gain.value = 0.045;
      noise.connect(this.filter).connect(ng).connect(this.master);
      noise.start();
      this.sources.push(noise);
      this.siren = context.createOscillator();
      this.siren.type = 'triangle';
      this.sirenGain = context.createGain();
      this.sirenGain.gain.value = 0;
      this.siren.connect(this.sirenGain).connect(this.master);
      this.siren.start();
      this.sources.push(this.siren);
      this.rotor = context.createOscillator();
      this.rotor.type = 'square';
      this.rotor.frequency.value = 22;
      this.rotorGain = context.createGain();
      this.rotorGain.gain.value = 0;
      this.rotor.connect(this.rotorGain).connect(this.master);
      this.rotor.start();
      this.sources.push(this.rotor);
      this.pause(false);
    } catch {
      this.available = false;
    }
  }
  update(speed: number, boost: boolean, heat: number, helicopter: boolean, time: number): void {
    if (!this.context) return;
    const t = this.context.currentTime;
    this.engine?.frequency.setTargetAtTime(45 + speed * 4 + (boost ? 45 : 0), t, 0.08);
    this.filter?.frequency.setTargetAtTime(400 + speed * 22 + (boost ? 800 : 0), t, 0.1);
    this.siren?.frequency.setTargetAtTime(760 + Math.sin(time * 7) * 260, t, 0.04);
    this.sirenGain?.gain.setTargetAtTime(heat ? 0.012 : 0, t, 0.2);
    this.rotorGain?.gain.setTargetAtTime(helicopter ? 0.01 : 0, t, 0.2);
  }
  tone(frequency: number, duration = 0.2, volume = 0.08, delay = 0): void {
    if (!this.context || !this.master || this.muted || this.paused) return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain(),
      at = c.currentTime + delay;
    o.type = 'triangle';
    o.frequency.value = frequency;
    o.connect(g).connect(this.master);
    g.gain.setValueAtTime(volume, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + duration);
    o.start(at);
    this.transients.add(o);
    o.stop(at + duration);
    o.onended = () => {
      this.transients.delete(o);
      o.disconnect();
      g.disconnect();
    };
  }
  horn(): void {
    this.tone(340, 0.3, 0.14);
    this.tone(440, 0.25, 0.09);
  }
  speak(text: string): void {
    if (this.muted || this.paused) return;
    try {
      const voices =
        window.speechSynthesis
          ?.getVoices()
          .filter((v) => v.localService && v.lang.startsWith('en')) ?? [];
      if (voices.length) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voices[0];
        u.volume = 0.65;
        u.rate = 1.03;
        window.speechSynthesis.speak(u);
        return;
      }
    } catch {
      /* Captions and nonverbal fallback remain available. */
    }
    for (let i = 0; i < 7; i++) this.tone(180 + (i % 3) * 95, 0.08, 0.045, i * 0.115);
  }
  mute(value = !this.muted): void {
    this.muted = value;
    if (this.master) this.master.gain.value = value ? 0 : 0.3;
    if (value) {
      window.speechSynthesis?.cancel();
      this.stopTransients();
    }
  }
  pause(value: boolean): void {
    this.paused = value;
    if (value) {
      this.stopTransients();
      window.speechSynthesis?.cancel();
      void this.context?.suspend().catch(() => {});
    } else void this.context?.resume().catch(() => {});
  }
  private stopTransients(): void {
    for (const source of this.transients) {
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    this.transients.clear();
  }
  snapshot() {
    return {
      state: this.context?.state ?? 'not started',
      muted: this.muted,
      available: this.available,
      localVoices:
        window.speechSynthesis?.getVoices().filter((v) => v.localService && v.lang.startsWith('en'))
          .length ?? 0,
    };
  }
  dispose(): void {
    this.pause(true);
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {}
      s.disconnect();
    });
    this.sources = [];
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
