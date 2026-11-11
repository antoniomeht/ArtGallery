import { describe, expect, it } from "vitest";
import { readPdfLoadState, type PdfFrame } from "./pdfLoadState";

const SRC = "artgallery-media://documents/a.pdf";
const VIEWER = "chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html";

function frames(state: unknown, src = SRC): PdfFrame[] {
  const page: PdfFrame = {
    url: "file:///app/index.html",
    parent: null,
    executeJavaScript: async () => null,
  };
  const iframe: PdfFrame = {
    url: `${src}#toolbar=0&view=FitH`,
    parent: page,
    executeJavaScript: async () => null,
  };
  const viewer: PdfFrame = {
    url: VIEWER,
    parent: iframe,
    executeJavaScript: async () => {
      if (state instanceof Error) throw state;
      return state;
    },
  };
  return [page, iframe, viewer];
}

describe("whether the PDF viewer has drawn a document", () => {
  it("follows the viewer of that document", async () => {
    expect(await readPdfLoadState(frames("loading"), SRC)).toBe("loading");
    expect(await readPdfLoadState(frames("success"), `${SRC}#page=2`)).toBe(
      "loaded",
    );
    expect(await readPdfLoadState(frames("failed"), SRC)).toBe("failed");
  });

  it("is still loading while the viewer does not exist yet", async () => {
    const [page, iframe] = frames("success");
    expect(await readPdfLoadState([page!, iframe!], SRC)).toBe("loading");
  });

  it("ignores the viewer of another document", async () => {
    expect(
      await readPdfLoadState(
        frames("success", "artgallery-media://documents/b.pdf"),
        SRC,
      ),
    ).toBe("loading");
  });

  it("gives up rather than guess when the viewer cannot be read", async () => {
    expect(await readPdfLoadState(frames(undefined), SRC)).toBe("unknown");
    expect(await readPdfLoadState(frames(new Error("gone")), SRC)).toBe(
      "unknown",
    );
  });
});
