import { Mark, mergeAttributes, Node, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface HeadingEntry {
  level: number;
  text: string;
  pos: number;
}

export interface FootnoteEntry {
  number: number;
  text: string;
  pos: number;
}

export function collectHeadings(doc: ProseMirrorNode): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      headings.push({
        level: Number(node.attrs.level),
        text: node.textContent,
        pos,
      });
      return false;
    }
    return true;
  });
  return headings;
}

/** Footnotes numbered 1, 2, 3… in the order they are read. */
export function numberFootnotes(doc: ProseMirrorNode): FootnoteEntry[] {
  const notes: FootnoteEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "footnote") {
      notes.push({
        number: notes.length + 1,
        text: String(node.attrs.text ?? ""),
        pos,
      });
    }
    return true;
  });
  return notes;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    structure: {
      insertTableOfContents: () => ReturnType;
      insertFootnote: (text: string) => ReturnType;
      updateFootnote: (pos: number, text: string) => ReturnType;
      setColumns: (count: 2 | 3) => ReturnType;
      unsetColumns: () => ReturnType;
      setComment: (id: string) => ReturnType;
      removeComment: (id: string) => ReturnType;
    };
  }
}

/** Lists the headings of the document; it follows every change. */
export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: "nav[data-table-of-contents]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "nav",
      mergeAttributes(HTMLAttributes, {
        "data-table-of-contents": "",
        class: "toc",
      }),
    ];
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement("nav");
      dom.className = "toc";
      dom.dataset.tableOfContents = "";
      dom.contentEditable = "false";
      const render = () => {
        const title = document.createElement("p");
        title.className = "toc__title";
        title.textContent = "Índice";
        const headings = collectHeadings(editor.state.doc);
        const list = document.createElement("ol");
        list.className = "toc__list";
        for (const heading of headings) {
          const item = document.createElement("li");
          item.className = `toc__item toc__item--${heading.level}`;
          item.textContent = heading.text || "(título vacío)";
          item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            editor
              .chain()
              .focus()
              .setTextSelection(heading.pos + 1)
              .scrollIntoView()
              .run();
          });
          list.append(item);
        }
        const empty = document.createElement("p");
        empty.className = "toc__empty";
        empty.textContent = "Los títulos del documento aparecerán aquí.";
        dom.replaceChildren(title, headings.length > 0 ? list : empty);
      };
      render();
      editor.on("update", render);
      return {
        dom,
        ignoreMutation: () => true,
        destroy: () => editor.off("update", render),
      };
    };
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name }, { type: "paragraph" }]),
    };
  },
});

const footnotesKey = new PluginKey("footnotes");

/** Builds the notes list shown at the end of the document. */
function notesList(notes: FootnoteEntry[]) {
  const section = document.createElement("section");
  section.className = "footnotes";
  section.contentEditable = "false";
  const title = document.createElement("p");
  title.className = "footnotes__title";
  title.textContent = "Notas";
  const list = document.createElement("ol");
  for (const note of notes) {
    const item = document.createElement("li");
    item.textContent = note.text;
    list.append(item);
  }
  section.append(title, list);
  return section;
}

/**
 * A note shown as a number in the text and listed at the end of the document,
 * also in the PDF, where Chromium cannot place notes at the foot of a page.
 */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-text") ?? "",
        renderHTML: ({ text }) => ({ "data-text": text, title: text }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-footnote]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(HTMLAttributes, {
        "data-footnote": "",
        class: "footnote",
      }),
    ];
  },

  addCommands() {
    return {
      insertFootnote:
        (text) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { text } }),
      updateFootnote:
        (pos, text) =>
        ({ tr, dispatch, state }) => {
          const node = state.doc.nodeAt(pos);
          if (node?.type.name !== this.name) return false;
          if (dispatch)
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, text });
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: footnotesKey,
        props: {
          decorations: (state) => {
            const notes = numberFootnotes(state.doc);
            if (notes.length === 0) return null;
            return DecorationSet.create(state.doc, [
              ...notes.map(({ pos, number }) =>
                Decoration.node(pos, pos + 1, {
                  "data-number": String(number),
                }),
              ),
              Decoration.widget(
                state.doc.content.size,
                () => notesList(notes),
                {
                  side: 1,
                  key: notes.map(({ text }) => text).join("\u0000"),
                },
              ),
            ]);
          },
        },
      }),
    ];
  },
});

/** A block of text set in two or three columns. */
export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (element) => (element.dataset.columns === "3" ? 3 : 2),
        renderHTML: ({ count }) => ({ "data-columns": String(count) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "columns" }), 0];
  },

  addCommands() {
    return {
      setColumns:
        (count) =>
        ({ editor, commands }) =>
          editor.isActive(this.name)
            ? commands.updateAttributes(this.name, { count })
            : commands.wrapIn(this.name, { count }),
      unsetColumns:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

/** Marks text that has a comment; the comment itself is kept apart. */
export const Comment = Mark.create({
  name: "comment",
  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: ({ id }) => ({ "data-comment-id": id }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "comment" }), 0];
  },

  addCommands() {
    return {
      setComment:
        (id) =>
        ({ commands }) =>
          commands.setMark(this.name, { id }),
      removeComment:
        (id) =>
        ({ tr, state, dispatch }) => {
          const type = state.schema.marks[this.name];
          if (!type) return false;
          state.doc.descendants((node, pos) => {
            const mark = node.marks.find(
              (candidate) =>
                candidate.type === type && candidate.attrs.id === id,
            );
            if (mark && dispatch) tr.removeMark(pos, pos + node.nodeSize, mark);
          });
          return true;
        },
    };
  },
});

/** Where the text of a comment is, to select it from the comments panel. */
export function commentRange(editor: Editor, id: string) {
  let from = -1;
  let to = -1;
  editor.state.doc.descendants((node, pos) => {
    if (
      node.marks.some(
        (mark) => mark.type.name === "comment" && mark.attrs.id === id,
      )
    ) {
      if (from < 0) from = pos;
      to = pos + node.nodeSize;
    }
  });
  return from < 0 ? null : { from, to };
}
