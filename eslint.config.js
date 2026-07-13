import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import stylistic from "@stylistic/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";

const localRules = {
    rules: {
        "single-line-imports": {
            meta: {
                type: "layout",
                docs: {
                    description: "Enforce import declarations on a single line",
                },
                schema: [],
                fixable: "whitespace",
                messages: {
                    singleLineImport: "Import declarations must stay on a single line.",
                },
            },
            create(context)
            {
                const sourceCode = context.getSourceCode();

                return {
                    ImportDeclaration(node)
                    {
                        if (!node.loc || node.loc.start.line === node.loc.end.line) return;

                        context.report({
                            node,
                            messageId: "singleLineImport",
                            fix(fixer)
                            {
                                const importText = sourceCode.getText(node);
                                const fixed = importText.replace(/\s+/g, " ").trim();

                                return fixer.replaceText(node, fixed);
                            },
                        });
                    },
                };
            },
        },
    },
};

export default [
    {
        ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
    },
    js.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            globals: {
                ...globals.node,
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            "@stylistic": stylistic,
            "simple-import-sort": simpleImportSort,
            "local": localRules,
            "unicorn": eslintPluginUnicorn,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            "no-undef": "off",
            "no-redeclare": "off",
            "@typescript-eslint/no-redeclare": "error",
            "curly": "warn",
            "eqeqeq": "warn",
            "no-dupe-keys": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/consistent-type-imports": ["error", {
                prefer: "type-imports",
                fixStyle: "separate-type-imports",
            }],
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            }],
            "@typescript-eslint/no-unused-expressions": ["error", {
                allowShortCircuit: true,
            }],
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],
            "local/single-line-imports": "error",
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "unicorn/filename-case": ["error", { case: "kebabCase" }],
            "max-lines": ["warn", { max: 2000, skipBlankLines: true, skipComments: true }],
            "@stylistic/brace-style": ["error", "allman", { allowSingleLine: true }],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/indent": ["error", 4],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/semi": ["error", "always"],
        },
    },
    {
        files: ["frontend/**/*.{ts,tsx}"],
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: reactHooks.configs["recommended-latest"].rules,
    },
    {
        files: ["frontend/**/*.js"],
        languageOptions: {
            parser: tsParser,
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            }],
        },
    },
    {
        files: ["**/*.mjs", "**/*.cjs", "**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];
