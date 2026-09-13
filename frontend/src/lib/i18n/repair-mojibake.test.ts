import { describe, expect, it } from "vitest";
import { repairMojibake } from "./repair-mojibake";

describe("repairMojibake", () => {
  it("repairs Arabic decoded as Latin-1", () => {
    const mojibake = String.fromCodePoint(
      0xd8, 0xa7, 0xd9, 0x84, 0xd8, 0xaf, 0xd9, 0x88,
      0xd8, 0xb1, 0xd8, 0xa7, 0xd8, 0xaa,
    );
    expect(repairMojibake(mojibake)).toBe("\u0627\u0644\u062F\u0648\u0631\u0627\u062A");
  });

  it("leaves valid Arabic and normal Latin text unchanged", () => {
    expect(repairMojibake("\u0627\u0644\u062F\u0648\u0631\u0627\u062A")).toBe("\u0627\u0644\u062F\u0648\u0631\u0627\u062A");
    expect(repairMojibake("Courses")).toBe("Courses");
  });
});
