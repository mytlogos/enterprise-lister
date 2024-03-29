/*
👋 Hi! This file was autogenerated by tslint-to-eslint-config.
https://github.com/typescript-eslint/tslint-to-eslint-config

It represents the closest reasonable ESLint configuration to this
project's original TSLint configuration.

We recommend eventually switching this configuration to extend from
the recommended rulesets in typescript-eslint. 
https://github.com/typescript-eslint/tslint-to-eslint-config/blob/master/docs/FAQs.md

Happy linting! 💖
*/
module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": false
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:vue/vue3-recommended",
        "@vue/eslint-config-standard-with-typescript",
        "plugin:prettier/recommended"
    ],
    "parser": "vue-eslint-parser",
    "parserOptions": {
        "parser": "@typescript-eslint/parser",
        "project": "tsconfig.json",
        "sourceType": "module",
        "extraFileExtensions": [ ".vue" ]
    },
    "plugins": [
        "eslint-plugin-import",
        "eslint-plugin-jsdoc",
        "eslint-plugin-prefer-arrow",
        "eslint-plugin-promise",
        "eslint-plugin-node",
        "eslint-plugin-vue",
        "@typescript-eslint",
        "vue",
        "prettier"
    ],

    "rules": {
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/adjacent-overload-signatures": "warn",
        "@typescript-eslint/array-type": [
            "warn",
            {
                "default": "array-simple"
            }
        ],
        "@typescript-eslint/ban-types": [
            "warn",
            {
                "types": {
                    "Object": {
                        "message": "Avoid using the `Object` type. Did you mean `object`?"
                    },
                    "Function": {
                        "message": "Avoid using the `Function` type. Prefer a specific function type, like `() => void`."
                    },
                    "Boolean": {
                        "message": "Avoid using the `Boolean` type. Did you mean `boolean`?"
                    },
                    "Number": {
                        "message": "Avoid using the `Number` type. Did you mean `number`?"
                    },
                    "String": {
                        "message": "Avoid using the `String` type. Did you mean `string`?"
                    },
                    "Symbol": {
                        "message": "Avoid using the `Symbol` type. Did you mean `symbol`?"
                    }
                }
            }
        ],
        "@typescript-eslint/consistent-type-assertions": "warn",
        "@typescript-eslint/consistent-type-definitions": "warn",
        "@typescript-eslint/dot-notation": "warn",
        "@typescript-eslint/explicit-member-accessibility": [
            "warn",
            {
                "accessibility": "explicit"
            }
        ],
        "@typescript-eslint/member-delimiter-style": [
            "warn",
            {
                "multiline": {
                    "delimiter": "semi",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/quotes": [
            "warn",
            "double"
        ],
        indent: [
            2,
            2,
            { SwitchCase: 1}
        ],
        'no-console': 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'vue/multi-word-component-names': 'off', // TODO: address this rule and remove this override
        'vue/no-deprecated-router-link-tag-prop': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/explicit-function-return-type': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/prefer-nullish-coalescing': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/restrict-plus-operands': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/strict-boolean-expressions': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/method-signature-style': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/promise-function-async': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/no-floating-promises': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/return-await': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/no-misused-promises': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/no-dynamic-delete': 'off', // TODO: address this rule and remove this override
        '@typescript-eslint/return-await': 'off', // TODO: address this rule and remove this override
    },
};
