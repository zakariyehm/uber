import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/**
 * Swap offer ringtone here:
 * 1. Put your file in driversapp/assets/sounds/ (e.g. my-ring.mp3)
 * 2. Change the require() path below to that file
 * Supports .wav / .mp3 / .m4a
 */
const OFFER_ALERT_SOUND = require('../assets/sounds/offer-alert.wav');

type OfferPlayer = {
  loop: boolean;
  volume: number;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void | Promise<void>;
  remove: () => void;
};

let player: OfferPlayer | null = null;
let started = false;
let hapticTimer: ReturnType<typeof setInterval> | null = null;

function startVibratePulse() {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 500, 250, 500, 250, 700], true);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    hapticTimer = setInterval(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 1200);
  } catch {
    // ignore
  }
}

function stopVibratePulse() {
  try {
    Vibration.cancel();
  } catch {
    // ignore
  }
  if (hapticTimer) {
    clearInterval(hapticTimer);
    hapticTimer = null;
  }
}

/** Loud looping alert so drivers hear a new offer even when not looking at the phone. */
export async function startOfferAlert() {
  if (started) return;
  started = true;
  startVibratePulse();

  try {
    const audio = require('expo-audio') as {
      setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
      createAudioPlayer: (source: number, options?: { downloadFirst?: boolean }) => OfferPlayer;
    };

    await audio.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    await stopOfferSoundOnly();

    const next = audio.createAudioPlayer(OFFER_ALERT_SOUND);
    next.loop = true;
    next.volume = 1;
    next.play();
    player = next;
  } catch {
    // Vibration/haptics already running — audio optional if native module missing
  }
}

async function stopOfferSoundOnly() {
  if (!player) return;
  const current = player;
  player = null;
  try {
    current.pause();
  } catch {
    // ignore
  }
  try {
    await current.seekTo(0);
  } catch {
    // ignore
  }
  try {
    current.remove();
  } catch {
    // ignore
  }
}

export async function stopOfferAlert() {
  started = false;
  stopVibratePulse();
  await stopOfferSoundOnly();
}
