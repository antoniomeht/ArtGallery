import { readFile, rename, writeFile } from "node:fs/promises";
import { settingsSchema, type Settings } from "../../shared/settings";

/** Settings kept as JSON next to the database. */
export class SettingsStore {
  constructor(private readonly filePath: string) {}

  /** Missing or unreadable settings fall back to the defaults. */
  async read(): Promise<Settings> {
    try {
      const raw: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      const result = settingsSchema.safeParse(raw);
      if (result.success) return result.data;
    } catch {
      // No settings file yet, or a damaged one: use the defaults.
    }
    return settingsSchema.parse({});
  }

  async update(changes: Partial<Settings>): Promise<Settings> {
    const settings = settingsSchema.parse({
      ...(await this.read()),
      ...changes,
    });
    const temporary = `${this.filePath}.tmp`;
    await writeFile(temporary, JSON.stringify(settings, null, 2));
    await rename(temporary, this.filePath);
    return settings;
  }
}
