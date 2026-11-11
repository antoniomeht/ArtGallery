// Writes out/THIRD-PARTY-NOTICES.md, installed next to the app: the licences
// of everything it ships besides its own code. Run after `npm run build`.
// Electron's own notices (LICENSE.electron.txt, LICENSES.chromium.html) are
// added by electron-builder.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Licences the app may ship under its MIT licence. A new dependency under
 * anything else stops the build until someone checks it.
 */
const ALLOWED = new Set([
  "MIT",
  "ISC",
  "BSD",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "Apache-2.0",
  "0BSD",
  "OFL-1.1",
  "(MIT AND Zlib)",
  // Dual licensed: used under MIT.
  "(MIT OR GPL-3.0-or-later)",
  // sharp's libvips binaries: LGPL, dynamically linked and replaceable.
  "Apache-2.0 AND LGPL-3.0-or-later",
]);

const LICENSE_FILE = /^(licen[cs]e|copying)(\.(md|txt|markdown))?$/i;

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n").trim();

/** Packages installed for the app at run time, from the lockfile's tree. */
function runtimePackages() {
  const dirs = execSync("npm ls --omit=dev --all --parseable", {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1); // The first line is the app itself.
  const packages = new Map();
  for (const dir of dirs) {
    const pkg = JSON.parse(read(join(dir, "package.json")));
    const license =
      typeof pkg.license === "string"
        ? pkg.license
        : (pkg.license?.type ?? "UNKNOWN");
    const file = readdirSync(dir).find((name) => LICENSE_FILE.test(name));
    packages.set(`${pkg.name}@${pkg.version}`, {
      name: pkg.name,
      version: pkg.version,
      license,
      text: file ? read(join(dir, file)) : null,
    });
  }
  return [...packages.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** What Vite bundled into each part of the app (see electron.vite.config). */
function bundledNotices() {
  return ["main", "preload", "renderer"]
    .map((part) => join("out", part, "licenses.md"))
    .filter(existsSync)
    .map((path) => read(path).replace(/^# Licenses\n+/, ""))
    .filter((text) => text.includes("## "))
    .map((text) =>
      text.replace(
        /^## .* - .* \((.*)\)$/gm,
        (line, license) => (checkLicense(license, line), line),
      ),
    );
}

const refused = [];
function checkLicense(license, name) {
  if (!ALLOWED.has(license)) refused.push(`${name}: ${license}`);
}

const runtime = runtimePackages();
runtime.forEach(({ name, version, license }) =>
  checkLicense(license, `${name}@${version}`),
);
const bundled = bundledNotices();

if (refused.length > 0) {
  console.error(
    "Licences not yet checked for an MIT app:\n" + refused.join("\n"),
  );
  process.exit(1);
}

const sections = [
  "# Third-party notices\n\n" +
    "ArtGallery is released under the MIT License (see LICENSE). It ships " +
    "the software below, each under its own licence. Electron and Chromium " +
    "notices are in LICENSE.electron.txt and LICENSES.chromium.html.",
  "# Bundled into the app\n\n" + bundled.join("\n\n"),
  "# Installed with the app\n\n" +
    runtime
      .map(
        ({ name, version, license, text }) =>
          `## ${name} - ${version} (${license})\n\n` +
          (text
            ? "````\n" + text + "\n````"
            : "No licence file in the package."),
      )
      .join("\n\n"),
  "# libvips and the libraries it includes\n\n" +
    "Image processing uses sharp, which loads prebuilt libvips libraries " +
    "kept as separate files next to the app, so they can be replaced.\n\n" +
    read("licenses/libvips-THIRD-PARTY-NOTICES.md").replace(/^# .*\n+/, ""),
  "# GNU Lesser General Public License v3\n\n```\n" +
    read("licenses/LGPL-3.0.txt") +
    "\n```",
  "# GNU General Public License v3\n\n```\n" +
    read("licenses/GPL-3.0.txt") +
    "\n```",
];

writeFileSync("out/THIRD-PARTY-NOTICES.md", sections.join("\n\n") + "\n");
console.log(
  `THIRD-PARTY-NOTICES.md: ${runtime.length} installed packages, ` +
    `${bundled.length} bundled parts.`,
);
