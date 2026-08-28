export interface ServiceTierDisplay {
  tierName: string;
  color: string;
  hasRainbow: boolean;
  hasYinYang: boolean;
  holidayDays: number;
  meaning: string;
  years: string;
}

// 0-indexed: key = completed years of service
export const SERVICE_TIERS: Record<number, ServiceTierDisplay> = {
  0: { tierName: 'Ivory Essence', color: '#FFFEF5', hasRainbow: false, hasYinYang: false, holidayDays: 22, meaning: 'Pure beginnings, representing untouched potential and the start of a promising journey.', years: '0' },
  1: { tierName: 'Golden Dawn', color: '#FFD700', hasRainbow: false, hasYinYang: false, holidayDays: 22, meaning: 'The first rays of recognition, symbolizing growing value and early achievements.', years: '1' },
  2: { tierName: 'Amber Flame', color: '#FF8C00', hasRainbow: false, hasYinYang: false, holidayDays: 22, meaning: 'Warmth and growing passion, representing dedication taking hold.', years: '2' },
  3: { tierName: 'Crimson Fire', color: '#DC143C', hasRainbow: false, hasYinYang: false, holidayDays: 22, meaning: 'Burning dedication and unwavering commitment to excellence.', years: '3' },
  4: { tierName: 'Emerald Crown', color: '#50C878', hasRainbow: false, hasYinYang: false, holidayDays: 23, meaning: 'The first major milestone — growth and loyalty rewarded with prestige.', years: '4' },
  5: { tierName: 'Sapphire Royal', color: '#4169E1', hasRainbow: false, hasYinYang: false, holidayDays: 24, meaning: 'Depth of loyalty and trust, a gemstone of enduring value.', years: '5' },
  6: { tierName: 'Amethyst Reign', color: '#9966CC', hasRainbow: false, hasYinYang: false, holidayDays: 25, meaning: 'Rare wisdom and emerging leadership, a regal milestone.', years: '6' },
  7: { tierName: 'Mahogany Noble', color: '#8B4513', hasRainbow: false, hasYinYang: false, holidayDays: 26, meaning: 'Deep-rooted legacy and strength, representing solid foundations.', years: '7' },
  8: { tierName: 'Prismatic Crown', color: '#FF0000', hasRainbow: true, hasYinYang: false, holidayDays: 27, meaning: 'Mastery of all domains — full spectrum excellence and complete expertise.', years: '8' },
  9: { tierName: 'Yin Yang Balance', color: '#FFFFFF', hasRainbow: false, hasYinYang: true, holidayDays: 28, meaning: 'Perfect equilibrium — mastery of opposing forces united in harmony.', years: '9' },
  10: { tierName: 'Yin Yang Balance', color: '#FFFFFF', hasRainbow: false, hasYinYang: true, holidayDays: 28, meaning: 'Perfect equilibrium — mastery of opposing forces united in harmony.', years: '10+' },
  15: { tierName: 'Obsidian Elite', color: '#1C1C1C', hasRainbow: false, hasYinYang: false, holidayDays: 33, meaning: "Ultra-elite tier for those whose influence runs in the company's DNA.", years: '15+' },
};

// Color manipulation helpers
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function getLighterColor(hex: string, amount: number = 20): string {
  const hsl = hexToHSL(hex);
  return hslToHex(hsl.h, Math.max(0, hsl.s - 10), Math.min(100, hsl.l + amount));
}

export function getDarkerColor(hex: string, amount: number = 20): string {
  const hsl = hexToHSL(hex);
  return hslToHex(hsl.h, Math.min(100, hsl.s + 10), Math.max(0, hsl.l - amount));
}

export function getServiceTierDisplay(yearsOfService: number): ServiceTierDisplay {
  if (yearsOfService >= 15) {
    return SERVICE_TIERS[15];
  }
  if (yearsOfService >= 10) {
    return SERVICE_TIERS[10];
  }
  return SERVICE_TIERS[yearsOfService] || SERVICE_TIERS[0];
}

export function calculateHolidayDays(yearsOfService: number): number {
  const BASE_DAYS = 22;
  
  if (yearsOfService >= 15) return 33;
  if (yearsOfService < 4) return BASE_DAYS;
  return BASE_DAYS + (yearsOfService - 3);
}

export function getYearsFromStartDate(startDate: string | null | undefined): number {
  if (!startDate) return 0;
  
  const start = new Date(startDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export const RING_SIZES = {
  xs: { avatar: 32, ring: 2 },
  sm: { avatar: 64, ring: 3 },
  md: { avatar: 80, ring: 4 },
  lg: { avatar: 128, ring: 5 },
  xl: { avatar: 192, ring: 6 },
} as const;

export type RingSize = keyof typeof RING_SIZES;
