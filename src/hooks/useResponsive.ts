import { useState, useEffect } from 'react';

// ブレークポイント定義
export const BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * 現在のビューポートサイズに基づいてブレークポイントを検出するフック
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('mobile');

  useEffect(() => {
    const getBreakpoint = (width: number): Breakpoint => {
      if (width >= BREAKPOINTS.wide) return 'wide';
      if (width >= BREAKPOINTS.desktop) return 'desktop';
      if (width >= BREAKPOINTS.tablet) return 'tablet';
      return 'mobile';
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    // 初期値設定
    handleResize();

    // リサイズイベントリスナー
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

/**
 * 特定のブレークポイント以上かどうかを判定するフック
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const updateMatch = () => setMatches(media.matches);
    updateMatch();

    // MediaQueryListのchangeイベントをサポート
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } else {
      // 古いブラウザ用フォールバック
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}

/**
 * 便利なメディアクエリフック
 */
export function useResponsive() {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';
  const isWide = breakpoint === 'wide';
  
  const isTabletUp = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);
  const isDesktopUp = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);
  const isWideUp = useMediaQuery(`(min-width: ${BREAKPOINTS.wide}px)`);

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isTabletUp,
    isDesktopUp,
    isWideUp,
  };
}

/**
 * デバイスタイプを検出するフック
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // タッチデバイスの検出
    const checkTouch = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    // デバイスタイプの判定
    const checkDeviceType = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      
      if (/mobile|android|iphone|ipod/i.test(userAgent) || width < BREAKPOINTS.tablet) {
        return 'mobile';
      } else if (/ipad|tablet/i.test(userAgent) || (checkTouch() && width < BREAKPOINTS.desktop)) {
        return 'tablet';
      }
      return 'desktop';
    };

    setIsTouchDevice(checkTouch());
    setDeviceType(checkDeviceType());

    const handleResize = () => {
      setDeviceType(checkDeviceType());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { deviceType, isTouchDevice };
}

/**
 * ビューポートサイズを取得するフック
 */
export function useViewportSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}