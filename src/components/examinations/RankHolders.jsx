// src/components/examinations/RankHolders.jsx
import React, { useState } from 'react';
import { getBlockBackgroundStyle } from './report-card-designer/utils';

/**
 * Constructs the public Supabase storage photo URL for a student photo_id.
 * Format: https://yefnykdexpnttwhxoibl.supabase.co/storage/v1/object/public/students_photo/2026-27/<photo_id>.JPG
 */
export const getStudentPhotoUrl = (photoId) => {
  if (!photoId) return null;
  const trimmed = String(photoId).trim();
  if (!trimmed) return null;
  const filename = /\.(jpe?g|png|webp)$/i.test(trimmed) ? trimmed : `${trimmed}.jpg`;
  return `https://yefnykdexpnttwhxoibl.supabase.co/storage/v1/object/public/students_photo/2026-27/${filename}`;
};

// Preset styling for ranks 1 through 6+
export const RANK_THEMES = [
  {
    // Rank 1: Emerald / Forest Green
    gradient: 'linear-gradient(180deg, #047857 0%, #059669 45%, #10b981 100%)',
    ringColor: '#10b981',
    rankTextColor: '#047857',
    shadowColor: 'rgba(16, 185, 129, 0.25)',
    barShadow: '0 12px 28px -6px rgba(4, 120, 87, 0.35), 0 4px 10px -2px rgba(4, 120, 87, 0.2)',
    bottomBarColor: '#10b981',
  },
  {
    // Rank 2: Navy / Cerulean / Sky Blue
    gradient: 'linear-gradient(180deg, #0369a1 0%, #0284c7 45%, #38bdf8 100%)',
    ringColor: '#0ea5e9',
    rankTextColor: '#0284c7',
    shadowColor: 'rgba(14, 165, 233, 0.25)',
    barShadow: '0 12px 28px -6px rgba(2, 132, 199, 0.35), 0 4px 10px -2px rgba(2, 132, 199, 0.2)',
    bottomBarColor: '#0ea5e9',
  },
  {
    // Rank 3: Plum / Royal Fuchsia / Pink
    gradient: 'linear-gradient(180deg, #701a75 0%, #a21caf 45%, #d946ef 100%)',
    ringColor: '#d946ef',
    rankTextColor: '#a21caf',
    shadowColor: 'rgba(217, 70, 239, 0.25)',
    barShadow: '0 12px 28px -6px rgba(162, 28, 175, 0.35), 0 4px 10px -2px rgba(162, 28, 175, 0.2)',
    bottomBarColor: '#d946ef',
  },
  {
    // Rank 5: Indigo / Violet
    gradient: 'linear-gradient(180deg, #3730a3 0%, #4f46e5 45%, #818cf8 100%)',
    ringColor: '#6366f1',
    rankTextColor: '#4338ca',
    shadowColor: 'rgba(99, 102, 241, 0.25)',
    barShadow: '0 12px 28px -6px rgba(55, 48, 163, 0.35), 0 4px 10px -2px rgba(55, 48, 163, 0.2)',
    bottomBarColor: '#6366f1',
  },
  {
    // Rank 4: Deep Amber / Golden
    gradient: 'linear-gradient(180deg, #b45309 0%, #d97706 45%, #fbbf24 100%)',
    ringColor: '#f59e0b',
    rankTextColor: '#b45309',
    shadowColor: 'rgba(245, 158, 11, 0.25)',
    barShadow: '0 12px 28px -6px rgba(180, 83, 9, 0.35), 0 4px 10px -2px rgba(180, 83, 9, 0.2)',
    bottomBarColor: '#f59e0b',
  },
  {
    // Rank 6+: Teal / Cyan
    gradient: 'linear-gradient(180deg, #0f766e 0%, #0d9488 45%, #2dd4bf 100%)',
    ringColor: '#14b8a6',
    rankTextColor: '#0f766e',
    shadowColor: 'rgba(20, 184, 166, 0.25)',
    barShadow: '0 12px 28px -6px rgba(15, 118, 110, 0.35), 0 4px 10px -2px rgba(15, 118, 110, 0.2)',
    bottomBarColor: '#14b8a6',
  },
];

/**
 * Individual Student Avatar Component with Image and Error Fallback
 */
const StudentAvatar = ({
  photoUrl,
  studentName,
  ringColor,
  sizeClass = 'w-24 h-24',
  photoSize = null,
}) => {
  const [imgError, setImgError] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const customPx = photoSize && Number(photoSize) > 0 ? Number(photoSize) : null;

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center ${customPx ? '' : sizeClass}`}
      style={{
        boxShadow: `0 0 0 4px #ffffff, 0 0 0 7px ${ringColor}, 0 8px 16px -2px rgba(0, 0, 0, 0.18)`,
        ...(customPx ? { width: `${customPx}px`, height: `${customPx}px` } : {}),
      }}
    >
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={studentName || 'Student'}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center font-black text-white"
          style={{
            background: `linear-gradient(135deg, ${ringColor} 0%, #0f172a 100%)`,
          }}
        >
          <span
            className="tracking-wider font-extrabold select-none"
            style={{
              fontSize: customPx ? `${Math.max(12, Math.round(customPx * 0.28))}px` : undefined,
            }}
          >
            {getInitials(studentName)}
          </span>
          <i
            className="fas fa-graduation-cap opacity-75 mt-0.5"
            style={{
              fontSize: customPx ? `${Math.max(8, Math.round(customPx * 0.15))}px` : '10px',
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Individual Rank Card Bar
 */
const RankHolderBar = ({
  student = {},
  rankNumber = 1,
  config = {},
  isCompact = false,
  isLarge = false,
  baseHeight = 220,
  perRow = 3,
}) => {
  const {
    showPhoto = true,
    showPercentage = true,
    showRank = true,
    showStudentName = true,
    podiumHeights = true,
    photoSize: cfgPhotoSize,
    nameFontSize: cfgNameFontSize,
    nameColor: cfgNameColor,
    style = {},
  } = config;

  const themeIdx = Math.max(0, rankNumber - 1) % RANK_THEMES.length;
  const theme = RANK_THEMES[themeIdx];

  // Podium stepped heights: Rank 1 is tallest, Rank 2 medium, Rank 3 shorter
  let heightMultiplier = 1.0;
  if (podiumHeights) {
    if (rankNumber === 1) heightMultiplier = 1.0;
    else if (rankNumber === 2) heightMultiplier = 0.9;
    else if (rankNumber === 3) heightMultiplier = 0.82;
    else heightMultiplier = Math.max(0.7, 0.82 - (rankNumber - 3) * 0.04);
  }

  const effectiveBaseHeight = isCompact
    ? Math.round(baseHeight * 0.78)
    : isLarge
      ? Math.round(baseHeight * 1.25)
      : baseHeight;
  const calculatedHeight = Math.round(effectiveBaseHeight * heightMultiplier);

  // Student details
  const name = student.student_name || student.name || `Student ${rankNumber}`;
  const percentage =
    student.percentage !== undefined && student.percentage !== null
      ? typeof student.percentage === 'number'
        ? `${Math.round(student.percentage)}%`
        : String(student.percentage).includes('%')
          ? student.percentage
          : `${student.percentage}%`
      : '—';

  const photoUrl = student.photo_url || getStudentPhotoUrl(student.photo_id);

  // Size classes responsive to perRow count & compact / large mode
  const avatarSize =
    isCompact || perRow >= 5
      ? 'w-14 h-14 sm:w-16 sm:h-16'
      : isLarge
        ? perRow <= 3
          ? 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32'
          : 'w-20 h-20 sm:w-24 sm:h-24'
        : perRow === 4
          ? 'w-16 h-16 sm:w-20 sm:h-20'
          : 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28';

  const pctFontSize =
    isCompact || perRow >= 6
      ? 'text-base sm:text-lg'
      : isCompact
        ? 'text-lg sm:text-xl'
        : isLarge
          ? perRow <= 3
            ? 'text-3xl sm:text-4xl md:text-5xl'
            : 'text-2xl sm:text-3xl'
          : perRow >= 5
            ? 'text-lg sm:text-xl'
            : perRow === 4
              ? 'text-xl sm:text-2xl'
              : 'text-2xl sm:text-3xl md:text-4xl';

  const rankFontSize = isCompact
    ? 'text-[10px] sm:text-[11px]'
    : isLarge
      ? 'text-sm sm:text-base md:text-lg'
      : perRow >= 5
        ? 'text-[11px] sm:text-xs'
        : 'text-xs sm:text-sm md:text-base';

  // Configurable name typography with backwards-compatible fallbacks
  const effectiveNameFontSize = cfgNameFontSize
    ? `${cfgNameFontSize}px`
    : style?.contentFontSize
      ? `${style.contentFontSize}px`
      : style?.labelFontSize
        ? `${style.labelFontSize}px`
        : isCompact
          ? '11px'
          : isLarge
            ? '15px'
            : '13px';

  const effectiveNameColor = cfgNameColor || style?.contentColor || style?.labelColor || '#0f172a';

  // Dynamic width constraints matching items per row & size modes
  const maxBarWidth = isCompact
    ? perRow <= 2
      ? 160
      : perRow === 3
        ? 150
        : perRow === 4
          ? 135
          : 110
    : isLarge
      ? perRow <= 2
        ? 240
        : perRow === 3
          ? 220
          : perRow === 4
            ? 195
            : 155
      : perRow <= 2
        ? 190
        : perRow === 3
          ? 180
          : perRow === 4
            ? 165
            : perRow === 5
              ? 145
              : 125;

  const minBarWidth = isCompact ? 65 : isLarge ? 100 : perRow >= 5 ? 75 : 85;

  return (
    <div
      className="flex flex-col items-center flex-1 group transition-all"
      style={{
        maxWidth: `${maxBarWidth}px`,
        minWidth: `${minBarWidth}px`,
      }}
    >
      {/* ── Main Bar Container (Aligns to bottom baseline) ── */}
      <div
        className="w-full flex flex-col items-center rounded-t-full overflow-hidden transition-all duration-300 relative"
        style={{
          boxShadow: theme.barShadow,
          minHeight: `${calculatedHeight}px`,
        }}
      >
        {/* Top Dome & Photo Section */}
        <div
          className={`w-full flex flex-col items-center justify-center relative ${
            isCompact ? 'pt-2 pb-1.5 px-0.5' : isLarge ? 'pt-4 pb-3 px-2' : 'pt-2.5 pb-2 px-1'
          }`}
          style={{ background: theme.gradient }}
        >
          {showPhoto && (
            <div className="relative z-10 my-1">
              <StudentAvatar
                photoUrl={photoUrl}
                studentName={name}
                ringColor={theme.ringColor}
                sizeClass={avatarSize}
                photoSize={cfgPhotoSize}
              />
            </div>
          )}

          {/* Percentage Value */}
          {showPercentage && (
            <div
              className={`text-center z-10 w-full px-1 ${
                isCompact ? 'py-1.5' : isLarge ? 'py-3.5 sm:py-4' : 'py-2.5 sm:py-3'
              }`}
            >
              <span
                className={`font-black text-white tracking-tight leading-none block drop-shadow-md select-none ${pctFontSize}`}
                style={{
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
              >
                {percentage}
              </span>
            </div>
          )}
        </div>

        {/* Bottom White Card Section with Rank Position */}
        <div
          className={`w-full bg-white mt-auto text-center border-t border-slate-100 flex flex-col items-center justify-center relative shadow-xs ${
            isCompact
              ? 'pt-1.5 pb-1 px-0.5'
              : isLarge
                ? 'pt-3 pb-3 px-2'
                : 'pt-2 sm:pt-2.5 pb-2 px-1'
          }`}
        >
          {showRank && (
            <span
              className={`font-black tracking-tight uppercase block leading-tight ${rankFontSize}`}
              style={{ color: theme.rankTextColor }}
            >
              Rank {rankNumber}
            </span>
          )}

          {/* Colored Bottom Accent Bar */}
          <div
            className={`w-full mt-1.5 rounded-full ${
              isCompact ? 'h-1' : isLarge ? 'h-2' : 'h-1 sm:h-1.5'
            }`}
            style={{ backgroundColor: theme.bottomBarColor }}
          />
        </div>
      </div>

      {/* Student Name under the Bar: wraps up to 2 lines, preserves aligned vertical baseline */}
      {showStudentName && (
        <div className="w-full text-center mt-2 px-1 flex items-start justify-center">
          <span
            className="font-extrabold uppercase tracking-wide block select-none text-center"
            style={{
              fontSize: effectiveNameFontSize,
              color: effectiveNameColor,
              lineHeight: 1.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              minHeight: '2.5em',
            }}
            title={name}
          >
            {name}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Class Vertical Badge Component (Left / Right sidebar)
 */
const ClassNameBadge = ({
  classNameText = 'PLATINUM - 3',
  isCompact = false,
  isLarge = false,
  position = 'left',
}) => {
  return (
    <div
      className="bg-zinc-900 rounded-xl sm:rounded-2xl px-2 sm:px-2.5 py-4 flex items-center justify-center shadow-md border border-zinc-800 shrink-0 select-none self-stretch"
      style={{
        minWidth: isCompact ? '36px' : isLarge ? '54px' : '46px',
      }}
    >
      <span
        className="font-black text-amber-400 tracking-widest uppercase whitespace-nowrap drop-shadow-xs"
        style={{
          writingMode: 'vertical-rl',
          transform: position === 'right' ? 'rotate(0deg)' : 'rotate(180deg)',
          letterSpacing: '0.15em',
          fontSize: isCompact ? '11px' : isLarge ? '15px' : '13px',
        }}
      >
        {classNameText}
      </span>
    </div>
  );
};

/**
 * Class Horizontal Badge Component (Top / Bottom alignment)
 */
const ClassNameHorizontalBadge = ({
  classNameText = 'PLATINUM - 3',
  isCompact = false,
  isLarge = false,
}) => {
  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-xl shadow-md inline-flex items-center gap-2 select-none ${
        isCompact
          ? 'px-2.5 py-1 text-[11px]'
          : isLarge
            ? 'px-4 py-2 text-sm'
            : 'px-3.5 py-1.5 text-xs'
      }`}
    >
      <i className="fas fa-graduation-cap text-amber-400 text-xs" />
      <span className="font-black text-amber-400 tracking-wider uppercase">{classNameText}</span>
    </div>
  );
};

/**
 * RankHolders Component
 * Renders high-fidelity rank holder cards matching the reference design:
 * - Positionable badge with Class Name (8 positions)
 * - Vertical bars with fully rounded shape at the top
 * - Circle with student photo (customizable photoSize)
 * - Overall percentage scored
 * - Rank position
 * - Student name (custom font size, color, up to 2 lines)
 * - Compact, Standard, and Large scaling
 * - Strictly repeats for each class ONLY when repeatForEveryClass is ON
 * - Arranges rank holder cards into rows based on itemsPerRow
 */
export const RankHolders = ({
  students = [],
  className = '',
  classNameText = '',
  config = {},
  isCompact: isCompactProp = false,
  size: sizeProp = null,
  allClassRankHolders = null,
}) => {
  const {
    title = 'Class Rank Holders',
    showTitle = false,
    showClassName = true,
    classNameBadgePosition = 'left',
    displayFilterMode = 'top_x', // 'top_x' | 'upto_x'
    displayLimit = 3,
    itemsPerRow = 3,
    repeatForEveryClass = false,
    barBaseHeight = 220,
    style = {},
  } = config;

  const effectiveSize = sizeProp || config.size || (isCompactProp ? 'compact' : 'standard');
  const isCompact = effectiveSize === 'compact';
  const isLarge = effectiveSize === 'large';

  const isRepeatOn = !!(repeatForEveryClass || config.repeatForEveryClass);

  // Filter rank holders based on displayFilterMode and displayLimit
  const filterList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return [];
    const limit = Number(displayLimit) || 3;

    if (displayFilterMode === 'upto_x') {
      // Show students with rank <= limit
      return list.filter((s, idx) => {
        const r = Number(s.classRank || s.rank || idx + 1);
        return r <= limit;
      });
    }

    // Default 'top_x': slice top X items
    return list.slice(0, limit);
  };

  // Build class groups: ONLY repeat across classes when repeatForEveryClass is ON
  const classGroups = [];
  if (isRepeatOn && allClassRankHolders && typeof allClassRankHolders === 'object') {
    Object.entries(allClassRankHolders).forEach(([clsName, stuList]) => {
      const filtered = filterList(stuList);
      if (filtered.length > 0) {
        classGroups.push({
          className: clsName,
          items: filtered,
        });
      }
    });

    if (classGroups.length === 0) {
      classGroups.push({
        className: classNameText || config.classNameText || className || 'Class',
        items: [],
      });
    }
  } else if (isRepeatOn && Array.isArray(students) && students.length > 0) {
    // If students array contains multiple classes and repeat is enabled
    const grouped = {};
    students.forEach((s) => {
      const cName = s.class_name || s.className || classNameText || 'Class';
      if (!grouped[cName]) grouped[cName] = [];
      grouped[cName].push(s);
    });

    const entries = Object.entries(grouped);
    if (entries.length > 1) {
      entries.forEach(([clsName, stuList]) => {
        const filtered = filterList(stuList);
        if (filtered.length > 0) {
          classGroups.push({
            className: clsName,
            items: filtered,
          });
        }
      });
    } else {
      const displayClass =
        classNameText ||
        config.classNameText ||
        className ||
        students[0]?.class_name ||
        'PLATINUM - 3';

      classGroups.push({
        className: displayClass,
        items: filterList(students),
      });
    }
  } else {
    // Single class view: strictly 1 class when repeatForEveryClass is off
    const displayClass =
      classNameText ||
      config.classNameText ||
      className ||
      students[0]?.class_name ||
      'PLATINUM - 3';

    classGroups.push({
      className: displayClass,
      items: filterList(students),
    });
  }

  const labelFontSize = style?.labelFontSize ? `${style.labelFontSize}px` : '10px';
  const perRow = Math.max(1, Math.min(12, Number(itemsPerRow) || 3));

  const badgePos = classNameBadgePosition || 'left';
  const isTopBadge = showClassName && badgePos.startsWith('top-');
  const isBottomBadge = showClassName && badgePos.startsWith('bottom-');
  const isLeftBadge = showClassName && badgePos === 'left';
  const isRightBadge = showClassName && badgePos === 'right';

  const topBadgeAlign =
    badgePos === 'top-left'
      ? 'justify-start'
      : badgePos === 'top-right'
        ? 'justify-end'
        : 'justify-center';

  const bottomBadgeAlign =
    badgePos === 'bottom-left'
      ? 'justify-start'
      : badgePos === 'bottom-right'
        ? 'justify-end'
        : 'justify-center';

  return (
    <div
      className={`rounded-2xl transition-all ${
        isCompact ? 'p-2 sm:p-2.5' : isLarge ? 'p-5 sm:p-6' : 'p-3 sm:p-4'
      } ${config.className || ''}`}
      style={getBlockBackgroundStyle(style, 'transparent')}
      data-feature="rank-holders-component"
    >
      {/* Optional Block Title Header */}
      {showTitle && (
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200/70">
          <i className="fas fa-trophy text-amber-500 text-xs" />
          <span
            className="font-black uppercase tracking-wider text-dark-primary"
            style={{
              fontSize: labelFontSize,
              color: style?.labelColor || '#0f172a',
            }}
          >
            {title}
          </span>
        </div>
      )}

      {/* Render each class group */}
      {classGroups.map((group, groupIdx) => {
        const items = group.items;

        // Chunk rank holders into rows matching itemsPerRow
        const rows = [];
        for (let i = 0; i < items.length; i += perRow) {
          rows.push(items.slice(i, i + perRow));
        }

        return (
          <div key={groupIdx} className="w-full flex flex-col gap-2.5">
            {groupIdx > 0 && <div className="w-full border-t border-slate-200/80 my-3 pt-1" />}

            {/* Top Class Name Badge */}
            {isTopBadge && (
              <div className={`flex w-full ${topBadgeAlign} px-1`}>
                <ClassNameHorizontalBadge
                  classNameText={group.className}
                  isCompact={isCompact}
                  isLarge={isLarge}
                />
              </div>
            )}

            <div className="flex items-stretch gap-3 sm:gap-4 w-full justify-center overflow-x-auto no-scrollbar py-2">
              {/* Left Class Name Badge */}
              {isLeftBadge && (
                <ClassNameBadge
                  classNameText={group.className}
                  isCompact={isCompact}
                  isLarge={isLarge}
                  position="left"
                />
              )}

              {/* Rank Holder Rows (chunked by itemsPerRow) */}
              <div
                className={`flex-1 flex flex-col max-w-4xl justify-center ${
                  isCompact ? 'gap-3 sm:gap-4' : isLarge ? 'gap-6 sm:gap-8' : 'gap-4 sm:gap-6'
                }`}
              >
                {rows.map((rowItems, rIdx) => (
                  <div
                    key={rIdx}
                    className="flex items-end justify-center w-full"
                    style={{
                      gap: isCompact ? '10px' : isLarge ? '22px' : '16px',
                    }}
                  >
                    {rowItems.map((student, idx) => {
                      const rankNum = Number(
                        student.classRank || student.rank || rIdx * perRow + idx + 1
                      );
                      return (
                        <RankHolderBar
                          key={student.id || student.student_id || `${rIdx}-${idx}`}
                          student={student}
                          rankNumber={rankNum}
                          config={config}
                          isCompact={isCompact}
                          isLarge={isLarge}
                          baseHeight={barBaseHeight}
                          perRow={perRow}
                        />
                      );
                    })}
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="py-8 text-center text-xs text-dark-muted font-bold italic w-full">
                    No rank holders found to display
                  </div>
                )}
              </div>

              {/* Right Class Name Badge */}
              {isRightBadge && (
                <ClassNameBadge
                  classNameText={group.className}
                  isCompact={isCompact}
                  isLarge={isLarge}
                  position="right"
                />
              )}
            </div>

            {/* Bottom Class Name Badge */}
            {isBottomBadge && (
              <div className={`flex w-full ${bottomBadgeAlign} px-1`}>
                <ClassNameHorizontalBadge
                  classNameText={group.className}
                  isCompact={isCompact}
                  isLarge={isLarge}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RankHolders;
