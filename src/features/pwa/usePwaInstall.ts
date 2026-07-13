import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { THOR_PUBLIC_PATH, THOR_PWA_ASSETS } from './constants';

type InstallOutcome = 'accepted' | 'dismissed' | null;
export type InstallPlatform = 'ios' | 'android' | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function detectStandalone() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || (navigator as NavigatorWithStandalone).standalone === true;
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const userAgent = navigator.userAgent ?? '';
  const isIpadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/i.test(userAgent) || isIpadDesktopMode) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}

export function usePwaInstall() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [outcome, setOutcome] = useState<InstallOutcome>(null);
  const [platform, setPlatform] = useState<InstallPlatform>('other');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    setPlatform(detectPlatform());
    setIsStandalone(detectStandalone());
    setIsReady(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const handleInstalled = () => {
      deferredPrompt.current = null;
      setCanPrompt(false);
      setIsStandalone(true);
      setOutcome('accepted');
      console.info('[AmiDog PWA] Instalación completada.');
    };
    const displayMode = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = () => setIsStandalone(detectStandalone());

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    displayMode?.addEventListener?.('change', handleDisplayModeChange);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(THOR_PWA_ASSETS.serviceWorker, { scope: THOR_PUBLIC_PATH })
        .catch((error: unknown) => console.warn('[AmiDog PWA] No se pudo registrar el service worker.', error));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      displayMode?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return null;

    await prompt.prompt();
    const choice = await prompt.userChoice;
    deferredPrompt.current = null;
    setCanPrompt(false);
    setOutcome(choice.outcome);
    console.info(`[AmiDog PWA] Resultado del diálogo de instalación: ${choice.outcome}.`);
    return choice.outcome;
  }, []);

  return { canPrompt, isReady, isStandalone, outcome, platform, promptInstall };
}
