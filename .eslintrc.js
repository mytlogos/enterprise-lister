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
        "@vue/typescript/recommended"
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
        "@typescript-eslint",
        "@typescript-eslint/tslint",
        "vue"
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
        "indent": [
            "error",
            4
        ],
        // "vue/comment-directive": "error",
        // "vue/custom-event-name-casing": "error",
        // "vue/experimental-script-setup-vars": "error",
        // "vue/jsx-uses-vars": "error",
        // "vue/no-arrow-functions-in-watch": "error",
        // "vue/no-async-in-computed-properties": "error",
        // "vue/no-custom-modifiers-on-v-model": "error",
        // "vue/no-dupe-keys": "error",
        // "vue/no-dupe-v-else-if": "error",
        // "vue/no-duplicate-attributes": "error",
        // "vue/no-multiple-template-root": "error",
        // "vue/no-mutating-props": "error",
        // "vue/no-parsing-error": "error",
        // "vue/no-reserved-keys": "error",
        // "vue/no-shared-component-data": "error",
        // "vue/no-side-effects-in-computed-properties": "error",
        // "vue/no-template-key": "error",
        // "vue/no-textarea-mustache": "error",
        // "vue/no-unused-components": "error",
        // "vue/no-unused-vars": "error",
        // "vue/no-use-v-if-with-v-for": "error",
        // "vue/no-v-for-template-key": "error",
        // "vue/no-v-model-argument": "error",
        // "vue/require-component-is": "error",
        // "vue/require-prop-type-constructor": "error",
        // "vue/require-render-return": "error",
        // "vue/require-v-for-key": "error",
        // "vue/require-valid-default-prop": "error",
        // "vue/return-in-computed-property": "error",
        // "vue/use-v-on-exact": "error",
        // "vue/valid-template-root": "error",
        // "vue/valid-v-bind": "error",
        // "vue/valid-v-bind-sync": "error",
        // "vue/valid-v-cloak": "error",
        // "vue/valid-v-else": "error",
        // "vue/valid-v-else-if": "error",
        // "vue/valid-v-for": "error",
        // "vue/valid-v-html": "error",
        // "vue/valid-v-if": "error",
        // "vue/valid-v-model": "error",
        // "vue/valid-v-on": "error",
        // "vue/valid-v-once": "error",
        // "vue/valid-v-pre": "error",
        // "vue/valid-v-show": "error",
        // "vue/valid-v-slot": "error",
        // "vue/valid-v-text": "error",
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
    },
};