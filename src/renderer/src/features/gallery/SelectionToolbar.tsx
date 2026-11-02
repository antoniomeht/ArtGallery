import { FileDown, Trash2 } from "lucide-react";
import {
  ARTWORK_STATUSES,
  type ArtworkStatus,
} from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onSetStatus: (status: ArtworkStatus) => void;
  onMoveToTrash: () => void;
  onExport: () => void;
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
        <button type="button" className="button" onClick={onSelectAll}>
          Seleccionar todo
        </button>
      ) : (
        <button type="button" className="button" onClick={onClear}>
          Quitar selección
        </button>
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
      <button
        type="button"
        className="button"
        disabled={!hasSelection}
        onClick={onExport}
      >
        <FileDown aria-hidden size={16} />
        Exportar…
      </button>
      <button
        type="button"
        className="button"
        disabled={!hasSelection}
        onClick={onMoveToTrash}
      >
        <Trash2 aria-hidden size={16} />
        Mover a la papelera
      </button>
      <button type="button" className="button button--primary" onClick={onDone}>
        Hecho
      </button>
    </div>
  );
}
