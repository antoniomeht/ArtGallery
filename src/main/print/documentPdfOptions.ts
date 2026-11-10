import type { PageSetup } from "../../shared/pageSetup";

export interface HeaderFooterOptions {
  displayHeaderFooter: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);

const STYLE =
  "width: 100%; padding: 0 12mm; font-family: Arial, sans-serif; font-size: 8pt; color: #555555; text-align: center;";

/**
 * Chromium's header and footer for a text document. An empty template is
 * still given: without it Chromium prints the date and the page address.
 */
export function documentPdfOptions(setup: PageSetup): HeaderFooterOptions {
  if (!setup.header && !setup.pageNumbers)
    return { displayHeaderFooter: false };
  return {
    displayHeaderFooter: true,
    headerTemplate: setup.header
      ? `<div style="${STYLE}">${escapeHtml(setup.header)}</div>`
      : "<span></span>",
    footerTemplate: setup.pageNumbers
      ? `<div style="${STYLE}"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`
      : "<span></span>",
  };
}
