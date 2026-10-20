"use client";

import { useTranslations } from "next-intl";
import { CalendarPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * "Pridať do kalendára" (Z72): a small menu — Google Calendar and Outlook open their own page with the event filled
 * in, Apple / other calendars download the .ics file. One component for the access link and the stay in the account.
 */
export function AddToCalendar({
  links,
  fileName,
  className,
}: {
  links: { google: string; outlook: string; ics: string };
  fileName: string;
  className?: string;
}) {
  const t = useTranslations("guest.confirm");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={className}>
          <CalendarPlus className="size-4" /> {t("addToCalendar")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[240px]">
        <DropdownMenuItem asChild>
          <a href={links.google} target="_blank" rel="noopener noreferrer">
            {t("calendarMenu.google")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.outlook} target="_blank" rel="noopener noreferrer">
            {t("calendarMenu.outlook")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.ics} download={fileName}>
            {t("calendarMenu.ics")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
