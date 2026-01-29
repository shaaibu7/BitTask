import { openContractCall } from '@stacks/connect';
import { UserSession } from '@stacks/auth';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { uintCV, stringAsciiCV, principalCV, FungibleConditionCode } from '@stacks/transactions';
import { createSTXPostCondition } from '@stacks/transactions/dist/pc';

const CONTRACT_ADDRESS = 'SP34HE2KF7SPKB8BD5GY39SG7M207FZPRXJS4NMY9';
const CONTRACT_NAME = 'bittask';
const REFERRAL_CONTRACT_NAME = 'referral-system';

// Use testnet for development, mainnet for production
const network = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

export interface ContractCallOptions {
  onFinish?: (data: any) => void;
  onCancel?: () => void;
  onTransactionId?: (txId: string) => void;
}

const STX_TO_MICROSTX = 1000000; // 1 STX = 1,000,000 micro-STX

export async function createTask(
  userSession: UserSession,
  title: string,
  description: string,
  amount: number, // in STX
  deadline: number, // block height
  options?: ContractCallOptions
): Promise<void> {
  try {
    // Convert STX to micro-STX. Use Math.round to handle potential floating point inaccuracies.
    const amountMicroSTX = Math.round(amount * STX_TO_MICROSTX);

    // Create post-condition to ensure only the specified amount is transferred
    const postConditions = [
      createSTXPostCondition(
        'tx-sender',
        FungibleConditionCode.Equal,
        amountMicroSTX
      ),
    ];

    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'create-task',
      functionArgs: [
        stringAsciiCV(title),
        stringAsciiCV(description),
        uintCV(amountMicroSTX),
        uintCV(deadline),
      ],
      network,
      postConditions,
      userSession: userSession as any,
      onFinish: (data) => {
        console.log('Task created:', data);
        const txId = data?.txId || data?.txid || data?.response?.txid || data?.stacksTransaction?.txid();
        if (txId && options?.onTransactionId) {
          options.onTransactionId(txId);
        }
        options?.onFinish?.(data);
      },
      onCancel: () => {
        console.log('Transaction cancelled');
        options?.onCancel?.();
      },
    });
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

export async function acceptTask(
  userSession: UserSession,
  taskId: number,
  options?: ContractCallOptions
): Promise<void> {
  try {
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'accept-task',
      functionArgs: [uintCV(taskId)],
      network,
      userSession,
      onFinish: (data) => {
        console.log('Task accepted:', data);
        const txId = data?.txId || data?.txid || data?.response?.txid || data?.stacksTransaction?.txid();
        if (txId && options?.onTransactionId) {
          options.onTransactionId(txId);
        }
        options?.onFinish?.(data);
      },
      onCancel: () => {
        console.log('Transaction cancelled');
        options?.onCancel?.();
      },
    });
  } catch (error) {
    console.error('Error accepting task:', error);
    throw error;
  }
}

export async function submitWork(
  userSession: UserSession,
  taskId: number,
  submission: string, // Link or hash of the work (string-ascii 256)
  options?: ContractCallOptions
): Promise<void> {
  try {
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'submit-work',
      functionArgs: [
        uintCV(taskId),
        stringAsciiCV(submission),
      ],
      network,
      userSession,
      onFinish: (data) => {
        console.log('Work submitted:', data);
        const txId = data?.txId || data?.txid || data?.response?.txid || data?.stacksTransaction?.txid();
        if (txId && options?.onTransactionId) {
          options.onTransactionId(txId);
        }
        options?.onFinish?.(data);
      },
      onCancel: () => {
        console.log('Transaction cancelled');
        options?.onCancel?.();
      },
    });
  } catch (error) {
    console.error('Error submitting work:', error);
    throw error;
  }
}

export async function approveWork(
  userSession: UserSession,
  taskId: number,
  options?: ContractCallOptions
): Promise<void> {
  try {
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'approve-work',
      functionArgs: [uintCV(taskId)],
      network,
      userSession,
      onFinish: (data) => {
        console.log('Work approved:', data);
        const txId = data?.txId || data?.txid || data?.response?.txid || data?.stacksTransaction?.txid();
        if (txId && options?.onTransactionId) {
          options.onTransactionId(txId);
        }
        options?.onFinish?.(data);
      },
      onCancel: () => {
        console.log('Transaction cancelled');
        options?.onCancel?.();
      },
    });
  } catch (error) {
    console.error('Error approving work:', error);
    throw error;
  }
}

export async function rejectWork(
  userSession: UserSession,
  taskId: number,
  options?: ContractCallOptions
): Promise<void> {
  try {
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'reject-work',
      functionArgs: [uintCV(taskId)],
      network,
      userSession,
      onFinish: (data) => {
        console.log('Work rejected:', data);
        const txId = data?.txId || data?.txid || data?.response?.txid || data?.stacksTransaction?.txid();
        if (txId && options?.onTransactionId) {
          options.onTransactionId(txId);
        }
        options?.onFinish?.(data);
      },
      onCancel: () => {
        console.log('Transaction cancelled');
        options?.onCancel?.();
      },
    });
  } catch (error) {
    console.error('Error rejecting work:', error);
    throw error;
  }
}

export async function reclaimExpired(
  userSession: UserSession,
  taskId: number,
  options?: ContractCallOptions
): Promise<void> {
  try {
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'reclaim-expired',
      functionArgs: [uintCV(taskId)],
      network,
      userSession,
      onFinish: (data) => {
        console.log('Funds reclaimed:', data);
        const txId = data?.txId || data?.txid || data?.response?.txid || data?.stacksTransaction?.txid();
        if (txId && options?.onTransactionId) {
          options.onTransactionId(txId);
        }
        options?.onFinish?.(data);
      },
      onCancel: () => {
        console.log('Transaction cancelled');
        options?.onCancel?.();
      },
    });
  } catch (error) {
    console.error('Error reclaiming expired task:', error);
    throw error;
  }
}

export async function registerReferrer(
  userSession: UserSession,
  referrer: string,
  options?: ContractCallOptions
): Promise<void> {
  try {
    // Principal CV is not imported, using standard string principal validation via stacks transactions would be better
    // but we can pass it as a string to principalCV if we had it.
    // For now, let's assume principalCV is available or we use a workaround.
    // Wait, I need to check imports.
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: REFERRAL_CONTRACT_NAME,
      functionName: 'register-referrer',
      functionArgs: [
        principalCV(referrer),
      ],
      network,
      userSession,
      onFinish: (data) => {
        console.log('Referrer registered:', data);
        const txId = data?.txId || data?.txid || data?.response?.txid || data?.stacksTransaction?.txid();
        if (txId && options?.onTransactionId) {
          options.onTransactionId(txId);
        }
        options?.onFinish?.(data);
      },
      onCancel: () => {
        console.log('Transaction cancelled');
        options?.onCancel?.();
      },
    });
  } catch (error) {
    console.error('Error registering referrer:', error);
    throw error;
  }
}
