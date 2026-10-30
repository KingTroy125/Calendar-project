"use client";

import { motion, type Variants } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Clock,
  LayoutGrid,
  Sparkles,
  UserRound,
} from "lucide-react";
import { ButtonLink } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/**
 * Startup / marketing hero for the signed-out app.
 *
 * Visual language follows the BoardUI tokens used everywhere else (semantic
 * surfaces, composite type styles, accent ramp). The choreography mirrors the
 * reference: staggered badge → heading → description → CTA → preview, with the
 * heading revealed character by character.
 *
 * The "dashboard preview" is a static, decorative calendar mock rather than a
 * screenshot, so it stays sharp at every size and automatically follows the
 * light/dark theme.
 */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const badgeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.1, ease: "easeOut" },
  },
};

const textEffectVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.02, delayChildren: 0.15 },
  },
};

const charVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const wordVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.02 },
  },
};

const descriptionVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.35, ease: "easeOut" },
  },
};

const buttonVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.45, ease: "easeOut" },
  },
};

const previewVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, delay: 0.55, ease: "easeOut" },
  },
};

function AnimatedText({ text }: { text: string }) {
  const words = text.split(" ");

  return (
    <motion.span className="inline-block" variants={textEffectVariants}>
      {words.map((word, wordIndex) => (
        <motion.span key={`${word}-${wordIndex}`} variants={wordVariants} className="inline-block">
          {word.split("").map((char, charIndex) => (
            <motion.span key={`${char}-${charIndex}`} variants={charVariants} className="inline-block">
              {char}
            </motion.span>
          ))}
          {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </motion.span>
      ))}
    </motion.span>
  );
}

const PREVIEW_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PreviewEvent = { title: string; color: string };

const PREVIEW_DAYS: { day: number; muted?: boolean; today?: boolean; events?: PreviewEvent[] }[] = [
  { day: 28, muted: true },
  { day: 29, muted: true },
  { day: 30, muted: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5, events: [{ title: "Design sync", color: "bg-accent-50 text-accent-700" }] },
  { day: 6 },
  { day: 7 },
  { day: 8, events: [{ title: "Dentist", color: "bg-status-rose-background text-status-rose-text" }] },
  { day: 9 },
  { day: 10 },
  { day: 11 },
  { day: 12, today: true, events: [{ title: "Sprint start", color: "bg-status-lime-background text-status-lime-text" }] },
  { day: 13 },
  { day: 14 },
  { day: 15, events: [{ title: "Dinner", color: "bg-chart-2/15 text-chart-2" }] },
  { day: 16 },
  { day: 17 },
  { day: 18 },
  { day: 19 },
  { day: 20, events: [{ title: "Review", color: "bg-chart-1/15 text-chart-1" }] },
  { day: 21 },
  { day: 22 },
  { day: 23, events: [{ title: "Launch", color: "bg-status-lime-background text-status-lime-text" }] },
  { day: 24 },
  { day: 25 },
  { day: 26 },
  { day: 27, events: [{ title: "1:1", color: "bg-accent-50 text-accent-700" }] },
  { day: 28 },
  { day: 29 },
  { day: 30 },
  { day: 31 },
  { day: 1, muted: true },
];

function CalendarPreview() {
  return (
    <div
      aria-hidden
      className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-xl"
    >
      {/* Faux window chrome */}
      <div className="flex items-center gap-2 border-b border-separator-border bg-background-secondary-default px-4 py-3">
        <span className="size-2.5 rounded-full bg-status-rose-text/70" />
        <span className="size-2.5 rounded-full bg-chart-2/70" />
        <span className="size-2.5 rounded-full bg-status-lime-text/70" />
        <span className="ms-3 hidden rounded-md bg-background-tertiary-default px-2 py-0.5 text-caption-2-regular text-text-tertiary sm:block">
          calendar.app / dashboard
        </span>
      </div>

      <div className="flex">
        {/* Faux sidebar */}
        <aside className="hidden w-44 shrink-0 flex-col gap-1 border-e border-separator-border bg-background-secondary-default p-3 md:flex">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent-50 text-accent-700">
              <CalendarDays className="size-4" />
            </span>
            <span className="text-body-2-medium text-text-primary">Calendar</span>
          </div>
          {[
            { icon: LayoutGrid, label: "Overview", active: false },
            { icon: CalendarRange, label: "Calendar", active: true },
            { icon: Clock, label: "Coming up", active: false },
            { icon: UserRound, label: "Profile", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={cx(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-caption-1-medium",
                active
                  ? "bg-background-primary-default text-text-primary shadow-xs"
                  : "text-text-secondary",
              )}
            >
              <Icon className="size-3.5 text-foreground-icon-secondary" />
              {label}
            </div>
          ))}
        </aside>

        {/* Faux month grid */}
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-caption-2-regular text-text-tertiary">Your calendar</p>
              <p className="text-body-medium text-text-primary sm:text-headline-medium">October 2026</p>
            </div>
            <span className="rounded-lg border border-border-button-default bg-background-primary-default px-2 py-1 text-caption-2-medium text-text-secondary shadow-xs">
              Month
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {PREVIEW_WEEKDAYS.map((day) => (
              <div key={day} className="pb-1 text-center text-caption-2-medium text-text-tertiary">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {PREVIEW_DAYS.map((cell, index) => (
              <div
                key={`${cell.day}-${index}`}
                className={cx(
                  "flex min-h-10 min-w-0 flex-col gap-0.5 rounded-md border p-1 md:min-h-16",
                  cell.muted
                    ? "border-transparent bg-background-secondary-default"
                    : "border-border-button-default bg-background-primary-default",
                )}
              >
                <span
                  className={cx(
                    "flex size-4 items-center justify-center rounded-full text-caption-2-medium tabular-nums sm:size-5",
                    cell.today
                      ? "bg-accent-600 text-text-white"
                      : cell.muted
                        ? "text-text-tertiary"
                        : "text-text-primary",
                  )}
                >
                  {cell.day}
                </span>
                {/* Mobile/tablet: colored dots. Desktop: event pills. */}
                <div className="flex flex-wrap gap-0.5 md:hidden">
                  {cell.events?.map((event) => (
                    <span key={event.title} className={cx("size-1 rounded-full", event.color.split(" ")[0])} />
                  ))}
                </div>
                <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
                  {cell.events?.map((event) => (
                    <span
                      key={event.title}
                      className={cx(
                        "truncate rounded px-1 py-px text-caption-2-medium",
                        event.color,
                      )}
                    >
                      {event.title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Every event in one place",
    body: "Create, edit and revisit events across a month view or your daily agenda.",
  },
  {
    icon: CalendarRange,
    title: "A week that starts your way",
    body: "Choose Monday or Sunday and set how long new events should run by default.",
  },
  {
    icon: UserRound,
    title: "A profile that is yours",
    body: "Keep your name, birthday and bio current, and change your password anytime.",
  },
];

export function LandingHero() {
  return (
    <>
      <section className="relative overflow-hidden">
        {/* Soft accent glows behind the hero */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 start-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-accent-100/60 blur-3xl dark:bg-accent-900/20" />
          <div className="absolute top-24 -start-24 size-72 rounded-full bg-chart-1/10 blur-3xl" />
          <div className="absolute top-40 -end-24 size-72 rounded-full bg-chart-2/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
          <motion.div
            className="flex flex-col items-center text-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Badge with fading rules */}
            <motion.div variants={badgeVariants} className="mb-6 flex items-center justify-center gap-2 sm:mb-8 sm:gap-3">
              <span className="h-px w-10 bg-linear-to-l from-accent-600/40 to-transparent sm:w-20" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default px-3 py-1 text-caption-1-medium text-text-secondary shadow-xs">
                <Sparkles className="size-3.5 text-accent-600" aria-hidden />
                Built for your week
              </span>
              <span className="h-px w-10 bg-linear-to-r from-accent-600/40 to-transparent sm:w-20" />
            </motion.div>

            {/* Heading */}
            <motion.h1
              aria-label="A calmer calendar for everything you have planned."
              variants={headingVariants}
              className="max-w-4xl text-display-4-semibold text-text-primary sm:text-display-3-medium lg:text-display-2-medium"
            >
              <AnimatedText text="A calmer calendar for everything you have planned." />
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={descriptionVariants}
              className="mt-5 max-w-2xl text-body-regular text-text-secondary sm:text-body-medium"
            >
              Keep your days, weeks and events together in one focused place.
              Sign up to save events, shape your week, and make the calendar yours.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={buttonVariants} className="mt-8 flex flex-col items-center gap-2 sm:flex-row">
              <ButtonLink href="/signup" size="medium" trailingIcon={ArrowRight} className="w-full sm:w-auto">
                Sign up
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="medium" className="w-full sm:w-auto">
                Log in
              </ButtonLink>
            </motion.div>
            <motion.p variants={descriptionVariants} className="mt-3 text-caption-1-regular text-text-tertiary">
              Free to use. No credit card required.
            </motion.p>

            {/* Dashboard preview */}
            <motion.div variants={previewVariants} className="mt-12 flex w-full justify-center sm:mt-16">
              <CalendarPreview />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature strip */}
      <section aria-labelledby="landing-features" className="border-t border-separator-border bg-background-secondary-default/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            <motion.h2
              id="landing-features"
              variants={headingVariants}
              className="text-title-2-medium text-text-primary sm:text-title-1-medium"
            >
              Everything your week needs
            </motion.h2>
            <motion.p variants={descriptionVariants} className="mt-2 max-w-xl text-body-regular text-text-secondary">
              Small, deliberate tools that keep the calendar out of your way.
            </motion.p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <motion.div
                  key={title}
                  variants={previewVariants}
                  className="rounded-3xl border border-border-button-default bg-background-primary-default p-5"
                >
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-headline-medium text-text-primary">{title}</h3>
                  <p className="mt-1.5 text-body-regular text-text-secondary">{body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
