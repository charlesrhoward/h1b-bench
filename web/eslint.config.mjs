import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import { sharedRules } from "./eslint.shared-rules.mjs";

const WARN_LEVELS = new Set(["warn", 1]);

/** Raise every rule left at "warn" to "error", presets and local rules alike. No rule may only warn. */
function promoteWarnings(configs) {
  return configs.map((config) => {
    if (!config.rules) return config;
    const rules = Object.fromEntries(
      Object.entries(config.rules).map(([name, setting]) => {
        const [level, ...options] = Array.isArray(setting) ? setting : [setting];
        return [name, WARN_LEVELS.has(level) ? ["error", ...options] : setting];
      }),
    );
    return { ...config, rules };
  });
}

const eslintConfig = defineConfig(promoteWarnings([
  ...nextVitals,
  ...nextTs,
  {
    // No per-file or per-line escapes: inline eslint comments are ignored and reported.
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
    plugins: { "eslint-comments": eslintComments },
    rules: {
      ...sharedRules,
      "eslint-comments/no-use": ["error", { allow: [] }],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": true, "ts-check": false },
      ],
    },
  },
  // Generated output only. Never add source paths here.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]));

export default eslintConfig;
