// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IX402Adapter
 * @notice Interface for x402 Private Pull-Payments adapter
 */
interface IX402Adapter {
    struct Permit {
        bytes32 noteId;
        address merchant;
        uint256 maxAmount;
        uint256 expiry;
        uint256 nonce;
        bytes signature; // EIP-712 sig by note owner/delegated signer
    }

    /**
     * @notice Execute pull payment from shielded note to recipient
     * @param proof ZK proof bytes for the transaction
     * @param publicInputs Public inputs from the proof witness: [root, public_amount, ext_data_hash, nullifier]
     * @param permit EIP-712 permit authorizing the merchant to pull
     * @param recipient Address to receive the funds (shielded or public)
     * @param amount Amount to transfer
     * @return ok True if successful
     */
    function take(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        Permit calldata permit,
        address recipient,
        uint256 amount
    ) external returns (bool ok);

    /**
     * @notice Redeem from shielded note to public recipient
     * @param proof ZK proof bytes for the transaction
     * @param publicInputs Public inputs from the proof witness: [root, public_amount, ext_data_hash, nullifier]
     * @param permit EIP-712 permit authorizing the merchant to pull
     * @param publicRecipient Public address to receive the funds
     * @param amount Amount to transfer
     * @return ok True if successful
     */
    function redeemToPublic(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        Permit calldata permit,
        address publicRecipient,
        uint256 amount
    ) external returns (bool ok);
}

