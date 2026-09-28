/** Short dual-tone telephone ring for the facilitator dashboard. */
export function playPhoneRing(): void {
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const chirp = (at: number) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.09, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
    gain.connect(ctx.destination);
    for (const freq of [440, 480]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(at);
      osc.stop(at + 0.4);
    }
  };
  const t = ctx.currentTime + 0.02;
  chirp(t);
  chirp(t + 0.55);
  chirp(t + 1.1);
  window.setTimeout(() => ctx.close(), 2200);
}
