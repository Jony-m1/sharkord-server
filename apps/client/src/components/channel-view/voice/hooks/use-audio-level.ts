import { useOwnVoiceUser } from '@/features/server/hooks';
import {
  getAudioLevel,
  getHeldSpeakingIntensity,
  getSpeakingIntensity,
  SPEAKING_EFFECT_CLASSES,
  SPEAKING_SAMPLE_INTERVAL_MS,
  SpeakingIntensity
} from '@/helpers/speaking-intensity';
import { useEffect, useState } from 'react';

const ANALYZER_FFT_SIZE = 512;
const ANALYZER_MIN_DECIBELS = -90;
const ANALYZER_MAX_DECIBELS = -10;
// the analyser smooths once per read, not per unit of time. this used to be 0.85 read on every
// animation frame; at half that rate the same response time needs 0.85 squared
const ANALYZER_SMOOTHING_TIME_CONSTANT = 0.72;

// the raw level never reaches react state: the component renders only when the intensity
// bucket changes, a few times a second while someone talks and never while the call is quiet,
// instead of once per animation frame for every participant
const useAudioLevel = (audioStream: MediaStream | undefined) => {
  const [speakingIntensity, setSpeakingIntensity] = useState(
    SpeakingIntensity.Silent
  );
  const ownVoiceUser = useOwnVoiceUser();
  const soundMuted = ownVoiceUser?.state.soundMuted;

  useEffect(() => {
    if (!audioStream || soundMuted) return;

    let audioContext: AudioContext | undefined;
    let intervalId: number | undefined;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      audioContext = new AudioContextClass();

      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);

      analyser.fftSize = ANALYZER_FFT_SIZE;
      analyser.minDecibels = ANALYZER_MIN_DECIBELS;
      analyser.maxDecibels = ANALYZER_MAX_DECIBELS;
      analyser.smoothingTimeConstant = ANALYZER_SMOOTHING_TIME_CONSTANT;

      source.connect(analyser);

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      let shown = SpeakingIntensity.Silent;
      let lastSpokeAt = 0;

      const sample = () => {
        // a page playing call audio keeps its timers at full rate even while hidden, where
        // nobody can see the ring, so the reads and renders wait until it is shown again
        if (document.hidden) return;

        analyser.getByteFrequencyData(frequencyData);

        const now = performance.now();
        const level = getAudioLevel(frequencyData);
        const measured = getSpeakingIntensity(level);

        if (measured !== SpeakingIntensity.Silent) {
          lastSpokeAt = now;
        }

        const next = getHeldSpeakingIntensity({
          shown,
          measured,
          lastSpokeAt,
          now
        });

        if (next === shown) return;

        shown = next;
        setSpeakingIntensity(next);
      };

      intervalId = window.setInterval(sample, SPEAKING_SAMPLE_INTERVAL_MS);
    } catch (error) {
      console.warn('Audio level detection not supported:', error);
    }

    return () => {
      window.clearInterval(intervalId);
      audioContext?.close();
      setSpeakingIntensity(SpeakingIntensity.Silent);
    };
  }, [audioStream, soundMuted]);

  const isSpeaking = speakingIntensity !== SpeakingIntensity.Silent;
  const speakingEffectClass = SPEAKING_EFFECT_CLASSES[speakingIntensity];

  return {
    isSpeaking,
    speakingIntensity,
    speakingEffectClass
  };
};

export { useAudioLevel };
