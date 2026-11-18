import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["out/", "release/", "coverage/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: [
      "src/main/**/*.ts",
      "src/preload/**/*.ts",
      "*.config.ts",
      "scripts/**/*.mjs",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // A promise nobody awaits or catches fails silently.
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.web.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended],
  },
);
