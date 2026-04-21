# LVector Converter UI Redesign — Design Document

**Date:** 2026-04-21
**Status:** Approved
**Approach:** Canvas Studio — Figma/Linear-style, clean and focused

---

## 1. Overall Layout & Structure

### Viewport (100vh)
```
┌─────────────────────────────────────────────────────┐
│  Header Bar (56px) — Logo, project name, help       │
├─────────────────────────────────────────────────────┤
│                                                     │
│   Preview Canvas (60% height, centered, max 800px)  │
│   - Checkered transparency bg                      │
│   - SVG centered with drop shadow                   │
│   - Split-view slider when active                   │
│   - Floating controls (zoom, fit, toggle split)    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Settings Panel (scrollable, ~35% height)          │
│  ┌─────────┬─────────┬─────────┬─────────┐         │
│  │ Presets │ Colors  │ Shape   │ Output  │ (tabs) │
│  └─────────┴─────────┴─────────┴─────────┘         │
│  [Active tab content - sliders inline]             │
├─────────────────────────────────────────────────────┤
│  Action Bar (64px, centered)                       │
│  [Progressively changing CTA button]               │
└─────────────────────────────────────────────────────┘
```

### Color & Typography
| Token | Light | Dark |
|-------|-------|------|
| Background | `#FAFAFA` | `#0D0D0D` |
| Surface | `#FFFFFF` | `#1A1A1A` |
| Primary accent | `#6366F1` (indigo-500) | same |
| Text | `#1F2937` | `#E5E7EB` |
| Muted | `#9CA3AF` | `#6B7280` |

**Spacing:** 4px base unit. Sections `24px` padding. Components `12px` internal spacing.

---

## 2. Preview Canvas

### Frame
- Centered container, **max 800px wide**, aspect-ratio preserved
- Border: `1px solid #E5E7EB`, `8px border-radius`
- Background: **checkered transparency pattern** (10px squares, `#F0F0F0` / `#FFFFFF`)
- Shadow: `0 4px 24px rgba(0,0,0,0.08)`

### Floating Controls (top-right of canvas)
- Zoom: `−` / `fit` / `+` as icon buttons
- Split toggle: eye icon
- Style: `32px` square, `rgba(255,255,255,0.9)` with `backdrop-filter: blur(8px)`, rounded `6px`

### Comparison Slider
- Draggable vertical divider, `2px` wide, `#6366F1` color
- Circle handle: `24px` diameter, white with indigo border, shadow
- Left = original raster, right = SVG output
- Label badges at top: "Original" / "SVG" pill badges

### Empty State
- Upload icon centered, muted
- Text: "Drop an image here or click to upload"
- Dashed border, same rounded corners
- On drag: border solid indigo, background tints, scale 1.01

---

## 3. Settings Panel

### Structure
- Full width below preview, `1px` border separator
- **Pill-style tab bar**: Presets | Colors | Shape | Output
- `24px` padding, scrollable

### Presets Tab
- 8 preset buttons as **pills** (not dropdown): Default, Posterized, Detailed, Smooth, Sharp, Cinematic, Artistic, Custom
- Active = indigo background, white text
- Inactive = ghost style, hover shows subtle bg

### Colors Tab (4 sliders, 2-column grid)
| Label | Range | Default |
|-------|-------|---------|
| Number of colors | 2–64 | 16 |
| Color sampling | 0–2 | 2 |
| Color quant cycles | 1–10 | 3 |
| Min color ratio | 0.00–1.00 | 0.00 |

### Shape Tab (5 sliders, 2-column grid)
| Label | Range | Default |
|-------|-------|---------|
| Line threshold | 0.1–10 | 1.0 |
| Curve threshold | 0.1–10 | 1.0 |
| Blur radius | 0–5 | 0 |
| Blur delta | 0–256 | 20 |
| Path omit | 0–100 | 8 |

### Output Tab (4 sliders, 2-column grid)
| Label | Range | Default |
|-------|-------|---------|
| Stroke width | 0–10 | 1.0 |
| Round coords | 0–10 | 1.0 |
| Scale | 0.1–10 | 1.0 |
| Layering | 0–2 | 0 |

### Slider Design
- Label left, monospace value right
- Track: `4px` height, rounded, `#E5E7EB`
- Thumb: `14px` circle, indigo fill, white border, shadow
- Hover: thumb scales slightly

---

## 4. Action Bar

### Layout
- Centered, `64px` height, full width

### Progressive States
| State | Button | Style |
|-------|--------|-------|
| No image | "Upload Image" | Indigo bg, white text, upload icon |
| Image loaded | "Convert to SVG" | Indigo bg, white text, refresh icon, subtle shimmer animation |
| Converting | "Converting..." + spinner | Indigo bg 80% opacity, spinner |
| SVG ready | "Export EMF" | Green bg (`#10B981`), white text, download icon |
| EMF exported | "Download Another" | Gray outline, refresh+download icon |

### Button Specs
- Height: `48px`, padding: `0 32px`
- Border-radius: `10px`
- Font: `15px`, weight `600`
- Icon + label, `8px` gap
- Hover: scale `1.02`, deeper shadow
- Active: scale `0.98`
- Disabled: `opacity: 0.5`, `cursor: not-allowed`

---

## 5. Stats Bar & Micro-Details

### Stats Strip
- Below action bar: `"128 paths · 4.2 KB SVG · 16 colors"`
- `12px` monospace, muted color, centered, `48px` height
- Only visible when SVG output exists

### Header Bar (56px)
- Left: "LVector" with small vector icon
- Right: theme toggle, help button

### Responsive Behavior
| Breakpoint | Layout |
|------------|--------|
| >1024px | Full layout |
| 768-1024px | Settings scrollable, 2-col → 1-col sliders |
| <768px | Stacked, preview 50vh, settings below |

### Animations
- Tab switch: `200ms ease-out` fade
- Slider thumb: `150ms` transition
- Button state change: `300ms` scale bounce
- Image load: fade in `400ms`

### Accessibility
- All sliders have `aria-label`
- Focus states: `2px` indigo ring
- WCAG AA color contrast

---

## Component Inventory

| Component | Description |
|-----------|-------------|
| `ConvertView` | Root orchestrator, holds state |
| `PreviewCanvas` | SVG/image display with comparison slider |
| `SettingsPanel` | Tabbed controls (Presets/Colors/Shape/Output) |
| `ActionBar` | Progressive CTA button |
| `StatsBar` | Path count, file size, color count |
| `HeaderBar` | App branding, theme toggle, help |
| `ComparisonSlider` | Draggable overlay for before/after |

---

## Design Principles

1. **Preview is king** — largest area, most visual weight
2. **Progressive disclosure** — action bar tells user exactly what to do next
3. **All settings visible** — no hidden panels, no popovers, everything in view
4. **Quality feedback** — comparison slider and stats give instant visual confirmation
5. **Figma-grade polish** — micro-animations, hover states, transitions everywhere