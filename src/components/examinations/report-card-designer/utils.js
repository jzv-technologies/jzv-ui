import {
  BLOCK_DEFAULT_BG,
  DEFAULT_BLOCK_STYLE,
  DEFAULT_CHART_COLUMN,
  DEFAULT_GRADING_SCALE,
  DEFAULT_TABLE_COLUMN_ORDER,
  DEFAULT_TEMPLATE,
  NAMED_COLORS,
} from './constants';

/**
 * Helper to compute grade from percentage using the active grading scale
 */
export const calculateGrade = (pct, scale = DEFAULT_GRADING_SCALE) => {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  const num = Number(pct);
  const activeScale = Array.isArray(scale) && scale.length > 0 ? scale : DEFAULT_GRADING_SCALE;
  const sorted = [...activeScale].sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));
  for (const tier of sorted) {
    if (num >= Number(tier.minPercentage)) {
      return tier.grade;
    }
  }
  return sorted[sorted.length - 1]?.grade || 'F';
};

export const getActiveTableColumns = (tblConfig = {}) => {
  const configuredOrder =
    Array.isArray(tblConfig.columnOrder) && tblConfig.columnOrder.length > 0
      ? tblConfig.columnOrder
      : DEFAULT_TABLE_COLUMN_ORDER;

  // Merge any missing default columns to ensure none are lost
  const fullOrder = [...configuredOrder];
  DEFAULT_TABLE_COLUMN_ORDER.forEach((c) => {
    if (!fullOrder.includes(c)) fullOrder.push(c);
  });

  return fullOrder.filter((colId) => {
    if (colId === 'subject') return true;
    if (colId === 'arabicName') return !!tblConfig.showArabicName;
    if (colId === 'maxMarks') return tblConfig.showMaxMarks !== false;
    if (colId === 'passMarks') return tblConfig.showPassMarks !== false;
    if (colId === 'marksObtained') return tblConfig.showMarksObtained !== false;
    if (colId === 'percentage') return !!tblConfig.showPercentage;
    if (colId === 'grade') return tblConfig.showGrade !== false;
    if (colId === 'status') return tblConfig.showStatus !== false;
    return false;
  });
};

// Convert hex color to rgba with opacity
export const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string') return hex;
  if (hex.startsWith('rgba') || hex.startsWith('hsla')) return hex;
  if (hex.startsWith('rgb(')) {
    return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length !== 6) return hex;
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Returns background style object honoring noBackground and backgroundOpacity
export const getBlockBackgroundStyle = (styleObj, fallbackColor = '') => {
  if (!styleObj) {
    return fallbackColor && fallbackColor !== 'transparent'
      ? { backgroundColor: fallbackColor }
      : { backgroundColor: 'transparent' };
  }
  if (styleObj.noBackground || styleObj.background === 'transparent') {
    return { backgroundColor: 'transparent' };
  }
  const bg = styleObj.background || fallbackColor;
  if (!bg || bg === 'transparent') {
    return { backgroundColor: 'transparent' };
  }
  const opacity =
    styleObj.backgroundOpacity !== undefined ? Number(styleObj.backgroundOpacity) : 100;
  if (opacity < 100) {
    return { backgroundColor: hexToRgba(bg, Math.max(0, Math.min(100, opacity)) / 100) };
  }
  return { backgroundColor: bg };
};

// Resolves bleed margins and padding for page-width and header/footer top/bottom coverage
export const getBlockBleedStyles = (blockSt = {}, blockKey = '', fallbackColor = '') => {
  const isCoverTop = (blockKey === 'schoolHeader' || blockSt?.coverTop) && !!blockSt?.coverTop;
  const isCoverBottom =
    (blockKey === 'signatures' || blockSt?.coverBottom) && !!blockSt?.coverBottom;
  const isPageWidth = blockSt?.bgWidth === 'page' || isCoverTop || isCoverBottom;
  const hasBleed = isPageWidth || isCoverTop || isCoverBottom;

  const defaultFb = fallbackColor || BLOCK_DEFAULT_BG[blockKey] || '';

  if (!hasBleed) {
    return {
      hasBleed: false,
      isPageWidth: false,
      isCoverTop: false,
      isCoverBottom: false,
      wrapperStyle: {},
      wrapperAttrs: {},
      innerBgStyle: (fb = defaultFb) => getBlockBackgroundStyle(blockSt, fb),
    };
  }

  const wrapperStyle = {
    ...getBlockBackgroundStyle(blockSt, defaultFb),
  };

  if (isPageWidth) {
    wrapperStyle.marginLeft = 'calc(-1 * var(--page-pad-x, 24px))';
    wrapperStyle.marginRight = 'calc(-1 * var(--page-pad-x, 24px))';
    wrapperStyle.width = 'calc(100% + (2 * var(--page-pad-x, 24px)))';
    wrapperStyle.maxWidth = 'calc(100% + (2 * var(--page-pad-x, 24px)))';
    wrapperStyle.boxSizing = 'border-box';
    wrapperStyle.paddingLeft = 'var(--page-pad-x, 24px)';
    wrapperStyle.paddingRight = 'var(--page-pad-x, 24px)';
    if (blockKey === 'schoolHeader') {
      wrapperStyle.borderBottom = '2px solid #0f172a';
    }
    if (blockKey === 'signatures' && (blockSt?.background || !blockSt?.noBackground)) {
      wrapperStyle.borderTop = '2px solid #cbd5e1';
    }
  }

  if (isCoverTop) {
    wrapperStyle.marginTop = 'calc(-1 * var(--page-pad-y, 24px))';
    wrapperStyle.paddingTop = 'calc(var(--page-pad-y, 24px) + 0.75rem)';
  }

  if (isCoverBottom) {
    wrapperStyle.marginBottom = 'calc(-1 * var(--page-pad-y, 24px))';
    wrapperStyle.paddingBottom = 'calc(var(--page-pad-y, 24px) + 0.75rem)';
  }

  return {
    hasBleed: true,
    isPageWidth,
    isCoverTop,
    isCoverBottom,
    wrapperStyle,
    wrapperAttrs: {
      'data-bleed-page': isPageWidth ? 'true' : undefined,
      'data-bleed-top': isCoverTop ? 'true' : undefined,
      'data-bleed-bottom': isCoverBottom ? 'true' : undefined,
    },
    innerBgStyle: () => ({ backgroundColor: 'transparent' }),
  };
};

// Formats data label with custom separator between name and value
export const formatDataLabel = (
  name,
  value,
  separator = 'colon',
  showValues = true,
  showLabels = false
) => {
  if (showValues && showLabels) {
    switch (separator) {
      case 'newline':
        return `${name}\n${value}`;
      case 'comma':
        return `${name}, ${value}`;
      case 'semicolon':
        return `${name}; ${value}`;
      case 'space':
        return `${name} ${value}`;
      case 'bracket':
        return `${name} (${value})`;
      case 'hyphen':
        return `${name} - ${value}`;
      case 'slash':
        return `${name} / ${value}`;
      case 'colon':
      default:
        return `${name}: ${value}`;
    }
  }
  if (showLabels) return `${name}`;
  if (showValues) return `${value}`;
  return '';
};

// Maps legend positions (top/bottom/left/right) to Recharts Legend configuration props
export const getLegendProps = (legendPos = 'bottom', isTight = false) => {
  switch (legendPos) {
    case 'top':
      return {
        verticalAlign: 'top',
        align: 'center',
        layout: 'horizontal',
        wrapperStyle: { fontSize: isTight ? 7.5 : 8, paddingBottom: 2, top: 0 },
      };
    case 'left':
      return {
        verticalAlign: 'middle',
        align: 'left',
        layout: 'vertical',
        wrapperStyle: { fontSize: isTight ? 7 : 7.5, paddingRight: 4, left: 0 },
      };
    case 'right':
      return {
        verticalAlign: 'middle',
        align: 'right',
        layout: 'vertical',
        wrapperStyle: { fontSize: isTight ? 7 : 7.5, paddingLeft: 4, right: 0 },
      };
    case 'bottom':
    default:
      return {
        verticalAlign: 'bottom',
        align: 'center',
        layout: 'horizontal',
        wrapperStyle: { fontSize: isTight ? 7.5 : 8, paddingTop: 2, bottom: isTight ? -4 : 0 },
      };
  }
};

// Normalizes data label positioning across Cartesian (vertical/horizontal), Line, Area, and Pie/Donut charts
export const getLabelPlacement = (chartType, rawPos = 'top') => {
  const isHoriz = chartType === 'horizontal_bar' || chartType === 'stacked_bar_h';
  const isLineOrArea = chartType === 'line' || chartType === 'area';
  const isPie = chartType === 'donut' || chartType === 'pie';

  if (isPie) {
    const isInside = ['inside', 'center', 'insideTop', 'insideBottom'].includes(rawPos);
    return { isInside, position: isInside ? 'inside' : 'outside', offset: 0 };
  }

  if (isHoriz) {
    switch (rawPos) {
      case 'center':
        return { isInside: true, position: 'center', offset: 0 };
      case 'inside':
      case 'insideTop':
        return { isInside: true, position: 'insideRight', offset: 4 };
      case 'insideBottom':
        return { isInside: true, position: 'insideLeft', offset: 4 };
      case 'top':
      default:
        return { isInside: false, position: 'right', offset: 4 };
    }
  }

  if (isLineOrArea) {
    switch (rawPos) {
      case 'center':
        return { isInside: true, position: 'center', offset: 0 };
      case 'insideBottom':
      case 'bottom':
        return { isInside: false, position: 'bottom', offset: 6 };
      case 'top':
      case 'inside':
      case 'insideTop':
      default:
        return { isInside: false, position: 'top', offset: 6 };
    }
  }

  // Vertical Bar & Stacked Bar
  switch (rawPos) {
    case 'center':
      return { isInside: true, position: 'center', offset: 0 };
    case 'inside':
    case 'insideTop':
      return { isInside: true, position: 'insideTop', offset: 4 };
    case 'insideBottom':
      return { isInside: true, position: 'insideBottom', offset: 4 };
    case 'top':
    default:
      return { isInside: false, position: 'top', offset: 4 };
  }
};

/**
 * Helper to convert Hex to RGB object { r, g, b }
 */
export const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

/**
 * Helper to convert RGB to Hex string (#RRGGBB)
 */
export const rgbToHex = (r, g, b) => {
  const clamp = (val) => Math.max(0, Math.min(255, Math.round(Number(val) || 0)));
  const toHex = (val) => clamp(val).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Returns a human-friendly color name from any hex or CSS color
 */
export const getColorName = (color, defaultName = 'Default / None') => {
  if (!color || color === 'transparent' || color === '') return defaultName;
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  let closest = null;
  let minDistance = Infinity;
  for (const c of NAMED_COLORS) {
    const d = Math.sqrt((rgb.r - c.r) ** 2 + (rgb.g - c.g) ** 2 + (rgb.b - c.b) ** 2);
    if (d === 0) return c.name;
    if (d < minDistance) {
      minDistance = d;
      closest = c;
    }
  }

  if (minDistance < 32 && closest) {
    return closest.name;
  }
  return closest ? closest.name : color.toUpperCase();
};

/**
 * Deep-merges a saved template config over a base config, filling in defaults for
 * every nested block style. (Moved out of the component – it only depends on module constants.)
 */
export const mergeConfig = (base, override) => ({
  ...base,
  ...(override || {}),
  blockSpacing: override?.blockSpacing ?? base.blockSpacing ?? 12,
  showExtraComponent: override?.showExtraComponent ?? base.showExtraComponent ?? false,
  extraComponentConfig: {
    ...base.extraComponentConfig,
    ...(override?.extraComponentConfig || {}),
  },
  showAttendanceBar: override?.showAttendanceBar ?? base.showAttendanceBar ?? true,
  attendanceBarConfig: {
    ...base.attendanceBarConfig,
    ...(override?.attendanceBarConfig || {}),
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...base.attendanceBarConfig?.style,
      ...(override?.attendanceBarConfig?.style || {}),
    },
  },
  schoolHeader: {
    ...base.schoolHeader,
    ...(override?.schoolHeader || {}),
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...base.schoolHeader?.style,
      ...(override?.schoolHeader?.style || {}),
    },
  },
  studentFields: { ...base.studentFields, ...(override?.studentFields || {}) },
  studentInfoConfig: {
    ...base.studentInfoConfig,
    ...(override?.studentInfoConfig || {}),
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...base.studentInfoConfig?.style,
      ...(override?.studentInfoConfig?.style || {}),
    },
  },
  subjectTableConfig: {
    ...base.subjectTableConfig,
    ...(override?.subjectTableConfig || {}),
    columnLabels: {
      ...(base.subjectTableConfig?.columnLabels || {}),
      ...(override?.subjectTableConfig?.columnLabels || {}),
    },
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...base.subjectTableConfig?.style,
      ...(override?.subjectTableConfig?.style || {}),
    },
  },
  summaryConfig: {
    ...base.summaryConfig,
    ...(override?.summaryConfig || {}),
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...base.summaryConfig?.style,
      ...(override?.summaryConfig?.style || {}),
    },
    itemOrder:
      override?.summaryConfig?.itemOrder ||
      base.summaryConfig?.itemOrder ||
      DEFAULT_TEMPLATE.summaryConfig.itemOrder,
  },
  chartConfig: {
    ...base.chartConfig,
    ...(override?.chartConfig || {}),
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...base.chartConfig?.style,
      ...(override?.chartConfig?.style || {}),
    },
    columns: (
      override?.chartConfig?.columns ||
      base.chartConfig?.columns ||
      DEFAULT_TEMPLATE.chartConfig.columns
    ).map((c) => ({
      ...DEFAULT_CHART_COLUMN,
      ...c,
    })),
  },
  remarksConfig: {
    ...base.remarksConfig,
    ...(override?.remarksConfig || {}),
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...base.remarksConfig?.style,
      ...(override?.remarksConfig?.style || {}),
    },
  },
  signatures: { ...base.signatures, ...(override?.signatures || {}) },
  signaturesConfig: {
    ...base.signaturesConfig,
    ...(override?.signaturesConfig || {}),
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...base.signaturesConfig?.style,
      ...(override?.signaturesConfig?.style || {}),
    },
  },
  gradingScale:
    override?.gradingScale && override.gradingScale.length > 0
      ? override.gradingScale
      : base.gradingScale?.length > 0
        ? base.gradingScale
        : DEFAULT_GRADING_SCALE,
  showGradingScale: override?.showGradingScale ?? base.showGradingScale ?? false,
  blockOrder: (() => {
    const bo = override?.blockOrder || base.blockOrder || DEFAULT_TEMPLATE.blockOrder;
    if (Array.isArray(bo) && !bo.includes('attendanceBar')) {
      const copy = [...bo];
      const studentIdx = copy.indexOf('studentInfo');
      if (studentIdx !== -1) {
        copy.splice(studentIdx + 1, 0, 'attendanceBar');
      } else {
        copy.push('attendanceBar');
      }
      return copy;
    }
    return bo;
  })(),
  subjectGroups: override?.subjectGroups || base.subjectGroups || [],
});
