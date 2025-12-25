import { ChainhookDefinition } from '@hirosystems/chainhooks-client';
import { chainhooksClient, getChainhooksNetwork } from '../lib/chainhooks';
import * as dotenv from 'dotenv';
dotenv.config();

// Configuration
const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with actual deployer if different
const CONTRACT_NAME = 'bittask';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/chainhook';

// To be reachable by Hiro's service, you need a public URL (e.g., via ngrok) when testing locally.

async function registerChainhook() {
    console.log(`Registering Chainhook for ${CONTRACT_NAME} on ${getChainhooksNetwork()}...`);

    const chainhook: ChainhookDefinition = {
        name: 'BitTask Events',
        chain: 'stacks',
        network: getChainhooksNetwork() as 'mainnet' | 'testnet',
        version: '1',
        filters: {
            events: [
                {
                    type: 'contract_call',
                    contract_identifier: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
                    function_name: 'create-task', // Listen for create-task calls
                }
            ]
        },
        action: {
            type: 'http_post',
            url: WEBHOOK_URL,
            authorization_header: `Bearer ${process.env.CHAINHOOKS_SECRET || ''}`
        } as any
    };

    try {
        const result = await chainhooksClient.registerChainhook(chainhook);
        console.log('Chainhook registered successfully!');
        console.log('UUID:', result.uuid);
    } catch (error: any) {
        console.error('Failed to register chainhook:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

registerChainhook();
