import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  EDITOR_FONTS,
  FONT_SIZES,
  LINE_HEIGHTS,
} from "../../../../shared/editorSchema";

const STYLES = [
  { value: "paragraph", label: "Normal" },
  { value: "1", label: "Título 1" },
  { value: "2", label: "Título 2" },
  { value: "3", label: "Título 3" },
  { value: "quote", label: "Cita" },
] as const;

const LINE_HEIGHT_LABELS: Record<string, string> = {
  "1": "1,0",
  "1.15": "1,15",
  "1.5": "1,5",
  "2": "2,0",
};

const DEFAULT_FONT = "Instrument Sans";
const DEFAULT_SIZE = "11pt";

function ToolButton({
  icon: Icon,
  label,
  isActive = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="tool-button"
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      disabled={disabled}
      // Keeps the selection in the text while clicking the toolbar.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon aria-hidden size={16} />
    </button>
  );
}

const Divider = () => <span className="toolbar-divider" aria-hidden />;

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="editor-toolbar__group">
      {children}
    </div>
  );
}

/** Formatting in two rows, as in Word's Home tab. */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const textStyle = current.getAttributes("textStyle");
      const block =
        current.getAttributes("heading").level !== undefined
          ? current.getAttributes("heading")
          : current.getAttributes("paragraph");
      return {
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
        style: current.isActive("blockquote")
          ? "quote"
          : current.isActive("heading")
            ? String(current.getAttributes("heading").level)
            : "paragraph",
        font: (textStyle.fontFamily as string | undefined) ?? DEFAULT_FONT,
        size: (textStyle.fontSize as string | undefined) ?? DEFAULT_SIZE,
        color: (textStyle.color as string | undefined) ?? "#222222",
        lineHeight: (block.lineHeight as string | undefined) ?? "1.15",
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        superscript: current.isActive("superscript"),
        subscript: current.isActive("subscript"),
        highlight: current.isActive("highlight"),
        align: (["left", "center", "right", "justify"] as const).find((align) =>
          current.isActive({ textAlign: align }),
        ),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
      };
    },
  });
  const chain = () => editor.chain().focus();

  function setStyle(value: string) {
    if (value === "quote") {
      chain().setParagraph().setBlockquote().run();
    } else if (value === "paragraph") {
      chain().setParagraph().unsetBlockquote().run();
    } else {
      chain()
        .unsetBlockquote()
        .setHeading({ level: Number(value) as 1 | 2 | 3 })
        .run();
    }
  }

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formato">
      <div className="editor-toolbar__row">
        <Group label="Historial">
          <ToolButton
            icon={Undo2}
            label="Deshacer (Ctrl+Z)"
            disabled={!state.canUndo}
            onClick={() => chain().undo().run()}
          />
          <ToolButton
            icon={Redo2}
            label="Rehacer (Ctrl+Y)"
            disabled={!state.canRedo}
            onClick={() => chain().redo().run()}
          />
        </Group>
        <Divider />
        <select
          className="editor-select editor-select--style"
          aria-label="Estilo de párrafo"
          value={state.style}
          onChange={(event) => setStyle(event.target.value)}
        >
          {STYLES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="editor-select editor-select--font"
          aria-label="Fuente"
          value={state.font}
          onChange={(event) =>
            chain()
              .setFont(event.target.value as (typeof EDITOR_FONTS)[number])
              .run()
          }
        >
          {EDITOR_FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
        <select
          className="editor-select editor-select--size"
          aria-label="Tamaño de fuente"
          value={state.size}
          onChange={(event) => chain().setFontSize(event.target.value).run()}
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={`${size}pt`}>
              {size}
            </option>
          ))}
        </select>
        <Divider />
        <Group label="Carácter">
          <ToolButton
            icon={Bold}
            label="Negrita (Ctrl+B)"
            isActive={state.bold}
            onClick={() => chain().toggleBold().run()}
          />
          <ToolButton
            icon={Italic}
            label="Cursiva (Ctrl+I)"
            isActive={state.italic}
            onClick={() => chain().toggleItalic().run()}
          />
          <ToolButton
            icon={Underline}
            label="Subrayado (Ctrl+U)"
            isActive={state.underline}
            onClick={() => chain().toggleUnderline().run()}
          />
          <ToolButton
            icon={Strikethrough}
            label="Tachado"
            isActive={state.strike}
            onClick={() => chain().toggleStrike().run()}
          />
          <ToolButton
            icon={Superscript}
            label="Superíndice"
            isActive={state.superscript}
            onClick={() => chain().toggleSuperscript().run()}
          />
          <ToolButton
            icon={Subscript}
            label="Subíndice"
            isActive={state.subscript}
            onClick={() => chain().toggleSubscript().run()}
          />
        </Group>
        <label className="color-tool" title="Color de texto">
          <Baseline aria-hidden size={16} />
          <span className="visually-hidden">Color de texto</span>
          <input
            type="color"
            value={state.color}
            onChange={(event) => chain().setColor(event.target.value).run()}
          />
          <span
            className="color-tool__swatch"
            style={{ background: state.color }}
            aria-hidden
          />
        </label>
        <ToolButton
          icon={Highlighter}
          label="Resaltado"
          isActive={state.highlight}
          onClick={() => chain().toggleHighlight({ color: "#fff1a8" }).run()}
        />
        <ToolButton
          icon={RemoveFormatting}
          label="Borrar formato"
          onClick={() => chain().unsetAllMarks().clearNodes().run()}
        />
      </div>
      <div className="editor-toolbar__row">
        <Group label="Alineación">
          <ToolButton
            icon={AlignLeft}
            label="Alinear a la izquierda"
            isActive={state.align === "left"}
            onClick={() => chain().setTextAlign("left").run()}
          />
          <ToolButton
            icon={AlignCenter}
            label="Centrar"
            isActive={state.align === "center"}
            onClick={() => chain().setTextAlign("center").run()}
          />
          <ToolButton
            icon={AlignRight}
            label="Alinear a la derecha"
            isActive={state.align === "right"}
            onClick={() => chain().setTextAlign("right").run()}
          />
          <ToolButton
            icon={AlignJustify}
            label="Justificar"
            isActive={state.align === "justify"}
            onClick={() => chain().setTextAlign("justify").run()}
          />
        </Group>
        <Divider />
        <Group label="Listas y sangría">
          <ToolButton
            icon={List}
            label="Lista con viñetas"
            isActive={state.bulletList}
            onClick={() => chain().toggleBulletList().run()}
          />
          <ToolButton
            icon={ListOrdered}
            label="Lista numerada"
            isActive={state.orderedList}
            onClick={() => chain().toggleOrderedList().run()}
          />
          <ToolButton
            icon={IndentDecrease}
            label="Disminuir sangría (Mayús+Tab)"
            onClick={() => chain().outdent().run()}
          />
          <ToolButton
            icon={IndentIncrease}
            label="Aumentar sangría (Tab)"
            onClick={() => chain().indent().run()}
          />
        </Group>
        <select
          className="editor-select"
          aria-label="Interlineado"
          title="Interlineado"
          value={state.lineHeight}
          onChange={(event) => chain().setLineHeight(event.target.value).run()}
        >
          {LINE_HEIGHTS.map((value) => (
            <option key={value} value={value}>
              Interlineado {LINE_HEIGHT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
