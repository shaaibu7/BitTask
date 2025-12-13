# BitTask

**BitTask** is a decentralized tasks marketplace built on **Stacks (Bitcoin L2)**. It enables users to post tasks with rewards paid in STX or sBTC, and allows workers to complete these tasks and get paid trustlessly via smart contracts.

## 📖 Project Overview

BitTask leverages the security of Bitcoin through the Stacks layer to provide a secure, transparent, and decentralized platform for micro-work. By removing centralized intermediaries, BitTask ensures lower fees, censorship resistance, and trustless escrow services.

## 🚩 Problem Statement

Traditional freelancing and micro-task platforms suffer from:
- **High Fees**: Intermediaries take a significant cut (up to 20%).
- **Centralized Control**: Platforms can freeze accounts or withhold funds arbitrarily.
- **Lack of Transparency**: Dispute resolution and payment flows are often opaque.
- **Slow Settlements**: Traditional banking rails can take days to settle payments.

**BitTask** solves this by using Clarity smart contracts to handle escrow and payments automatically, ensuring fairness and instant settlement upon approval.

## 🏗 Architecture

BitTask follows a decentralized architecture:

- **Blockchain Layer**: Stacks (Bitcoin L2) for smart contracts and transaction settlement.
- **Smart Contracts**: Written in Clarity, handling task creation, escrow, assignment, submission, and payment release.
- **Frontend**: Next.js application interacting with the Stacks blockchain via Stacks.js.
- **Authentication**: Wallet-based authentication (Leather, Xverse).
- **Storage**: Critical state is on-chain. Large file submissions (proof of work) can be stored on IPFS (optional).

## 🔐 Smart Contract Design

The core logic resides in the `bittask` contract.

### Core Entities
- **Task**: Represents a gig. Contains title, description, reward, deadline, creator, worker, and status.

### Task Lifecycle
1.  **Open**: Task created, funds locked in escrow.
2.  **In Progress**: Worker accepts the task.
3.  **Submitted**: Worker submits proof of work.
4.  **Completed**: Creator approves work, funds released to worker.
5.  **Disputed**: (Optional) Dispute raised if work is rejected or deadline missed.

## 🛠 Tech Stack

-   **Smart Contracts**: [Clarity](https://clarity-lang.org/)
-   **Frontend Framework**: [Next.js](https://nextjs.org/)
-   **Blockchain Interaction**: [Stacks.js](https://github.com/hirosystems/stacks.js)
-   **Wallets**: [Leather](https://leather.io/), [Xverse](https://www.xverse.app/)
-   **Development Environment**: [Clarinet](https://github.com/hirosystems/clarinet)

## 🚀 Local Setup

### Prerequisites
-   [Node.js](https://nodejs.org/) (v18+)
-   [Clarinet](https://github.com/hirosystems/clarinet) (for smart contract dev)
-   [Docker](https://www.docker.com/) (for running local Stacks node)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Cyberking99/BitTask.git
    cd BitTask
    ```

2.  **Install Frontend Dependencies**
    ```bash
    cd frontend
    npm install
    ```

3.  **Run Local Stacks Chain (Devnet)**
    ```bash
    # In the root directory
    clarinet integrate
    ```
    This will start a local Stacks blockchain and deploy the contracts.

4.  **Run Frontend**
    ```bash
    cd frontend
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Deployment

### Smart Contracts
To deploy contracts to the Stacks Testnet or Mainnet:

1.  Configure your `Clarinet.toml` and `settings/Testnet.toml` (or `Mainnet.toml`).
2.  Run the deployment command:
    ```bash
    clarinet deploy --config Clarinet.toml --settings settings/Testnet.toml
    ```

### Frontend
Deploy the Next.js application to Vercel, Netlify, or any standard web hosting service. Ensure you set the `NEXT_PUBLIC_NETWORK` environment variable to `testnet` or `mainnet`.

## 🛡 Security Considerations

-   **Trustless Escrow**: Funds are locked in the contract and can only be released by the logic defined in the code.
-   **No Admin Keys**: The contract is designed to be immutable or have limited admin governance to prevent rug pulls.
-   **Post-Conditions**: The frontend uses Stacks post-conditions to protect users from unauthorized asset transfers.

## 🤝 Contribution Guidelines

We welcome contributions! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

Please ensure your code follows the project's style guidelines and includes relevant tests.

---

**BitTask** - Decentralizing task marketplace on Bitcoin.
