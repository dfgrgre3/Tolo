import { describe, expect, it } from "vitest";
import { decodeStorageSegments } from "@/lib/security/policy/storage-policy";

describe("decodeStorageSegments", () => {
  it("decodes safe path segments", () => {
    expect(decodeStorageSegments(["public-assets", "folder%20name", "file.jpg"]))
      .toEqual(["public-assets", "folder name", "file.jpg"]);
  });

  it("rejects encoded traversal and encoded separators", () => {
    expect(decodeStorageSegments(["public-assets", "%2e%2e", "secret"])).toBeNull();
    expect(decodeStorageSegments(["public-assets", "nested%2Fsecret"])).toBeNull();
    expect(decodeStorageSegments(["public-assets", "%5Csecret"])).toBeNull();
  });
});