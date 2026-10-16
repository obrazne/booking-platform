import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ColorModeProvider } from "@/core/theme/color-mode-provider";
import { fontVariableClasses } from "@/core/theme/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booking platform",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${fontVariableClasses} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <ColorModeProvider>{children}</ColorModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
