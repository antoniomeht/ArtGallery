import { FileDown, Landmark, Tags, Trash2 } from "lucide-react";
import {
  ARTWORK_STATUSES,
  type ArtworkStatus,
} from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";
import { Button } from "../../components/Button";

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onSetStatus: (status: ArtworkStatus) => void;
  onMoveToTrash: () => void;
  onExport: () => void;
  onAddToExhibition: () => void;
  onPrintLabels: () => void;
  onDone: () => void;
}

export function SelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  onSetStatus,
  onMoveToTrash,
  onExport,
  onAddToExhibition,
  onPrintLabels,
  onDone,
}: SelectionToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="toolbar" role="toolbar" aria-label="Acciones de selección">
      <p className="toolbar__count" aria-live="polite">
        {selectedCount === 1
          ? "1 seleccionada"
          : `${selectedCount} seleccionadas`}
      </p>
      {selectedCount < totalCount ? (
        <Button onClick={onSelectAll}>Seleccionar todo</Button>
      ) : (
        <Button onClick={onClear}>Quitar selección</Button>
      )}
      <label>
        <span className="visually-hidden">Cambiar estado</span>
        <select
          className="field__input"
          value=""
          disabled={!hasSelection}
          onChange={(event) => onSetStatus(event.target.value as ArtworkStatus)}
        >
          <option value="" disabled>
            Cambiar estado…
          </option>
          {ARTWORK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <Button disabled={!hasSelection} onClick={onAddToExhibition}>
        <Landmark aria-hidden size={16} />
        Añadir a exposición…
      </Button>
      <Button disabled={!hasSelection} onClick={onExport}>
        <FileDown aria-hidden size={16} />
        Exportar…
      </Button>
      <Button disabled={!hasSelection} onClick={onPrintLabels}>
        <Tags aria-hidden size={16} />
        Cartelas…
      </Button>
      <Button disabled={!hasSelection} onClick={onMoveToTrash}>
        <Trash2 aria-hidden size={16} />
        Mover a la papelera
      </Button>
      <Button variant="primary" onClick={onDone}>
        Hecho
      </Button>
    </div>
  );
}
