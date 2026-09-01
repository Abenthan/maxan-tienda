import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Providers de contexto + hooks de uso (patrón estándar de react-refresh):
    // un archivo de contexto exporta el Provider y su useXxxHook, lo que rompe
    // la regla only-export-components. Se permite expresamente para context/.
    files: ['**/context/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
