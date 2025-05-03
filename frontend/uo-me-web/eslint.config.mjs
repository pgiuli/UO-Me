import { FlatCompat } from '@eslint/eslintrc';

// import.meta.dirname is available after Node.js v20.11.0
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ['next'],
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  }),
];

export default eslintConfig;
