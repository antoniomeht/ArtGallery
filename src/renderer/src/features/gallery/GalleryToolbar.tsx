import { Plus } from "lucide-react";
import type { ArtworkSort } from "../../../../shared/artwork";
import { SortSelect } from "./SortSelect";
import { Button } from "../../components/Button";

interface GalleryToolbarProps {
  sort: ArtworkSort;
  onSortChange: (sort: ArtworkSort) => void;
  onAdd: () => void;
}

export function GalleryToolbar({
  sort,
  onSortChange,
  onAdd,
}: GalleryToolbarProps) {
  return (
    <div className="toolbar">
      <SortSelect value={sort} onChange={onSortChange} />
      <Button variant="primary" onClick={onAdd}>
        <Plus aria-hidden size={16} />
        Añadir obra
      </Button>
    </div>
  );
}
