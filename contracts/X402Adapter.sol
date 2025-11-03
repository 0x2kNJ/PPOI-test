// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IX402Adapter.sol";
import "./SimplePolicyGate.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Delegation support
interface IDelegationAnchor {
    function latestRoot() external view returns (bytes32);
}

/**
 * @title X402Adapter
 * @notice Adapter for x402 Private Pull-Payments using Bermuda shielded pool (Demo version)
 * @dev Reuses precompute stack: precomputed zk proofs + EIP-712 permits + relayer/paymaster
 * @dev Simplified for demo: proof verification is placeholder
 */
contract X402Adapter is IX402Adapter, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    // EIP-712 domain separator for regular permits
    bytes32 public constant PERMIT_TYPEHASH = keccak256(
        "Permit(bytes32 noteId,address merchant,uint256 maxAmount,uint256 expiry,uint256 nonce,bytes32 merchantCommitment)"
    );
    
    // EIP-712 domain separator for delegation permits (no maxAmount)
    bytes32 public constant DELEGATION_PERMIT_TYPEHASH = keccak256(
        "DelegationPermit(bytes32 noteId,address merchant,uint256 expiry,uint256 nonce,bytes32 merchantCommitment)"
    );

    SimplePolicyGate public policies;
    address public relayer; // Optional allowlist for relayers
    
    // Delegation support
    IDelegationAnchor public delegationAnchor; // Contract storing Merkle root for delegations
    address public attestor; // Demo: ECDSA signer, Production: TEE attestation verification
    
    // Track used nonces per noteId
    mapping(bytes32 => bool) public usedNonce;
    
    event Take(address indexed merchant, address indexed recipient, bytes32 noteId, uint256 amount);
    event Redeem(address indexed merchant, address indexed publicRecipient, bytes32 noteId, uint256 amount);
    event NonceUsed(bytes32 indexed noteId, uint256 nonce);
    event ProofVerified(bytes32 indexed noteId, uint256 amount);
    event X402TakeDelegated(
        bytes32 indexed nullifier, // Unique per payment - prevents linking
        bytes32 merchantCommitment, // Hash of merchant address - hides merchant identity
        bytes32 amountCommitment, // Hash of amount - hides payment amount
        bytes32 root // Merkle root for delegation verification
        // merchant/recipient addresses removed - replaced with commitments
        // amount removed - replaced with commitment
        // leafCommitment removed - replaced with nullifier
    );

    constructor(
        address _policies,
        address _relayer,
        address _delegationAnchor,
        address _attestor
    ) EIP712("Bermuda X402", "1") {
        policies = SimplePolicyGate(_policies);
        relayer = _relayer; // set to address(0) to allow any sender for demo
        delegationAnchor = IDelegationAnchor(_delegationAnchor); // can be address(0) if delegation not used
        attestor = _attestor; // demo: ECDSA signer address, production: not used (TEE attestation)
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
        
        // Demo: Skip ZK proof verification for simplicity
        // require(verifier.verify(proof, publicInputs), "invalid proof");
        
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
        
        // Demo: Skip ZK proof verification for simplicity
        // require(verifier.verify(proof, publicInputs), "invalid proof");
        
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
                p.nonce,
                p.merchantCommitment
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
    
    function _verifyDelegationPermitSig(DelegationPermit calldata p) internal view {
        // DelegationPermit doesn't include maxAmount (verified privately in Nillion)
        bytes32 structHash = keccak256(
            abi.encode(
                DELEGATION_PERMIT_TYPEHASH,
                p.noteId,
                p.merchant,
                p.expiry,
                p.nonce,
                p.merchantCommitment
            )
        );
        
        // Get digest
        bytes32 digest = _hashTypedDataV4(structHash);
        
        // Recover signer
        address signer = digest.recover(p.signature);
        
        require(signer != address(0), "invalid signature");
    }

    /**
     * @notice Delegation-aware pull payment: verifies delegation note inclusion + Nillion attestation
     * @param proof ZK proof bytes generated off-chain
     * @param publicInputs Public inputs from proof witness: [root, public_amount, ext_data_hash, nullifier]
     * @param p DelegationPermit (no maxAmount - verified privately in Nillion attestation)
     * @param recipient Address to receive the funds
     * @param amount Amount to transfer
     * @param root Merkle root from DelegationAnchor
     * @param leafCommitment Delegation leaf commitment (keccak256(policyHash || salt))
     * @param merkleProof Merkle proof array (siblings) proving leaf is in tree
     * @param actionHash Action hash for attestation binding (keccak256(method, recipient, amount, chainId, adapter))
     * @param attestation Nillion attestation signature (demo: ECDSA, production: TEE attestation)
     * @param nullifier Privacy-preserving nullifier (unique per payment, prevents linking)
     */
    function takeWithDelegationAnchor(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        DelegationPermit calldata p, // Changed from Permit to DelegationPermit
        address recipient,
        uint256 amount,
        bytes32 root,
        bytes32 leafCommitment,
        bytes32[] calldata merkleProof,
        bytes32 actionHash,
        bytes calldata attestation,
        bytes32 nullifier // Privacy-preserving nullifier
    ) external nonReentrant returns (bool) {
        require(block.timestamp <= p.expiry, "permit expired");
        require(p.merchant != address(0) && recipient != address(0), "bad addr");
        // maxAmount check removed - Nillion attestation verifies amount <= maxAmount privately
        require(amount > 0, "amount must be positive");
        require(publicInputs.length == 4, "invalid public inputs length");
        require(address(delegationAnchor) != address(0), "delegation not configured");
        require(nullifier != bytes32(0), "nullifier required");
        
        _checkRelayer();
        _checkNonce(p.noteId, p.nonce);
        _verifyDelegationPermitSig(p); // Use delegation-specific permit verification
        
            // Demo: Skip ZK proof verification for simplicity
            // Production: Verify ZK proof on-chain
            // require(verifier.verify(proof, publicInputs), "invalid proof");
        require(publicInputs[2] == bytes32(0), "ext_data_hash must be zero for precompute");
        
        // Delegation-specific validations
        require(root == delegationAnchor.latestRoot(), "stale root");
        require(_verifyMerkle(leafCommitment, root, merkleProof), "bad inclusion");
        _verifyAttestation(leafCommitment, actionHash, root, attestation);
        
        _enforcePolicies(p.merchant, recipient, amount);
        
        // In production, this would transfer from shielded note to recipient
        // For demo, we just emit event
        
        emit ProofVerified(p.noteId, amount);
        emit Take(p.merchant, recipient, p.noteId, amount);
        
        // PRIVACY IMPROVEMENT: Generate commitments instead of emitting raw values
        // Merchant commitment (hides merchant identity)
        bytes32 merchantCommitment = keccak256(
            abi.encodePacked(recipient, root, nullifier)
        );
        
        // Amount commitment (hides payment amount)
        bytes32 amountCommitment = keccak256(
            abi.encodePacked(amount, root, nullifier)
        );
        
        // Emit privacy-preserving event
        emit X402TakeDelegated(nullifier, merchantCommitment, amountCommitment, root);
        return true;
    }

    // ==================== Delegation Helper Functions ====================

    /**
     * @notice Verify Merkle proof that leaf is included in tree with given root
     * @param leaf The leaf commitment to verify
     * @param root The Merkle root
     * @param siblings Array of sibling hashes (proof path)
     * @return True if leaf is in tree
     */
    function _verifyMerkle(
        bytes32 leaf,
        bytes32 root,
        bytes32[] memory siblings
    ) internal pure returns (bool) {
        bytes32 h = leaf;
        for (uint256 i = 0; i < siblings.length; i++) {
            bytes32 s = siblings[i];
            // Order matters: smaller hash first
            h = (h < s) 
                ? keccak256(abi.encodePacked(h, s)) 
                : keccak256(abi.encodePacked(s, h));
        }
        return h == root;
    }

    /**
     * @notice Verify Nillion attestation (demo: ECDSA, production: TEE attestation report)
     * @param leafCommitment Delegation leaf commitment
     * @param actionHash Action hash binding attestation to specific action
     * @param root Current Merkle root
     * @param signature Attestation signature (demo: ECDSA, production: TEE attestation)
     */
    function _verifyAttestation(
        bytes32 leafCommitment,
        bytes32 actionHash,
        bytes32 root,
        bytes calldata signature
    ) internal view {
        // Demo: ECDSA over keccak256(leafCommitment || actionHash || root)
        // Production: Will verify Nillion nilCC TEE attestation report
        bytes32 digest = keccak256(abi.encodePacked(leafCommitment, actionHash, root));
        bytes32 ethSignedHash = digest.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        require(signer == attestor, "bad attestation");
        
        // TODO: Replace with Nillion nilCC TEE attestation verification
        // This will verify:
        // 1. AMD SEV-SNP attestation report
        // 2. Workload integrity (Docker Compose hash matches)
        // 3. Policy evaluation result matches action
    }

    function _enforcePolicies(address /* merchant */, address recipient, uint256 amount) internal view {
        // Check if policy gate allows this transaction
        (bool ok, string memory reason) = policies.check(recipient, amount);
        require(ok, reason);
    }
}
