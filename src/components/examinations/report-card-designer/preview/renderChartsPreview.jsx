import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DEFAULT_BLOCK_STYLE, DEFAULT_CHART_COLUMN, DEFAULT_GRADING_SCALE } from '../constants';
import { formatDataLabel, getLabelPlacement, getLegendProps } from '../utils';

/**
 * renderChartsPreview
 * Live-preview renderer for one report-card block.
 * This is a render function (not a component): it returns null when the block is hidden/empty so
 * PreviewPanel can skip the block wrapper, exactly like the original switch statement did.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
export const renderChartsPreview = ({
  bleed,
  blockSize,
  currentConfig,
  overallPreviewPct,
  previewScoresWithGrades,
}) => {
  if (!currentConfig.showCharts) return null;
  const ch = currentConfig.chartConfig || {};
  const chartCols =
    ch.columns && ch.columns.length > 0 ? ch.columns : [{ ...DEFAULT_CHART_COLUMN }];
  const chartH = ch.height || (blockSize === 'compact' ? 130 : blockSize === 'large' ? 240 : 180);
  const accentColor = currentConfig.accentColor || '#e11d48';
  const secondColor = currentConfig.secondaryColor || '#059669';
  const PALETTE = ['#e11d48', '#059669', '#7c3aed', '#0284c7', '#d97706', '#db2777', '#0891b2'];

  // Helper: determines if a chart column represents a percentage metric
  const isPercentage = (colCfg) => {
    const d =
      colCfg.chartData === 'classification'
        ? 'grade_classification'
        : colCfg.chartData || 'subject_marks';
    const agg = colCfg.aggregation || 'none';
    if (d === 'subject_pct' || d === 'overall_pct') return true;
    if (d === 'subject_classification' && agg !== 'sum' && agg !== 'max') return true;
    return false;
  };

  // Build chart data for a column config
  const buildChartData = (colCfg) => {
    const d =
      colCfg.chartData === 'classification'
        ? 'grade_classification'
        : colCfg.chartData || 'subject_marks';
    const agg = colCfg.aggregation || 'none';

    if (d === 'subject_marks') {
      return previewScoresWithGrades.map((s) => ({
        name: s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + '…' : s.subjectName,
        fullName: s.subjectName,
        value: s.marksObtained,
        Max: s.maxMarks,
      }));
    }

    if (d === 'subject_pct') {
      return previewScoresWithGrades.map((s) => ({
        name: s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + '…' : s.subjectName,
        fullName: s.subjectName,
        value: Math.round((s.marksObtained / s.maxMarks) * 100),
        Max: 100,
      }));
    }

    if (d === 'subject_classification') {
      // Aggregate preview scores by Subject Classification
      const groupsMap = new Map();
      previewScoresWithGrades.forEach((s) => {
        const key = s.classificationName || 'General';
        if (!groupsMap.has(key)) {
          groupsMap.set(key, []);
        }
        groupsMap.get(key).push(s);
      });

      const result = [];
      groupsMap.forEach((subList, groupName) => {
        const totalObt = subList.reduce((acc, curr) => acc + (Number(curr.marksObtained) || 0), 0);
        const totalMax = subList.reduce((acc, curr) => acc + (Number(curr.maxMarks) || 0), 0);
        const count = subList.length;

        let val = 0;
        if (agg === 'sum') {
          val = Math.round(totalObt);
        } else if (agg === 'max') {
          val = Math.max(...subList.map((s) => Number(s.marksObtained) || 0));
        } else {
          val =
            totalMax > 0
              ? Math.round((totalObt / totalMax) * 100)
              : count > 0
                ? Math.round(totalObt / count)
                : 0;
        }

        result.push({
          name: groupName.length > 12 ? groupName.slice(0, 10) + '…' : groupName,
          fullName: `${groupName} (${count} subject${count === 1 ? '' : 's'})`,
          value: val,
          count,
          Max: agg === 'sum' ? totalMax : 100,
        });
      });
      return result;
    }

    if (d === 'grade_classification') {
      // Frequency distribution of grades across subjects
      const scale =
        Array.isArray(currentConfig.gradingScale) && currentConfig.gradingScale.length > 0
          ? currentConfig.gradingScale
          : DEFAULT_GRADING_SCALE;

      const counts = {};
      scale.forEach((g) => {
        counts[g.grade] = 0;
      });
      previewScoresWithGrades.forEach((s) => {
        if (s.grade) {
          counts[s.grade] = (counts[s.grade] || 0) + 1;
        }
      });

      const isPieOrDonut = colCfg.chartType === 'pie' || colCfg.chartType === 'donut';
      const gradeEntries = scale.map((g) => ({
        name: g.grade,
        fullName: `Grade ${g.grade}${g.description ? ` (${g.description})` : ''}`,
        value: counts[g.grade] || 0,
        count: counts[g.grade] || 0,
      }));

      const nonZero = gradeEntries.filter((g) => g.value > 0);
      return isPieOrDonut || nonZero.length >= 3
        ? nonZero.length > 0
          ? nonZero
          : gradeEntries
        : gradeEntries;
    }

    if (d === 'attendance') {
      return [
        { name: 'Present', fullName: 'Present Days', value: 96, Max: 100 },
        { name: 'Absent', fullName: 'Absent Days', value: 4, Max: 100 },
      ];
    }

    if (d === 'overall_pct') {
      return [
        {
          name: 'Score',
          fullName: 'Overall Score',
          value: Math.round(overallPreviewPct),
          Max: 100,
        },
        {
          name: 'Remaining',
          fullName: 'Remaining',
          value: Math.round(100 - overallPreviewPct),
          Max: 100,
        },
      ];
    }

    return previewScoresWithGrades.map((s) => ({
      name: s.subjectName.slice(0, 6),
      fullName: s.subjectName,
      value: s.marksObtained,
      Max: s.maxMarks,
    }));
  };

  const renderSingleChart = (colCfg, h, isTight = false) => {
    const data = buildChartData(colCfg);
    const t = colCfg.chartType || 'bar';
    const pctMode = isPercentage(colCfg);
    const cd =
      colCfg.chartData === 'classification'
        ? 'grade_classification'
        : colCfg.chartData || 'subject_marks';

    // ── Color palette ──
    const userColors = Array.isArray(colCfg.colors) ? colCfg.colors.filter(Boolean) : [];
    const randomHsl = (i) => `hsl(${Math.round((i * 137.508) % 360)}, 65%, 52%)`;
    const getColor = (i) => {
      if (userColors.length > 0) return i < userColors.length ? userColors[i] : randomHsl(i);
      return PALETTE[i % PALETTE.length];
    };
    const baseColor = getColor(0) || accentColor;

    // ── Data labels: showValues, showLabels, separator ──
    const showValues = !!colCfg.showValues;
    const showLabels = !!colCfg.showLabels;
    const showAnyLabel = showValues || showLabels;
    const labelColor = colCfg.dataLabelColor || '#1e293b';
    const rawPos = colCfg.dataLabelPosition || 'top';
    const placement = getLabelPlacement(t, rawPos);
    const labelSeparator = colCfg.dataLabelSeparator || 'colon';

    // Enrich data with displayLabel formatted using separator
    const enrichedData = data.map((d) => {
      const fVal = pctMode ? `${d.value}%` : `${d.value}`;
      const nameStr = d.name || '';
      const displayLabel = formatDataLabel(nameStr, fVal, labelSeparator, showValues, showLabels);
      return {
        ...d,
        formattedValue: fVal,
        displayLabel,
      };
    });

    // ── Max scale → axis domain ──
    const scaleType = colCfg.maxScale || 'auto';
    const axisMax =
      scaleType === 'pct100'
        ? 100
        : scaleType === 'custom'
          ? Number(colCfg.maxScaleValue) || 100
          : 'auto';
    const axisDomain = axisMax === 'auto' ? [0, 'auto'] : [0, axisMax];

    // ── Common Tooltip Formatter ──
    const tooltipFormatter = (val, name, item) => {
      const title = item?.payload?.fullName || name;
      if (pctMode) return [`${val}%`, title];
      if (cd === 'grade_classification') return [`${val} subject${val === 1 ? '' : 's'}`, title];
      if (item?.payload?.Max) return [`${val} / ${item.payload.Max}`, title];
      return [val, title];
    };

    // ── Legend Setup ──
    const hasLegend =
      colCfg.showLegend !== undefined
        ? !!colCfg.showLegend
        : colCfg.chartType === 'donut' || colCfg.chartType === 'pie';
    const legendPos = colCfg.legendPosition || 'bottom';
    const legendProps = getLegendProps(legendPos, isTight);
    const legendPayload = enrichedData.map((d, i) => ({
      value: d.name,
      type: t === 'line' ? 'line' : 'circle',
      id: d.name,
      color: getColor(i),
    }));

    const renderLegendText = (value, entry) => {
      const mode = colCfg.legendTextColorMode || 'data_labels_color';
      const textColor =
        mode === 'chart_color'
          ? entry.color || entry.payload?.fill || baseColor
          : colCfg.dataLabelColor || '#1e293b';
      return (
        <span className="recharts-legend-item-text font-bold" style={{ color: textColor }}>
          {value}
        </span>
      );
    };

    const getCartesianMargin = (kind) => {
      let top = isTight
        ? showAnyLabel && placement.position === 'top'
          ? 14
          : 2
        : showAnyLabel && placement.position === 'top'
          ? 16
          : 5;
      let right = isTight ? 4 : 8;
      let left = isTight ? -20 : -16;
      let bottom = isTight ? -2 : 2;

      if (kind === 'horizontal') {
        top = isTight ? 2 : 4;
        right = isTight
          ? showAnyLabel && placement.position === 'right'
            ? 24
            : 8
          : showAnyLabel && placement.position === 'right'
            ? 32
            : 12;
        left = isTight ? 4 : 8;
        bottom = isTight ? 2 : 4;
      } else if (kind === 'line' || kind === 'area') {
        top = isTight
          ? showAnyLabel && placement.position === 'top'
            ? 14
            : 3
          : showAnyLabel && placement.position === 'top'
            ? 16
            : 5;
        right = isTight ? 4 : 10;
        left = isTight ? -20 : -16;
        bottom = isTight ? -2 : 2;
      }

      if (hasLegend) {
        if (legendPos === 'top') top += 18;
        else if (legendPos === 'bottom') bottom += 16;
        else if (legendPos === 'left') left += 40;
        else if (legendPos === 'right') right += 40;
      }

      return { top, right, left, bottom };
    };

    // Custom SVG Label Renderer for multi-line (line break) and bounded positioning
    const renderSvgLabel = (props) => {
      const { x, y, width, height, value } = props;
      if (!value && value !== 0) return null;
      const str = String(value);
      if (!str) return null;

      if (str.includes('\n')) {
        const lines = str.split('\n');
        let tx = x + (width ? width / 2 : 0);
        let ty = y + (height ? height / 2 : 0);
        let anchor = 'middle';

        if (t === 'horizontal_bar' || t === 'stacked_bar_h') {
          if (placement.position === 'right') {
            tx = x + (width || 0) + 4;
            ty = y + (height ? height / 2 : 0);
            anchor = 'start';
          } else if (placement.position === 'insideRight') {
            tx = x + (width || 0) - 4;
            ty = y + (height ? height / 2 : 0);
            anchor = 'end';
          }
        } else {
          if (placement.position === 'top') {
            ty = y - 4;
          }
        }

        return (
          <text
            x={tx}
            y={ty - (lines.length - 1) * 4.5}
            fill={labelColor}
            textAnchor={anchor}
            dominantBaseline="central"
            fontSize={isTight ? 7.5 : 8}
            fontWeight={700}
          >
            {lines.map((line, idx) => (
              <tspan key={idx} x={tx} dy={idx === 0 ? 0 : '1.15em'}>
                {line}
              </tspan>
            ))}
          </text>
        );
      }

      let tx = x + (width ? width / 2 : 0);
      let ty = y + (height ? height / 2 : 0);
      let anchor = 'middle';

      if (t === 'horizontal_bar' || t === 'stacked_bar_h') {
        if (placement.position === 'right') {
          tx = x + (width || 0) + 4;
          anchor = 'start';
        } else if (placement.position === 'insideRight') {
          tx = x + (width || 0) - 4;
          anchor = 'end';
        }
      } else if (placement.position === 'top') {
        ty = y - 5;
      }

      return (
        <text
          x={tx}
          y={ty}
          fill={labelColor}
          textAnchor={anchor}
          dominantBaseline="central"
          fontSize={isTight ? 7.5 : 8}
          fontWeight={700}
        >
          {str}
        </text>
      );
    };

    if (t === 'text') {
      return (
        <div
          className={`flex flex-col ${isTight ? 'gap-0.5' : 'gap-1'} justify-center h-full px-1`}
        >
          {enrichedData.slice(0, 6).map((d, i) => (
            <div key={i} className="flex items-center justify-between text-[9px] font-bold">
              <span className="text-dark-muted truncate max-w-[60%]">{d.name}</span>
              <span className="font-black" style={{ color: baseColor }}>
                {d.value}
                {pctMode
                  ? '%'
                  : cd === 'grade_classification'
                    ? d.value === 1
                      ? ' subj'
                      : ' subjs'
                    : ''}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (t === 'donut' || t === 'pie') {
      const isPieInside = placement.isInside;
      const pieData = enrichedData.map((d, i) => ({
        ...d,
        fill: getColor(i),
      }));
      const outerR = isTight ? (isPieInside ? '90%' : '80%') : '70%';
      const innerR = t === 'donut' ? (isTight ? '46%' : '40%') : 0;
      const RADIAN = Math.PI / 180;
      const piePaddingAngle =
        colCfg.sliceGap !== undefined ? Number(colCfg.sliceGap) : isTight ? 1 : 2;
      const defaultOuterR = hasLegend ? outerR : isTight ? (isPieInside ? '94%' : '84%') : '76%';
      const effectiveOuterR = colCfg.pieSizePercent ? `${colCfg.pieSizePercent}%` : defaultOuterR;
      const effectiveInnerR =
        t === 'donut' ? (colCfg.donutHolePercent ? `${colCfg.donutHolePercent}%` : innerR) : 0;

      let pieCx = '50%';
      let pieCy = '50%';
      if (hasLegend) {
        if (legendPos === 'left') pieCx = '62%';
        else if (legendPos === 'right') pieCx = '38%';
        else if (legendPos === 'top') pieCy = '58%';
        else if (legendPos === 'bottom') pieCy = '44%';
      }

      const renderCustomPieLabel = (props) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, payload, x, y } = props;
        const text = payload?.displayLabel || '';
        if (!text) return null;

        if (isPieInside) {
          const ir = Number(innerRadius) || 0;
          const or = Number(outerRadius) || 60;
          const r = ir + (or - ir) * (t === 'donut' ? 0.52 : 0.6);
          const lx = cx + r * Math.cos(-midAngle * RADIAN);
          const ly = cy + r * Math.sin(-midAngle * RADIAN);

          if (text.includes('\n')) {
            const lines = text.split('\n');
            return (
              <text
                x={lx}
                y={ly - (lines.length - 1) * 4.5}
                fill={labelColor}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isTight ? 8 : 7.5}
                fontWeight={700}
              >
                {lines.map((l, i) => (
                  <tspan key={i} x={lx} dy={i === 0 ? 0 : '1.15em'}>
                    {l}
                  </tspan>
                ))}
              </text>
            );
          }

          return (
            <text
              x={lx}
              y={ly}
              fill={labelColor}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isTight ? 8.5 : 8}
              fontWeight={700}
            >
              {text}
            </text>
          );
        }

        if (text.includes('\n')) {
          const lines = text.split('\n');
          const anchor = x > cx ? 'start' : 'end';
          return (
            <text
              x={x}
              y={y - (lines.length - 1) * 4.5}
              fill={labelColor}
              textAnchor={anchor}
              dominantBaseline="central"
              fontSize={8}
              fontWeight={700}
            >
              {lines.map((l, i) => (
                <tspan key={i} x={x} dy={i === 0 ? 0 : '1.15em'}>
                  {l}
                </tspan>
              ))}
            </text>
          );
        }

        return (
          <text
            x={x}
            y={y}
            fill={labelColor}
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={8}
            fontWeight={700}
          >
            {text}
          </text>
        );
      };

      return (
        <ResponsiveContainer width="100%" height={h}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx={pieCx}
              cy={pieCy}
              innerRadius={effectiveInnerR}
              outerRadius={effectiveOuterR}
              paddingAngle={piePaddingAngle}
              label={showAnyLabel ? renderCustomPieLabel : undefined}
              labelLine={
                showAnyLabel && !isPieInside ? { stroke: labelColor, strokeWidth: 1 } : false
              }
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
            {hasLegend && (
              <Legend
                payload={legendPayload}
                {...legendProps}
                iconSize={isTight ? 7 : 8}
                formatter={renderLegendText}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (t === 'horizontal_bar') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <BarChart
            data={enrichedData}
            layout="vertical"
            margin={getCartesianMargin('horizontal')}
            barGap={colCfg.barGap !== undefined ? Number(colCfg.barGap) : 4}
            barCategoryGap={colCfg.barCategoryGap || '15%'}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }}
              width={isTight ? 32 : 40}
            />
            <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
            {hasLegend && (
              <Legend
                payload={legendPayload}
                {...legendProps}
                iconSize={isTight ? 7 : 8}
                formatter={renderLegendText}
              />
            )}
            <Bar
              dataKey="value"
              barSize={colCfg.barSize ? Number(colCfg.barSize) : undefined}
              radius={
                colCfg.barRadius !== undefined
                  ? [0, Number(colCfg.barRadius), Number(colCfg.barRadius), 0]
                  : [0, 3, 3, 0]
              }
            >
              {enrichedData.map((_, i) => (
                <Cell key={i} fill={getColor(i)} />
              ))}
              {showAnyLabel && <LabelList dataKey="displayLabel" content={renderSvgLabel} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (t === 'stacked_bar') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <BarChart
            data={enrichedData}
            margin={getCartesianMargin('vertical')}
            barGap={colCfg.barGap !== undefined ? Number(colCfg.barGap) : 4}
            barCategoryGap={colCfg.barCategoryGap || '15%'}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} />
            <YAxis tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
            <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
            {hasLegend && (
              <Legend
                payload={legendPayload}
                {...legendProps}
                iconSize={isTight ? 7 : 8}
                formatter={renderLegendText}
              />
            )}
            <Bar
              dataKey="value"
              stackId="a"
              fill={getColor(0)}
              barSize={colCfg.barSize ? Number(colCfg.barSize) : undefined}
              radius={
                colCfg.barRadius !== undefined
                  ? [Number(colCfg.barRadius), Number(colCfg.barRadius), 0, 0]
                  : undefined
              }
            >
              {showAnyLabel && <LabelList dataKey="displayLabel" content={renderSvgLabel} />}
            </Bar>
            {enrichedData[0]?.Max && <Bar dataKey="Max" stackId="a" fill="#e2e8f0" />}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (t === 'stacked_bar_h') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <BarChart
            data={enrichedData}
            layout="vertical"
            margin={getCartesianMargin('horizontal')}
            barGap={colCfg.barGap !== undefined ? Number(colCfg.barGap) : 4}
            barCategoryGap={colCfg.barCategoryGap || '15%'}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }}
              width={isTight ? 32 : 40}
            />
            <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
            {hasLegend && (
              <Legend
                payload={legendPayload}
                {...legendProps}
                iconSize={isTight ? 7 : 8}
                formatter={renderLegendText}
              />
            )}
            <Bar
              dataKey="value"
              stackId="a"
              fill={getColor(0)}
              barSize={colCfg.barSize ? Number(colCfg.barSize) : undefined}
              radius={
                colCfg.barRadius !== undefined
                  ? [0, Number(colCfg.barRadius), Number(colCfg.barRadius), 0]
                  : undefined
              }
            >
              {showAnyLabel && <LabelList dataKey="displayLabel" content={renderSvgLabel} />}
            </Bar>
            {enrichedData[0]?.Max && <Bar dataKey="Max" stackId="a" fill="#e2e8f0" />}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (t === 'line') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <LineChart data={enrichedData} margin={getCartesianMargin('line')}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} />
            <YAxis tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
            <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
            {hasLegend && (
              <Legend
                payload={legendPayload}
                {...legendProps}
                iconSize={isTight ? 7 : 8}
                formatter={renderLegendText}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={baseColor}
              strokeWidth={colCfg.lineWidth ? Number(colCfg.lineWidth) : 2}
              dot={{
                r: colCfg.dotSize !== undefined ? Number(colCfg.dotSize) : 3,
                fill: baseColor,
              }}
            >
              {showAnyLabel && <LabelList dataKey="displayLabel" content={renderSvgLabel} />}
            </Line>
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (t === 'area') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <AreaChart data={enrichedData} margin={getCartesianMargin('area')}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} />
            <YAxis tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
            <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
            {hasLegend && (
              <Legend
                payload={legendPayload}
                {...legendProps}
                iconSize={isTight ? 7 : 8}
                formatter={renderLegendText}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={baseColor}
              strokeWidth={colCfg.lineWidth ? Number(colCfg.lineWidth) : 2}
              fillOpacity={0.25}
              fill={baseColor}
            >
              {showAnyLabel && <LabelList dataKey="displayLabel" content={renderSvgLabel} />}
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: vertical bar
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart
          data={enrichedData}
          margin={getCartesianMargin('vertical')}
          barGap={colCfg.barGap !== undefined ? Number(colCfg.barGap) : 4}
          barCategoryGap={colCfg.barCategoryGap || '15%'}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} />
          <YAxis tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
          <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
          {hasLegend && (
            <Legend
              payload={legendPayload}
              {...legendProps}
              iconSize={isTight ? 7 : 8}
              formatter={renderLegendText}
            />
          )}
          <Bar
            dataKey="value"
            barSize={colCfg.barSize ? Number(colCfg.barSize) : undefined}
            radius={
              colCfg.barRadius !== undefined
                ? [Number(colCfg.barRadius), Number(colCfg.barRadius), 0, 0]
                : [3, 3, 0, 0]
            }
          >
            {enrichedData.map((_, index) => (
              <Cell key={index} fill={getColor(index)} />
            ))}
            {showAnyLabel && <LabelList dataKey="displayLabel" content={renderSvgLabel} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const totalCols = chartCols.length;
  const gridTemplateStyle =
    totalCols > 1
      ? {
          gridTemplateColumns: chartCols
            .map((c) => `minmax(0, ${c.widthPercent || Math.round(100 / totalCols)}fr)`)
            .join(' '),
        }
      : undefined;

  const chSt = { ...DEFAULT_BLOCK_STYLE, ...(ch.style || {}) };
  const isTight = !!ch.tightMargins;

  return (
    <div
      key="charts"
      className={`${isTight ? 'p-1.5 space-y-1' : 'p-3 space-y-2'} border border-slate-200 rounded-xl transition-all`}
      style={bleed.innerBgStyle('#f8fafc')}
    >
      <div
        className={`grid ${totalCols === 1 ? 'grid-cols-1' : ''} ${isTight ? 'gap-1.5' : 'gap-3'}`}
        style={gridTemplateStyle}
      >
        {chartCols.map((colCfg, colIdx) => {
          const colH = colCfg.height ? Number(colCfg.height) : chartH;
          return (
            <div
              key={colIdx}
              className={`${isTight ? 'space-y-0.5' : 'space-y-1'} min-w-0 w-full overflow-hidden`}
            >
              {colCfg.title && (
                <h5
                  className={`${isTight ? 'text-[9.5px] mb-0.5' : 'text-[10px] mb-1'} font-black text-dark-primary uppercase tracking-wider text-center`}
                >
                  {colCfg.title}
                </h5>
              )}
              {colCfg.chartType === 'text' ? (
                <div style={{ height: `${colH}px` }}>
                  {renderSingleChart(colCfg, colH, isTight)}
                </div>
              ) : (
                renderSingleChart(colCfg, colH, isTight)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
