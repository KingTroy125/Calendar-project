"use client";

import Image from "next/image";
import { motion, type Variants } from "motion/react";
import { ArrowRight, CalendarDays, Lock, Moon } from "lucide-react";
import { ButtonLink } from "@/components/base/buttons/button";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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
  hidden: { opacity: 0, y: 32, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, delay: 0.55, ease: "easeOut" },
  },
};

const trustVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.7, ease: "easeOut" },
  },
};

const trustItems = [
  { icon: CalendarDays, label: "Month & week views" },
  { icon: Moon, label: "Light & dark" },
  { icon: Lock, label: "Private by default" },
];

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

export function LandingHero({ hasScreenshot }: { hasScreenshot?: boolean }) {
  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36">
      {/* Soft accent glows behind the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 start-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-accent-100/60 blur-3xl dark:bg-accent-900/20" />
        <div className="absolute top-24 -start-24 size-72 rounded-full bg-chart-1/10 blur-3xl" />
        <div className="absolute top-40 -end-24 size-72 rounded-full bg-chart-2/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col items-center text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1
            aria-label="A calmer calendar for everything you have planned."
            variants={headingVariants}
            className="max-w-4xl text-display-4-semibold text-text-primary sm:text-display-3-medium lg:text-display-2-medium"
          >
            <AnimatedText text="A calmer calendar for everything you have planned." />
          </motion.h1>

          <motion.p
            variants={descriptionVariants}
            className="mt-5 max-w-2xl text-body-regular text-text-secondary sm:text-body-medium"
          >
            Keep your days, weeks, and events in one focused place. Sign up to save
            events, shape your week, and make the calendar yours.
          </motion.p>

          <motion.div
            variants={buttonVariants}
            className="mt-8 flex flex-col items-center gap-2 sm:flex-row"
          >
            <ButtonLink
              href="/signup"
              size="medium"
              trailingIcon={ArrowRight}
              className="w-full sm:w-auto"
            >
              Get started
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="medium" className="w-full sm:w-auto">
              Log in
            </ButtonLink>
          </motion.div>

          <motion.p variants={descriptionVariants} className="mt-3 text-caption-1-regular text-text-tertiary">
            Free to use. No credit card required.
          </motion.p>

          {/* Product preview */}
          <motion.div
            id="preview"
            variants={previewVariants}
            className="relative mt-14 w-full max-w-5xl scroll-mt-24 sm:mt-20"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-4 -top-6 bottom-6 -z-10 rounded-[2.5rem] bg-accent-100/50 blur-2xl dark:bg-accent-900/20"
            />

            <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-secondary-default p-2 shadow-2xl sm:p-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-separator-border bg-background-primary-default">
                <Image
                  src="/assets/2.png"
                  alt="Calendar application preview"
                  fill
                  priority
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </motion.div>

          {/* Trust strip */}
          <motion.div id="features" variants={trustVariants} className="mt-10 scroll-mt-24 sm:mt-12">
            <p className="text-caption-1-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Built for the way you plan
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {trustItems.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-caption-1-medium text-text-secondary">
                  <Icon aria-hidden className="size-4 text-foreground-icon-tertiary" />
                  {label}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
