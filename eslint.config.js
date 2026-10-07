import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const FECHAS_MSG = 'Usar src/utils/fechas.js: las fechas de la clínica son hora de pared, no UTC'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Las fechas de la clínica son hora de pared: convertirlas a UTC
    // las desplaza (-6 h en Managua). Todo pasa por src/utils/fechas.js.
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-properties': ['error',
        ...['toISOString', 'getUTCHours', 'getUTCDate'].map((property) => ({
          property,
          message: FECHAS_MSG,
        })),
        { object: 'Date', property: 'parse', message: FECHAS_MSG },
      ],
    },
  },
  {
    files: ['src/utils/fechas.js'],
    rules: { 'no-restricted-properties': 'off' },
  },
])
