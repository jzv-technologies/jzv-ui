# Report Card Designer – module layout

`../ReportCardDesigner.jsx` is still the entry point (same path, same default export, same named
exports as before). It owns the state + handlers and composes the pieces below.

```
report-card-designer/
├─ constants.js            default template, grading scale, labels, preview data, colours…
├─ utils.js                calculateGrade, colour helpers, chart helpers, mergeConfig…
├─ renderBlockTitle.jsx    block-title renderer
├─ ColorPicker.jsx         colour picker control
├─ index.js                barrel (re-exported by ReportCardDesigner.jsx for backwards compatibility)
├─ components/
│  ├─ ExtraComponent.jsx   ★ reusable: <ExtraComponentConfig/> + <ExtraComponentLayers/> + getExtraComponentLayers()
│  ├─ DesignerHeader.jsx, TemplateSelectorBar.jsx, ConfigTabsBar.jsx
│  ├─ BlockSpacingCard.jsx, GradingScaleLegend.jsx
├─ tabs/                   LayoutTab, GradingTab, GroupingTab
├─ block-settings/         BlockRowHeader, BlockSettingsPanel, BlockCommonSettings + one *Settings per block
├─ preview/                PreviewPanel + one renderXxxPreview() per block
└─ modals/                 GradeRuleModal, GroupModal
```

## ExtraComponent (reusable)

```jsx
import ExtraComponentConfig, { ExtraComponentLayers } from './report-card-designer/components/ExtraComponent';

// settings card (uncontrolled: it manages its own open/closed state)
<ExtraComponentConfig currentConfig={config} setCurrentConfig={setConfig} />

// optional: control the open state yourself
<ExtraComponentConfig ... expanded={open} onExpandedChange={setOpen} />

// render the watermark / logo layers on any canvas (parent must be `relative`)
<ExtraComponentLayers currentConfig={config} position="background" />  // behind content (z-0)
<ExtraComponentLayers currentConfig={config} position="foreground" />  // above content  (z-30)
```

## Note on `renderXxxPreview`
The eight preview block renderers are plain render functions, not components, on purpose: each returns
`null` when its block is hidden/empty and `PreviewPanel` then skips the block wrapper – identical to
the original `switch`.
