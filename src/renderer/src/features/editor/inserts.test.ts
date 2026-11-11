import { describe, expect, it } from "vitest";
import { inlineImageSrc } from "./inserts";

describe("images embedded in a previewed file", () => {
  it("keeps embedded pictures the app can show", () => {
    const src = "data:image/png;base64,iVBORw0KGgo=";
    expect(inlineImageSrc(src)).toBe(src);
    expect(inlineImageSrc("data:image/jpeg;base64,/9j/4AAQ")).not.toBeNull();
  });

  it("leaves out anything else", () => {
    expect(inlineImageSrc("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(inlineImageSrc("data:text/html;base64,PGI+")).toBeNull();
    expect(inlineImageSrc("https://example.com/a.png")).toBeNull();
    expect(inlineImageSrc("")).toBeNull();
  });
});
