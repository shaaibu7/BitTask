import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;
const charlie = accounts.get("wallet_3")!;

describe("ERC1155 Multi-Token Contract", () => {
  beforeEach(() => {
    // Deploy the contract before each test
    simnet.deployContract("erc1155", "contracts/erc1155.clar", null, deployer);
  });

  describe("Contract Initialization", () => {
    it("should initialize with correct owner", () => {
      const result = simnet.callReadOnlyFn(
        "erc1155",
        "get-contract-owner",
        [],
        deployer
      );
      expect(result.result).toBeOk(Cl.principal(deployer));
    });

    it("should start with next token ID as 1", () => {
      const result = simnet.callReadOnlyFn(
        "erc1155",
        "get-next-token-id",
        [],
        deployer
      );
      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should not be paused initially", () => {
      const result = simnet.callReadOnlyFn(
        "erc1155",
        "is-paused",
        [],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(false));
    });
  });

  describe("Token Minting", () => {
    it("should allow owner to mint new tokens", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should update balance after minting", () => {
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
      
      const balance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      expect(balance.result).toBeOk(Cl.uint(100));
    });

    it("should reject minting by non-owner", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(101)); // ERR-UNAUTHORIZED
    });

    it("should reject minting zero amount", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(0)],
        deployer
      );
      expect(result.result).toBeErr(Cl.uint(103)); // ERR-ZERO-AMOUNT
    });
  });

  describe("Balance Queries", () => {
    beforeEach(() => {
      // Mint some tokens for testing
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(50)],
        deployer
      );
    });

    it("should return correct balance for existing tokens", () => {
      const balance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      expect(balance.result).toBeOk(Cl.uint(100));
    });

    it("should return zero for non-existent tokens", () => {
      const balance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(999)],
        deployer
      );
      expect(balance.result).toBeOk(Cl.uint(0));
    });

    it("should return zero for non-existent principals", () => {
      const balance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(charlie), Cl.uint(1)],
        deployer
      );
      expect(balance.result).toBeOk(Cl.uint(0));
    });
  });

  describe("Single Token Transfers", () => {
    beforeEach(() => {
      // Mint tokens for testing
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
    });

    it("should transfer tokens successfully", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(bob), Cl.uint(1), Cl.uint(30)],
        alice
      );
      expect(result.result).toBeOk(Cl.bool(true));

      // Check balances
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
      
      expect(aliceBalance.result).toBeOk(Cl.uint(70));
      expect(bobBalance.result).toBeOk(Cl.uint(30));
    });

    it("should reject transfer with insufficient balance", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(bob), Cl.uint(1), Cl.uint(200)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(100)); // ERR-INSUFFICIENT-BALANCE
    });

    it("should reject zero amount transfer", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(bob), Cl.uint(1), Cl.uint(0)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(103)); // ERR-ZERO-AMOUNT
    });

    it("should reject self-transfer", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(alice), Cl.uint(1), Cl.uint(30)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(104)); // ERR-SELF-TRANSFER
    });
  });

  describe("Operator Approvals", () => {
    it("should set approval for all tokens", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "set-approval-for-all",
        [Cl.principal(bob), Cl.bool(true)],
        alice
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const isApproved = simnet.callReadOnlyFn(
        "erc1155",
        "is-approved-for-all",
        [Cl.principal(alice), Cl.principal(bob)],
        deployer
      );
      expect(isApproved.result).toBeOk(Cl.bool(true));
    });

    it("should revoke approval", () => {
      // First approve
      simnet.callPublicFn(
        "erc1155",
        "set-approval-for-all",
        [Cl.principal(bob), Cl.bool(true)],
        alice
      );

      // Then revoke
      const result = simnet.callPublicFn(
        "erc1155",
        "set-approval-for-all",
        [Cl.principal(bob), Cl.bool(false)],
        alice
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const isApproved = simnet.callReadOnlyFn(
        "erc1155",
        "is-approved-for-all",
        [Cl.principal(alice), Cl.principal(bob)],
        deployer
      );
      expect(isApproved.result).toBeOk(Cl.bool(false));
    });

    it("should reject self-approval", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "set-approval-for-all",
        [Cl.principal(alice), Cl.bool(true)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(107)); // ERR-INVALID-PRINCIPAL
    });
  });

  describe("Operator Transfers", () => {
    beforeEach(() => {
      // Mint tokens and set approval
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
      simnet.callPublicFn(
        "erc1155",
        "set-approval-for-all",
        [Cl.principal(bob), Cl.bool(true)],
        alice
      );
    });

    it("should allow approved operator to transfer", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(charlie), Cl.uint(1), Cl.uint(30)],
        bob
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const charlieBalance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(charlie), Cl.uint(1)],
        deployer
      );
      expect(charlieBalance.result).toBeOk(Cl.uint(30));
    });

    it("should reject unauthorized operator transfer", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(charlie), Cl.uint(1), Cl.uint(30)],
        charlie
      );
      expect(result.result).toBeErr(Cl.uint(101)); // ERR-UNAUTHORIZED
    });
  });
});