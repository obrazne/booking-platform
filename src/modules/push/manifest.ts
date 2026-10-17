import type { ModuleManifest } from "@/core/modules/types";

/**
 * Push notifications (Z33, B11): Web Push to the team's phones and computers on top of the bell. No menu item — the
 * module shows the section "Upozornenia na tomto zariadení" in Settings → E-maily a upozornenia (src/core/push).
 */
export const pushModule: ModuleManifest = {
  key: "push",
  messages: "modules.push",
};
