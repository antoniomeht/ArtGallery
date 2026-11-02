import { useEffect, useState, type ReactNode } from "react";
import type { PrintJob } from "../../../../shared/print";
import { CatalogDocument } from "./CatalogDocument";
import { loadExhibitionArtworks, type PrintData } from "./printData";
import "./print.css";

interface PrintDocumentProps {
  job: PrintJob;
}

/**
 * Rendered by the hidden print window. Once the document and its images are
 * ready, it tells the main process, which saves it as PDF.
 */
export function PrintDocument({ job }: PrintDocumentProps) {
  const [data, setData] = useState<PrintData | null>(null);

  useEffect(() => {
    void loadExhibitionArtworks(job.exhibitionId).then(setData);
  }, [job.exhibitionId]);

  useEffect(() => {
    if (!data) return;
    const images = [...document.images].map((image) =>
      image.decode().catch(() => undefined),
    );
    void Promise.all([...images, document.fonts.ready]).then(() =>
      window.artGallery.printReady(),
    );
  }, [data]);

  if (!data) return null;
  const documents: Record<PrintJob["kind"], ReactNode> = {
    catalog: <CatalogDocument {...data} includePrices={job.includePrices} />,
  };
  return documents[job.kind];
}
