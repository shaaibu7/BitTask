# Contributing to BitTask

We welcome contributions to BitTask! Please follow these guidelines to ensure a smooth collaboration process.

## Development Process

1.  **Fork** the repository.
2.  **Clone** your fork locally.
3.  Create a new **branch** for your feature or fix: `git checkout -b feature/my-feature`.
4.  Commit your changes with clear messages.
5.  Push to your fork and submit a **Pull Request**.

## Code Style

### General

- Use meaningful variable and function names.
- Keep functions small and focused.

### Frontend

- We use **Prettier** for code formatting. Run `npm run format` before committing.
- We use **ESLint** for linting. Run `npm run lint` to catch errors.
- Use TypeScript for all new code. Avoid `any` types where possible.
- Use Tailwind CSS for styling.

### Smart Contracts

- Follow standard Clarity conventions.
- Ensure all public functions have appropriate checks and error handling.
- Write tests for every new public function.

## Pull Request Process

1.  Ensure all tests pass.
2.  Update documentation if you changed any functionality.
3.  Describe your changes in detail in the PR description.
