module.exports = {
    extends: ['prettier', 'eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module'
    },
    plugins: ['@typescript-eslint/eslint-plugin', 'eslint-plugin-jest'],
    root: true,
    env: {
        es6: true,
        browser: true,
        node: true,
        'jest/globals': true
    },
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
    },
    ignorePatterns: ['.eslintrc.js'],
    rules: {
        'no-async-promise-executor': ['error'],
        'no-await-in-loop': ['error'],
        'no-template-curly-in-string': ['error'],
        'array-callback-return': ['off'],
        'block-scoped-var': ['error'],
        curly: ['error', 'all'],
        'dot-location': ['error', 'property'],
        'dot-notation': ['error'],
        eqeqeq: ['error', 'always'],
        'guard-for-in': ['error'],
        'max-classes-per-file': ['error', 1],
        'no-alert': ['error'],
        'no-caller': ['error'],
        'no-console': ['error'],
        'no-div-regex': ['error'],
        'no-else-return': ['error', { allowElseIf: true }],
        'no-eval': ['error'],
        'no-empty': ['error', { allowEmptyCatch: true }],
        'no-extend-native': ['error'],
        'no-extra-bind': ['error'],
        'no-fallthrough': ['error'],
        'no-floating-decimal': ['error'],
        'no-implicit-coercion': ['error'],
        'no-implied-eval': ['error'],
        'no-invalid-this': ['off'], // see @typescript-eslint/no-invalid-this
        'no-iterator': ['error'],
        'no-lone-blocks': ['error'],
        'no-loop-func': ['error'],
        'no-multi-spaces': ['error'],
        'no-multi-str': ['error'],
        'no-new-func': ['error'],
        'no-new-wrappers': ['error'],
        'no-octal-escape': ['error'],
        'no-proto': ['error'],
        'no-redeclare': ['off'], // see @typescript-eslint/no-redeclare
        'no-return-assign': ['error', 'always'],
        'no-return-await': ['error'],
        'no-script-url': ['error'],
        'no-self-assign': ['error'],
        'no-self-compare': ['error'],
        'no-sequences': ['error'],
        'no-throw-literal': ['error'],
        'no-unmodified-loop-condition': ['error'],
        'no-unused-expressions': ['off'], // see @typescript-eslint/no-unused-expressions
        'no-unused-vars': ['off'], // see @typescript-eslint/no-unused-vars
        'no-useless-call': ['error'],
        'no-useless-concat': ['error'],
        'no-useless-constructor': ['off'], // see @typescript-eslint/no-useless-constructor
        'no-void': ['error'],
        'no-with': ['error'],
        radix: ['error', 'always'],
        'require-await': ['off'], // see @typescript-eslint/require-await
        'wrap-iife': ['error', 'inside'],
        yoda: ['error'],
        'no-label-var': ['error'],
        'no-shadow': ['off'],
        'no-shadow-restricted-names': ['error'],
        'no-use-before-define': ['off'], // see @typescript-eslint/no-use-before-define
        'no-path-concat': ['error'],

        /* Stylistic */
        'no-extra-parens': ['off'],
        'no-extra-semi': ['off'], // see @typescript-eslint/no-extra-semi

        /* ECMAScript 6 */
        'arrow-parens': ['error', 'always'],
        'arrow-spacing': ['error', { before: true, after: true }],
        'generator-star-spacing': ['error', { before: false, after: true }],
        'no-duplicate-imports': ['error', { includeExports: true }],
        'no-useless-computed-key': ['error'],
        'no-useless-rename': ['error'],
        'no-var': ['error'],
        'object-shorthand': ['error', 'always'],
        'prefer-const': ['error'],
        'prefer-rest-params': ['error'],
        'prefer-spread': ['error'],
        'prefer-template': ['error'],
        quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
        'rest-spread-spacing': ['error', 'never'],
        'template-curly-spacing': ['error'],
        'yield-star-spacing': ['error', { before: true, after: false }],

        /* Typescript */
        '@typescript-eslint/adjacent-overload-signatures': ['error'],
        '@typescript-eslint/array-type': ['error', { default: 'array-simple', readonly: 'array-simple' }],
        '@typescript-eslint/await-thenable': ['error'],
        '@typescript-eslint/naming-convention': [
            'error',
            {
                selector: 'default',
                format: ['camelCase']
            },
            {
                selector: 'variable',
                format: ['camelCase', 'UPPER_CASE', 'PascalCase']
            },
            {
                selector: ['function'],
                format: ['camelCase', 'PascalCase']
            },
            {
                selector: 'parameter',
                format: ['camelCase', 'PascalCase']
            },
            {
                selector: ['objectLiteralProperty', 'objectLiteralMethod'],
                format: []
            },
            {
                selector: 'typeProperty',
                format: []
            },
            {
                selector: 'typeLike',
                format: ['PascalCase']
            },
            {
                selector: 'enum',
                format: ['PascalCase', 'UPPER_CASE']
            },
            {
                selector: 'enumMember',
                format: ['camelCase', 'PascalCase', 'UPPER_CASE']
            },
            {
                selector: 'interface',
                format: ['PascalCase'],
                custom: {
                    regex: '^I[A-Z]',
                    match: true
                }
            }
        ],
        '@typescript-eslint/ban-ts-comment': ['off'],
        '@typescript-eslint/consistent-type-assertions': [
            'error',
            { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow-as-parameter' }
        ],
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
        '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
        '@typescript-eslint/explicit-module-boundary-types': [
            'error',
            {
                allowArgumentsExplicitlyTypedAsAny: true
            }
        ],
        '@typescript-eslint/member-delimiter-style': [
            'error',
            {
                multiline: {
                    delimiter: 'semi',
                    requireLast: true
                },
                singleline: {
                    delimiter: 'semi',
                    requireLast: false
                }
            }
        ],
        '@typescript-eslint/no-extra-parens': ['off'],
        '@typescript-eslint/no-extra-semi': ['error'],
        '@typescript-eslint/no-floating-promises': ['off'],
        '@typescript-eslint/no-empty-interface': ['off'],
        '@typescript-eslint/no-explicit-any': ['off'],
        '@typescript-eslint/no-shadow': ['error'],
        '@typescript-eslint/no-inferrable-types': [
            'error',
            {
                ignoreParameters: true,
                ignoreProperties: true
            }
        ],
        '@typescript-eslint/no-invalid-this': ['error'],
        '@typescript-eslint/no-redeclare': ['error', { ignoreDeclarationMerge: true }],
        '@typescript-eslint/no-non-null-assertion': ['off'],
        '@typescript-eslint/no-misused-new': ['error'],
        '@typescript-eslint/no-misused-promises': [
            'error',
            {
                checksVoidReturn: false
            }
        ],
        '@typescript-eslint/no-parameter-properties': ['off'],
        '@typescript-eslint/no-unnecessary-type-assertion': ['error'],
        '@typescript-eslint/no-unused-expressions': ['error'],
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                vars: 'all',
                args: 'after-used',
                ignoreRestSiblings: false
            }
        ],
        '@typescript-eslint/no-use-before-define': [
            'error',
            {
                variables: true,
                functions: false,
                classes: true,
                enums: true,
                typedefs: true
            }
        ],
        '@typescript-eslint/no-useless-constructor': ['error'],
        '@typescript-eslint/promise-function-async': [
            'error',
            {
                checkArrowFunctions: true,
                checkFunctionDeclarations: true,
                checkFunctionExpressions: true,
                checkMethodDeclarations: true
            }
        ],
        '@typescript-eslint/require-await': ['error'],
        '@typescript-eslint/restrict-plus-operands': ['error'],
        '@typescript-eslint/typedef': [
            'error',
            {
                arrayDestructuring: false,
                arrowParameter: true,
                memberVariableDeclaration: false,
                objectDestructuring: false,
                parameter: true,
                propertyDeclaration: true,
                variableDeclaration: false,
                variableDeclarationIgnoreFunction: false
            }
        ],
        '@typescript-eslint/unified-signatures': ['error'],

        /* Jest */
        'jest/consistent-test-it': ['error', { fn: 'test' }],
        'jest/expect-expect': ['error'],
        'jest/no-disabled-tests': ['error'],
        'jest/no-focused-tests': ['error'],
        'jest/no-identical-title': ['error'],
        'jest/no-jasmine-globals': ['error'],
        'jest/no-jest-import': ['error'],
        'jest/no-test-prefixes': ['error'],
        'jest/no-test-return-statement': ['error'],
        'jest/prefer-to-be': ['error'],
        'jest/prefer-to-have-length': ['error'],
        'jest/valid-describe-callback': ['error'],
        'jest/valid-expect-in-promise': ['error'],
        'jest/valid-expect': ['error']
    }
};
