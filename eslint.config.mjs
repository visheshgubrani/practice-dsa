import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The markdown renderer maps elements with `{ node: _node, ...props }`
      // to keep react-markdown's AST node out of the DOM, which is exactly the
      // rest-sibling pattern this option covers.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated monaco assets, copied from node_modules.
    "public/monaco/**",
  ]),
]);

export default eslintConfig;
