# Technical Stack

This project is built on a modern, full-stack TypeScript foundation. Below is a summary of the key technologies and tools used.

## Core Technologies

*   **Frontend**:
    *   **Framework**: [Remix](https://remix.run/) (v2.15.3)
    *   **Language**: TypeScript
    *   **UI Library**: [React](https://react.dev/) (v18.3.1)
    *   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
    *   **State Management**: [Nanostores](https://github.com/nanostores/nanostores)

*   **Backend**:
    *   **Platform**: [Convex](https://www.convex.dev/) (v1.27.0)
    *   **Database**: Convex's built-in real-time database.
    *   **Serverless Functions**: All backend logic is handled through Convex's `queries`, `mutations`, and `actions`.

*   **AI & Language Models**:
    *   **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai/) for handling language model interactions.
    *   **Models**: The project is configured to work with various models from OpenAI, Google (Gemini), and Anthropic.

*   **In-Browser Environment**:
    *   **WebContainer API**: [WebContainer API](https://webcontainers.io/) is used to create a sandboxed Node.js environment directly in the browser, allowing the AI agent to execute code and manage a file system.

## Development & Tooling

*   **Package Manager**: [pnpm](https://pnpm.io/) (v9.5.0) is used for managing dependencies in this monorepo.
*   **Build Tool**: [Vite](https://vitejs.dev/) is used for building and serving the Remix application.
*   **Linting**: [ESLint](https://eslint.org/) is used for code quality and consistency.
*   **Formatting**: [Prettier](https://prettier.io/) is used for code formatting.
*   **Testing**: [Vitest](https://vitest.dev/) is used for running unit and integration tests.
*   **Monorepo Management**: The project is structured as a monorepo using pnpm workspaces.