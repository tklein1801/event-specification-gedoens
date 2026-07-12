import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export function baseConfig(tsconfigRootDir = process.cwd()) {
  return tseslint.config(
    { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/.turbo/**'] },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parserOptions: { tsconfigRootDir },
      },
    },
  );
}
