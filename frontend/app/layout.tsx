import type { Metadata } from "next";
import "@/styles/globals.css";
import { Toaster } from "@/components/base/toast/toast";

export const metadata: Metadata = {
  title: "Calendar",
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
