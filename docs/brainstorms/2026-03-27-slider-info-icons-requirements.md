---
date: 2026-03-27
topic: slider-info-icons
---

# Slider Info Icons

## Problem Frame

The app has ~40 sliders controlling financial model inputs. Several use abbreviated or domain-specific labels ("Maint. & Vacancy", "PMI Rate", "Buy Closing Costs") that aren't self-explanatory to users unfamiliar with real-estate finance. There's no in-UI guidance — users must guess or leave defaults.

## Requirements

- R1. When a `tooltip` prop is present on a Slider, render a small ⓘ icon inline after the label text.
- R2. Hovering the ⓘ icon shows a custom styled dark popover with the description text. Pure CSS/JSX, no library.
- R3. The popover matches the app's dark theme (dark bg, muted border, small readable font).
- R4. All ~40 Slider instances in App.jsx are given a `tooltip` description string.
- R5. Sliders without a `tooltip` prop render identically to today — no visual change, no icon.

## Success Criteria

- Every slider has a visible ⓘ that reveals a plain-language description on hover.
- No visible layout shift or overflow when popovers appear.
- The Slider component remains self-contained (no global CSS, no external dependencies).

## Scope Boundaries

- No mobile/touch support required — hover-only is acceptable for this desktop financial tool.
- No click-to-pin or persistent tooltip behavior.
- No changes to slider behavior, values, or ranges.

## Key Decisions

- **Custom styled vs. native browser tooltip**: Custom dark popover chosen for visual consistency with the app's dark theme. Native `title` would be unstyled and inconsistent.
- **ⓘ icon character**: Use the Unicode ⓘ (U+24D8) inline character — no SVG or icon library needed.
- **Popover positioning**: Absolute positioned relative to the label row, appearing below the icon. No smart repositioning needed at this scale.
- **All sliders vs. non-obvious only**: All sliders get descriptions for consistency — users shouldn't have to guess which ones have info.

## Deferred to Planning

- [Affects R2][Technical] Exact CSS for popover positioning (z-index, overflow, whether `position: relative` on the label row is sufficient).
- [Affects R4][Needs research] Draft the ~40 description strings — Claude can write these during planning/implementation using the slider labels and ranges as context.

## Next Steps

→ `/ce:plan` for structured implementation planning
