"use client";

import { motion, type Variants } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/base/buttons/button";

/**
 * Startup / marketing hero for the signed-out app.
 *
 * Visual language follows the BoardUI tokens used everywhere else (semantic
 * surfaces, composite type styles, accent ramp). The choreography mirrors the
 * reference: staggered badge → heading → description → CTA, with the heading
 * revealed character by character.
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

export function LandingHero() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden">
      {/* Soft accent glows behind the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 start-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-accent-100/60 blur-3xl dark:bg-accent-900/20" />
        <div className="absolute top-24 -start-24 size-72 rounded-full bg-chart-1/10 blur-3xl" />
        <div className="absolute top-40 -end-24 size-72 rounded-full bg-chart-2/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <motion.div
          className="flex flex-col items-center text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Badge with fading rules */}
          <motion.div variants={badgeVariants} className="mb-6 flex items-center justify-center gap-2 sm:mb-8 sm:gap-3">
            <span className="h-px w-10 bg-linear-to-l from-accent-600/40 to-transparent sm:w-20" />
            <span className="inline-flex items-center rounded-full border border-border-button-default bg-background-primary-default px-3 py-1 text-caption-1-medium text-text-secondary shadow-xs">
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
        </motion.div>
      </div>
    </section>
  );
}
