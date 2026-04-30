import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-shot Drupal → Supabase migration scripts (Node CommonJS, not runtime)
    "scripts/**",
    // Generated Supabase types
    "src/lib/supabase/types.ts",
    // Vendored / minified third-party assets (e.g. pdfjs-dist worker copy)
    "public/**",
  ]),
  {
    rules: {
      // Project convention (.claude/rules/conventions.md): postgrest-js v2.95.3
      // requires `as any` casts on query builders/results to work around broken
      // type inference. Surface as warning, not error.
      "@typescript-eslint/no-explicit-any": "warn",
      // React Compiler advisories — many are valid patterns (subscriptions,
      // debouncers, optional manual memoization). Keep them visible as
      // warnings instead of failing CI on them.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
