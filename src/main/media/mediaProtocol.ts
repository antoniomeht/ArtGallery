import { net, protocol } from "electron";
import { pathToFileURL } from "node:url";
import { MEDIA_SCHEME } from "../../shared/media";
import type { ImageStore } from "../images/imageStore";

/** Must run before the app is ready. */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true } },
  ]);
}

/** Serves `artgallery-media://<kind>/<file>` only from the image store. */
export function handleMediaRequests(imageStore: ImageStore): void {
  protocol.handle(MEDIA_SCHEME, (request) => {
    const url = new URL(request.url);
    const path = imageStore.resolveMediaPath(url.host, url.pathname.slice(1));
    if (!path) return new Response(null, { status: 404 });
    return net.fetch(pathToFileURL(path).toString());
  });
}
