import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;
const charlie = accounts.get("wallet_3")!;

describe("ERC1155 Integration Tests", () => {
  beforeEach(() => {
    simnet.deployContract("erc1155", "contracts/erc1155.clar", null, deployer);
  });

  describe("Complete User Workflows", () => {
    it("should handle complete mint-transfer-burn workflow", () => {
      // 1. Mint tokens
      const mintResult = simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(1000)],
        deployer
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));

      // 2. Transfer some tokens
      const transferResult = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(bob), Cl.uint(1), Cl.uint(300)],
        alice
      );
      expect(transferResult.result).toBeOk(Cl.bool(true));

      // 3. Burn some tokens
      const burnResult = simnet.callPublicFn(
        "erc1155",
        "burn-tokens",
        [Cl.principal(alice), Cl.uint(1), Cl.uint(200)],
        alice
      );
      expect(burnResult.result).toBeOk(Cl.bool(true));

      // 4. Verify final balances
      const aliceBalance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      const bobBalance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(bob), Cl.uint(1)],
        deployer
      );
      const totalSupply = simnet.callReadOnlyFn(
        "erc1155",
        "get-total-supply",
        [Cl.uint(1)],
        deployer
      );

      expect(aliceBalance.result).toBeOk(Cl.uint(500)); // 1000 - 300 - 200
      expect(bobBalance.result).toBeOk(Cl.uint(300));
      expect(totalSupply.result).toBeOk(Cl.uint(800)); // 1000 - 200 burned
    });

    it("should handle operator approval and transfer workflow", () => {
      // 1. Mint tokens to Alice
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(500)],
        deployer
      );

      // 2. Alice approves Bob as operator
      const approvalResult = simnet.callPublicFn(
        "erc1155",
        "set-approval-for-all",
        [Cl.principal(bob), Cl.bool(true)],
        alice
      );
      expect(approvalResult.result).toBeOk(Cl.bool(true));

      // 3. Bob transfers on behalf of Alice
      const transferResult = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(charlie), Cl.uint(1), Cl.uint(200)],
        bob
      );
      expect(transferResult.result).toBeOk(Cl.bool(true));

      // 4. Alice revokes approval
      const revokeResult = simnet.callPublicFn(
        "erc1155",
        "set-approval-for-all",
        [Cl.principal(bob), Cl.bool(false)],
        alice
      );
      expect(revokeResult.result).toBeOk(Cl.bool(true));

      // 5. Bob can no longer transfer
      const failedTransfer = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(charlie), Cl.uint(1), Cl.uint(100)],
        bob
      );
      expect(failedTransfer.result).toBeErr(Cl.uint(101)); // ERR-UNAUTHORIZED
    });
  });

  describe("Complex Batch Operations", () => {
    it("should handle mixed batch operations with multiple users", () => {
      // Setup: Mint different tokens to Alice
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(200)],
        deployer
      );
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(300)],
        deployer
      );

      // Batch transfer different amounts of different tokens
      const batchResult = simnet.callPublicFn(
        "erc1155",
        "transfer-batch",
        [
          Cl.principal(alice),
          Cl.principal(bob),
          Cl.list([Cl.uint(1), Cl.uint(2), Cl.uint(3)]),
          Cl.list([Cl.uint(50), Cl.uint(100), Cl.uint(150)])
        ],
        alice
      );
      expect(batchResult.result).toBeOk(Cl.bool(true));

      // Verify all balances
      const bobBalance1 = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(bob), Cl.uint(1)],
        deployer
      );
      const bobBalance2 = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(bob), Cl.uint(2)],
        deployer
      );
      const bobBalance3 = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(bob), Cl.uint(3)],
        deployer
      );

      expect(bobBalance1.result).toBeOk(Cl.uint(50));
      expect(bobBalance2.result).toBeOk(Cl.uint(100));
      expect(bobBalance3.result).toBeOk(Cl.uint(150));
    });

    it("should handle batch operations with duplicate token IDs", () => {
      // Mint tokens
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(1000)],
        deployer
      );

      // Batch transfer with duplicate token IDs (should process each separately)
      const batchResult = simnet.callPublicFn(
        "erc1155",
        "transfer-batch",
        [
          Cl.principal(alice),
          Cl.principal(bob),
          Cl.list([Cl.uint(1), Cl.uint(1), Cl.uint(1)]),
          Cl.list([Cl.uint(100), Cl.uint(200), Cl.uint(300)])
        ],
        alice
      );
      expect(batchResult.result).toBeOk(Cl.bool(true));

      // Bob should have received total of 600 tokens
      const bobBalance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(bob), Cl.uint(1)],
        deployer
      );
      expect(bobBalance.result).toBeOk(Cl.uint(600));

      // Alice should have 400 remaining
      const aliceBalance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      expect(aliceBalance.result).toBeOk(Cl.uint(400));
    });
  });
});