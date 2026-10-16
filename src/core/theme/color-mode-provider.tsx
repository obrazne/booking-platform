"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/** Light / dark / system colour mode via the `dark` class on <html>. */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
