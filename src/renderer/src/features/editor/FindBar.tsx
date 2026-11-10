import { useEditorState, type Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "../../components/IconButton";
import { searchKey } from "./findReplace";

interface FindBarProps {
  editor: Editor;
  /** Opened with Ctrl+H: the replace field gets the focus. */
  focusReplace: boolean;
  onClose: () => void;
}

/** Find and replace over the document, like Word's Ctrl+F and Ctrl+H. */
export function FindBar({ editor, focusReplace, onClose }: FindBarProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const findRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const { count, current } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const state = searchKey.getState(e.state);
      return {
        count: state?.matches.length ?? 0,
        current: state?.current ?? 0,
      };
    },
  });

  useEffect(() => {
    (focusReplace ? replaceRef : findRef).current?.focus();
  }, [focusReplace]);

  useEffect(() => {
    editor.commands.setSearch(query, { caseSensitive });
  }, [editor, query, caseSensitive]);

  useEffect(
    () => () => {
      editor.commands.setSearch("", { caseSensitive: false });
    },
    [editor],
  );

  return (
    <div
      className="find-bar"
      role="search"
      aria-label="Buscar y reemplazar"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          editor.commands.focus();
        }
      }}
    >
      <input
        ref={findRef}
        className="field__input find-bar__input"
        aria-label="Buscar"
        placeholder="Buscar"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            editor.commands.goToMatch(event.shiftKey ? -1 : 1);
          }
        }}
      />
      <span className="find-bar__count" aria-live="polite">
        {query ? (count ? `${current + 1} de ${count}` : "Sin resultados") : ""}
      </span>
      <IconButton
        aria-label="Anterior"
        disabled={count === 0}
        onClick={() => editor.commands.goToMatch(-1)}
      >
        <ChevronUp aria-hidden size={16} />
      </IconButton>
      <IconButton
        aria-label="Siguiente"
        disabled={count === 0}
        onClick={() => editor.commands.goToMatch(1)}
      >
        <ChevronDown aria-hidden size={16} />
      </IconButton>
      <label className="checkbox find-bar__case">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(event) => setCaseSensitive(event.target.checked)}
        />
        Mayúsculas
      </label>
      <input
        ref={replaceRef}
        className="field__input find-bar__input"
        aria-label="Reemplazar por"
        placeholder="Reemplazar por"
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
      />
      <button
        type="button"
        className="button"
        disabled={count === 0}
        onClick={() => editor.commands.replaceCurrent(replacement)}
      >
        Reemplazar
      </button>
      <button
        type="button"
        className="button"
        disabled={count === 0}
        onClick={() => editor.commands.replaceAll(replacement)}
      >
        Reemplazar todo
      </button>
      <IconButton aria-label="Cerrar búsqueda" onClick={onClose}>
        <X aria-hidden size={16} />
      </IconButton>
    </div>
  );
}
