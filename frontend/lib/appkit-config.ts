import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia } from 'viem/chains';

// Get projectId from environment
const projectId = process.env.NEXT_PUBLIC_APPKIT_PROJECT_ID || '';

if (!projectId) {
  console.warn('NEXT_PUBLIC_APPKIT_PROJECT_ID is not set');
}

// Create Wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  chains: [mainnet, sepolia],
});

// Create AppKit instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, sepolia],
  defaultNetwork: mainnet,
  metadata: {
    name: 'BitTask',
    description: 'Decentralized Microgigs Marketplace on Stacks',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  },
  features: {
    analytics: true,
  },
});
