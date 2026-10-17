import { platformBrand } from "@/core/admin/brand";

/**
 * Web app manifests (Z33): the administration (start /admin) and the control center (start /platform) can be added
 * to the home screen — on iPhone that is the only way to get push notifications.
 */
export async function GET(_request: Request, { params }: RouteContext<"/pwa/[app]">) {
  const { app } = await params;
  if (app !== "admin" && app !== "platform") return new Response(null, { status: 404 });
  const control = app === "platform";
  const manifest = {
    id: `/${app}`,
    name: control ? `${platformBrand.name} — riadiace centrum` : platformBrand.name,
    short_name: platformBrand.name,
    start_url: `/${app}`,
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: control ? "#1d1d1f" : "#0071e3",
    icons: [
      { src: `/pwa/icon/192?app=${app}`, sizes: "192x192", type: "image/png" },
      { src: `/pwa/icon/512?app=${app}`, sizes: "512x512", type: "image/png" },
      {
        src: `/pwa/icon/512?app=${app}&maskable=1`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
