import { Easing, interpolate, spring } from "remotion";

export const fps = 30;
export const durationInFrames = 840;

export function clamp(frame: number, range: [number, number], output: [number, number]) {
  return interpolate(frame, range, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1)
  });
}

export function linear(frame: number, range: [number, number], output: [number, number]) {
  return interpolate(frame, range, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
}

export function softSpring(frame: number, from: number) {
  return spring({
    frame: frame - from,
    fps,
    config: { damping: 220, stiffness: 95, mass: 0.8 },
    durationInFrames: 30
  });
}

export function between(frame: number, start: number, end: number) {
  return frame >= start && frame <= end;
}
