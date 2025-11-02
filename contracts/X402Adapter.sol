// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IX402Adapter.sol";
import "./SimplePolicyGate.sol";
import "../lib/precompute-circuit/HonkVerifier.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

/**
 * @title X402Adapter
 * @notice Adapter for x402 Private Pull-Payments using Bermuda shielded pool (Demo version)
 * @dev Reuses precompute stack: precomputed zk proofs + EIP-712 permits + relayer/paymaster
 * @dev Simplified for demo: proof verification is placeholder
 */
contract X402Adapter is IX402Adapter, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // EIP-712 domain separator
    bytes32 public constant PERMIT_TYPEHASH = keccak256(
        "Permit(bytes32 noteId,address merchant,uint256 maxAmount,uint256 expiry,uint256 nonce)"
    );

    SimplePolicyGate public policies;
    IVerifier public verifier; // HonkVerifier for on-chain proof verification
    address public relayer; // Optional allowlist for relayers
    address public pool; // Bermuda pool contract address (demo: unused)
    
    // Track used nonces per noteId
    mapping(bytes32 => bool) public usedNonce;
    
    event Take(address indexed merchant, address indexed recipient, bytes32 noteId, uint256 amount);
    event Redeem(address indexed merchant, address indexed publicRecipient, bytes32 noteId, uint256 amount);
    event NonceUsed(bytes32 indexed noteId, uint256 nonce);
    event ProofVerified(bytes32 indexed noteId, uint256 amount);

    constructor(
        address _policies,
        address _verifier,
        address _relayer
    ) EIP712("Bermuda X402", "1") {
        policies = SimplePolicyGate(_policies);
        verifier = IVerifier(_verifier);
        relayer = _relayer; // set to address(0) to allow any sender for demo
    }

    /**
     * @notice Pull payment from shielded note to recipient
     * @param proof ZK proof bytes generated off-chain
     * @param publicInputs Public inputs from proof witness: [root, public_amount, ext_data_hash, nullifier]
     * @param p EIP-712 permit authorizing the merchant to pull
     * @param recipient Address to receive the funds
     * @param amount Amount to transfer
     */
    function take(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        Permit calldata p,
        address recipient,
        uint256 amount
    ) external nonReentrant returns (bool) {
        require(block.timestamp <= p.expiry, "permit expired");
        require(p.merchant != address(0) && recipient != address(0), "bad addr");
        require(amount <= p.maxAmount, "over max");
        require(publicInputs.length == 4, "invalid public inputs length");
        
        _checkRelayer();
        _checkNonce(p.noteId, p.nonce);
        _verifyPermitSig(p);
        
        // Verify ZK proof on-chain using HonkVerifier with actual public inputs from witness
        require(verifier.verify(proof, publicInputs), "invalid proof");
        
        // Verify public inputs match expectations
        // publicInputs[0] = root (merkle root)
        // publicInputs[1] = public_amount (should be negative of amount in field)
        // publicInputs[2] = ext_data_hash (should be 0 for precompute)
        // publicInputs[3] = nullifier (used for double-spend prevention)
        require(publicInputs[2] == bytes32(0), "ext_data_hash must be zero for precompute");
        
        _enforcePolicies(p.merchant, recipient, amount);
        
        // In production, this would transfer from shielded note to recipient
        // For demo, we just emit event
        
        emit ProofVerified(p.noteId, amount);
        emit Take(p.merchant, recipient, p.noteId, amount);
        return true;
    }

    /**
     * @notice Pull payment from shielded note to public recipient
     * @param proof ZK proof bytes generated off-chain
     * @param publicInputs Public inputs from proof witness: [root, public_amount, ext_data_hash, nullifier]
     * @param p EIP-712 permit authorizing the merchant to pull
     * @param publicRecipient Public address to receive the funds
     * @param amount Amount to transfer
     */
    function redeemToPublic(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        Permit calldata p,
        address publicRecipient,
        uint256 amount
    ) external nonReentrant returns (bool) {
        require(block.timestamp <= p.expiry, "permit expired");
        require(publicRecipient != address(0), "bad recipient");
        require(amount <= p.maxAmount, "over max");
        require(publicInputs.length == 4, "invalid public inputs length");
        
        _checkRelayer();
        _checkNonce(p.noteId, p.nonce);
        _verifyPermitSig(p);
        
        // Verify ZK proof on-chain using HonkVerifier with actual public inputs from witness
        require(verifier.verify(proof, publicInputs), "invalid proof");
        
        // Verify public inputs match expectations
        require(publicInputs[2] == bytes32(0), "ext_data_hash must be zero for precompute");
        
        _enforcePolicies(p.merchant, publicRecipient, amount);
        
        // In production: transfer from shielded note to public recipient
        // For demo, we just emit event
        
        emit ProofVerified(p.noteId, amount);
        emit Redeem(p.merchant, publicRecipient, p.noteId, amount);
        return true;
    }

    // ==================== Internal Functions ====================

    function _checkRelayer() internal view {
        if (relayer != address(0)) {
            require(msg.sender == relayer, "relayer only");
        }
    }

    function _checkNonce(bytes32 noteId, uint256 nonce) internal {
        bytes32 key = keccak256(abi.encodePacked(noteId, nonce));
        require(!usedNonce[key], "nonce used");
        usedNonce[key] = true;
        emit NonceUsed(noteId, nonce);
    }

    function _verifyPermitSig(Permit calldata p) internal view {
        // Build EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                p.noteId,
                p.merchant,
                p.maxAmount,
                p.expiry,
                p.nonce
            )
        );
        
        // Get digest
        bytes32 digest = _hashTypedDataV4(structHash);
        
        // Recover signer
        address signer = digest.recover(p.signature);
        
        // In production, verify that signer owns noteId or is authorized delegate
        // For demo, we just verify signature is valid (signer != address(0))
        require(signer != address(0), "invalid signature");
    }

    function _enforcePolicies(address /* merchant */, address recipient, uint256 amount) internal view {
        // Check if policy gate allows this transaction
        (bool ok, string memory reason) = policies.check(recipient, amount);
        require(ok, reason);
    }
}
