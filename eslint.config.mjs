import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["out/", "release/", "coverage/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts", "*.config.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended],
  },
);
