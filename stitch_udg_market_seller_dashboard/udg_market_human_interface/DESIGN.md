---
name: UDG Market Human Interface
colors:
  surface: '#fbf9f7'
  surface-dim: '#dbdad8'
  surface-bright: '#fbf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f1'
  surface-container: '#efedec'
  surface-container-high: '#eae8e6'
  surface-container-highest: '#e4e2e0'
  on-surface: '#1b1c1b'
  on-surface-variant: '#59413d'
  inverse-surface: '#30302f'
  inverse-on-surface: '#f2f0ee'
  outline: '#8d706c'
  outline-variant: '#e1bfb9'
  surface-tint: '#ae3021'
  primary: '#ae3021'
  on-primary: '#ffffff'
  primary-container: '#d04836'
  on-primary-container: '#ffffff'
  inverse-primary: '#ffb4a8'
  secondary: '#006b60'
  on-secondary: '#ffffff'
  secondary-container: '#98f0e1'
  on-secondary-container: '#006f64'
  tertiary: '#575f67'
  on-tertiary: '#ffffff'
  tertiary-container: '#707880'
  on-tertiary-container: '#01050b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410100'
  on-primary-fixed-variant: '#8c170b'
  secondary-fixed: '#9bf2e4'
  secondary-fixed-dim: '#7fd6c8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#dbe3ed'
  tertiary-fixed-dim: '#bfc7d1'
  on-tertiary-fixed: '#141c23'
  on-tertiary-fixed-variant: '#40484f'
  background: '#fbf9f7'
  on-background: '#1b1c1b'
  surface-variant: '#e4e2e0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: -0.022em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.019em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 25px
    letterSpacing: -0.017em
  headline-sm:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.012em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.009em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.006em
  label-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 13px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system blends the artisanal, grounded vibrancy of a collegiate and civic marketplace with the disciplined precision of Apple's Human Interface Guidelines. Designed for the university community—students, faculty, local makers, and campus merchants—the interface balances institutional credibility with tactile warmth.

The personality balances four primary attributes:
- **Disciplined Precision:** Content-forward composition, standardized margins, and crystalline hierarchy inspired by iOS/iPadOS system architectures.
- **Organic Warmth:** Earthbound terracottas and botanical mints layered across soft architectural neutrals, avoiding cold sterile whites.
- **Physical Responsiveness:** Micro-interactions calibrated with tactile haptics, spring-like press compressions (`active:scale-95`), and spatial sheet transitions.
- **Materiality:** Layered translucency, subtle multi-stop specular borders, and variable backdrop blurs that establish tangible spatial planes.

The visual style is **Contemporary Human Interface Materiality**: clean whitespace, rounded grouped surfaces, fluid typography with snug tracking, and translucent frosted overlays that ground digital commerce in a natural, welcoming atmosphere.

## Colors

The palette grounds transactional utility in authentic, warm natural materials while maintaining accessible contrast ratios.

### Palette Architecture
- **Primary (`#D04836` — Terracota):** Core brand accent for primary CTAs, active segmented tab pills, promotional badges, and critical interactive anchors. Conveys energy, craft, and urgency without aggression.
- **Secondary (`#228276` — Mint / Verdigris):** Complementary operational tone used for verified vendor badges, success affirmations, price tags, positive balances, and botanical/sustainable product tags.
- **Tertiary (`#212930` — Navy / Obsidian Stone):** Deep foundation for dominant display typography, unselected navigation elements, primary iconography, and high-emphasis structural shells.
- **Neutral Canvas (`#FBF9F7` — Sand Canvas):** The default root background layer. Soft on the eyes, offering organic tactile warmth compared to harsh default whites.
- **Neutral Elevated (`#FFFFFF` & `#F8FAFC`):** Grouped card content fills and elevated container surfaces that float cleanly over the sand canvas.
- **Stone Tones (`#E8DFD8`, `#E2D9D2`):** Structural borders, list group dividers, non-selected state fills, and interactive track states.

### Surface Roles & Contrast
- **System Background:** `#FBF9F7`
- **Secondary Background (Inset Grouping):** `#F3EFEA`
- **Card Surface:** `#FFFFFF` with `rgba(255, 255, 255, 0.85)` under backdrop-filter blur.
- **Dividers & Separators:** Thin, hairline dividers (`0.5px` or `1px`) using `rgba(33, 41, 48, 0.08)` or `#E8DFD8`.

## Typography

Typography prioritizes clarity, optical rhythm, and structured hierarchy inspired by the native San Francisco scale, rendered cleanly through Inter.

### Optical Rhythm & Rules
- **Negative Tracking (`tracking-tight`):** Sizes `17px` and above incorporate negative letter-spacing (`-0.012em` to `-0.022em`) to eliminate visual slack, matching Apple HIG's native kerning engine.
- **Micro Labels:** Badges, category uppercase flags, and timestamps transition to slightly open tracking (`+0.02em` to `+0.03em`) for legibility at miniature footprints.
- **Weight Pairing:** Headlines utilize SemiBold (`600`) and Bold (`700`) weights to anchor reading flow; Body text stays at Regular (`400`) or Medium (`500`) to preserve optical breathing room.
- **Tabular Numerals:** Currency displays, stock units, and countdown timers must activate `font-variant-numeric: tabular-nums` to maintain aligned spatial columns.

## Layout & Spacing

The system implements a responsive layout foundation centered on iOS-style **Inset Grouping**.

### Layout Structure
- **Mobile (< 768px):** Single-column layout. Global canvas margin is fixed at `1rem` (`16px`). Inset cards have outer margins that isolate grouped content cells from the viewport edges.
- **Tablet (768px – 1024px):** Split-view layouts (Master-Detail) or 6-column fluid grids with `1.5rem` margins and `1rem` gutters.
- **Desktop (> 1024px):** 12-column centered layout constrained to a maximum width of `1280px`, anchored by `2rem` margins and gutters.

### Rhythmic Rules
- **Base Grid (8pt System):** All spacing tokens conform strictly to multiples of 4px and 8px.
- **Inset Margins:** Card groupings sit inset from the edge by `margin-mobile` (`16px`), presenting rounded boundaries rather than edge-to-edge full-bleed slabs, mirroring the modern iOS Settings/Store architecture.
- **Vertical Flow:** Spacing between stacked grouped card sections uses `space-lg` (`24px`), with sectional headers spaced `space-xs` (`8px`) above the container group.

## Elevation & Depth

Spatial layering relies on glassmorphic materials, diffuse ambient shadows, and structural physical stacking rather than sharp heavy drops.

### Materiality & Translucency
- **Ultra-Thin Material (Bars & Modals):** `backdrop-filter: blur(20px) saturate(180%)`; background fill: `rgba(251, 249, 247, 0.82)`. Applied to sticky navigation bars, bottom tab bars, and floating sheet titles.
- **Card Material (Regular Groupings):** Solid `#FFFFFF` on mobile canvas; transitions to `rgba(255, 255, 255, 0.92)` with `backdrop-filter: blur(12px)` when hovering or floating over textured galleries.
- **Hairline Surface Strokes:** Elevated layers feature an internal simulated light edge: `1px solid rgba(255, 255, 255, 0.65)` for the top edge, and `1px solid rgba(33, 41, 48, 0.06)` for bottom and lateral bounds.

### Shadow Structure
- **Ambient Level 1 (Inset Cards & Micro-elements):** `0 2px 8px -2px rgba(33, 41, 48, 0.04), 0 1px 3px 0 rgba(33, 41, 48, 0.02)`.
- **Ambient Level 2 (Floating Action Buttons & Popovers):** `0 10px 25px -5px rgba(33, 41, 48, 0.08), 0 4px 10px -2px rgba(33, 41, 48, 0.03)`.
- **Ambient Level 3 (Modal Sheets & Context Menus):** `0 24px 48px -12px rgba(33, 41, 48, 0.14), 0 8px 16px -4px rgba(33, 41, 48, 0.04)`.

## Shapes

The design uses continuous corner smoothing (squircle aesthetics) across cards, controls, and sheets, drawing inspiration from Apple hardware and software silhouettes.

### Corner Radii Hierarchy
- **Extra Small (`0.375rem` / `6px`):** Checkboxes, tags, mini rating pills.
- **Base Controls (`0.5rem` / `8px`):** Regular buttons, text input fields, segmented control segments.
- **Containers & Inset Cards (`1rem` to `1.25rem` / `16px–20px` — `rounded-2xl` equivalent):** Inset grouped lists, marketplace product cards, and banner headers.
- **Sheets & Modals (`1.5rem` to `2rem` / `24px–32px` — `rounded-3xl` equivalent):** Modal presentation sheets, top grabber action panels, checkout drawers.
- **Full Rounded (`9999px`):** Grabber handles, pill filters, badge indicators, and standard iOS switches.

## Components

### 1. Inset Grouped Cards
- **Structure:** Content sections are grouped inside white container cards inset from screen edges.
- **Styling:** `background: #FFFFFF`; `border-radius: 1.25rem` (`20px`); subtle border: `1px solid #E8DFD8`.
- **Inner Dividers:** Items within the card are separated by an inset horizontal divider line (`0.5px solid rgba(33, 41, 48, 0.08)`), left-indented by `56px` to align with the text block following leading icons.

### 2. Grabber Pills & Modal Sheets
- **Grabber Indicator:** Centered pill measuring `36px × 5px`, `border-radius: 9999px`, background: `#E8DFD8` (Stone). Positioned `8px` from the modal top.
- **Sheet Architecture:** `background: rgba(251, 249, 247, 0.94)`, `backdrop-filter: blur(24px)`, `border-top-left-radius: 2rem`, `border-top-right-radius: 2rem`.

### 3. iOS Switches
- **Track Dimensions:** `51px × 31px`, `border-radius: 9999px`.
- **Off State:** Background `#E8DFD8` with `1px solid rgba(33, 41, 48, 0.06)`.
- **On State:** Background `#228276` (Mint for positive toggles) or `#D04836` (Terracota for market alerts).
- **Thumb:** `27px × 27px` pure white circle, elevation `0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)`. Moves with smooth cubic-bezier easing (`cubic-bezier(0.25, 0.1, 0.25, 1)`).

### 4. HIG Check & Radio Lists
- **Layout:** Full-width row inside an Inset Grouped Card with a vertical height of `48px` to `52px`.
- **Active Selection:** Checkmark (`✓`) positioned at the right trailing margin in Terracota (`#D04836`), accompanying bold label text.
- **Radio Buttons:** Circular indicator (`20px`), active fill with Terracota, featuring a `6px` centered white dot.

### 5. Buttons & Micro-Interactions
- **Touch Responsiveness:** Every tappable button, card row, and chip must trigger `active:scale-95 transition-transform duration-100 ease-out`.
- **Primary Button:** Solid Terracota (`#D04836`), white text, `border-radius: 0.75rem`, font weight `600`, height `48px`.
- **Secondary Button:** Light Stone tint (`#E8DFD8` at 40%), Navy text (`#212930`), height `48px`.

### 6. Chips & Filter Pills
- **Geometry:** Height `32px`, `border-radius: 9999px`, horizontal padding `14px`.
- **Selected State:** Solid Navy (`#212930`) with white text, or Terracota (`#D04836`) for promotional filters.
- **Unselected State:** Faint sand tint with `1px solid #E8DFD8`, text in `#212930`.

### 7. Form Inputs
- **Base Structure:** Height `44px`, background `#FFFFFF`, border `1px solid #E8DFD8`, `border-radius: 0.75rem`.
- **Focus State:** Border changes to Mint (`#228276`), subtle glow ring: `0 0 0 3px rgba(34, 130, 118, 0.15)`.