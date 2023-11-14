module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    'jest': true,
  },
  extends: 'eslint:recommended',
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    indent: ['error', 2],
    eqeqeq: 'error',
    'no-trailing-spaces': 'error',
    'object-curly-spacing': ['error', 'always'],
    'no-console': 0,
    'arrow-spacing': ['error', { before: true, after: true }],
    'linebreak-style': ['error', 'windows'],
    quotes: ['error', 'single']
    //semi: ['error', 'never'],
  },
}
