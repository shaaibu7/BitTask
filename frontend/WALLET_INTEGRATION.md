# Wallet Integration Documentation

## Current Implementation: Stacks Connect

BitTask uses **@stacks/connect** for wallet integration, which is the official and recommended way to connect Stacks wallets (Leather, Xverse) to dApps.

### Why @stacks/connect instead of Reown AppKit/WalletKit?

**Reown AppKit and WalletKit** are excellent tools for multi-chain wallet integration, but they currently support:
- ✅ EVM chains (Ethereum, Polygon, etc.)
- ✅ Solana
- ✅ Bitcoin
- ✅ Polkadot
- ✅ Cosmos
- ❌ **Stacks** (not supported)

Since BitTask is built on the **Stacks blockchain**, we use **@stacks/connect**, which:
- ✅ Is the official Stacks wallet connection library
- ✅ Works seamlessly with Leather (formerly Hiro Wallet) and Xverse
- ✅ Provides secure transaction signing
- ✅ Handles authentication and session management
- ✅ Supports both mainnet and testnet

### Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  StacksWalletProvider   │  ← Custom React Context Provider
│  (stacks-wallet.tsx)    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   @stacks/connect       │  ← Official Stacks SDK
│   - showConnect()       │
│   - UserSession         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Leather / Xverse      │  ← User's Wallet Extension
│   Wallet Extension      │
└─────────────────────────┘
```

### Key Components

1. **StacksWalletProvider** (`lib/stacks-wallet.tsx`)
   - Manages wallet connection state
   - Provides `userSession` for contract calls
   - Handles connect/disconnect logic

2. **Contract Actions** (`lib/contractActions.ts`)
   - All contract functions require `userSession` parameter
   - Uses `openContractCall` from @stacks/connect
   - Handles transaction signing and submission

3. **UI Components**
   - `Navbar.tsx` - Connect/disconnect button
   - `Providers.tsx` - Wraps app with wallet provider

### Usage Example

```typescript
import { useStacksWallet } from '@/lib/stacks-wallet';
import { createTask } from '@/lib/contractActions';

function MyComponent() {
  const { userSession, isConnected, connectWallet } = useStacksWallet();
  
  const handleCreateTask = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    
    await createTask(
      userSession,
      'Task Title',
      'Task Description',
      100, // STX amount
      deadlineBlockHeight
    );
  };
  
  return <button onClick={handleCreateTask}>Create Task</button>;
}
```

### Supported Wallets

- **Leather** (formerly Hiro Wallet) - Primary wallet
- **Xverse** - Alternative wallet option

Both wallets are automatically detected when users click "Connect Wallet".

### Network Configuration

The app supports both Stacks mainnet and testnet, controlled by the environment variable:

```env
NEXT_PUBLIC_STACKS_NETWORK=mainnet  # or 'testnet'
```

### Future Considerations

If you plan to add multi-chain support (e.g., Bitcoin, Ethereum), you could:

1. **Keep current approach**: Use @stacks/connect for Stacks, and add Reown AppKit for other chains
2. **Hybrid approach**: Use both libraries side-by-side with a unified wallet interface
3. **Wait for Stacks support**: Monitor Reown's roadmap for potential Stacks integration

### Migration Notes

The following files are **not currently used** but kept for potential future multi-chain support:
- `lib/appkit-config.ts` - Reown AppKit config (Ethereum/Bitcoin)
- `config/index.tsx` - Bitcoin adapter config
- `context/index.tsx` - AppKit provider (unused)
- `lib/useWalletConnection.ts` - Wagmi hooks (Ethereum)

These can be removed if you're certain you won't need multi-chain support, or kept for future expansion.

## Security Considerations

- ✅ All transactions require explicit user approval
- ✅ Post-conditions are used to prevent unauthorized transfers
- ✅ UserSession is securely managed and persisted
- ✅ No private keys are stored in the application

## Troubleshooting

### Wallet not connecting?
- Ensure Leather or Xverse extension is installed
- Check browser console for errors
- Verify network configuration matches wallet network

### Transactions failing?
- Check user has sufficient STX balance
- Verify contract address is correct for the network
- Ensure userSession is properly initialized

