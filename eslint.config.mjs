import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      ".venv/**",
      "venv/**",
      "env/**",
      "**/__pycache__/**",
      "**/*.py",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Console
        console: "readonly",
        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        NodeJS: "readonly",
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        // Web APIs
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        RequestInit: "readonly",
        RequestInfo: "readonly",
        Headers: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        // Timers
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Abort
        AbortController: "readonly",
        AbortSignal: "readonly",
        // Notifications
        Notification: "readonly",
        NotificationPermission: "readonly",
        // WebSocket
        WebSocket: "readonly",
        // EventSource
        EventSource: "readonly",
        // Broadcast Channel
        BroadcastChannel: "readonly",
        StorageEvent: "readonly",
        // Storage
        Storage: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        // Blob and File
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        // Media
        HTMLAudioElement: "readonly",
        Audio: "readonly",
        // Base64
        btoa: "readonly",
        atob: "readonly",
        // Crypto
        crypto: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        // React
        React: "readonly",
        // DOM types
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLTableElement: "readonly",
        HTMLTableSectionElement: "readonly",
        HTMLTableRowElement: "readonly",
        HTMLTableCellElement: "readonly",
        HTMLTableCaptionElement: "readonly",
        HTMLParagraphElement: "readonly",
        HTMLHeadingElement: "readonly",
        HTMLSpanElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLOptionElement: "readonly",
        HTMLAnchorElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLVideoElement: "readonly",
        HTMLIFrameElement: "readonly",
        Element: "readonly",
        Document: "readonly",
        Window: "readonly",
        Event: "readonly",
        // Intersection Observer
        IntersectionObserver: "readonly",
        IntersectionObserverEntry: "readonly",
        // Performance
        performance: "readonly",
        Performance: "readonly",
        // Media Queries
        MediaQueryList: "readonly",
        MediaQueryListEvent: "readonly",
        WindowEventMap: "readonly",
        // WebAuthn
        PublicKeyCredential: "readonly",
        AuthenticatorAttestationResponse: "readonly",
        AuthenticatorTransport: "readonly",
        PublicKeyCredentialCreationOptions: "readonly",
        PublicKeyCredentialRequestOptions: "readonly",
        PublicKeyCredentialRpEntity: "readonly",
        PublicKeyCredentialUserEntity: "readonly",
        PublicKeyCredentialParameters: "readonly",
        AttestationConveyancePreference: "readonly",
        PublicKeyCredentialDescriptor: "readonly",
        AuthenticatorSelectionCriteria: "readonly",
        AuthenticationExtensionsClientInputs: "readonly",
        Credential: "readonly",
        BufferSource: "readonly",
        // WebGL
        WebGLRenderingContext: "readonly",
        // Service Worker
        ServiceWorkerRegistration: "readonly",
        MessageChannel: "readonly",
        // Image
        Image: "readonly",
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "@typescript-eslint": typescriptEslint,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Disable base no-unused-vars in favor of TypeScript version
      "no-unused-vars": "off",
      // Disable no-undef for TypeScript files since TypeScript handles type checking
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Allow lexical declarations in case blocks
      "no-case-declarations": "off",
      // Allow styled-jsx properties
      "react/no-unknown-property": ["error", { ignore: ["jsx", "global"] }],
      // Prevent importing old/deprecated files
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/*.old.*", "**/*.old"],
              message: "ملفات .old.* غير موجودة وقد تسبب أخطاء. استخدم الملفات الحالية فقط. / .old.* files do not exist and will cause errors. Use current files only.",
            },
          ],
        },
      ],
    },
  },
  // Jest globals for test files
  {
    files: ["**/*.test.{js,jsx,ts,tsx}", "**/*.spec.{js,jsx,ts,tsx}", "**/tests/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        vitest: "readonly",
        // Browser globals for jsdom environment
        WebSocket: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Headers: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        DOMException: "readonly",
        // DOM types
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLDivElement: "readonly",
        Element: "readonly",
        Document: "readonly",
        Window: "readonly",
      },
    },
    rules: {
      // Disable base no-unused-vars in favor of TypeScript version
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
