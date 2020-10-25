module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jest/recommended',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: __dirname
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    camelcase: 'off',
    'default-param-last': 'off',
    'dot-notation': 'off',
    'no-dupe-class-members': 'off',
    'no-duplicate-imports': 'off',
    'no-invalid-this': 'off',
    'no-loop-func': 'off',
    'no-loss-of-precision': 'off',
    'no-redeclare': 'off',
    'no-return-await': 'off',
    'no-shadow': 'off',
    'no-unused-expressions': 'off',
    'no-use-before-define': 'off',
    'no-useless-constructor': 'off',
    '@typescript-eslint/array-type': ['error', { default: 'array' }],
    '@typescript-eslint/class-literal-property-style': ['error'],
    '@typescript-eslint/consistent-indexed-object-style': ['error'],
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' }
    ],
    '@typescript-eslint/default-param-last': ['error'],
    '@typescript-eslint/dot-notation': ['error'],
    '@typescript-eslint/explicit-function-return-type': ['error'],
    '@typescript-eslint/explicit-member-accessibility': ['error'],
    '@typescript-eslint/member-ordering': [
      'error',
      {
        default: [
          // Fields
          'public-static-field',
          'protected-static-field',
          'private-static-field',
          'public-decorated-field',
          'protected-decorated-field',
          'private-decorated-field',
          'public-instance-field',
          'protected-instance-field',
          'private-instance-field',
          'public-abstract-field',
          'protected-abstract-field',
          'private-abstract-field',

          // Constructors
          'public-constructor',
          'protected-constructor',
          'private-constructor',

          // Methods
          'public-static-method',
          'protected-static-method',
          'private-static-method',
          'public-decorated-method',
          'protected-decorated-method',
          'private-decorated-method',
          'public-abstract-method',
          'public-instance-method',
          'protected-abstract-method',
          'protected-instance-method',
          'private-abstract-method',
          'private-instance-method'
        ]
      }
    ],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
        trailingUnderscore: 'forbid'
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE']
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'property',
        modifiers: ['static'],
        format: ['UPPER_CASE']
      },
      {
        selector: 'typeLike',
        format: ['PascalCase']
      },
      {
        selector: 'variable',
        types: ['boolean'],
        format: ['PascalCase'],
        prefix: ['is', 'should', 'has', 'can', 'did', 'will']
      }
    ],
    '@typescript-eslint/no-base-to-string': ['error'],
    '@typescript-eslint/no-confusing-non-null-assertion': ['error'],
    '@typescript-eslint/no-dupe-class-members': ['error'],
    '@typescript-eslint/no-duplicate-imports': ['error'],
    '@typescript-eslint/no-dynamic-delete': ['error'],
    '@typescript-eslint/no-extraneous-class': ['error', { allowStaticOnly: true }],
    '@typescript-eslint/no-implicit-any-catch': ['error'],
    '@typescript-eslint/no-invalid-this': ['error'],
    '@typescript-eslint/no-invalid-void-type': ['error'],
    '@typescript-eslint/no-loop-func': ['error'],
    '@typescript-eslint/no-loss-of-precision': ['error'],
    '@typescript-eslint/no-parameter-properties': ['error'],
    '@typescript-eslint/no-redeclare': ['error'],
    '@typescript-eslint/no-require-imports': ['error'],
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/no-throw-literal': ['error'],
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': ['error'],
    '@typescript-eslint/no-unnecessary-condition': ['error'],
    '@typescript-eslint/no-unnecessary-qualifier': ['error'],
    '@typescript-eslint/no-unnecessary-type-arguments': ['error'],
    '@typescript-eslint/no-unused-expressions': ['error'],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/no-useless-constructor': ['error'],
    '@typescript-eslint/prefer-for-of': ['error'],
    '@typescript-eslint/prefer-function-type': ['error'],
    '@typescript-eslint/prefer-includes': ['error'],
    '@typescript-eslint/prefer-literal-enum-member': ['error'],
    '@typescript-eslint/prefer-nullish-coalescing': ['error'],
    '@typescript-eslint/prefer-optional-chain': ['error'],
    '@typescript-eslint/prefer-readonly': ['error'],
    // '@typescript-eslint/prefer-readonly-parameter-types': ['error'],
    '@typescript-eslint/prefer-reduce-type-parameter': ['error'],
    '@typescript-eslint/prefer-string-starts-ends-with': ['error'],
    '@typescript-eslint/prefer-ts-expect-error': ['error'],
    '@typescript-eslint/promise-function-async': ['error'],
    '@typescript-eslint/require-array-sort-compare': ['error'],
    '@typescript-eslint/return-await': 'error',
    '@typescript-eslint/strict-boolean-expressions': ['error'],
    '@typescript-eslint/switch-exhaustiveness-check': ['error'],
    '@typescript-eslint/typedef': ['error'],
    '@typescript-eslint/unified-signatures': ['error'],
    'sort-imports': ['error']
  }
};
