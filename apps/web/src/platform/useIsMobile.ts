import { useEffect, useState } from 'react';

/** Phone-width breakpoint shared by every responsive hook (matches the CSS media queries). */
export const MOBILE_MAX_WIDTH = 720;

export function useIsMobile(maxWidth = MOBILE_MAX_WIDTH): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= maxWidth);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= maxWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [maxWidth]);
  return isMobile;
}
