# Chicane.ai — Design System

## Brand
- Name: Chicane.ai
- Tagline: Predict. Verify. Repeat.
- Positioning: AI-powered F1 intelligence platform

## Colors
- Page background: #0C0C0E
- Card background: #1A1A1F
- Surface/elevated: #27272A
- Primary text: #F4F4F5
- Muted text: #A1A1AA
- Accent red: #E8002D
- P1 accent: #E8002D
- P2 accent: #FF6B35
- P3 accent: #FFB800
- Border: rgba(255,255,255,0.06)

## Typography Scale
- H1: 42px, weight 800
- H2: 30px, weight 700
- H3: 20px, weight 600
- Body: 16px, weight 400
- Small/muted: 14px, weight 400
- Label/tag: 13px, weight 500, letter-spacing 0.08em
- Logo: DM Sans, SemiBold 600, italic, letter-spacing -0.05em
- Body/UI: Helvetica, Arial, sans-serif

## Spacing System
- Base unit: 8px
- Common values: 8 / 16 / 24 / 32 / 48 / 80px
- Card padding: 24px
- Section spacing: 80px top and bottom
- Gap between elements: 16px
- Max content width: 1280px, margin auto, padding 0 32px

## Buttons
- Height: 44px
- Padding: 0 20px
- Border radius: 8px

Primary:
- Background: #E8002D
- Text: white, weight 600

Secondary:
- Background: transparent
- Border: 1px solid rgba(255,255,255,0.1)
- Text: #A1A1AA

States:
- Hover: slightly brighter background
- Disabled: opacity 50%

## Scrollbar
- Track: #0C0C0E
- Thumb: #E8002D
- Thumb hover: #ff1a3d
- Width: 6px

## Key Components

Cards:
- Background: #1A1A1F
- Border radius: 12px
- Border top: 2px solid #E8002D (accent cards)
- Padding: 24px

Navbar:
- Fixed top, full width
- Background: #0C0C0E
- Bottom border: 1px solid rgba(255,255,255,0.06)
- Nav links: 0.95rem, weight 500, color #A1A1AA

Prediction bars:
- Height: 10px
- Border radius: 5px
- P1: #E8002D, P2: #FF6B35, P3: #FFB800, P4+: #27272A

## Pages
- Home: hero with video bg, stats, countdown, calendar, latest prediction
- Predictions: full driver win probability breakdown
- History: past predictions vs actual results
- Season: 2026 race calendar

## How to Use This File
When building anything new, ask:
1. What does design.md say about this component?
2. Am I following the color system?
3. Am I following the spacing system?
4. Am I following the typography scale?

If something doesn't match → fix the code OR update design.md.
This file evolves as the product evolves.

## Issues / TODO
- Buttons may not be consistent across all pages
- Mobile responsiveness needs refinement
- Hover and active states not fully defined everywhere
- Typography scale not enforced consistently across all pages
- Spacing may vary slightly between sections

## Next Improvements
- Standardize all buttons across every page
- Improve mobile navbar
- Align all card spacing to 24px consistently
- Add consistent hover states everywhere
- Improve hero section typography hierarchy
- Add Drivers and Standings pages
- Add post-race result verification after Miami GP
