"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/**
 * Signed-out header for the landing page.
 *
 * Mirrors the reference behaviour: transparent at the top, a soft blurred
 * surface once the page scrolls, a compact mobile panel, and a single
 * "Get started" action while scrolled. Colours and type come from BoardUI
 * tokens so light and dark mode both follow the rest of the app.
 */

const menuItems = [
  { name: "Preview", href: "#preview" },
  { name: "Features", href: "#features" },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav
        className={cx(
          "border-b transition-colors duration-300",
          isScrolled
            ? "border-separator-border bg-background-full/80 backdrop-blur"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Calendar home"
              className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full bg-accent-50 text-accent-700"
              >
                <Calendar className="size-[18px]" />
              </span>
              <span className="text-body-medium text-text-primary">Calendar</span>
            </Link>

            <div className="ms-4 hidden items-center gap-1 lg:flex">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-body-medium text-text-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              {isScrolled ? (
                <ButtonLink href="/signup" size="small" trailingIcon={ArrowRight}>
                  Get started
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/login" variant="ghost" size="small">
                    Log in
                  </ButtonLink>
                  <ButtonLink href="/signup" size="small">
                    Sign up
                  </ButtonLink>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-menu"
              className="relative -me-1 inline-flex size-9 items-center justify-center rounded-lg text-text-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring lg:hidden"
            >
              <Menu
                aria-hidden
                className={cx(
                  "size-5 transition-all duration-200",
                  menuOpen && "rotate-90 scale-0 opacity-0",
                )}
              />
              <X
                aria-hidden
                className={cx(
                  "absolute size-5 transition-all duration-200",
                  menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
                )}
              />
            </button>
          </div>
        </div>

        <div
          id="landing-mobile-menu"
          className={cx(
            "border-t border-separator-border bg-background-full/95 backdrop-blur lg:hidden",
            menuOpen ? "block" : "hidden",
          )}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-body-medium text-text-secondary outline-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid gap-2 sm:hidden">
              <ButtonLink href="/login" variant="secondary" className="w-full">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" className="w-full">
                Sign up
              </ButtonLink>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
