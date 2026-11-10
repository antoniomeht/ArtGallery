import "@fontsource-variable/instrument-sans";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { readPrintJob } from "../../shared/print";
import { App } from "./App";
import { PrintDocument } from "./features/print/PrintDocument";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// The hidden print window loads the same page with a job in the hash.
const printJob = readPrintJob(window.location.hash);

createRoot(root).render(
  <StrictMode>
    {printJob ? <PrintDocument job={printJob} /> : <App />}
  </StrictMode>,
);
