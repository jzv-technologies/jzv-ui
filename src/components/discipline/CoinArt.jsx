import React, { useMemo } from 'react';

/**
 * Discipline coin artwork.
 *
 * The PNGs live in src/media/discipline in three sizes:
 *   small/  - the scorecard table
 *   stack/  - the coin-stack popup (clicking a coin takes it out of the class)
 *   large/  - spare, for the graphical views
 *
 * They are picked up with Vite glob imports, so they are bundled with a hash in dev and production
 * alike and only files that actually exist are registered. Anything missing - the silver and gold
 * appreciation coins today, or a category added before its artwork - falls back to a CSS coin drawn
 * from the category's accent colour and shape, so a view never shows a broken image.
 */
const variantModules = {
  small: import.meta.glob('../../media/discipline/small/*.png', { eager: true, import: 'default' }),
  stack: import.meta.glob('../../media/discipline/stack/*.png', { eager: true, import: 'default' }),
  large: import.meta.glob('../../media/discipline/large/*.png', { eager: true, import: 'default' }),
};

const byBasename = (modules) =>
  Object.entries(modules).reduce((acc, [path, url]) => {
    acc[path.split('/').pop()] = url;
    return acc;
  }, {});

const MEDIA = {
  small: byBasename(variantModules.small),
  stack: byBasename(variantModules.stack),
  large: byBasename(variantModules.large),
};

/** Filenames available for a size - used by the Setup tab's artwork picker. */
export const COIN_FILES = Object.keys(MEDIA.small);

/**
 * Resolve a category's artwork filename for a size. The stack and large folders fall back to the
 * small one, so a category only needs to exist once to work everywhere.
 */
export const resolveCoinImage = (fileName, variant = 'small') => {
  if (!fileName) return null;
  const base = String(fileName).split('/').pop();
  return MEDIA[variant]?.[base] || MEDIA.small[base] || null;
};

/**
 * @param {Object} props
 * @param {string} [props.image] - filename inside the media folder, e.g. 'red.png'
 * @param {'small'|'stack'|'large'} [props.variant]
 * @param {string} [props.accent] - CSS colour for the fallback coin
 * @param {'circle'|'square'} [props.shape]
 * @param {number|string} [props.face] - value printed on the coin (5/10/20/50/100), optional
 * @param {number} [props.size] - pixel width (default 28)
 * @param {number} [props.height] - pixel height; defaults to `size`. The stack artwork is a wide
 *   ellipse (300x162), so a pile passes a shorter height and the image letter-boxes inside it.
 * @param {string} [props.alt]
 * @param {boolean} [props.dim] - render faded, e.g. a category with nothing left
 * @param {string} [props.className]
 */
const CoinArt = ({
  image,
  variant = 'small',
  accent = '#94a3b8',
  shape = 'circle',
  face = null,
  size = 28,
  height = null,
  alt = 'coin',
  dim = false,
  className = '',
}) => {
  const url = useMemo(() => resolveCoinImage(image, variant), [image, variant]);
  const dimension = { width: `${size}px`, height: `${height || size}px` };
  const wrapperClass = `inline-flex items-center justify-center shrink-0 ${dim ? 'opacity-40' : ''} ${className}`;

  if (url) {
    return (
      <span className={wrapperClass} style={dimension} title={alt}>
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain drop-shadow-sm"
        />
      </span>
    );
  }

  const box = Number(height || size);
  const textSize = Math.max(7, Math.round(box * (String(face || '').length > 2 ? 0.28 : 0.36)));
  return (
    <span
      className={wrapperClass}
      style={{
        ...dimension,
        borderRadius: shape === 'square' ? `${Math.max(2, box * 0.16)}px` : '9999px',
        background: `radial-gradient(circle at 32% 28%, #ffffffcc, ${accent} 62%)`,
        border: `1px solid ${accent}`,
        boxShadow: 'inset 0 -1px 2px rgba(0,0,0,.25)',
      }}
      title={alt}
      data-coin-fallback="true"
    >
      {face ? (
        <span
          className="font-black leading-none text-white"
          style={{ fontSize: `${textSize}px`, textShadow: '0 1px 1px rgba(0,0,0,.45)' }}
        >
          {face}
        </span>
      ) : null}
    </span>
  );
};

/** Small row of coins, used in the log tab and the coin-stack views. */
export const CoinStack = ({ image, accent, shape, face, count = 0, max = 5, size = 20 }) => {
  const shown = Math.min(Number(count) || 0, max);
  if (shown <= 0) {
    return <span className="text-[11px] font-semibold text-dark-soft">&mdash;</span>;
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: shown }).map((_, index) => (
        <CoinArt
          key={index}
          image={image}
          accent={accent}
          shape={shape}
          face={face}
          size={size}
          alt="coin"
        />
      ))}
      {Number(count) > shown && (
        <span className="text-[10px] font-bold text-dark-muted ml-0.5">+{count - shown}</span>
      )}
    </span>
  );
};

export default CoinArt;
