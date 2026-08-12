/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_FEEDBACK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Injected via vite.config.ts's `define`, resolved at build time from `git rev-parse`.
declare const __GIT_SHA__: string

// Non-standard, not part of TS's DOM lib, but supported widely enough to be worth
// typing narrowly rather than reaching for `any` at the one call site that needs it.
interface NetworkInformation {
  readonly effectiveType?: string
}

interface Navigator {
  readonly connection?: NetworkInformation
}
