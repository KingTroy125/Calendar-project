import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";

export const metadata: Metadata = {
  title: "Calendar — A calmer place for your week",
  description:
    "Keep your days, weeks and events together in one focused calendar. Sign up to save events, shape your week and make the calendar yours.",
};

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-background-full">
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
      </main>
    </div>
  );
}
