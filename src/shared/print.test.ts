import { describe, expect, it } from "vitest";
import { printJobHash, readPrintJob, type PrintJob } from "./print";

describe("print jobs", () => {
  it("travel through the URL hash unchanged", () => {
    const job: PrintJob = {
      kind: "catalog",
      exhibitionId: "a1",
      includePrices: true,
    };

    expect(readPrintJob(printJobHash(job))).toEqual(job);
  });

  it("are absent from the normal app window and ignore malformed hashes", () => {
    expect(readPrintJob("")).toBeNull();
    expect(readPrintJob("#print?not-json")).toBeNull();
    expect(
      readPrintJob(`#print?${encodeURIComponent('{"kind":"x"}')}`),
    ).toBeNull();
  });
});
