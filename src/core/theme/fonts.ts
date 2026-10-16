import { Geist, Geist_Mono, Inter, Lora, Manrope, Playfair_Display } from "next/font/google";
import type { FontKey } from "./theme";

// Every selectable font is registered once; only the ones a page actually uses are downloaded by the browser.
const geist = Geist({ variable: "--font-geist", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], preload: false });
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  preload: false,
});
const lora = Lora({ variable: "--font-lora", subsets: ["latin", "latin-ext"], preload: false });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  preload: false,
});

export const fontVariableClasses = [geist, geistMono, inter, manrope, lora, playfair]
  .map((f) => f.variable)
  .join(" ");

export const FONT_LABELS: Record<FontKey, string> = {
  geist: "Geist",
  inter: "Inter",
  manrope: "Manrope",
  lora: "Lora",
  playfair: "Playfair Display",
};
