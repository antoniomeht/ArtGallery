import { describe, expect, it } from "vitest";
import { parseSettingsChanges } from "./settings";

describe("a change to the settings", () => {
  it("holds only the settings that were changed", () => {
    expect(parseSettingsChanges({ dimensionUnit: "in" })).toEqual({
      dimensionUnit: "in",
    });
  });

  it("is still checked", () => {
    expect(() => parseSettingsChanges({ autoBackup: "hourly" })).toThrow();
  });
});
