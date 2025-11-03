// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockX402Adapter
 * @notice x402 adapter supporting shielded-to-shielded and shielded-to-public transfers
 * @dev Enables merchants to receive payments to their own shielded addresses (commitments)
 */
contract MockX402Adapter {
    enum RecipientType { PUBLIC, SHIELDED }
    
    event Take(address indexed merchant, address indexed recipient, uint256 amount);
    event TakeShielded(address indexed merchant, bytes32 indexed recipientCommitment, uint256 amount);
    event TakeShieldedWithCommitment(address indexed merchant, bytes32 indexed recipientCommitment, bytes32 amountCommitment, bytes32 nullifier);
    event Redeem(address indexed merchant, address indexed recipient, uint256 amount);

    struct Permit {
        bytes32 noteId;
        address merchant;
        uint256 maxAmount;
        uint256 expiry;
        uint256 nonce;
        bytes signature;
        bytes32 merchantCommitment; // Shielded address for merchant (0x0 = public)
    }

    /**
     * @notice Pull payment from shielded note to recipient (public or shielded)
     * @dev If permit.merchantCommitment is non-zero, payment goes to shielded address
     * @param proof ZK proof (unused in mock)
     * @param publicInputs Public inputs (unused in mock)
     * @param permit EIP-712 permit with optional shielded merchant address
     * @param recipient Public address (used only if merchantCommitment is 0x0)
     * @param amount Amount to transfer
     */
    function take(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        Permit calldata permit,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        require(block.timestamp <= permit.expiry, "permit expired");
        require(amount <= permit.maxAmount, "over max");
        
        // Shielded-to-shielded transfer
        if (permit.merchantCommitment != bytes32(0)) {
            // In production: transfer to shielded commitment via pool
            emit TakeShielded(permit.merchant, permit.merchantCommitment, amount);
        } 
        // Shielded-to-public transfer
        else {
            require(recipient != address(0), "invalid recipient");
            // In production: transfer to public address via pool
            emit Take(permit.merchant, recipient, amount);
        }
        
        return true;
    }

    /**
     * @notice Pull payment with amount commitment (100% privacy)
     * @dev Amount is hidden via commitment, merchant verifies off-chain
     * @param proof ZK proof
     * @param publicInputs Public inputs including nullifier
     * @param permit EIP-712 permit
     * @param amountCommitment Commitment to payment amount (hides exact amount)
     * @param minAmount Minimum acceptable amount (range proof)
     * @param maxAmount Maximum acceptable amount (range proof)
     */
    function takeWithCommitment(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        Permit calldata permit,
        bytes32 amountCommitment,
        uint256 minAmount,
        uint256 maxAmount
    ) external returns (bool) {
        require(block.timestamp <= permit.expiry, "permit expired");
        require(minAmount <= maxAmount, "invalid range");
        
        // Extract nullifier from publicInputs (last element)
        bytes32 nullifier = publicInputs[publicInputs.length - 1];
        
        // Shielded-to-shielded with amount commitment
        if (permit.merchantCommitment != bytes32(0)) {
            // ✅ PRIVACY: Amount is hidden via commitment
            // Merchant verifies commitment off-chain via ZK proof
            emit TakeShieldedWithCommitment(
                permit.merchant,
                permit.merchantCommitment,
                amountCommitment,
                nullifier
            );
        } else {
            revert("Public transfers require takeWithCommitment");
        }
        
        return true;
    }

    function redeemToPublic(
        bytes calldata,
        bytes32[] calldata,
        Permit calldata permit,
        address publicRecipient,
        uint256 amount
    ) external returns (bool) {
        require(block.timestamp <= permit.expiry, "permit expired");
        require(amount <= permit.maxAmount, "over max");
        emit Redeem(permit.merchant, publicRecipient, amount);
        return true;
    }
}
