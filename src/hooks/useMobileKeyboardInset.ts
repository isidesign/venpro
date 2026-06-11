import { useEffect } from 'react';

function updateKeyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport) {
    document.documentElement.style.setProperty('--keyboard-inset', '0px');
    return;
  }

  const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
  document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
}

export function useMobileKeyboardInset() {
  useEffect(() => {
    updateKeyboardInset();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateKeyboardInset);
    viewport?.addEventListener('scroll', updateKeyboardInset);
    window.addEventListener('orientationchange', updateKeyboardInset);

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches('input, textarea, select')) return;

      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 320);
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      viewport?.removeEventListener('resize', updateKeyboardInset);
      viewport?.removeEventListener('scroll', updateKeyboardInset);
      window.removeEventListener('orientationchange', updateKeyboardInset);
      document.removeEventListener('focusin', handleFocusIn);
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
    };
  }, []);
}
