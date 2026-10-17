import { describe, expect, it } from "vitest";
import { isTestEndpoint, selectRecipients, type PushDevice } from "./recipients";

const T1 = "t1";
const T2 = "t2";
const device = (id: string, userId: string, tenantId: string | null, kinds: string[]) =>
  ({ id, userId, tenantId, endpoint: `https://push.example/${id}`, kinds }) satisfies PushDevice;

const devices = [
  device("a", "owner", T1, ["reservation_new", "calendar_conflict"]),
  device("b", "owner", T1, ["sync_failed"]),
  device("c", "reception", T1, ["reservation_new"]),
  device("d", "other", T2, ["reservation_new"]),
  device("e", "admin", null, ["client_new"]),
  device("f", "owner", null, ["client_new"]),
];
const ctx = {
  moduleEnabled: true,
  members: new Set(["owner", "reception"]),
  platformAdmins: new Set(["admin"]),
  readBy: new Set<string>(),
};
const ids = (list: PushDevice[]) => list.map((d) => d.id);

describe("selectRecipients", () => {
  it("sends a client notification to devices of the client with the kind on", () => {
    expect(
      ids(
        selectRecipients(
          { audience: "tenant", tenantId: T1, kind: "reservation_new" },
          devices,
          ctx,
        ),
      ),
    ).toEqual(["a", "c"]);
    expect(
      ids(
        selectRecipients({ audience: "tenant", tenantId: T1, kind: "sync_failed" }, devices, ctx),
      ),
    ).toEqual(["b"]);
  });

  it("sends nothing when the module is off", () => {
    expect(
      selectRecipients({ audience: "tenant", tenantId: T1, kind: "reservation_new" }, devices, {
        ...ctx,
        moduleEnabled: false,
      }),
    ).toEqual([]);
  });

  it("skips people who left the team and who caused the event", () => {
    const list = selectRecipients(
      { audience: "tenant", tenantId: T1, kind: "reservation_new" },
      devices,
      { ...ctx, members: new Set(["owner"]), readBy: new Set(["owner"]) },
    );
    expect(list).toEqual([]);
  });

  it("sends platform notifications only to platform devices of platform admins, module or not", () => {
    expect(
      ids(
        selectRecipients({ audience: "platform", tenantId: T1, kind: "client_new" }, devices, {
          ...ctx,
          moduleEnabled: false,
        }),
      ),
    ).toEqual(["e"]);
  });
});

describe("isTestEndpoint", () => {
  it("recognises test hosts", () => {
    expect(isTestEndpoint("https://push.booking-platform.test/abc")).toBe(true);
    expect(isTestEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isTestEndpoint("nonsense")).toBe(false);
  });
});
