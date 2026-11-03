# ResusSkills — professor research workspace

Hallmark · technical, restrained, scientific. Scope: `/dashboard` only.

## System
Dark research console by default with an equivalent light theme. Preserve the ResusSkills logo and French language. Use Space Grotesk for headings, Inter for body, tabular numerals for measurements. The application is a working interface, not a product-tour page: persistent grouped sidebar, compact page header, filter toolbar, data surface, detail views. No marketing hero, decorative imagery, gradients, glass, or elastic chart motion.

## Tokens
The single token source is `tokens.css`, scoped under `.professor-workspace`. Charcoal surfaces, teal action accent, explicit accessible text and focus colors; categorical plot colors also distinguish series with labels/markers. Four-point spacing, 8px controls and 12px panels. Headings remain upright. No token changes outside the professor scope.

## Components and motion
beUI supplies controls, tables, sidebar, dialogs and feedback. React Bits supplies the adapted stepper and activity list. No shadcn components are imported into professor pages. Existing student components stay intact. Native button semantics and visible focus override any vendor defaults. All actions implement default, hover, focus, pressed, disabled, pending, error and success behavior. Motion is limited to 120–180ms state transitions, with reduced-motion support; no bounce, magnetic motion or count-up research values.

## Layout and accessibility
Desktop sidebar, tablet rail, mobile focus-managed drawer. Mobile forms occupy full available width. Tables scroll within their own containers; the page never scrolls horizontally. Touch targets at least 44px. Each figure has an accessible table and methodology. Empty and missing data are distinct from zero. Test 320, 375, 414, 768, 1024 and 1440px, keyboard, both themes and reduced motion.

## Scientific and export rules
Use stored scores until an explicit correction is committed. Never assume today's bank describes historical tests. Unknown durations are missing, not zero. Percentages identify their denominators. Use ECharts native SVG/PNG exports with separate light publication layouts, fonts, legends, filters, sample size and limitations. Exported datasets include a dictionary and manifest and default to pseudonymous IDs.
