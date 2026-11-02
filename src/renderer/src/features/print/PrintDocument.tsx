import { useEffect, useState, type ReactNode } from "react";
import type { PrintJob } from "../../../../shared/print";
import { CatalogDocument } from "./CatalogDocument";
import { LabelSheets } from "./LabelSheets";
import { loadExhibitionArtworks, loadSourceArtworks } from "./printData";
import "./print.css";

interface PrintDocumentProps {
  job: PrintJob;
}

/** Loads what the job needs and returns the document to print. */
async function renderJob(job: PrintJob): Promise<ReactNode> {
  switch (job.kind) {
    case "catalog": {
      const data = await loadExhibitionArtworks(job.exhibitionId);
      return <CatalogDocument {...data} includePrices={job.includePrices} />;
    }
    case "labels": {
      const artworks = await loadSourceArtworks(job.source);
      return <LabelSheets artworks={artworks} options={job.options} />;
    }
  }
}

/**
 * Rendered by the hidden print window. Once the document and its images are
 * ready, it tells the main process, which saves it as PDF.
 */
export function PrintDocument({ job }: PrintDocumentProps) {
  const [content, setContent] = useState<ReactNode | null>(null);

  useEffect(() => {
    void renderJob(job).then(setContent);
  }, [job]);

  useEffect(() => {
    if (!content) return;
    const images = [...document.images].map((image) =>
      image.decode().catch(() => undefined),
    );
    void Promise.all([...images, document.fonts.ready]).then(() =>
      window.artGallery.printReady(),
    );
  }, [content]);

  return content;
}
