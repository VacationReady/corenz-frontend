export type TenantThemeScale = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  cardHeader: string;
  contentPanel: string;
  sectionBackground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  primaryRgb: string;
  primaryScale: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  editorial: {
    purple: string;
    blue: string;
    teal: string;
    pink: string;
    orange: string;
    yellow: string;
  };
  sunset: {
    1: string;
    2: string;
    3: string;
  };
  chart: {
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
  };
  surface: string;
  surfaceDark: string;
  radius: string;
};

export type TenantThemePalette = {
  light: TenantThemeScale;
  dark: TenantThemeScale;
};

type PartialTenantThemeScale = Partial<
  Omit<TenantThemeScale, "primaryScale" | "editorial" | "sunset" | "chart">
> & {
  primaryScale?: Partial<TenantThemeScale["primaryScale"]>;
  editorial?: Partial<TenantThemeScale["editorial"]>;
  sunset?: Partial<TenantThemeScale["sunset"]>;
  chart?: Partial<TenantThemeScale["chart"]>;
};

type PartialTenantThemePalette = Partial<{
  light: PartialTenantThemeScale;
  dark: PartialTenantThemeScale;
}>;

const basePalette: TenantThemePalette = {
  light: {
    background: "220 25% 98%",
    foreground: "220 20% 10%",
    card: "0 0% 100%",
    cardForeground: "220 15% 15%",
    cardHeader: "220 30% 98%",
    contentPanel: "220 20% 90%",
    sectionBackground: "220 25% 96%",
    popover: "0 0% 100%",
    popoverForeground: "220 15% 15%",
    primary: "217 91% 60%",
    primaryForeground: "0 0% 100%",
    primaryRgb: "59, 130, 246",
    primaryScale: {
      50: "214 100% 97%",
      100: "214 95% 93%",
      200: "213 97% 87%",
      300: "212 96% 78%",
      400: "213 94% 68%",
      500: "217 91% 60%",
      600: "221 83% 53%",
      700: "224 76% 48%",
      800: "226 71% 40%",
      900: "226 64% 33%",
    },
    secondary: "220 15% 92%",
    secondaryForeground: "220 15% 15%",
    muted: "220 15% 92%",
    mutedForeground: "220 10% 50%",
    accent: "220 20% 88%",
    accentForeground: "220 15% 15%",
    destructive: "0 84.2% 60.2%",
    destructiveForeground: "0 0% 100%",
    border: "220 15% 88%",
    input: "220 20% 94%",
    ring: "217 91% 60%",
    gradientStart: "280 100% 99%",
    gradientMid: "217 100% 97%",
    gradientEnd: "190 100% 98%",
    editorial: {
      purple: "280 100% 70%",
      blue: "217 91% 60%",
      teal: "180 60% 50%",
      pink: "340 82% 65%",
      orange: "25 95% 53%",
      yellow: "45 93% 47%",
    },
    sunset: {
      1: "217 91% 60%",
      2: "267 84% 65%",
      3: "142 76% 55%",
    },
    chart: {
      1: "25 95% 53%",
      2: "15 85% 50%",
      3: "35 75% 45%",
      4: "45 70% 50%",
      5: "55 65% 45%",
    },
    surface: "210 40% 98%",
    surfaceDark: "222 47% 12%",
    radius: "1rem",
  },
  dark: {
    background: "222 47% 7%",
    foreground: "210 40% 98%",
    card: "222 47% 11%",
    cardForeground: "210 40% 98%",
    cardHeader: "222 47% 13%",
    contentPanel: "222 47% 9%",
    sectionBackground: "222 47% 8%",
    popover: "222 47% 11%",
    popoverForeground: "210 40% 98%",
    primary: "217 91% 60%",
    primaryForeground: "210 40% 98%",
    primaryRgb: "59, 130, 246",
    primaryScale: {
      50: "222 47% 15%",
      100: "221 50% 18%",
      200: "220 55% 25%",
      300: "218 60% 35%",
      400: "217 75% 45%",
      500: "217 91% 60%",
      600: "217 91% 65%",
      700: "217 91% 70%",
      800: "216 90% 75%",
      900: "215 88% 80%",
    },
    secondary: "217 32% 17%",
    secondaryForeground: "210 40% 98%",
    muted: "217 32% 17%",
    mutedForeground: "215 20% 65%",
    accent: "217 32% 17%",
    accentForeground: "210 40% 98%",
    destructive: "0 62.8% 50%",
    destructiveForeground: "210 40% 98%",
    border: "217 32% 17%",
    input: "217 32% 17%",
    ring: "217 91% 60%",
    gradientStart: "222 47% 12%",
    gradientMid: "222 47% 10%",
    gradientEnd: "222 47% 8%",
    editorial: {
      purple: "280 100% 75%",
      blue: "217 91% 65%",
      teal: "180 60% 55%",
      pink: "340 82% 70%",
      orange: "25 95% 58%",
      yellow: "45 93% 52%",
    },
    sunset: {
      1: "217 91% 65%",
      2: "267 84% 70%",
      3: "142 76% 60%",
    },
    chart: {
      1: "25 80% 45%",
      2: "15 70% 40%",
      3: "35 60% 35%",
      4: "45 55% 40%",
      5: "55 50% 35%",
    },
    surface: "222 47% 12%",
    surfaceDark: "222 47% 16%",
    radius: "1rem",
  },
};

const tenantPaletteOverrides: Record<string, PartialTenantThemePalette> = {
  default: {},
  peoplecore: {},
  corenz: {
    light: {
      primary: "12 83% 54%",
      primaryForeground: "0 0% 100%",
      primaryRgb: "234, 88, 12",
      primaryScale: {
        50: "18 100% 96%",
        100: "20 94% 89%",
        200: "20 92% 78%",
        300: "18 90% 66%",
        400: "16 88% 58%",
        500: "12 83% 54%",
        600: "10 81% 47%",
        700: "8 80% 40%",
        800: "7 78% 32%",
        900: "5 75% 25%",
      },
      gradientStart: "18 100% 96%",
      gradientMid: "12 92% 90%",
      gradientEnd: "40 96% 90%",
      editorial: {
        purple: "273 90% 70%",
        blue: "208 88% 60%",
        teal: "162 66% 50%",
        pink: "338 82% 65%",
        orange: "20 95% 55%",
        yellow: "48 94% 54%",
      },
      sunset: {
        1: "12 83% 54%",
        2: "326 70% 58%",
        3: "162 66% 50%",
      },
      chart: {
        1: "12 83% 54%",
        2: "340 82% 65%",
        3: "205 90% 60%",
        4: "48 94% 54%",
        5: "162 66% 50%",
      },
      contentPanel: "18 44% 94%",
      sectionBackground: "18 50% 97%",
      surface: "18 50% 97%",
    },
    dark: {
      primary: "20 94% 64%",
      primaryForeground: "210 40% 98%",
      primaryRgb: "249, 115, 22",
      primaryScale: {
        50: "22 60% 20%",
        100: "22 67% 24%",
        200: "22 73% 30%",
        300: "20 80% 40%",
        400: "20 87% 52%",
        500: "20 94% 64%",
        600: "20 94% 68%",
        700: "20 94% 72%",
        800: "20 94% 76%",
        900: "20 94% 80%",
      },
      gradientStart: "18 36% 20%",
      gradientMid: "20 58% 16%",
      gradientEnd: "24 70% 12%",
      editorial: {
        purple: "275 90% 75%",
        blue: "210 90% 68%",
        teal: "165 70% 60%",
        pink: "338 82% 70%",
        orange: "30 94% 65%",
        yellow: "48 94% 62%",
      },
      sunset: {
        1: "20 94% 64%",
        2: "330 70% 62%",
        3: "162 66% 54%",
      },
      chart: {
        1: "20 90% 60%",
        2: "338 80% 58%",
        3: "205 80% 55%",
        4: "48 90% 58%",
        5: "162 66% 50%",
      },
      contentPanel: "24 36% 14%",
      sectionBackground: "24 38% 12%",
      surface: "24 38% 14%",
      surfaceDark: "24 42% 18%",
    },
  },
  aurora: {
    light: {
      primary: "262 83% 58%",
      primaryForeground: "0 0% 100%",
      primaryRgb: "124, 58, 237",
      primaryScale: {
        50: "267 100% 97%",
        100: "265 95% 94%",
        200: "264 94% 86%",
        300: "263 93% 76%",
        400: "262 91% 66%",
        500: "262 83% 58%",
        600: "263 78% 51%",
        700: "264 71% 45%",
        800: "266 67% 39%",
        900: "268 60% 32%",
      },
      gradientStart: "266 100% 96%",
      gradientMid: "245 100% 94%",
      gradientEnd: "198 100% 96%",
      editorial: {
        purple: "262 83% 58%",
        blue: "219 83% 67%",
        teal: "170 67% 50%",
        pink: "320 70% 66%",
        orange: "30 92% 55%",
        yellow: "50 96% 55%",
      },
      sunset: {
        1: "262 83% 58%",
        2: "199 88% 60%",
        3: "150 65% 55%",
      },
      chart: {
        1: "262 83% 58%",
        2: "219 83% 60%",
        3: "170 67% 50%",
        4: "320 70% 60%",
        5: "40 90% 60%",
      },
      contentPanel: "255 56% 94%",
      sectionBackground: "255 60% 97%",
      surface: "255 60% 97%",
    },
    dark: {
      primary: "262 83% 62%",
      primaryForeground: "210 40% 98%",
      primaryRgb: "139, 92, 246",
      primaryScale: {
        50: "260 55% 20%",
        100: "261 60% 26%",
        200: "261 63% 32%",
        300: "262 70% 40%",
        400: "262 78% 50%",
        500: "262 83% 62%",
        600: "262 83% 66%",
        700: "262 83% 70%",
        800: "262 83% 74%",
        900: "262 83% 78%",
      },
      gradientStart: "255 40% 20%",
      gradientMid: "262 50% 16%",
      gradientEnd: "270 55% 12%",
      editorial: {
        purple: "262 83% 68%",
        blue: "219 83% 67%",
        teal: "170 67% 60%",
        pink: "320 70% 68%",
        orange: "30 92% 60%",
        yellow: "50 96% 60%",
      },
      sunset: {
        1: "262 83% 62%",
        2: "199 88% 64%",
        3: "150 65% 60%",
      },
      chart: {
        1: "262 83% 62%",
        2: "219 83% 60%",
        3: "170 67% 55%",
        4: "320 70% 65%",
        5: "40 90% 62%",
      },
      contentPanel: "262 40% 14%",
      sectionBackground: "262 42% 12%",
      surface: "262 42% 14%",
      surfaceDark: "262 46% 18%",
    },
  },
};

const paletteAliases: Record<string, string> = {
  public: "default",
};

function mergeScale(
  base: TenantThemeScale,
  overrides?: PartialTenantThemeScale,
): TenantThemeScale {
  if (!overrides) {
    return base;
  }

  return {
    ...base,
    ...overrides,
    primaryScale: {
      ...base.primaryScale,
      ...overrides.primaryScale,
    },
    editorial: {
      ...base.editorial,
      ...overrides.editorial,
    },
    sunset: {
      ...base.sunset,
      ...overrides.sunset,
    },
    chart: {
      ...base.chart,
      ...overrides.chart,
    },
  };
}

function mergePalette(
  base: TenantThemePalette,
  overrides?: PartialTenantThemePalette,
): TenantThemePalette {
  if (!overrides) {
    return base;
  }

  return {
    light: mergeScale(base.light, overrides.light),
    dark: mergeScale(base.dark, overrides.dark),
  };
}

export function normalizeTenantId(tenantId?: string) {
  const normalized = tenantId?.toLowerCase().trim();
  return normalized ? normalized : undefined;
}

export function getTenantPalette(tenantId?: string): TenantThemePalette {
  const normalized = normalizeTenantId(tenantId) ?? "default";
  const resolvedKey = paletteAliases[normalized] ?? normalized;
  const overrides = tenantPaletteOverrides[resolvedKey];
  if (!overrides) {
    return basePalette;
  }

  return mergePalette(basePalette, overrides);
}

export function createTenantCssVariables(
  palette: TenantThemePalette,
): Record<string, string> {
  const cssVars: Record<string, string> = {
    "--tenant-background": palette.light.background,
    "--tenant-foreground": palette.light.foreground,
    "--tenant-card": palette.light.card,
    "--tenant-card-foreground": palette.light.cardForeground,
    "--tenant-card-header": palette.light.cardHeader,
    "--tenant-content-panel": palette.light.contentPanel,
    "--tenant-section-background": palette.light.sectionBackground,
    "--tenant-popover": palette.light.popover,
    "--tenant-popover-foreground": palette.light.popoverForeground,
    "--tenant-primary": palette.light.primary,
    "--tenant-primary-foreground": palette.light.primaryForeground,
    "--tenant-primary-rgb": palette.light.primaryRgb,
    "--tenant-secondary": palette.light.secondary,
    "--tenant-secondary-foreground": palette.light.secondaryForeground,
    "--tenant-muted": palette.light.muted,
    "--tenant-muted-foreground": palette.light.mutedForeground,
    "--tenant-accent": palette.light.accent,
    "--tenant-accent-foreground": palette.light.accentForeground,
    "--tenant-destructive": palette.light.destructive,
    "--tenant-destructive-foreground": palette.light.destructiveForeground,
    "--tenant-border": palette.light.border,
    "--tenant-input": palette.light.input,
    "--tenant-ring": palette.light.ring,
    "--tenant-gradient-start": palette.light.gradientStart,
    "--tenant-gradient-mid": palette.light.gradientMid,
    "--tenant-gradient-end": palette.light.gradientEnd,
    "--tenant-editorial-purple": palette.light.editorial.purple,
    "--tenant-editorial-blue": palette.light.editorial.blue,
    "--tenant-editorial-teal": palette.light.editorial.teal,
    "--tenant-editorial-pink": palette.light.editorial.pink,
    "--tenant-editorial-orange": palette.light.editorial.orange,
    "--tenant-editorial-yellow": palette.light.editorial.yellow,
    "--tenant-sunset-1": palette.light.sunset[1],
    "--tenant-sunset-2": palette.light.sunset[2],
    "--tenant-sunset-3": palette.light.sunset[3],
    "--tenant-chart-1": palette.light.chart[1],
    "--tenant-chart-2": palette.light.chart[2],
    "--tenant-chart-3": palette.light.chart[3],
    "--tenant-chart-4": palette.light.chart[4],
    "--tenant-chart-5": palette.light.chart[5],
    "--tenant-surface": palette.light.surface,
    "--tenant-surface-dark": palette.light.surfaceDark,
    "--tenant-radius": palette.light.radius,
    "--tenant-dark-background": palette.dark.background,
    "--tenant-dark-foreground": palette.dark.foreground,
    "--tenant-dark-card": palette.dark.card,
    "--tenant-dark-card-foreground": palette.dark.cardForeground,
    "--tenant-dark-card-header": palette.dark.cardHeader,
    "--tenant-dark-content-panel": palette.dark.contentPanel,
    "--tenant-dark-section-background": palette.dark.sectionBackground,
    "--tenant-dark-popover": palette.dark.popover,
    "--tenant-dark-popover-foreground": palette.dark.popoverForeground,
    "--tenant-dark-primary": palette.dark.primary,
    "--tenant-dark-primary-foreground": palette.dark.primaryForeground,
    "--tenant-dark-primary-rgb": palette.dark.primaryRgb,
    "--tenant-dark-secondary": palette.dark.secondary,
    "--tenant-dark-secondary-foreground": palette.dark.secondaryForeground,
    "--tenant-dark-muted": palette.dark.muted,
    "--tenant-dark-muted-foreground": palette.dark.mutedForeground,
    "--tenant-dark-accent": palette.dark.accent,
    "--tenant-dark-accent-foreground": palette.dark.accentForeground,
    "--tenant-dark-destructive": palette.dark.destructive,
    "--tenant-dark-destructive-foreground": palette.dark.destructiveForeground,
    "--tenant-dark-border": palette.dark.border,
    "--tenant-dark-input": palette.dark.input,
    "--tenant-dark-ring": palette.dark.ring,
    "--tenant-dark-gradient-start": palette.dark.gradientStart,
    "--tenant-dark-gradient-mid": palette.dark.gradientMid,
    "--tenant-dark-gradient-end": palette.dark.gradientEnd,
    "--tenant-dark-editorial-purple": palette.dark.editorial.purple,
    "--tenant-dark-editorial-blue": palette.dark.editorial.blue,
    "--tenant-dark-editorial-teal": palette.dark.editorial.teal,
    "--tenant-dark-editorial-pink": palette.dark.editorial.pink,
    "--tenant-dark-editorial-orange": palette.dark.editorial.orange,
    "--tenant-dark-editorial-yellow": palette.dark.editorial.yellow,
    "--tenant-dark-sunset-1": palette.dark.sunset[1],
    "--tenant-dark-sunset-2": palette.dark.sunset[2],
    "--tenant-dark-sunset-3": palette.dark.sunset[3],
    "--tenant-dark-chart-1": palette.dark.chart[1],
    "--tenant-dark-chart-2": palette.dark.chart[2],
    "--tenant-dark-chart-3": palette.dark.chart[3],
    "--tenant-dark-chart-4": palette.dark.chart[4],
    "--tenant-dark-chart-5": palette.dark.chart[5],
    "--tenant-dark-surface": palette.dark.surface,
    "--tenant-dark-surface-dark": palette.dark.surfaceDark,
    "--tenant-dark-radius": palette.dark.radius,
  };

  for (const [tone, value] of Object.entries(palette.light.primaryScale)) {
    cssVars[`--tenant-primary-${tone}`] = value;
  }

  for (const [tone, value] of Object.entries(palette.dark.primaryScale)) {
    cssVars[`--tenant-dark-primary-${tone}`] = value;
  }

  return cssVars;
}
