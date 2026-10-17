import { getTranslations } from "next-intl/server";
import type { ReservationTab } from "@/core/modules/types";
import { getTenantInfo } from "@/core/tenant/info";
import { ConversationPane } from "./conversation";
import { loadConversation, unreadCount } from "./data";

/** "Správy" in the reservation panel (Z46): the conversation with the number of unread messages of the guest. */
export const messagesTab: ReservationTab = {
  key: "messages",
  render: async ({ tenantId, reservationId, locale }) => {
    const c = await loadConversation(reservationId, locale);
    if (!c) return null;
    const [t, tenant] = await Promise.all([
      getTranslations("modules.messages.admin"),
      getTenantInfo(tenantId),
    ]);
    const day = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: tenant.timezone }).format(d);
    return {
      label: t("tab"),
      count: unreadCount(c),
      content: (
        <ConversationPane
          reservationId={reservationId}
          guestName={c.reservation.guestName}
          timeZone={tenant.timezone}
          locale={locale}
          today={day(new Date())}
          yesterday={day(new Date(Date.now() - 86_400_000))}
          messages={c.messages}
          scheduled={c.scheduled}
          quickReplies={c.quickReplies}
        />
      ),
    };
  },
};
