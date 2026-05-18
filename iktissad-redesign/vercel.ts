/**
 * Vercel project configuration (typed).
 *
 * This file documents the intended Vercel deployment shape with TypeScript so
 * the values get linted/type-checked alongside the rest of the codebase. It is
 * intentionally a thin file: headers, redirects, rewrites, and image optimisation
 * all live in `next.config.ts` where Next.js owns them — duplicating them here
 * would create drift.
 *
 * Vercel still primarily reads `vercel.json` at the repo/project root. For the
 * monorepo layout used by this project, the root `vercel.json` (at the worktree
 * root, one directory up) handles the `cd iktissad-redesign && npm run build`
 * dance. If Vercel is ever re-linked to this subdirectory directly, the sibling
 * `vercel.json` next to this file will be picked up automatically.
 *
 * The type below is a hand-rolled subset matching the official `@vercel/config`
 * shape. We avoid taking `@vercel/config` as a dependency because (a) it would
 * add weight for a single config file, and (b) the per-constraint instruction
 * was to keep Vercel tooling out of the runtime dep tree.
 *
 * @see https://vercel.com/docs/projects/project-configuration
 * @see https://www.npmjs.com/package/@vercel/config — official typed shape
 */

type VercelFramework = "nextjs" | "remix" | "astro" | "sveltekit" | string;

interface VercelConfig {
  /** Framework preset Vercel should apply (build tooling, routing defaults). */
  framework?: VercelFramework;
  /** Override the default build command. */
  buildCommand?: string;
  /** Override the default install command. */
  installCommand?: string;
  /** Override the default dev command for `vercel dev`. */
  devCommand?: string;
  /** Directory (relative to project root) containing the built output. */
  outputDirectory?: string;
  /** Public env vars exposed to the build only. Runtime env stays in the Vercel UI. */
  env?: Record<string, string>;
}

const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "npm run build",
};

export default config;
