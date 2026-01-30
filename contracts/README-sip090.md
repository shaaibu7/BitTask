# SIP-090 NFT Contract

A fully compliant SIP-090 Non-Fungible Token (NFT) implementation for the Stacks blockchain.

## Overview

This contract implements the SIP-090 standard, which defines a common interface for NFTs on Stacks. It provides all required functionality for minting, transferring, and managing NFTs with full ecosystem compatibility.

## Features

- ✅ Full SIP-090 compliance
- ✅ Token minting with access control
- ✅ Safe transfers with validation
- ✅ Approval system for operators
- ✅ Batch operations for efficiency
- ✅ Comprehensive error handling
- ✅ Event emission for ecosystem integration
- ✅ Metadata URI support

## Contract Functions

### Core SIP-090 Functions

- `get-last-token-id()` - Returns the highest minted token ID
- `get-token-uri(token-id)` - Returns metadata URI for a token
- `get-owner(token-id)` - Returns the owner of a token
- `transfer(token-id, sender, recipient)` - Transfers a token

### Management Functions

- `mint(recipient, token-uri)` - Mints a new token (owner only)
- `batch-mint(recipients, uris)` - Mints multiple tokens efficiently
- `approve(spender, token-id)` - Approves an operator for a token
- `transfer-from(token-id, sender, recipient)` - Transfers via approved operator

### Query Functions

- `get-balance(owner)` - Returns token count for an address
- `get-approved(token-id)` - Returns approved operator for a token
- `get-contract-name()` - Returns contract name
- `get-contract-symbol()` - Returns contract symbol
- `get-total-supply()` - Returns total minted tokens

## Usage Examples

### Minting Tokens

```clarity
;; Mint a single token
(contract-call? .sip090-nft mint 'SP1234... "https://example.com/metadata/1")

;; Batch mint multiple tokens
(contract-call? .sip090-nft batch-mint 
  (list 'SP1234... 'SP5678...)
  (list "https://example.com/1" "https://example.com/2"))
```

### Transferring Tokens

```clarity
;; Direct transfer by owner
(contract-call? .sip090-nft transfer u1 tx-sender 'SP1234...)

;; Transfer via approved operator
(contract-call? .sip090-nft approve 'SP-OPERATOR... u1)
(contract-call? .sip090-nft transfer-from u1 'SP-OWNER... 'SP-RECIPIENT...)
```

### Querying Information

```clarity
;; Check token owner
(contract-call? .sip090-nft get-owner u1)

;; Check balance
(contract-call? .sip090-nft get-balance 'SP1234...)

;; Get metadata URI
(contract-call? .sip090-nft get-token-uri u1)
```

## Error Codes

- `u401` - Not authorized
- `u404` - Token not found
- `u400` - Invalid recipient
- `u405` - Invalid token ID
- `u406` - Self transfer not allowed
- `u407` - Invalid URI
- `u408` - Batch size mismatch
- `u409` - Already exists

## Events

The contract emits events for ecosystem integration:

- `nft_mint_event` - When tokens are minted
- `nft_transfer_event` - When tokens are transferred
- `nft_approval_event` - When approvals are granted
- `nft_approval_revoked_event` - When approvals are revoked
- `ownership_transfer_event` - When contract ownership changes

## Testing

Run the test suite:

```bash
clarinet test
```

## Deployment

Deploy to devnet:

```bash
clarinet deployments apply -p deployments/sip090-nft.devnet-plan.yaml
```

## License

MIT License - see LICENSE file for details.