import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import tslint from 'typescript-eslint';

export default tslint.config(
  {
    extends: [eslint.configs.recommended, ...tslint.configs.recommendedTypeChecked, prettier],
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.eslint.json',
      },
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [tslint.configs.disableTypeChecked],
  },
);
