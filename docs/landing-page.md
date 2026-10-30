# Landing Page

The signed-out entry point lives at `/` (`frontend/app/page.tsx`). It replaces
the old redirect to `/dashboard`, so visitors land on a real startup page before
signing in.

## Content

- Sticky top bar: brand, **Log in** (`/login`) and **Sign up** (`/signup`).
- Hero: animated badge, character-by-character heading, description, and the two
  account CTAs. **Sign up** is the primary action and goes to `/signup`; the page
  also notes that the app is free to use.

## Animation

`frontend/components/landing/landing-hero.tsx` is a client component built on
`motion/react`. The choreography mirrors the reference:

1. Badge fades and scales in.
2. The heading reveals word by word and character by character.
3. Description and CTAs follow with a short stagger.

## Styling

- BoardUI semantic tokens only (`bg-background-full`, `text-text-primary`,
  `border-border-button-default`, the `accent-*` ramp).
- Composite type utilities (`text-display-4-semibold`,
  `sm:text-display-3-medium`, `lg:text-display-2-medium`, `text-body-regular`).
- Buttons use `ButtonLink` from the design system rather than bespoke anchors.

## Files

- `frontend/app/page.tsx` — page shell, metadata and header.
- `frontend/components/landing/landing-hero.tsx` — animated hero.
