import { mergeAttributes } from "@tiptap/core";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import {
  ARTWORK_IMAGE_SRC,
  DOCUMENT_ASSET_SRC,
  IMAGE_ALIGNS,
} from "../../../../shared/editorSchema";
import {
  documentFileUrl,
  MEDIA_SCHEME,
  thumbnailUrl,
} from "../../../../shared/media";

/** Where the app serves an image a document refers to. */
export function imageUrl(src: string): string | null {
  const artwork = ARTWORK_IMAGE_SRC.exec(src)?.[1];
  if (artwork) return thumbnailUrl(artwork);
  const asset = DOCUMENT_ASSET_SRC.exec(src)?.[1];
  return asset ? documentFileUrl(asset) : null;
}

/** The reverse of `imageUrl`, for images copied inside the app. */
export function imageSrcFromUrl(url: string): string | null {
  const prefix = `${MEDIA_SCHEME}://`;
  if (!url.startsWith(prefix)) return null;
  const [kind, file = ""] = url.slice(prefix.length).split("/");
  const src =
    kind === "thumbnails"
      ? `artwork-image:${file.replace(/\.webp$/, "")}`
      : kind === "documents"
        ? `document-asset:${file}`
        : null;
  return src && imageUrl(src) ? src : null;
}

const INLINE_IMAGE =
  /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;

/** A picture carried inside a previewed file, or null for anything else. */
export function inlineImageSrc(url: string): string | null {
  return INLINE_IMAGE.test(url) ? url : null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: { setPageBreak: () => ReturnType };
    documentImage: {
      setImageAlign: (align: (typeof IMAGE_ALIGNS)[number]) => ReturnType;
    };
  }
}

/**
 * Images of artworks or copied into the document. Images pasted from
 * elsewhere are left out: a document only shows what the app keeps.
 */
export const DocumentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) =>
          imageSrcFromUrl(element.getAttribute("src") ?? ""),
        renderHTML: ({ src }) => ({ src: imageUrl(String(src)) ?? "" }),
      },
      align: {
        default: null,
        parseHTML: (element) =>
          IMAGE_ALIGNS.find((align) => align === element.dataset.align) ?? null,
        renderHTML: ({ align }) => (align ? { "data-align": align } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) =>
          imageSrcFromUrl(element.getAttribute("src") ?? "") ? null : false,
      },
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { align }),
    };
  },
}).configure({
  resize: {
    enabled: true,
    directions: ["bottom-right", "bottom-left"],
    minWidth: 40,
    minHeight: 40,
    alwaysPreserveAspectRatio: true,
  },
});

/**
 * Starts a new page in the PDF and when printing. Built on the horizontal
 * rule, which already leaves the cursor after it in a new paragraph.
 */
export const PageBreak = HorizontalRule.extend({
  name: "pageBreak",

  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-page-break": "",
        class: "page-break",
      }),
    ];
  },

  addCommands() {
    const parent = this.parent?.();
    return {
      setPageBreak: () => (props) =>
        parent?.setHorizontalRule?.()(props) ?? false,
    };
  },

  addInputRules() {
    return [];
  },

  addKeyboardShortcuts() {
    return { "Mod-Enter": () => this.editor.commands.setPageBreak() };
  },
});

/**
 * Only for looking at a file read from outside: its pictures travel inside
 * the HTML instead of being stored by the app.
 */
export const InlineImage = DocumentImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) =>
          inlineImageSrc(element.getAttribute("src") ?? ""),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) =>
          inlineImageSrc(element.getAttribute("src") ?? "") ? null : false,
      },
    ];
  },
});
