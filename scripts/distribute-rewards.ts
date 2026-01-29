import {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    PostConditionMode,
    uintCV,
    principalCV,
    getNonce,
    StacksMainnet,
    StacksTestnet
} from '@stacks/transactions';
import { config } from 'dotenv';

config();

/**
 * Distribute Rewards Script
 * Automates batch distribution of referral points to active contributors.
 * Uses @stacks/transactions for low-level contract interaction.
 */

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const CONTRACT_ADDRESS = 'SP34HE2KF7SPKB8BD5GY39SG7M207FZPRXJS4NMY9';
const REFERRAL_CONTRACT_NAME = 'referral-system';
const NETWORK_TYPE = process.env.STACKS_NETWORK || 'testnet';
const network = NETWORK_TYPE === 'mainnet' ? new StacksMainnet() : new StacksTestnet();

interface RewardRecipient {
    address: string;
    amount: number;
}

const recipients: RewardRecipient[] = [
    { address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', amount: 100 },
    { address: 'ST2CY5V39NHDPWSXMW9MDT3HC3GD6Q6XX4CFRK9AG', amount: 250 },
    { address: 'ST2JHG361ZXG51QTKY2NQCVBP73WQC9AF2QAFXWWC', amount: 50 },
    { address: 'ST2NEB84ASENDXKYG3JHXC8BC3GHYB79D55DH9H11', amount: 500 },
];

async function distributeRewards() {
    if (!PRIVATE_KEY) {
        console.error('ERROR: PRIVATE_KEY not found in .env');
        return;
    }

    console.log(`Starting reward distribution on ${NETWORK_TYPE}...`);

    let nonce = await getNonce(CONTRACT_ADDRESS, network);

    for (const recipient of recipients) {
        console.log(`Sending ${recipient.amount} points to ${recipient.address}...`);

        try {
            const txOptions = {
                contractAddress: CONTRACT_ADDRESS,
                contractName: REFERRAL_CONTRACT_NAME,
                functionName: 'add-points',
                functionArgs: [
                    principalCV(recipient.address),
                    uintCV(recipient.amount)
                ],
                senderKey: PRIVATE_KEY,
                validateWithAbi: true,
                network,
                anchorMode: AnchorMode.Any,
                postConditionMode: PostConditionMode.Allow,
                nonce,
            };

            const transaction = await makeContractCall(txOptions);
            const broadcastResponse = await broadcastTransaction(transaction, network);

            if (broadcastResponse.error) {
                console.error(`FAILED to broadcast for ${recipient.address}:`, broadcastResponse.error);
            } else {
                console.log(`SUCCESS: TxID: ${broadcastResponse.txid}`);
                nonce++; // Increment nonce for next transaction
            }
        } catch (error) {
            console.error(`ERROR processing ${recipient.address}:`, error);
        }
    }

    console.log('Reward distribution completed.');
}

distributeRewards().catch(console.error);
