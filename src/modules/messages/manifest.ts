import type { ModuleManifest } from "@/core/modules/types";
import { ensureMessageDefaults } from "./defaults";
import { messageEmailBlocks } from "./email-blocks";
import { GuestMessagesContact, GuestMessagesPill, GuestMessagesSection } from "./guest/section";
import { messageTodos } from "./guest/todos";

/**
 * Messages with the guest (Z45, B11): one conversation per direct reservation, automatic messages by rules, quick
 * replies. The base is the database (send_message, messages_tick, e-mails and the bell); the screens come with Z46
 * (administration) and Z47 (guest) — until then "v príprave" in the catalog.
 */
export const messagesModule: ModuleManifest = {
  key: "messages",
  messages: "modules.messages",
  ready: false,
  onEnable: ensureMessageDefaults,
  emailBlocks: messageEmailBlocks,
  slots: {
    "guest.stay.top": GuestMessagesSection,
    "guest.stay.header": GuestMessagesPill,
    "guest.stay.aside": GuestMessagesContact,
  },
  guestContact: true,
  guestTodos: messageTodos,
};
