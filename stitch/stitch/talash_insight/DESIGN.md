# Design System Specification

## 1. Overview & Creative North Star: "The Intelligent Atelier"

In the context of high-stakes talent acquisition, "The Intelligent Atelier" serves as our Creative North Star. We are moving away from the "SaaS-standard" look of cold, boxed-in data. Instead, we treat the recruitment platform as a curated, editorial space where AI insights meet human craftsmanship.

This design system eschews the rigid, line-heavy grids of traditional HR tools in favor of **Tonal Layering** and **Intentional Asymmetry**. By utilizing wide gutters, shifting surface heights, and high-contrast typography, we create an environment that feels authoritative yet breathable. Data is not just displayed; it is presented with purpose.

---

## 2. Colors & Surface Philosophy

The color palette is anchored in a deep, intellectual Indigo, supported by a sophisticated range of Slate and Surface tones.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections, cards, or containers. Structure must be achieved through:
- **Background Color Shifts:** Placing a `surface-container-low` component on a `surface` background.
- **Tonal Transitions:** Using subtle variations in the surface hierarchy to denote hierarchy.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-transparent layers.
- **Page Background:** `surface` (#f7f9fb)
- **Secondary Sections:** `surface-container-low` (#f2f4f6)
- **Primary Cards:** `surface-container-lowest` (#ffffff)
- **Active/Hover States:** `surface-container-high` (#e6e8ea)

### Glass & Gradient Rules
To elevate the "AI-powered" nature of the platform, floating elements (modals, dropdowns, hovering insights) must utilize **Glassmorphism**:
- **Backdrop:** 12px to 20px blur.
- **Fill:** 80% opacity of the `surface` token.
- **CTAs:** Primary buttons and active states should use a subtle linear gradient from `primary` (#4648d4) to `primary-container` (#6063ee) at 135 degrees. This adds "visual soul" and depth that flat hex codes lack.

---

## 3. Typography: The Editorial Voice

We utilize **Inter** to bridge the gap between technical precision and readable editorial.

| Role | Token | Size | Tracking | Weight |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Metric** | `display-md` | 2.75rem | -0.02em | 700 |
| **Section Header** | `headline-sm` | 1.5rem | -0.01em | 600 |
| **Sub-Header** | `title-sm` | 1rem | 0 | 500 |
| **Data Label** | `label-md` | 0.75rem | 0.05em | 700 (Uppercase) |
| **Body/Data** | `body-md` | 0.875rem | 0 | 400 |

**The Identity Logic:** Use `display-md` for high-level AI talent scores to make them feel like headlines in a premium journal. Contrast this with `label-md` in uppercase for table headers to create a "technical blueprint" aesthetic.

---

## 4. Elevation & Depth

We define hierarchy through **Tonal Layering** rather than structural shadows.

### The Layering Principle
Depth is achieved by "stacking." A candidate profile card (`surface-container-lowest`) sits atop a search results pane (`surface-container-low`), which in turn sits on the main application background (`surface`). This creates natural lift without visual clutter.

### Ambient Shadows
Shadows are reserved for "true flight" (e.g., a candidate comparison modal). 
- **Blur:** 32px to 48px.
- **Opacity:** 4% to 6%.
- **Tint:** Shadows must be tinted with the `on-surface-variant` (#464554) color to mimic natural ambient light, never pure black.

### The "Ghost Border" Fallback
If a boundary is required for accessibility in dense data tables, use a **Ghost Border**: `outline-variant` (#c7c4d7) at **15% opacity**. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), `md` (0.375rem) rounding, white text.
- **Secondary:** Surface-tinted background, no border. Use `primary-fixed` (#e1e0ff) with `on-primary-fixed` (#07006c) text.
- **Tertiary:** Pure text with `label-md` styling and 8px horizontal padding.

### Cards & Data Lists
- **Rule:** Never use divider lines between list items.
- **Separation:** Use 0.6rem (`spacing-3`) or 0.9rem (`spacing-4`) of vertical whitespace.
- **Selection:** Use a background shift to `surface-container-high` to indicate selection or hover.

### Candidate Score Chips
- **Implementation:** Use a glass-morphic background with a color-coded indicator dot or text color based on ranges:
  - **86-100 (Green):** On-Surface-Variant text with a `10b981` accent.
  - **0-50 (Red):** On-Surface-Variant text with a `ef4444` accent.

### Input Fields
- Avoid the "box" look. Use a `surface-container-low` fill with a bottom-only "Ghost Border" that expands to a 2px `primary` underline on focus.

---

## 6. Do’s and Don’ts

### Do
- **Do** use whitespace as a structural element. If a section feels messy, add more `spacing-8` or `spacing-10` padding.
- **Do** use "Intelligent Asymmetry." For example, align AI summary text to a wider left margin while right-aligning data metrics to create an editorial flow.
- **Do** lean into the Dark Indigo (`#1e1b4b`) sidebar to create a strong vertical anchor for the light-themed workspace.

### Don’t
- **Don’t** use pure black (#000000) for anything. Use `on-surface` (#191c1e) for text to maintain a premium, soft-contrast feel.
- **Don’t** use standard "drop shadows" on cards. Rely on color shifts first.
- **Don’t** crowd the interface. This platform is for "Smart Hiring"—it should feel like it has already done the heavy lifting of filtering out the noise.