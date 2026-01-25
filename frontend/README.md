# BitTask Frontend

The frontend is a Next.js application built with Tailwind CSS and Wagmi/Stacks.js for blockchain interaction.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1.  Navigate to the directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    ```bash
    cp .env.sample .env.local
    ```
    Edit `.env.local` to match your network configuration (default is `testnet`).

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable React components.
  - `ui/`: Generic UI components (Buttons, Inputs, etc.).
  - `layout/`: specific layout components (Header, Footer).
- `lib/`: Utility functions and contract interaction logic.
- `hooks/`: Custom React hooks.

## Troubleshooting

- **Wagmi Error**: If you encounter issues with Wagmi provider, ensure you are wrapping the app correctly in `Providers.tsx`.
- **Hydration Errors**: Ensure that UI that depends on wallet state handles loading states gracefully.
