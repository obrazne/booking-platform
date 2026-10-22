/**
 * The loader of the widget for the client's website (Z83): one line in an Elementor HTML widget —
 * `<div data-booking-widget="kalendar" data-objekt="<slug>"></div>` + `<script src="https://<domain>/widget.js" async>`.
 * It puts `/embed/kalendar` in a frame once the place is near the screen and sets the frame's height from the messages
 * of that frame only (origin and source checked). Small and without dependencies.
 */
const SCRIPT = `(function () {
  var script = document.currentScript;
  var base = script && script.src ? new URL(script.src).origin : location.origin;
  function mount(el) {
    if (el.getAttribute("data-booking-widget-ready")) return;
    el.setAttribute("data-booking-widget-ready", "1");
    var q = new URLSearchParams({ objekt: el.getAttribute("data-objekt") || "" });
    var bg = el.getAttribute("data-pozadie");
    if (bg) q.set("pozadie", bg);
    var unit = el.getAttribute("data-jednotka");
    if (unit) q.set("unit", unit);
    var frame = document.createElement("iframe");
    frame.src = base + "/embed/kalendar?" + q.toString();
    frame.title = el.getAttribute("data-titulok") || "Kalendár s cenami";
    frame.style.cssText = "display:block;width:100%;height:560px;border:0;background:transparent;color-scheme:normal";
    frame.setAttribute("allowtransparency", "true");
    window.addEventListener("message", function (e) {
      if (e.origin !== base || e.source !== frame.contentWindow) return;
      var d = e.data;
      if (d && d.type === "booking-widget:height" && typeof d.height === "number" && d.height > 0 && d.height < 5000)
        frame.style.height = Math.ceil(d.height) + "px";
    });
    el.appendChild(frame);
  }
  function start() {
    var els = document.querySelectorAll('[data-booking-widget="kalendar"]');
    if (!("IntersectionObserver" in window)) return els.forEach(mount);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (x) {
        if (x.isIntersecting) { io.unobserve(x.target); mount(x.target); }
      });
    }, { rootMargin: "400px" });
    els.forEach(function (el) { io.observe(el); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
