# Landing Page

The signed-out entry point lives at `/` (`frontend/app/page.tsx`). It replaces
the old redirect to `/dashboard`, so visitors land on a real startup page before
signing in.

## Content

- Sticky top bar: brand, **Log in** (`/login`) and **Sign up** (`/signup`).
- Hero: animated badge, character-by-character heading, description, and the two
  account CTAs. **Sign up** is the primary action and goes to `/signup`; the page
  also notes that the app is free to use.
- Calendar preview: a static, decorative month-grid mock shown inside a faux app
  window. It uses the same semantic tokens as the real dashboard, so it follows
  light/dark mode. Event pills collapse to colored dots below `md`.
- Feature strip: three cards (events, week preferences, profile).
- Footer: brand and the same log in / sign up links.

## Animation

`frontend/components/landing/landing-hero.tsx` is a client component built on
`motion/react`. The choreography mirrors the reference:

1. Badge fades and scales in.
2. The heading reveals word by word and character by character.
3. Description, CTAs and preview follow with a short stagger.
4. The feature strip animates on scroll with `whileInView` (`once: true`).

## Styling

- BoardUI semantic tokens only (`bg-background-full`, `text-text-primary`,
  `border-border-button-default`, the `accent-*` ramp, chart/status tokens for
  the event pills).
- Composite type utilities (`text-display-4-semibold`,
  `sm:text-display-3-medium`, `lg:text-display-2-medium`, `text-body-regular`).
- Buttons use `ButtonLink` from the design system rather than bespoke anchors.
- No external screenshot is fetched; the preview is HTML/CSS, so it stays sharp
  at every size and has no third-party dependency.

## Files

- `frontend/app/page.tsx` — page shell, metadata, header and footer.
- `frontend/components/landing/landing-hero.tsx` — animated hero, preview and
  feature strip.
