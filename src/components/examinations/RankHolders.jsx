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
  const filename = /\.(jpe?g|png|webp)$/i.test(trimmed) ? trimmed : `${trimmed}.JPG`;
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
    // Rank 4: Deep Amber / Golden
    gradient: 'linear-gradient(180deg, #b45309 0%, #d97706 45%, #fbbf24 100%)',
    ringColor: '#f59e0b',
    rankTextColor: '#b45309',
    shadowColor: 'rgba(245, 158, 11, 0.25)',
    barShadow: '0 12px 28px -6px rgba(180, 83, 9, 0.35), 0 4px 10px -2px rgba(180, 83, 9, 0.2)',
    bottomBarColor: '#f59e0b',
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
const StudentAvatar = ({ photoUrl, studentName, ringColor, sizeClass = 'w-24 h-24' }) => {
  const [imgError, setImgError] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center ${sizeClass}`}
      style={{
        boxShadow: `0 0 0 4px #ffffff, 0 0 0 7px ${ringColor}, 0 8px 16px -2px rgba(0, 0, 0, 0.18)`,
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
          <span className="text-base sm:text-lg tracking-wider font-extrabold select-none">
            {getInitials(studentName)}
          </span>
          <i className="fas fa-graduation-cap text-[10px] opacity-75 mt-0.5" />
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
  baseHeight = 220,
}) => {
  const {
    showPhoto = true,
    showPercentage = true,
    showRank = true,
    showStudentName = true,
    podiumHeights = true,
    style = {},
  } = config;

  const themeIdx = Math.max(0, rankNumber - 1) % RANK_THEMES.length;
  const theme = RANK_THEMES[themeIdx];

  // Podium stepped heights: Rank 1 is tallest, Rank 2 medium, Rank 3 shorter
  let heightMultiplier = 1.0;
  if (podiumHeights) {
    if (rankNumber === 1) heightMultiplier = 1.0;
    else if (rankNumber === 2) heightMultiplier = 0.90;
    else if (rankNumber === 3) heightMultiplier = 0.82;
    else heightMultiplier = Math.max(0.70, 0.82 - (rankNumber - 3) * 0.04);
  }

  const effectiveBaseHeight = isCompact ? Math.round(baseHeight * 0.8) : baseHeight;
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

  // Size classes
  const avatarSize = isCompact
    ? 'w-16 h-16 sm:w-20 sm:h-20'
    : 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28';
  const pctFontSize = isCompact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl md:text-4xl';
  const rankFontSize = isCompact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base md:text-lg';
  const nameFontSize = style?.labelFontSize
    ? `${style.labelFontSize}px`
    : isCompact
      ? '10px'
      : '12px';

  return (
    <div className="flex flex-col items-center flex-1 min-w-[90px] max-w-[190px] group">
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
          className="w-full pt-2.5 pb-2 px-1 flex flex-col items-center justify-center relative"
          style={{ background: theme.gradient }}
        >
          {showPhoto && (
            <div className="relative z-10 my-1">
              <StudentAvatar
                photoUrl={photoUrl}
                studentName={name}
                ringColor={theme.ringColor}
                sizeClass={avatarSize}
              />
            </div>
          )}

          {/* Percentage Value */}
          {showPercentage && (
            <div className="py-2.5 sm:py-3 text-center z-10 w-full px-1">
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
        <div className="w-full bg-white mt-auto pt-2 sm:pt-2.5 pb-2 px-1 text-center border-t border-slate-100 flex flex-col items-center justify-center relative shadow-xs">
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
            className="w-full h-1 sm:h-1.5 mt-1.5 rounded-full"
            style={{ backgroundColor: theme.bottomBarColor }}
          />
        </div>
      </div>

      {/* Student Name under the Bar */}
      {showStudentName && (
        <div className="w-full text-center mt-2 px-0.5">
          <span
            className="font-extrabold uppercase tracking-wide text-dark-primary block truncate leading-tight select-none"
            style={{
              fontSize: nameFontSize,
              color: style?.contentColor || '#0f172a',
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
 * Class Vertical Badge Component (Left sidebar)
 */
const ClassNameBadge = ({ classNameText = 'PLATINUM - 3', isCompact = false }) => {
  return (
    <div
      className="bg-zinc-900 rounded-xl sm:rounded-2xl px-2 sm:px-2.5 py-4 flex items-center justify-center shadow-md border border-zinc-800 shrink-0 select-none"
      style={{
        minWidth: isCompact ? '38px' : '48px',
      }}
    >
      <span
        className="font-black text-amber-400 tracking-widest uppercase whitespace-nowrap text-xs sm:text-sm drop-shadow-xs"
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          letterSpacing: '0.15em',
        }}
      >
        {classNameText}
      </span>
    </div>
  );
};

/**
 * RankHolders Component
 * Renders high-fidelity vertical rank holder bars matching the reference design:
 * - Left vertical badge with Class Name
 * - Vertical bars with fully rounded shape at the top
 * - Circle with student photo
 * - Overall percentage scored
 * - Rank position
 * - Student name
 * - Gradient colors, shades and shadows
 */
export const RankHolders = ({
  students = [],
  className = '',
  classNameText = '',
  config = {},
  isCompact = false,
  allClassRankHolders = null,
}) => {
  const {
    title = 'Class Rank Holders',
    showTitle = false,
    showClassName = true,
    displayFilterMode = 'top_x', // 'top_x' | 'upto_x'
    displayLimit = 3,
    itemsPerRow = 3,
    repeatForEveryClass = false,
    barBaseHeight = 220,
    style = {},
  } = config;

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

  // If repeatForEveryClass is enabled and allClassRankHolders is provided
  const classGroups = [];
  if (repeatForEveryClass && allClassRankHolders && typeof allClassRankHolders === 'object') {
    Object.entries(allClassRankHolders).forEach(([clsName, stuList]) => {
      classGroups.push({
        className: clsName,
        items: filterList(stuList),
      });
    });
  } else {
    // Single class view
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

  return (
    <div
      className={`rounded-2xl transition-all p-3 sm:p-4 space-y-4 ${config.className || ''}`}
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
        const colClass =
          itemsPerRow === 1
            ? 'grid-cols-1'
            : itemsPerRow === 2
              ? 'grid-cols-2'
              : itemsPerRow === 4
                ? 'grid-cols-2 sm:grid-cols-4'
                : itemsPerRow === 5
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
                  : itemsPerRow === 6
                    ? 'grid-cols-3 sm:grid-cols-6'
                    : 'grid-cols-1 sm:grid-cols-3'; // default 3

        return (
          <div
            key={groupIdx}
            className="flex items-stretch gap-3 sm:gap-4 w-full justify-center overflow-x-auto no-scrollbar py-2"
          >
            {/* Left Class Name Badge */}
            {showClassName && (
              <ClassNameBadge classNameText={group.className} isCompact={isCompact} />
            )}

            {/* Rank Holder Bars Row (Bottom-aligned for podium step effect) */}
            <div
              className={`flex-1 flex items-end justify-center gap-3 sm:gap-6 max-w-4xl`}
              style={{
                gap: isCompact ? '12px' : undefined,
              }}
            >
              {items.map((student, idx) => {
                const rankNum = Number(student.classRank || student.rank || idx + 1);
                return (
                  <RankHolderBar
                    key={student.id || student.student_id || idx}
                    student={student}
                    rankNumber={rankNum}
                    config={config}
                    isCompact={isCompact}
                    baseHeight={barBaseHeight}
                  />
                );
              })}

              {items.length === 0 && (
                <div className="py-8 text-center text-xs text-dark-muted font-bold italic w-full">
                  No rank holders found to display
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RankHolders;
