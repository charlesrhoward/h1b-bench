import webConfig from './web/eslint.config.mjs';

const config = [
  ...webConfig,
  { settings: { next: { rootDir: 'web/' }, react: { version: '19.2' } } },
  { ignores: ['web/.next/**', 'web/out/**', 'web/build/**', 'web/next-env.d.ts'] },
];
export default config;
