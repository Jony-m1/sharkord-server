import {
  getAudioLevel,
  getHeldSpeakingIntensity,
  getSpeakingIntensity,
  SPEAKING_EFFECT_CLASSES,
  SPEAKING_RELEASE_HOLD_MS,
  SpeakingIntensity
} from '@/helpers/speaking-intensity';
import { describe, expect, it } from 'bun:test';

describe('getAudioLevel', () => {
  it('should be zero for silence', () => {
    expect(getAudioLevel(new Uint8Array(256))).toBe(0);
  });

  it('should be 100 when every bin is at full scale', () => {
    expect(getAudioLevel(new Uint8Array(256).fill(255))).toBe(100);
  });

  it('should scale the root mean square of the bins', () => {
    // half the bins at full scale: rms is 255 / sqrt(2)
    const frequencyData = new Uint8Array([255, 0, 255, 0]);

    expect(getAudioLevel(frequencyData)).toBeCloseTo(100 / Math.SQRT2, 5);
  });

  it('should treat an empty analyser as silence instead of NaN', () => {
    expect(getAudioLevel(new Uint8Array(0))).toBe(0);
  });
});

describe('getSpeakingIntensity', () => {
  it('should be silent up to and including the speaking threshold', () => {
    expect(getSpeakingIntensity(0)).toBe(SpeakingIntensity.Silent);
    expect(getSpeakingIntensity(8)).toBe(SpeakingIntensity.Silent);
  });

  it('should be quiet just above the threshold', () => {
    expect(getSpeakingIntensity(8.1)).toBe(SpeakingIntensity.Quiet);
    expect(getSpeakingIntensity(14.9)).toBe(SpeakingIntensity.Quiet);
  });

  it('should be normal from 15 and loud from 30', () => {
    expect(getSpeakingIntensity(15)).toBe(SpeakingIntensity.Normal);
    expect(getSpeakingIntensity(29.9)).toBe(SpeakingIntensity.Normal);
    expect(getSpeakingIntensity(30)).toBe(SpeakingIntensity.Loud);
    expect(getSpeakingIntensity(100)).toBe(SpeakingIntensity.Loud);
  });

  it('should map every intensity to its effect class', () => {
    expect(SPEAKING_EFFECT_CLASSES[SpeakingIntensity.Silent]).toBe('');
    expect(SPEAKING_EFFECT_CLASSES[SpeakingIntensity.Quiet]).toBe(
      'speaking-effect-low'
    );
    expect(SPEAKING_EFFECT_CLASSES[SpeakingIntensity.Normal]).toBe(
      'speaking-effect-medium'
    );
    expect(SPEAKING_EFFECT_CLASSES[SpeakingIntensity.Loud]).toBe(
      'speaking-effect-high'
    );
  });
});

describe('getHeldSpeakingIntensity', () => {
  it('should show any level above silence at once', () => {
    expect(
      getHeldSpeakingIntensity({
        shown: SpeakingIntensity.Silent,
        measured: SpeakingIntensity.Loud,
        lastSpokeAt: 1000,
        now: 1000
      })
    ).toBe(SpeakingIntensity.Loud);

    expect(
      getHeldSpeakingIntensity({
        shown: SpeakingIntensity.Loud,
        measured: SpeakingIntensity.Quiet,
        lastSpokeAt: 1000,
        now: 1000
      })
    ).toBe(SpeakingIntensity.Quiet);
  });

  it('should keep the shown intensity through a short pause', () => {
    expect(
      getHeldSpeakingIntensity({
        shown: SpeakingIntensity.Normal,
        measured: SpeakingIntensity.Silent,
        lastSpokeAt: 1000,
        now: 1000 + SPEAKING_RELEASE_HOLD_MS - 1
      })
    ).toBe(SpeakingIntensity.Normal);
  });

  it('should drop to silent once the pause has lasted the hold', () => {
    expect(
      getHeldSpeakingIntensity({
        shown: SpeakingIntensity.Normal,
        measured: SpeakingIntensity.Silent,
        lastSpokeAt: 1000,
        now: 1000 + SPEAKING_RELEASE_HOLD_MS
      })
    ).toBe(SpeakingIntensity.Silent);
  });

  it('should stay silent while nobody speaks', () => {
    expect(
      getHeldSpeakingIntensity({
        shown: SpeakingIntensity.Silent,
        measured: SpeakingIntensity.Silent,
        lastSpokeAt: 0,
        now: 10
      })
    ).toBe(SpeakingIntensity.Silent);
  });
});
