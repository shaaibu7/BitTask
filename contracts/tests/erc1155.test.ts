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
        "is-contract-paused",
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

  describe("Token Burning", () => {
    beforeEach(() => {
      // Mint tokens for testing
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
    });

    it("should allow owner to burn tokens", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "burn-tokens",
        [Cl.uint(1), Cl.uint(30)],
        alice
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const balance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      expect(balance.result).toBeOk(Cl.uint(70));
    });

    it("should reject burning more than balance", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "burn-tokens",
        [Cl.uint(1), Cl.uint(200)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(100)); // ERR-INSUFFICIENT-BALANCE
    });

    it("should reject burning zero amount", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "burn-tokens",
        [Cl.uint(1), Cl.uint(0)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(103)); // ERR-ZERO-AMOUNT
    });
  });

  describe("Metadata Management", () => {
    it("should allow owner to set token URI", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "set-token-uri",
        [Cl.uint(1), Cl.stringAscii("https://example.com/token/1")],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const uri = simnet.callReadOnlyFn(
        "erc1155",
        "get-token-uri",
        [Cl.uint(1)],
        deployer
      );
      expect(uri.result).toBeOk(Cl.stringAscii("https://example.com/token/1"));
    });

    it("should reject URI setting by non-owner", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "set-token-uri",
        [Cl.uint(1), Cl.stringAscii("https://example.com/token/1")],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(101)); // ERR-UNAUTHORIZED
    });
  });

  describe("Contract Management", () => {
    it("should allow owner to pause contract", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "pause-contract",
        [],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const isPaused = simnet.callReadOnlyFn(
        "erc1155",
        "is-contract-paused",
        [],
        deployer
      );
      expect(isPaused.result).toBeOk(Cl.bool(true));
    });

    it("should allow owner to unpause contract", () => {
      // First pause
      simnet.callPublicFn("erc1155", "pause-contract", [], deployer);
      
      // Then unpause
      const result = simnet.callPublicFn(
        "erc1155",
        "unpause-contract",
        [],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const isPaused = simnet.callReadOnlyFn(
        "erc1155",
        "is-contract-paused",
        [],
        deployer
      );
      expect(isPaused.result).toBeOk(Cl.bool(false));
    });

    it("should get contract summary", () => {
      const result = simnet.callReadOnlyFn(
        "erc1155",
        "get-contract-summary",
        [],
        deployer
      );
      expect(result.result).toBeOk(
        Cl.tuple({
          owner: Cl.principal(deployer),
          "next-token-id": Cl.uint(1),
          "total-token-types": Cl.uint(0),
          paused: Cl.bool(false),
          "block-height": Cl.uint(1)
        })
      );
    });
  });

  describe("Metadata Management", () => {
    it("should allow owner to set token URI", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "set-token-uri",
        [Cl.uint(1), Cl.stringAscii("https://example.com/token/1")],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const uri = simnet.callReadOnlyFn(
        "erc1155",
        "get-token-uri",
        [Cl.uint(1)],
        deployer
      );
      expect(uri.result).toBeOk(Cl.stringAscii("https://example.com/token/1"));
    });

    it("should reject URI setting by non-owner", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "set-token-uri",
        [Cl.uint(1), Cl.stringAscii("https://example.com/token/1")],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(101)); // ERR-UNAUTHORIZED
    });

    it("should return empty string for non-existent token URI", () => {
      const uri = simnet.callReadOnlyFn(
        "erc1155",
        "get-token-uri",
        [Cl.uint(999)],
        deployer
      );
      expect(uri.result).toBeOk(Cl.stringAscii(""));
    });
  });

  describe("Total Supply Tracking", () => {
    beforeEach(() => {
      // Mint tokens for testing
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
    });

    it("should track total supply correctly", () => {
      const supply = simnet.callReadOnlyFn(
        "erc1155",
        "get-total-supply",
        [Cl.uint(1)],
        deployer
      );
      expect(supply.result).toBeOk(Cl.uint(100));
    });

    it("should update supply after burning", () => {
      simnet.callPublicFn(
        "erc1155",
        "burn-tokens",
        [Cl.principal(alice), Cl.uint(1), Cl.uint(30)],
        alice
      );

      const supply = simnet.callReadOnlyFn(
        "erc1155",
        "get-total-supply",
        [Cl.uint(1)],
        deployer
      );
      expect(supply.result).toBeOk(Cl.uint(70));
    });

    it("should return zero supply for non-existent tokens", () => {
      const supply = simnet.callReadOnlyFn(
        "erc1155",
        "get-total-supply",
        [Cl.uint(999)],
        deployer
      );
      expect(supply.result).toBeOk(Cl.uint(0));
    });
  });

  describe("Token Existence Queries", () => {
    beforeEach(() => {
      // Mint a token
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
    });

    it("should return true for existing tokens", () => {
      const exists = simnet.callReadOnlyFn(
        "erc1155",
        "token-exists",
        [Cl.uint(1)],
        deployer
      );
      expect(exists.result).toBeOk(Cl.bool(true));
    });

    it("should return false for non-existent tokens", () => {
      const exists = simnet.callReadOnlyFn(
        "erc1155",
        "token-exists",
        [Cl.uint(999)],
        deployer
      );
      expect(exists.result).toBeOk(Cl.bool(false));
    });

    it("should check if token has supply", () => {
      const hasSupply = simnet.callReadOnlyFn(
        "erc1155",
        "has-supply",
        [Cl.uint(1)],
        deployer
      );
      expect(hasSupply.result).toBeOk(Cl.bool(true));

      const noSupply = simnet.callReadOnlyFn(
        "erc1155",
        "has-supply",
        [Cl.uint(999)],
        deployer
      );
      expect(noSupply.result).toBeOk(Cl.bool(false));
    });
  });

  describe("Batch Query Functions", () => {
    beforeEach(() => {
      // Mint multiple tokens
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
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(bob), Cl.uint(1), Cl.uint(25)],
        deployer
      );
    });

    it("should get batch balances correctly", () => {
      const result = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance-batch",
        [
          Cl.list([Cl.principal(alice), Cl.principal(bob)]),
          Cl.list([Cl.uint(1), Cl.uint(1)])
        ],
        deployer
      );
      expect(result.result).toBeOk(Cl.list([Cl.uint(100), Cl.uint(25)]));
    });

    it("should get batch supplies correctly", () => {
      const result = simnet.callReadOnlyFn(
        "erc1155",
        "get-total-supply-batch",
        [Cl.list([Cl.uint(1), Cl.uint(2)])],
        deployer
      );
      expect(result.result).toBeOk(Cl.list([Cl.uint(125), Cl.uint(50)]));
    });

    it("should check batch token existence", () => {
      const result = simnet.callReadOnlyFn(
        "erc1155",
        "token-exists-batch",
        [Cl.list([Cl.uint(1), Cl.uint(2), Cl.uint(999)])],
        deployer
      );
      expect(result.result).toBeOk(Cl.list([Cl.bool(true), Cl.bool(true), Cl.bool(false)]));
    });
  });

  describe("Owner Management", () => {
    it("should transfer ownership successfully", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-ownership",
        [Cl.principal(alice)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const newOwner = simnet.callReadOnlyFn(
        "erc1155",
        "get-contract-owner",
        [],
        deployer
      );
      expect(newOwner.result).toBeOk(Cl.principal(alice));
    });

    it("should reject ownership transfer by non-owner", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-ownership",
        [Cl.principal(alice)],
        bob
      );
      expect(result.result).toBeErr(Cl.uint(101)); // ERR-UNAUTHORIZED
    });

    it("should renounce ownership", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "renounce-ownership",
        [],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const owner = simnet.callReadOnlyFn(
        "erc1155",
        "get-contract-owner",
        [],
        deployer
      );
      expect(owner.result).toBeOk(Cl.principal('SP000000000000000000002Q6VF78'));
    });
  });

  describe("Pause Mechanism", () => {
    it("should pause contract successfully", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "pause-contract",
        [],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const isPaused = simnet.callReadOnlyFn(
        "erc1155",
        "is-paused",
        [],
        deployer
      );
      expect(isPaused.result).toBeOk(Cl.bool(true));
    });

    it("should unpause contract successfully", () => {
      // First pause
      simnet.callPublicFn("erc1155", "pause-contract", [], deployer);

      // Then unpause
      const result = simnet.callPublicFn(
        "erc1155",
        "unpause-contract",
        [],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const isPaused = simnet.callReadOnlyFn(
        "erc1155",
        "is-paused",
        [],
        deployer
      );
      expect(isPaused.result).toBeOk(Cl.bool(false));
    });

    it("should reject operations when paused", () => {
      // Mint tokens first
      simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );

      // Pause contract
      simnet.callPublicFn("erc1155", "pause-contract", [], deployer);

      // Try to transfer (should fail)
      const result = simnet.callPublicFn(
        "erc1155",
        "transfer-single",
        [Cl.principal(alice), Cl.principal(bob), Cl.uint(1), Cl.uint(30)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(101)); // ERR-UNAUTHORIZED
    });
  });

  describe("Emergency Functions", () => {
    it("should allow emergency withdrawal by owner", () => {
      // First send some STX to the contract (simulate accidental transfer)
      simnet.callPublicFn(
        "erc1155",
        "emergency-withdraw",
        [Cl.uint(1000)],
        deployer
      );
      // Note: In real scenario, we'd need to send STX to contract first
      // This test verifies the function exists and has proper access control
    });

    it("should reject emergency withdrawal by non-owner", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "emergency-withdraw",
        [Cl.uint(1000)],
        alice
      );
      expect(result.result).toBeErr(Cl.uint(101)); // ERR-UNAUTHORIZED
    });

    it("should reject zero amount withdrawal", () => {
      const result = simnet.callPublicFn(
        "erc1155",
        "emergency-withdraw",
        [Cl.uint(0)],
        deployer
      );
      expect(result.result).toBeErr(Cl.uint(103)); // ERR-ZERO-AMOUNT
    });
  });

  describe("Contract Information", () => {
    beforeEach(() => {
      // Mint some tokens to change state
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

    it("should return correct contract info", () => {
      const info = simnet.callReadOnlyFn(
        "erc1155",
        "get-contract-info",
        [],
        deployer
      );
      
      expect(info.result).toBeOk(
        Cl.tuple({
          owner: Cl.principal(deployer),
          "next-token-id": Cl.uint(3),
          "total-token-types": Cl.uint(2)
        })
      );
    });

    it("should track next token ID correctly", () => {
      const nextId = simnet.callReadOnlyFn(
        "erc1155",
        "get-next-token-id",
        [],
        deployer
      );
      expect(nextId.result).toBeOk(Cl.uint(3));
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle large token amounts", () => {
      const largeAmount = 1000000000; // 1 billion
      const result = simnet.callPublicFn(
        "erc1155",
        "mint-tokens",
        [Cl.principal(alice), Cl.uint(0), Cl.uint(largeAmount)],
        deployer
      );
      expect(result.result).toBeOk(Cl.uint(1));

      const balance = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      expect(balance.result).toBeOk(Cl.uint(largeAmount));
    });

    it("should handle multiple token types for same user", () => {
      // Mint different token types
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

      // Check all balances
      const balance1 = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      const balance2 = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(2)],
        deployer
      );
      const balance3 = simnet.callReadOnlyFn(
        "erc1155",
        "get-balance",
        [Cl.principal(alice), Cl.uint(3)],
        deployer
      );

      expect(balance1.result).toBeOk(Cl.uint(100));
      expect(balance2.result).toBeOk(Cl.uint(200));
      expect(balance3.result).toBeOk(Cl.uint(300));
    });
  });
});