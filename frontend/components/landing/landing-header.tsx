"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Features", href: "#features" },
  { label: "Integration", href: "#integration" },
  { label: "Pricing", href: "#pricing" },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.nav
        aria-label="Main navigation"
        className="mx-auto max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pt-6 lg:px-8"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between rounded-2xl border border-border-button-default/80 bg-background-primary-default/85 px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl transition-colors sm:rounded-3xl sm:px-5 sm:py-3 dark:border-border-button-default/60 dark:bg-background-primary-default/75 dark:shadow-black/25">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Link
              href="/"
              aria-label="Calendar home"
              className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-950/60 dark:text-accent-400"
              >
                <Calendar className="size-5" />
              </span>
              <span className="text-body-regular text-text-primary">Calendar</span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex lg:gap-8">
            {navItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.08, duration: 0.4 }}
              >
                <Link
                  href={item.href}
                  className="rounded-lg px-2 py-1 text-body-regular text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  <motion.span whileHover={{ y: -2 }} className="inline-block">
                    {item.label}
                  </motion.span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <ButtonLink
              href="/login"
              variant="ghost"
              size="small"
              className="rounded-full px-3 text-body-medium text-text-secondary hover:text-text-primary"
            >
              Log in
            </ButtonLink>
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <ButtonLink
                href="/signup"
                size="small"
                className="rounded-full px-5 text-body-medium font-medium shadow-xs"
              >
                Get started
              </ButtonLink>
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            className="relative z-20 flex size-9 items-center justify-center rounded-xl text-text-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring md:hidden"
          >
            <Menu
              className={cx(
                "size-5 transition-all duration-200",
                menuOpen && "rotate-180 scale-0 opacity-0",
              )}
            />
            <X
              className={cx(
                "absolute inset-0 m-auto size-5 transition-all duration-200",
                menuOpen
                  ? "rotate-0 scale-100 opacity-100"
                  : "-rotate-180 scale-0 opacity-0",
              )}
            />
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="landing-mobile-menu"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-2.5 rounded-2xl border border-border-button-default/80 bg-background-primary-default/95 p-4 shadow-xl shadow-black/5 backdrop-blur-xl sm:rounded-3xl dark:bg-background-primary-default/90 dark:shadow-black/25 md:hidden"
            >
              <ul className="space-y-1">
                {navItems.map((item, index) => (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <Link
                      href={item.href}
                      className="block rounded-xl px-3 py-2 text-body-regular text-text-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-2 border-t border-separator-border pt-4">
                <ButtonLink
                  href="/login"
                  variant="secondary"
                  size="medium"
                  className="w-full justify-center rounded-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </ButtonLink>
                <ButtonLink
                  href="/signup"
                  size="medium"
                  className="w-full justify-center rounded-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started
                </ButtonLink>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}

export default LandingHeader;
