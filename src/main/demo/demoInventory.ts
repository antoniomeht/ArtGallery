import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { ArtworkFieldsInput } from "../../shared/artwork";
import type { ExhibitionService } from "../exhibitions/exhibitionService";
import type { InventoryService } from "../inventory/inventoryService";

/**
 * Fictional artworks for trying the app. Artists and titles are invented and
 * every image is generated here, so the demo has no licensing concerns.
 */
const DEMO_ARTWORKS: (ArtworkFieldsInput & {
  palette: string[];
  ratio: number;
})[] = [
  {
    title: "Mediodía en Cádiz",
    artist: "Inés Albar",
    category: "Pintura",
    technique: "Óleo",
    support: "lienzo",
    year: 2019,
    height: 81,
    width: 65,
    status: "available",
    price: 2400,
    location: "Salón",
    tags: ["mar", "luz"],
    palette: ["#f2e3c6", "#1f3fbf", "#e8b04b"],
    ratio: 0.8,
  },
  {
    title: "Estudio en ocre",
    artist: "Inés Albar",
    category: "Pintura",
    technique: "Acrílico",
    support: "tabla",
    year: 2021,
    height: 40,
    width: 40,
    status: "exhibited",
    price: 950,
    location: "Galería Norte",
    tags: ["abstracto"],
    palette: ["#c8902e", "#3b2f2a", "#efe6d8"],
    ratio: 1,
  },
  {
    title: "Ventana norte",
    artist: "Marco Ledesma",
    category: "Dibujo",
    technique: "Grafito",
    support: "papel",
    year: 2015,
    yearApproximate: true,
    height: 30,
    width: 42,
    status: "available",
    location: "Estudio",
    tags: ["interior"],
    palette: ["#ecebe7", "#2b2b2b", "#9a9a95"],
    ratio: 1.4,
  },
  {
    title: "Huerto en marzo",
    artist: "Lucía Ferrer",
    category: "Pintura",
    technique: "Gouache",
    support: "papel",
    year: 2023,
    height: 24,
    width: 32,
    status: "sold",
    price: 480,
    tags: ["paisaje", "primavera"],
    palette: ["#dfe8cf", "#4f7a3a", "#d94f3d"],
    ratio: 1.33,
  },
  {
    title: "Retrato azul",
    artist: "Marco Ledesma",
    category: "Pintura",
    technique: "Óleo",
    support: "lienzo",
    year: 2008,
    height: 100,
    width: 81,
    status: "loaned",
    location: "Museo de Bellas Artes (préstamo)",
    tags: ["retrato"],
    palette: ["#1d2a44", "#8fb3d9", "#f0d9b5"],
    ratio: 0.81,
  },
  {
    title: "Trama II",
    artist: "Sara Quintana",
    category: "Técnica mixta",
    technique: "Collage y tinta",
    support: "cartón",
    year: 2020,
    height: 50,
    width: 50,
    status: "available",
    price: 1200,
    location: "Almacén",
    tags: ["abstracto", "serie trama"],
    palette: ["#f4f1ea", "#b3261e", "#222222"],
    ratio: 1,
  },
  {
    title: "Lluvia sobre el puerto",
    artist: "Lucía Ferrer",
    category: "Pintura",
    technique: "Acuarela",
    support: "papel",
    year: 2017,
    height: 36,
    width: 48,
    status: "available",
    price: 650,
    location: "Salón",
    tags: ["mar", "puerto"],
    palette: ["#c9d6df", "#52616b", "#1e2022"],
    ratio: 1.33,
  },
  {
    title: "Bodegón con granadas",
    artist: "Sara Quintana",
    category: "Pintura",
    technique: "Óleo",
    support: "tabla",
    year: 1999,
    yearApproximate: true,
    height: 46,
    width: 55,
    status: "other",
    notes: "Pendiente de restauración del marco.",
    tags: ["bodegón"],
    palette: ["#2a1d1a", "#a8323e", "#d9b26f"],
    ratio: 1.2,
  },
];

const DEMO_EXHIBITION = {
  name: "Geometrías del color",
  venue: "Sala Norte",
  startDate: "2026-03-12",
  endDate: "2026-04-30",
  description:
    "Una selección de obras donde el color se organiza en formas sencillas.",
};

/** Fills an empty inventory with the demo artworks and one exhibition. */
export async function seedDemoInventory({
  inventory,
  exhibitions,
  workDir,
}: {
  inventory: InventoryService;
  exhibitions: ExhibitionService;
  workDir: string;
}): Promise<void> {
  if (inventory.listAllArtworks().length > 0) return;
  await mkdir(workDir, { recursive: true });

  const ids: string[] = [];
  try {
    for (const [
      index,
      { palette, ratio, ...fields },
    ] of DEMO_ARTWORKS.entries()) {
      const image = join(workDir, `demo-${index}.jpg`);
      await sharp(Buffer.from(composition(palette, ratio, index)))
        .jpeg({ quality: 88 })
        .toFile(image);
      const { id } = await inventory.createArtwork({
        title: fields.title,
        imagePaths: [image],
      });
      inventory.updateArtwork(id, fields);
      ids.push(id);
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  const { id } = exhibitions.create(DEMO_EXHIBITION);
  exhibitions.addArtworks(id, [ids[1]!, ids[5]!, ids[0]!, ids[3]!]);
}

/** Each demo artwork gets its own simple composition, in list order. */
const COMPOSITIONS: ((w: number, h: number, c: string[]) => string)[] = [
  // Horizon with a low sun.
  (w, h, [ground, sea, sun]) =>
    `<rect y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="${sea}"/>
     <circle cx="${w * 0.62}" cy="${h * 0.5}" r="${w * 0.16}" fill="${sun}"/>
     <rect y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="${sea}" opacity="0.85"/>
     <rect x="${w * 0.1}" y="${h * 0.12}" width="${w * 0.8}" height="${h * 0.02}" fill="${ground}"/>`,
  // Vertical bands.
  (w, h, [, dark, light]) =>
    [0.12, 0.38, 0.64]
      .map(
        (x, i) =>
          `<rect x="${w * x}" y="${h * 0.12}" width="${w * 0.2}" height="${h * 0.76}" fill="${i === 1 ? light : dark}"/>`,
      )
      .join(""),
  // Window grid drawn in pencil.
  (w, h, [, line, shade]) =>
    `<rect x="${w * 0.2}" y="${h * 0.15}" width="${w * 0.6}" height="${h * 0.7}" fill="none" stroke="${line}" stroke-width="10"/>
     <line x1="${w / 2}" y1="${h * 0.15}" x2="${w / 2}" y2="${h * 0.85}" stroke="${line}" stroke-width="8"/>
     <line x1="${w * 0.2}" y1="${h / 2}" x2="${w * 0.8}" y2="${h / 2}" stroke="${line}" stroke-width="8"/>
     <rect x="${w * 0.52}" y="${h * 0.52}" width="${w * 0.26}" height="${h * 0.31}" fill="${shade}" opacity="0.5"/>`,
  // Rows of an orchard.
  (w, h, [, leaf, fruit]) =>
    Array.from({ length: 4 }, (_, row) =>
      Array.from(
        { length: 6 },
        (_, col) =>
          `<circle cx="${w * (0.12 + col * 0.15)}" cy="${h * (0.25 + row * 0.18)}" r="${w * 0.05}" fill="${(row + col) % 4 === 0 ? fruit : leaf}"/>`,
      ).join(""),
    ).join(""),
  // Portrait bust.
  (w, h, [, coat, skin]) =>
    `<ellipse cx="${w / 2}" cy="${h * 0.38}" rx="${w * 0.17}" ry="${h * 0.16}" fill="${skin}"/>
     <path d="M ${w * 0.18} ${h} Q ${w / 2} ${h * 0.45} ${w * 0.82} ${h} Z" fill="${coat}"/>`,
  // Collage of tilted paper.
  (w, h, [, red, ink]) =>
    `<rect x="${w * 0.15}" y="${h * 0.2}" width="${w * 0.45}" height="${h * 0.3}" fill="${red}" transform="rotate(-8 ${w / 2} ${h / 2})"/>
     <rect x="${w * 0.4}" y="${h * 0.45}" width="${w * 0.4}" height="${h * 0.32}" fill="${ink}" transform="rotate(6 ${w / 2} ${h / 2})"/>
     <circle cx="${w * 0.7}" cy="${h * 0.28}" r="${w * 0.07}" fill="${ink}"/>`,
  // Rain over the harbour.
  (w, h, [, water, mast]) =>
    `<rect y="${h * 0.65}" width="${w}" height="${h * 0.35}" fill="${water}"/>
     ${Array.from({ length: 28 }, (_, i) => `<line x1="${(i * w) / 28}" y1="0" x2="${(i * w) / 28 - w * 0.05}" y2="${h * 0.6}" stroke="${water}" stroke-width="4" opacity="0.5"/>`).join("")}
     <rect x="${w * 0.3}" y="${h * 0.3}" width="${w * 0.015}" height="${h * 0.36}" fill="${mast}"/>
     <rect x="${w * 0.22}" y="${h * 0.62}" width="${w * 0.2}" height="${h * 0.05}" fill="${mast}"/>`,
  // Still life with pomegranates.
  (w, h, [, fruit, table]) =>
    `<rect y="${h * 0.66}" width="${w}" height="${h * 0.34}" fill="${table}"/>
     <circle cx="${w * 0.38}" cy="${h * 0.56}" r="${w * 0.12}" fill="${fruit}"/>
     <circle cx="${w * 0.6}" cy="${h * 0.6}" r="${w * 0.09}" fill="${fruit}"/>
     <circle cx="${w * 0.5}" cy="${h * 0.45}" r="${w * 0.07}" fill="${fruit}" opacity="0.8"/>`,
];

function composition(palette: string[], ratio: number, index: number): string {
  const width = 1600;
  const height = Math.round(width / ratio);
  const draw = COMPOSITIONS[index % COMPOSITIONS.length]!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${palette[0]}"/>${draw(width, height, palette)}
  </svg>`;
}
