import { useEffect, useState } from 'react';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setCanInstall(false);
      return choiceResult.outcome === 'accepted';
    }
    return false;
  };

  return { canInstall, promptInstall };
}



export function useCanInstallPwa() {
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstallable(false);
    } else {
      fetch('/manifest.webmanifest')
        .then((res) => setInstallable(res.ok))
        .catch(() => setInstallable(false));
    }
  }, []);

  return installable;
}
