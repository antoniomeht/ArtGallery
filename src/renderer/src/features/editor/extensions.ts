import { Extension, type CommandProps } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { CharacterCount } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import {
  EDITOR_FONTS,
  LINE_HEIGHTS,
  MAX_INDENT,
} from "../../../../shared/editorSchema";

/** Font names stay stable in documents; this is how each one is drawn. */
export const FONT_STACKS: Record<(typeof EDITOR_FONTS)[number], string> = {
  "Instrument Sans":
    '"Instrument Sans Variable", "Instrument Sans", sans-serif',
  "Instrument Serif": '"Instrument Serif", Georgia, serif',
  Arial: "Arial, Helvetica, sans-serif",
  Georgia: "Georgia, serif",
  "Times New Roman": '"Times New Roman", Times, serif',
  Verdana: "Verdana, Geneva, sans-serif",
  "Courier New": '"Courier New", Courier, monospace',
};

const fontFromCss = (css: string) => {
  const first = css.split(",")[0]?.replace(/["']/g, "").trim().toLowerCase();
  return (
    EDITOR_FONTS.find((font) => first?.startsWith(font.toLowerCase())) ?? null
  );
};

const BLOCKS = ["paragraph", "heading"];
const INDENT_EM = 2;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    editorFormat: {
      setFont: (font: (typeof EDITOR_FONTS)[number] | null) => ReturnType;
      setLineHeight: (lineHeight: string | null) => ReturnType;
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

/** Changes paragraph attributes of every block in the selection. */
const updateBlocks =
  (change: (attrs: Record<string, unknown>) => Record<string, unknown>) =>
  ({ tr, state, dispatch }: CommandProps) => {
    const { from, to } = state.selection;
    let changed = false;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!BLOCKS.includes(node.type.name)) return;
      changed = true;
      if (dispatch) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          ...change(node.attrs),
        });
      }
    });
    return changed;
  };

const clampIndent = (value: number) =>
  Math.max(0, Math.min(MAX_INDENT, value)) || null;

/**
 * Word-like formatting not covered by Tiptap's own extensions: a fixed list
 * of fonts, paragraph line spacing and paragraph indentation.
 */
const EditorFormat = Extension.create({
  name: "editorFormat",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => fontFromCss(element.style.fontFamily),
            renderHTML: ({ fontFamily }) =>
              fontFamily
                ? {
                    style: `font-family: ${FONT_STACKS[fontFamily as keyof typeof FONT_STACKS]}`,
                  }
                : {},
          },
        },
      },
      {
        types: BLOCKS,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) =>
              LINE_HEIGHTS.find(
                (value) => value === element.style.lineHeight,
              ) ?? null,
            renderHTML: ({ lineHeight }) =>
              lineHeight ? { style: `line-height: ${lineHeight}` } : {},
          },
          indent: {
            default: null,
            parseHTML: (element) => {
              const em = /^([\d.]+)em$/.exec(element.style.marginLeft)?.[1];
              return em
                ? clampIndent(Math.round(Number(em) / INDENT_EM))
                : null;
            },
            renderHTML: ({ indent }) =>
              indent
                ? { style: `margin-left: ${Number(indent) * INDENT_EM}em` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFont:
        (font) =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontFamily: font })
            .removeEmptyTextStyle()
            .run(),
      setLineHeight: (lineHeight) => updateBlocks(() => ({ lineHeight })),
      // Inside a list, indenting nests the item as Word does.
      indent: () => (props) =>
        props.editor.isActive("listItem")
          ? props.commands.sinkListItem("listItem")
          : updateBlocks((attrs) => ({
              indent: clampIndent(Number(attrs.indent ?? 0) + 1),
            }))(props),
      outdent: () => (props) =>
        props.editor.isActive("listItem")
          ? props.commands.liftListItem("listItem")
          : updateBlocks((attrs) => ({
              indent: clampIndent(Number(attrs.indent ?? 0) - 1),
            }))(props),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      "Shift-Tab": () => this.editor.commands.outdent(),
    };
  },
});

/** The same extensions draw the editor and the printed document. */
export function createEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      link: false,
    }),
    TextStyle,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    TextAlign.configure({ types: BLOCKS }),
    CharacterCount,
    EditorFormat,
  ];
}
