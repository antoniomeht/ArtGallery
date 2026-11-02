// Renders build/icon.svg to the PNG that electron-builder turns into the
// Windows and macOS app icons. The PNG is generated, so it is not versioned.
import sharp from "sharp";

await sharp("build/icon.svg", { density: 300 })
  .resize(1024, 1024)
  .png()
  .toFile("build/icon.png");
