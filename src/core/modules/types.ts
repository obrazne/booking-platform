import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { SectionDef } from "@/core/sections/types";

/** Booking lifecycle events modules can react to (A3, hook point 2). Payloads grow with part B. */
export type BookingEventName =
  | "booking.created"
  | "booking.paid"
  | "booking.cancelled"
  | "booking.checked_in"
  | "booking.checked_out";

export type ModuleEvent = { name: BookingEventName; tenantId: string; bookingId: string };

/** Named places in the UI where modules can render (A3, hook point 3). */
export type SlotName =
  | "admin.dashboard.cards"
  | "booking.form.sections"
  | "booking.detail.tabs"
  /**
   * Guest's stay (account `/ucet/pobyt/<id>` and access link `/r/<code>`): top of the content (before the arrival
   * instructions), main column and the right column.
   */
  | "guest.stay.top"
  | "guest.stay.main"
  | "guest.stay.aside"
  /** Inside the stay's green "Účet pobytu" card in the account (Z44): lines a module adds (orders). */
  | "guest.stay.account"
  /** Under the dates in the stay's header (e.g. "Nová správa od Jany ↓", Z47). */
  | "guest.stay.header";

export type SlotProps = {
  tenantId: string;
  locale: string;
  /** Set in the places of one reservation (booking.detail.tabs — the reservation panel, guest.stay.*). */
  reservationId?: string;
  /** Guest's stay opened through the access link (guest.stay.*): the code that verifies access in the database. */
  accessToken?: string;
};

/** One point "what to do" of a guest's stay (account v2.4): warn = the guest should act (counts in the badge). */
export type GuestTodo = { key: string; tone: "warn" | "info"; text: string };

/** Groups of the side menu (v1.2) a module item can join; an empty group is not shown. */
export type NavGroupKey = "reservations" | "property" | "offer" | "connections" | "settings";

export type ModuleNavItem = {
  /** Path under /admin, e.g. "/admin/services". */
  href: string;
  /** Menu group the item belongs to (v1.2). */
  group: NavGroupKey;
  /** Translation key inside the module's message namespace. */
  labelKey: string;
  icon: LucideIcon;
};

export type ModuleManifest = {
  /** Same key as in the `modules` table. */
  key: string;
  /** Translation namespace in messages/<locale>.json, e.g. "modules.services". */
  messages: string;
  /**
   * False while the module has no guest screens yet (B11): the catalog shows it as "v príprave" and the control
   * center cannot switch it on; a switch set in the database (demo data) still works.
   */
  ready?: boolean;
  /** Other modules this one needs (e.g. upsell needs services). */
  dependsOn?: readonly string[];
  navItems?: readonly ModuleNavItem[];
  slots?: Partial<Record<SlotName, ComponentType<SlotProps>>>;
  events?: Partial<Record<BookingEventName, (event: ModuleEvent) => Promise<void>>>;
  /** The module shows the owner's contact in the stay (guest.stay.aside) — the core leaves its own card out (Z47). */
  guestContact?: boolean;
  /** Points for the guest's stay card in the account (Z43): e.g. "Vyplňte online check-in". Signed-in guest only. */
  guestTodos?: (args: { reservationId: string; locale: string }) => Promise<GuestTodo[]>;
  /** Section types for the property page (B7), e.g. services on request. */
  sections?: readonly SectionDef[];
  /** After the control center switches the module on for a client (e.g. default settings — messages, Z45). */
  onEnable?: (tenantId: string) => Promise<void>;
  /**
   * Blocks a module adds to a core e-mail to the guest (e.g. an automatic message inside the confirmation or the
   * arrival instructions — no double e-mails, Z45). Runs in the e-mail worker (no user).
   */
  emailBlocks?: (args: EmailBlockArgs) => Promise<EmailBlock[]>;
};

export type EmailBlockArgs = {
  kind: "guest_confirmed" | "guest_arrival" | "guest_upsell_offer";
  tenantId: string;
  reservationId: string;
  locale: string;
};
export type EmailBlock = { title: string; text: string };
