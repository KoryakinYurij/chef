# System Architecture

This project is a full-stack monorepo application with a clear separation between the frontend, backend, and the AI agent.

## Core Components

1.  **Frontend (`app/`)**:
    *   **Framework**: [Remix](https://remix.run/) (a full-stack web framework for React).
    *   **UI**: Built with React and styled with Tailwind CSS.
    *   **State Management**: [Nanostores](https://github.com/nanostores/nanostores) for global state management.
    *   **Key Features**:
        *   A chat interface for interacting with the AI agent.
        *   A "Workbench" that includes a file tree, code editor (CodeMirror), and terminal (Xterm.js).
        *   User authentication and settings management.
        *   Session sharing and history.

2.  **Backend (`convex/`)**:
    *   **Platform**: [Convex](https://www.convex.dev/) (a serverless backend platform with a real-time database).
    *   **`schema.ts`**: Defines the database tables and their relationships.
    *   **Functions**: Serverless functions (`queries`, `mutations`, `actions`) handle all backend logic, including authentication, data storage, and communication with the AI agent.
    *   **`http.ts`**: Handles HTTP endpoints for integrations like webhooks.

3.  **AI Agent (`chef-agent/`)**:
    *   **Core Logic**: This is a self-contained TypeScript project that defines the AI agent's behavior.
    *   **`prompts/`**: Contains the system prompts that guide the language model's responses and behavior. This is the "brain" of the agent.
    *   **`tools/`**: Defines the functions the agent can execute within the WebContainer environment (e.g., `edit`, `deploy`, `npmInstall`).
    *   **`message-parser.ts`**: Parses natural language from the user into actionable commands for the agent's tools.

## Key Technical Decisions & Design Patterns

*   **Monorepo with Workspaces**: The project uses pnpm workspaces to manage the different parts of the application (`app`, `chef-agent`, etc.) within a single repository.
*   **Serverless Backend**: Using Convex simplifies backend development by providing a managed database, serverless functions, and real-time updates.
*   **WebContainer API**: The core of the agent's functionality relies on the [WebContainer API](https://webcontainers.io/) to create an in-browser Node.js environment where the agent can safely execute code, manage files, and run a terminal.
*   **AI SDK**: The Vercel AI SDK is used to handle streaming responses from the language model, providing a smooth, real-time chat experience.
*   **Component-Based UI**: The frontend is built with a modular, component-based architecture, making it easier to maintain and extend.