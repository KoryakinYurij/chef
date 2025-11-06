# Dependency Analysis

This document provides a detailed analysis of the project's dependencies, based on the `package.json` files in the monorepo.

## Root `package.json`

The main `package.json` file defines the core dependencies for the Remix frontend application and the development dependencies for the entire monorepo.

### Production Dependencies

**Key Technologies:**

*   **Remix (`@remix-run/*`)**: The core of the frontend application is built with Remix, using versions around `2.15.3`. This includes `@remix-run/node`, `@remix-run/react`, `@remix-run/serve`, and `@remix-run/server-runtime`.
*   **React (`react`, `react-dom`)**: The UI is built with React version `18.3.1`.
*   **Convex (`convex`)**: The backend and database are powered by Convex version `1.27.0`. Several Convex-related packages are used, such as `@convex-dev/ai-sdk-google`, `@convex-dev/design-system`, and `@convex-dev/rate-limiter`.
*   **AI SDK (`@ai-sdk/*`, `ai`)**: The project uses the Vercel AI SDK to interact with various language models. This includes specific packages for different providers like `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/anthropic`, etc.
*   **WebContainer (`@webcontainer/api`)**: The in-browser development environment is enabled by the WebContainer API version `1.5.1-internal.10`.
*   **Code Editor (`@codemirror/*`)**: The in-app code editor is built with CodeMirror 6, with various language packages (`@codemirror/lang-javascript`, `@codemirror/lang-python`, etc.) and themes.
*   **Terminal (`@xterm/*`)**: The in-app terminal is implemented using Xterm.js version `5.5.0`.
*   **Styling (`tailwindcss`, `framer-motion`)**: The UI is styled with Tailwind CSS, and animations are handled by Framer Motion.
*   **State Management (`@nanostores/react`)**: Nanostores is used for global state management in the React application.
*   **Authentication (`@workos-inc/authkit-react`)**: User authentication is handled by WorkOS AuthKit.

### Development Dependencies

*   **Vite (`vite`)**: The project uses Vite version `5.4.17` as the build tool for Remix.
*   **TypeScript (`typescript`)**: The project is written in TypeScript, using version `~5.7.3`.
*   **Testing (`vitest`, `@fast-check/vitest`)**: Testing is done with Vitest version `2.1.9`.
*   **Linting & Formatting (`eslint`, `prettier`)**: Code quality is maintained with ESLint and Prettier.
*   **Monorepo Management (`pnpm`)**: The project is a monorepo managed with pnpm version `9.5.0`.

### Special Configurations

*   **`pnpm.overrides`**: The project uses pnpm overrides to enforce specific versions of certain packages. For example, `@remix-run/cloudflare` is forced to use the same version as `@remix-run/node`. `@ai-sdk/google` is overridden to use the Convex-specific version.
*   **`pnpm.patchedDependencies`**: The project applies a patch to `@ai-sdk/openai@1.3.6`, indicating a custom modification to the package.
*   **Workspaces**: The project is configured as a pnpm workspace, with `chef-agent` and `chefshot` being local packages.

## `chef-agent/package.json`

This package contains the core logic for the AI agent.

*   **Dependencies**:
    *   `ai`: The Vercel AI SDK.
    *   `jose`: For handling JSON Web Tokens (JWTs).
    *   `zod`: For schema validation.
    *   `typescript`: Core language.

## `chefshot/package.json`

This package is a utility for running prompts through the Chef application via browser automation.

*   **Dependencies**:
    *   `@playwright/test`: For browser automation and testing.
    *   `tsx`: For running TypeScript files directly.
    *   `dotenv`: For managing environment variables.

## Summary

The project is a sophisticated full-stack application that leverages a modern TypeScript-based stack. The use of a monorepo with pnpm workspaces allows for clear separation of concerns between the frontend application, the AI agent, and other utilities. The dependency list shows a heavy reliance on the Vercel AI SDK for language model interactions and the WebContainer API for creating the in-browser development environment. The backend is fully managed by Convex, which simplifies data management and serverless functions. The use of pnpm overrides and patches indicates a need for fine-grained control over specific dependencies.