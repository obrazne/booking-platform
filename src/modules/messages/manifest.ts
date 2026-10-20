import { MessageCircle, Zap } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { createClient } from "@/lib/supabase/server";
import { messagesTab } from "./admin/tab";
import { ensureMessageDefaults } from "./defaults";
import { messageEmailBlocks } from "./email-blocks";
import { GuestMessagesWrite, GuestMessagesPill, GuestMessagesSection } from "./guest/section";
import { messageTodos } from "./guest/todos";

/** Conversations waiting for a reply (the badge of Správy in the menu). */
async function waitingCount(tenantId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("messages_waiting", { p_tenant_id: tenantId });
  return data ?? 0;
}

/**
 * Messages with the guest (Z45, B11): one conversation per direct reservation, automatic messages by rules, quick
 * replies. The base is the database (send_message, messages_tick, e-mails and the bell); administration (Z46):
 * Správy › Schránka, Automatické správy and the tab of the reservation panel; guest (Z47): the stay.
 */
export const messagesModule: ModuleManifest = {
  key: "messages",
  messages: "modules.messages",
  ready: true,
  // Pomoc (Z67): words in modules.messages.help.
  helpFaqs: [{ id: "replyGuest", topic: "guests", href: "/admin/messages" }],
  navItems: [
    {
      href: "/admin/messages",
      group: "messages",
      labelKey: "navInbox",
      icon: MessageCircle,
      badge: waitingCount,
    },
    { href: "/admin/messages/auto", group: "messages", labelKey: "navAuto", icon: Zap },
  ],
  reservationTabs: [messagesTab],
  onEnable: ensureMessageDefaults,
  emailBlocks: messageEmailBlocks,
  slots: {
    "guest.stay.top": GuestMessagesSection,
    "guest.stay.header": GuestMessagesPill,
    // Z70: no own contact card (it slid under the sticky stay card) — "Napísať správu" in the card's foot.
    "guest.stay.contact": GuestMessagesWrite,
  },
  guestContact: true,
  guestTodos: messageTodos,
};
