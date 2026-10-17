import { ImageResponse } from "next/og";
import { platformBrand } from "@/core/admin/brand";

const SIZES = new Set([96, 180, 192, 512]);

/** App icon (Z33): the first letter of the platform name on the brand colour; maskable keeps a safe margin. */
export async function GET(request: Request, { params }: RouteContext<"/pwa/icon/[size]">) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const control = url.searchParams.get("app") === "platform";
  const maskable = url.searchParams.get("maskable") === "1";
  const letter = (platformBrand.name.trim()[0] ?? "B").toUpperCase();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: control ? "#1d1d1f" : "#0071e3",
        borderRadius: maskable ? 0 : size * 0.22,
        color: "#ffffff",
        fontSize: size * (maskable ? 0.42 : 0.56),
        fontWeight: 700,
      }}
    >
      {letter}
    </div>,
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
