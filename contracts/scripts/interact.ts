
import 'dotenv/config';
import {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    FungibleConditionCode,
    Pc,
    stringAsciiCV,
    uintCV,
    PostConditionMode
} from '@stacks/transactions';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

import { generateWallet } from '@stacks/wallet-sdk';

// Config
const NETWORK_ENV = process.env.NETWORK || 'testnet';
const MNEMONIC = process.env.MNEMONIC;
const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS || '').split('.')[0];
const CONTRACT_NAME = 'bittask';

if (!MNEMONIC) {
    console.error("Please set MNEMONIC in .env");
    process.exit(1);
}
if (!CONTRACT_ADDRESS) {
    console.error("Please set CONTRACT_ADDRESS in .env");
    process.exit(1);
}

const network = NETWORK_ENV === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

// Derive key
async function getPrivateKey() {
    const wallet = await generateWallet({
        secretKey: MNEMONIC!,
        password: 'optional-password',
    });
    // Use the first account
    return wallet.accounts[0].stxPrivateKey;
}

async function createTask(title: string, description: string, amount: number, deadline: number, nonce?: number) {
    console.log(`Creating task: ${title}...`);
    const privateKey = await getPrivateKey();

    const txOptions = {
        contractAddress: CONTRACT_ADDRESS!,
        contractName: CONTRACT_NAME,
        functionName: 'create-task',
        functionArgs: [
            stringAsciiCV(title),
            stringAsciiCV(description),
            uintCV(amount),
            uintCV(deadline)
        ],
        senderKey: privateKey,
        validateWithAbi: true,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        postConditions: [
            Pc.principal(process.env.SENDER_ADDRESS!).willSendEq(amount).ustx()
        ],
        nonce: nonce,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network });
    console.log('Broadcast response:', broadcastResponse);
    return broadcastResponse;
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'create':
            // Usage: tsx scripts/interact.ts create "Title" "Desc" 1000 50000
            await createTask(args[1], args[2], parseInt(args[3]), parseInt(args[4]));
            break;
        case 'batch':
            // We need to fetch the nonce manually to chain transactions
            // Requires a fetch to the API or just assuming 0 if fresh, but better to fetch.
            // Using a simple fetch here:
            const address = process.env.SENDER_ADDRESS!;
            // Cast to any to access coreApiUrl if strict types block it, or fallback.
            const apiUrl = NETWORK_ENV === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';
            const url = `${apiUrl}/v2/accounts/${address}?proof=0`;

            console.log(`Fetching nonce for ${address} from ${url}...`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch account info: ${response.statusText}`);
            }
            const data = await response.json() as { nonce: string };
            let currentNonce = parseInt(data.nonce);
            console.log(`Starting nonce: ${currentNonce}`);

            for (let i = 1; i <= 12; i++) {
                const title = `Batch Task ${i}`;
                const desc = `Description for batch task ${i}`;
                const amt = 1000 + i;
                const dl = 144 * 30; // ~ 1 month

                await createTask(title, desc, amt, dl, currentNonce);
                currentNonce++;

                // Small delay to be nice to the node
                await new Promise(r => setTimeout(r, 500));
            }
            break;
        default:
            console.log("Usage:");
            console.log("  tsx scripts/interact.ts create <title> <desc> <amount_microstx> <deadline_height>");
            console.log("  tsx scripts/interact.ts batch");
            break;
    }
}

main();
