import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface FindOptions {
  caseSensitive: boolean;
}

export interface Match {
  from: number;
  to: number;
}

/** Folds one character the way the search compares it. */
const fold = (char: string, { caseSensitive }: FindOptions) => {
  const plain = char.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return caseSensitive ? plain : plain.toLocaleLowerCase("es");
};

/**
 * Finds `query` in every paragraph, ignoring accents and, unless asked,
 * case. A word split by formatting is still found; a match never spans two
 * paragraphs.
 */
export function findMatches(
  doc: ProseMirrorNode,
  query: string,
  options: FindOptions,
): Match[] {
  const needle = [...query].map((char) => fold(char, options)).join("");
  if (!needle) return [];
  const matches: Match[] = [];
  doc.descendants((block, blockPos) => {
    if (!block.isTextblock) return true;
    // Folded text of the paragraph, and the document position of each char.
    let text = "";
    const positions: number[] = [];
    block.forEach((child, offset) => {
      if (!child.isText) {
        text += "￼";
        positions.push(blockPos + 1 + offset);
        return;
      }
      [...(child.text ?? "")].forEach((char, index) => {
        const folded = fold(char, options);
        for (let i = 0; i < folded.length; i += 1) {
          positions.push(blockPos + 1 + offset + index);
        }
        text += folded;
      });
    });
    let index = text.indexOf(needle);
    while (index !== -1) {
      const last = positions[index + needle.length - 1]!;
      matches.push({ from: positions[index]!, to: last + 1 });
      index = text.indexOf(needle, index + needle.length);
    }
    return false;
  });
  return matches;
}

/** Replaces every match in one transaction, so one undo restores them all. */
export function replaceAllTr(
  state: EditorState,
  query: string,
  replacement: string,
  options: FindOptions,
): Transaction {
  const tr = state.tr;
  for (const { from, to } of findMatches(state.doc, query, options).reverse()) {
    if (replacement) tr.insertText(replacement, from, to);
    else tr.delete(from, to);
  }
  return tr;
}

interface SearchState {
  query: string;
  options: FindOptions;
  current: number;
  matches: Match[];
}

export const searchKey = new PluginKey<SearchState>("search");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    search: {
      setSearch: (query: string, options: FindOptions) => ReturnType;
      goToMatch: (step: 1 | -1) => ReturnType;
      replaceCurrent: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
    };
  }
}

const EMPTY: SearchState = {
  query: "",
  options: { caseSensitive: false },
  current: 0,
  matches: [],
};

/** Highlights matches and offers the find and replace commands. */
export const Search = Extension.create({
  name: "search",

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => EMPTY,
          apply: (tr, previous, _old, state) => {
            const meta = tr.getMeta(searchKey) as
              Partial<SearchState> | undefined;
            if (!meta && !tr.docChanged) return previous;
            const next = { ...previous, ...meta };
            const matches = findMatches(state.doc, next.query, next.options);
            const current = Math.min(
              next.current,
              Math.max(0, matches.length - 1),
            );
            return { ...next, matches, current };
          },
        },
        props: {
          decorations: (state) => {
            const search = searchKey.getState(state);
            if (!search?.matches.length) return null;
            return DecorationSet.create(
              state.doc,
              search.matches.map(({ from, to }, index) =>
                Decoration.inline(from, to, {
                  class:
                    index === search.current
                      ? "search-match search-match--current"
                      : "search-match",
                }),
              ),
            );
          },
        },
      }),
    ];
  },

  addCommands() {
    const stateOf = (editorState: EditorState) =>
      searchKey.getState(editorState) ?? EMPTY;
    return {
      setSearch:
        (query, options) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(searchKey, { query, options, current: 0 });
          return true;
        },
      goToMatch:
        (step) =>
        ({ state, tr, dispatch, view }) => {
          const { matches, current } = stateOf(state);
          if (matches.length === 0) return false;
          const next = (current + step + matches.length) % matches.length;
          const match = matches[next]!;
          if (dispatch) {
            tr.setMeta(searchKey, { current: next });
            tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
            tr.scrollIntoView();
            view.focus();
          }
          return true;
        },
      replaceCurrent:
        (replacement) =>
        ({ state, tr, dispatch }) => {
          const { matches, current } = stateOf(state);
          const match = matches[current];
          if (!match) return false;
          if (dispatch) {
            if (replacement) tr.insertText(replacement, match.from, match.to);
            else tr.delete(match.from, match.to);
          }
          return true;
        },
      replaceAll:
        (replacement) =>
        ({ state, tr, dispatch }) => {
          const { query, options, matches } = stateOf(state);
          if (matches.length === 0) return false;
          if (dispatch) {
            replaceAllTr(state, query, replacement, options).steps.forEach(
              (step) => tr.step(step),
            );
          }
          return true;
        },
    };
  },
});
