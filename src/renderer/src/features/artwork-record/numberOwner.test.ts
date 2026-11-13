import { describe, expect, it } from "vitest";
import { ownerText, swapText } from "./numberOwner";

describe("the notice about an inventory number in use", () => {
  it("names the artwork that has it, and whether it is in the trash", () => {
    expect(ownerText({ id: "a", title: "Marina", inTrash: false })).toBe(
      "Este número lo tiene «Marina».",
    );
    expect(ownerText({ id: "a", title: "Boceto", inTrash: true })).toBe(
      "Este número lo tiene «Boceto» (en la papelera).",
    );
  });

  it("says what the other artwork gets when saving", () => {
    const marina = { id: "a", title: "Marina", inTrash: false };
    expect(swapText(marina, "005")).toBe(
      "Al guardar, «Marina» pasará a tener el 005.",
    );
    expect(swapText(marina, null)).toBe(
      "Al guardar, «Marina» se quedará sin número.",
    );
  });
});
