import type { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { LandingHero } from "@/components/landing/landing-hero";
import { ButtonLink } from "@/components/base/buttons/button";

export const metadata: Metadata = {
  title: "Calendar — A calmer place for your week",
  description:
    "Keep your days, weeks and events together in one focused calendar. Sign up to save events, shape your week and make the calendar yours.",
};

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <header className="sticky top-0 z-40 border-b border-separator-border bg-background-full/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-50 text-accent-700" aria-hidden>
              <Calendar className="size-[18px]" />
            </span>
            <span className="text-body-medium text-text-primary">Calendar</span>
          </Link>

          <nav aria-label="Account" className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" size="small">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup" size="small">
              Sign up
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <LandingHero />
      </main>
    </div>
  );
}
