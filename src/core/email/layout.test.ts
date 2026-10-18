import { describe, expect, it } from "vitest";
import {
  BODY_MARKER,
  emailLayout,
  fillMessagePreview,
  guestFrame,
  guestFrameText,
  guestMessageHtml,
} from "./layout";

const frameInput = {
  accent: "#2f5d50",
  name: "Chalet <STRÖMY>",
  contactName: "Jana",
  phone: "+421 900 000 000",
  email: "jana@example.invalid",
  whatsapp: "+421900000000",
  stayLink: "https://chalet.example.invalid/r/abc",
  labels: { questions: "Otázky k pobytu?", myStay: "Môj pobyt", whatsapp: "WhatsApp" },
};

describe("e-mails to guests (Z60)", () => {
  it("header with the name (no logo), footer with the contact and the stay — HTML snapshot", () => {
    const html = guestMessageHtml({
      accent: "#2f5d50",
      frame: guestFrame(frameInput),
      title: "Jana vám napísala k pobytu",
      greeting: "Dobrý deň, Tomáš, Jana vám napísala.",
      bodies: ["Tešíme sa na vás!\nJana"],
      replyHint: "Odpovedzte cez tlačidlo.",
      button: { href: "https://chalet.example.invalid/r/abc/spravy", label: "Odpovedať" },
    });
    expect(html).toContain("Chalet &lt;STRÖMY&gt;");
    expect(html).toContain('href="tel:+421900000000"');
    expect(html).toContain('href="https://wa.me/421900000000"');
    expect(html).toContain("Môj pobyt →");
    expect(html).toContain("Tešíme sa na vás!<br>Jana");
    expect(html).toMatchSnapshot();
  });

  it("the client's logo in the header only as an https address", () => {
    expect(
      guestFrame({ ...frameInput, logoUrl: "https://cdn.example.invalid/logo.png" }).header,
    ).toContain('<img src="https://cdn.example.invalid/logo.png"');
    expect(guestFrame({ ...frameInput, logoUrl: "javascript:alert(1)" }).header).not.toContain(
      "<img",
    );
  });

  it("the preview fills the text where the message goes; e-mails to the owner have no frame", () => {
    const template = guestMessageHtml({
      accent: "#2f5d50",
      title: "T",
      greeting: "G",
      bodies: [BODY_MARKER],
      replyHint: "R",
      button: { href: "#", label: "B" },
    });
    expect(fillMessagePreview(template, "Ahoj <b>")).toContain("Ahoj &lt;b&gt;");
    expect(emailLayout("#000", "Owner", ["x"])).not.toContain('border-bottom:1px solid #e9e5db">');
    expect(guestFrameText(frameInput)).toContain("Môj pobyt: https://chalet.example.invalid/r/abc");
  });
});
