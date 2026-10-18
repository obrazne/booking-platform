/** Items of the guest account's navigation (Z59) — shared by the server loader and the client tabs and menu. */
export type AccountNavItem = {
  key: "current" | "stays" | "profile";
  href: string;
  label: string;
  /** Things to do (Pobyty). */
  badge: number;
};

/** Which item is lit on a path: the current stay (and its pages), Moje údaje, otherwise Pobyty. */
export function activeAccountItem(items: AccountNavItem[], path: string): AccountNavItem["key"] {
  const current = items.find((i) => i.key === "current");
  if (current && (path === current.href || path.startsWith(`${current.href}/`))) return "current";
  if (path.startsWith("/ucet/udaje")) return "profile";
  return "stays";
}
