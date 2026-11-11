/** A newer published version and the installer for this computer. */
export interface UpdateInfo {
  /** e.g. "0.2.0" */
  version: string;
  /** The release page, with its notes. */
  releaseUrl: string;
  asset: {
    name: string;
    url: string;
    size: number;
    /** As published by GitHub, checked after downloading. */
    sha256: string;
  };
}
