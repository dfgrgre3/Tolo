import { describe, expect, it } from "vitest";
import { UserStatus } from "@/types/enums";

describe("user status contract", () => {
  it("matches the backend OpenAPI vocabulary", () => {
    expect(Object.values(UserStatus)).toEqual([
      "ACTIVE",
      "INACTIVE",
      "SUSPENDED",
      "BANNED",
    ]);
  });
});
