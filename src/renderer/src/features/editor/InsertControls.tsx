import { useEditorState, type Editor } from "@tiptap/react";
import {
  Image as ImageIcon,
  Link2,
  Minus,
  Search,
  SeparatorHorizontal,
  Table,
} from "lucide-react";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { ArtworkImageDialog } from "./ArtworkImageDialog";
import { LinkDialog } from "./LinkDialog";

/** New images start at a size that leaves room for text; they can be resized. */
const IMAGE_WIDTH = 320;

interface InsertControlsProps {
  editor: Editor;
  documentId: string;
  onFind: () => void;
  isLinking: boolean;
  setIsLinking: (isLinking: boolean) => void;
}

function MenuButton({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const id = useId();
  const anchor = `--insert-${id.replace(/\W/g, "")}`;
  const close = () => document.getElementById(id)?.hidePopover();
  return (
    <>
      <button
        type="button"
        className="tool-button tool-button--text"
        popoverTarget={id}
        style={{ anchorName: anchor } as CSSProperties}
        onMouseDown={(event) => event.preventDefault()}
      >
        {icon}
        {label} ▾
      </button>
      <div
        id={id}
        popover="auto"
        role="menu"
        className="filter-panel menu"
        style={{ positionAnchor: anchor } as CSSProperties}
      >
        {children(close)}
      </div>
    </>
  );
}

function MenuItem({
  label,
  disabled = false,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="menu__item"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** Second half of the second toolbar row: what can be inserted. */
export function InsertControls({
  editor,
  documentId,
  onFind,
  isLinking,
  setIsLinking,
}: InsertControlsProps) {
  const [isChoosingArtwork, setIsChoosingArtwork] = useState(false);
  const inTable = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      active: e.isActive("table"),
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
      link: e.isActive("link"),
    }),
  });
  const run = (close: () => void, action: () => void) => () => {
    close();
    action();
  };
  const chain = () => editor.chain().focus();

  return (
    <>
      <button
        type="button"
        className="tool-button tool-button--text"
        aria-pressed={inTable.link}
        title="Enlace (Ctrl+K)"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsLinking(true)}
      >
        <Link2 aria-hidden size={16} />
        Enlace
      </button>
      <MenuButton icon={<ImageIcon aria-hidden size={16} />} label="Imagen">
        {(close) => (
          <>
            <MenuItem
              label="De una obra…"
              onClick={run(close, () => setIsChoosingArtwork(true))}
            />
            <MenuItem
              label="Desde un archivo…"
              onClick={run(close, async () => {
                const added =
                  await window.artGallery.addDocumentImage(documentId);
                if (added) {
                  chain()
                    .setImage({ src: added.src, width: IMAGE_WIDTH })
                    .run();
                }
              })}
            />
          </>
        )}
      </MenuButton>
      <MenuButton icon={<Table aria-hidden size={16} />} label="Tabla">
        {(close) =>
          inTable.active ? (
            <>
              <MenuItem
                label="Insertar fila encima"
                onClick={run(close, () => chain().addRowBefore().run())}
              />
              <MenuItem
                label="Insertar fila debajo"
                onClick={run(close, () => chain().addRowAfter().run())}
              />
              <MenuItem
                label="Insertar columna a la izquierda"
                onClick={run(close, () => chain().addColumnBefore().run())}
              />
              <MenuItem
                label="Insertar columna a la derecha"
                onClick={run(close, () => chain().addColumnAfter().run())}
              />
              <MenuItem
                label="Eliminar fila"
                onClick={run(close, () => chain().deleteRow().run())}
              />
              <MenuItem
                label="Eliminar columna"
                onClick={run(close, () => chain().deleteColumn().run())}
              />
              <MenuItem
                label="Combinar celdas"
                disabled={!inTable.canMerge}
                onClick={run(close, () => chain().mergeCells().run())}
              />
              <MenuItem
                label="Dividir celda"
                disabled={!inTable.canSplit}
                onClick={run(close, () => chain().splitCell().run())}
              />
              <MenuItem
                label="Fila de encabezado sí/no"
                onClick={run(close, () => chain().toggleHeaderRow().run())}
              />
              <MenuItem
                label="Eliminar tabla"
                onClick={run(close, () => chain().deleteTable().run())}
              />
            </>
          ) : (
            <>
              {[
                [2, 2],
                [3, 3],
                [4, 3],
                [3, 5],
              ].map(([cols, rows]) => (
                <MenuItem
                  key={`${cols}x${rows}`}
                  label={`Insertar tabla de ${cols} × ${rows}`}
                  onClick={run(close, () =>
                    chain()
                      .insertTable({ cols, rows, withHeaderRow: true })
                      .run(),
                  )}
                />
              ))}
            </>
          )
        }
      </MenuButton>
      <button
        type="button"
        className="tool-button tool-button--text"
        title="Salto de página (Ctrl+Intro)"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => chain().setPageBreak().run()}
      >
        <SeparatorHorizontal aria-hidden size={16} />
        Salto de página
      </button>
      <button
        type="button"
        className="tool-button tool-button--text"
        title="Línea horizontal"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => chain().setHorizontalRule().run()}
      >
        <Minus aria-hidden size={16} />
        Línea
      </button>
      <button
        type="button"
        className="tool-button tool-button--text"
        title="Buscar y reemplazar (Ctrl+F, Ctrl+H)"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onFind}
      >
        <Search aria-hidden size={16} />
        Buscar
      </button>

      {isLinking && (
        <LinkDialog editor={editor} onClose={() => setIsLinking(false)} />
      )}
      {isChoosingArtwork && (
        <ArtworkImageDialog
          onClose={() => setIsChoosingArtwork(false)}
          onChoose={(artwork) =>
            chain()
              .setImage({
                src: `artwork-image:${artwork.primaryImageId}`,
                alt: artwork.title,
                width: IMAGE_WIDTH,
              })
              .run()
          }
        />
      )}
    </>
  );
}
