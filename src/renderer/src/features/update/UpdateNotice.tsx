import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { UpdateInfo } from "../../../../shared/update";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import "./UpdateNotice.css";

type State =
  | { status: "hidden" }
  | { status: "offered" | "installing" | "failed"; update: UpdateInfo };

const megabytes = (bytes: number) =>
  `${Math.round(bytes / 1024 / 1024).toLocaleString("es-ES")} MB`;

/** Offers a newer published version, found once when the app starts. */
export function UpdateNotice() {
  const [state, setState] = useState<State>({ status: "hidden" });

  useEffect(() => {
    // Without a connection there is simply nothing to offer.
    window.artGallery.checkForUpdate().then(
      (update) => update && setState({ status: "offered", update }),
      () => {},
    );
  }, []);

  if (state.status === "hidden") return null;
  const { update } = state;

  return (
    <div className="update-notice" role="status">
      <Download aria-hidden size={18} />
      <span className="update-notice__message">
        {state.status === "failed"
          ? "No se pudo descargar la nueva versión. Inténtalo más tarde."
          : state.status === "installing"
            ? `Descargando ArtGallery ${update.version} (${megabytes(update.asset.size)})…`
            : `Hay una versión nueva de ArtGallery: ${update.version}.`}
      </span>
      <Button onClick={() => void window.artGallery.openReleaseNotes()}>
        Ver novedades
      </Button>
      <Button
        variant="primary"
        disabled={state.status === "installing"}
        onClick={() => {
          setState({ status: "installing", update });
          window.artGallery.installUpdate().then(
            // On macOS the disk image opens and the app stays open.
            () => setState({ status: "hidden" }),
            () => setState({ status: "failed", update }),
          );
        }}
      >
        Instalar
      </Button>
      <IconButton
        aria-label="Más tarde"
        disabled={state.status === "installing"}
        onClick={() => setState({ status: "hidden" })}
      >
        <X aria-hidden size={16} />
      </IconButton>
    </div>
  );
}
