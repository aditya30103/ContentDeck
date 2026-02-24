import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for waiting worker on load — auto-apply it
      if (reg.waiting) {
        setShowUpdate(true);
        reg.waiting.postMessage('SKIP_WAITING'); // don't wait for user tap
        return;
      }

      // Listen for new worker installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowUpdate(true);
          }
        });
      });
    });

    // Reload when the new SW takes over
    let refreshing = false;
    function onControllerChange() {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium shadow-lg">
      <RefreshCw size={16} className="animate-spin" />
      <span>Updating to latest version…</span>
    </div>
  );
}
