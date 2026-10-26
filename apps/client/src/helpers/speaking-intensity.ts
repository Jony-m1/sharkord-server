export enum SpeakingIntensity {
  Silent = 0,
  Quiet = 1,
  Normal = 2,
  Loud = 3
}

const SPEAKING_THRESHOLD = 8;
const QUIET_CEILING = 15;
const NORMAL_CEILING = 30;

// about 30 times a second: the analyser already smooths over several frames, so reading it
// on every animation frame only bought more wakeups, not a faster ring
export const SPEAKING_SAMPLE_INTERVAL_MS = 33;

// the gaps between words would otherwise drop the ring for a sample or two and flip the
// speaking classes on and off mid sentence
export const SPEAKING_RELEASE_HOLD_MS = 150;

export const SPEAKING_EFFECT_CLASSES: Record<SpeakingIntensity, string> = {
  [SpeakingIntensity.Silent]: '',
  [SpeakingIntensity.Quiet]: 'speaking-effect-low',
  [SpeakingIntensity.Normal]: 'speaking-effect-medium',
  [SpeakingIntensity.Loud]: 'speaking-effect-high'
};

// root mean square of the analyser's frequency bins, scaled to 0-100
export const getAudioLevel = (frequencyData: Uint8Array) => {
  if (frequencyData.length === 0) return 0;

  let sum = 0;

  for (const value of frequencyData) {
    sum += value * value;
  }

  const rms = Math.sqrt(sum / frequencyData.length);

  return Math.min(100, (rms / 255) * 100);
};

export const getSpeakingIntensity = (level: number) => {
  if (level <= SPEAKING_THRESHOLD) return SpeakingIntensity.Silent;
  if (level < QUIET_CEILING) return SpeakingIntensity.Quiet;
  if (level < NORMAL_CEILING) return SpeakingIntensity.Normal;

  return SpeakingIntensity.Loud;
};

type THeldSpeakingIntensityParams = {
  shown: SpeakingIntensity;
  measured: SpeakingIntensity;
  lastSpokeAt: number;
  now: number;
};

// any level above silence shows at once, silence only once it has lasted the hold
export const getHeldSpeakingIntensity = ({
  shown,
  measured,
  lastSpokeAt,
  now
}: THeldSpeakingIntensityParams) => {
  if (measured !== SpeakingIntensity.Silent) return measured;

  if (
    shown !== SpeakingIntensity.Silent &&
    now - lastSpokeAt < SPEAKING_RELEASE_HOLD_MS
  ) {
    return shown;
  }

  return SpeakingIntensity.Silent;
};
