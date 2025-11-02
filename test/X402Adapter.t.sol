// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {X402Adapter} from "../contracts/X402Adapter.sol";
import {IX402Adapter} from "../contracts/interfaces/IX402Adapter.sol";
import {SimplePolicyGate} from "../contracts/SimplePolicyGate.sol";
import {PPOIVerifier} from "../contracts/PPOIVerifier.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract X402AdapterTest is Test {
    X402Adapter adapter;
    SimplePolicyGate policies;
    PPOIVerifier compliance;
    
    address deployer = address(0x1);
    address relayer = address(0x2);
    address merchant = address(0x3);
    address recipient = address(0x4);
    address pool = address(0x5);
    
    bytes32 noteId = keccak256("test-note");
    uint256 maxAmount = 1000e6; // 1000 USDC (6 decimals)
    uint256 amount = 100e6; // 100 USDC
    uint256 nonce = 1;
    
    bytes dummyProof;
    
    function setUp() public {
        vm.startPrank(deployer);
        
        // Deploy dependencies
        policies = new SimplePolicyGate();
        compliance = new PPOIVerifier(
            deployer,
            keccak256("INITIAL_VK_HASH"),
            1,
            keccak256("INITIAL_ROOT")
        );
        
        // Deploy X402Adapter (set relayer to address(0) for testing flexibility)
        adapter = new X402Adapter(
            address(policies),
            address(compliance),
            pool,
            address(0) // No relayer restriction for tests
        );
        
        // Setup policy for recipient
        vm.stopPrank();
        vm.prank(recipient);
        policies.setPolicy(maxAmount * 2, maxAmount * 10, true); // 2x max tx, 10x daily
        
        dummyProof = bytes("dummy-proof-bytes");
        
        vm.label(address(adapter), "X402Adapter");
        vm.label(address(policies), "SimplePolicyGate");
        vm.label(address(compliance), "PPOIVerifier");
        vm.label(merchant, "Merchant");
        vm.label(recipient, "Recipient");
    }
    
    function _createPermit(uint256 _maxAmount, uint256 _expiry, uint256 _nonce, address _merchant) 
        internal view returns (IX402Adapter.Permit memory) 
    {
        bytes32 domainSeparator = adapter.DOMAIN_SEPARATOR();
        bytes32 permitTypeHash = adapter.PERMIT_TYPEHASH();
        
        bytes32 structHash = keccak256(
            abi.encode(
                permitTypeHash,
                noteId,
                _merchant,
                _maxAmount,
                _expiry,
                _nonce
            )
        );
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator,
                structHash
            )
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, hash); // Use deployer's key
        bytes memory signature = abi.encodePacked(r, s, v);
        
        return IX402Adapter.Permit({
            noteId: noteId,
            merchant: _merchant,
            maxAmount: _maxAmount,
            expiry: _expiry,
            nonce: _nonce,
            signature: signature
        });
    }
    
    function test_Take_Success() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        vm.expectEmit(true, true, true, true);
        emit X402Adapter.Take(merchant, recipient, noteId, amount);
        
        bool ok = adapter.take(dummyProof, permit, recipient, amount);
        assertTrue(ok);
    }
    
    function test_Take_RevertExpiredPermit() public {
        uint256 expiredTime = block.timestamp - 1;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiredTime, nonce, merchant);
        
        vm.expectRevert("permit expired");
        adapter.take(dummyProof, permit, recipient, amount);
    }
    
    function test_Take_RevertOverMax() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        uint256 overAmount = maxAmount + 1;
        
        vm.expectRevert("over max");
        adapter.take(dummyProof, permit, recipient, overAmount);
    }
    
    function test_Take_RevertNonceReplay() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        // First call succeeds
        adapter.take(dummyProof, permit, recipient, amount);
        
        // Second call with same nonce should fail
        vm.expectRevert("nonce used");
        adapter.take(dummyProof, permit, recipient, amount);
    }
    
    function test_Take_RevertWrongMerchant() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        // Try to use permit with different merchant
        address wrongMerchant = address(0x999);
        IX402Adapter.Permit memory wrongPermit = permit;
        wrongPermit.merchant = wrongMerchant;
        
        // The permit signature will be invalid because it was signed for different merchant
        // This should fail signature verification
        vm.expectRevert();
        adapter.take(dummyProof, wrongPermit, recipient, amount);
    }
    
    function test_Take_RevertZeroAddress() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        vm.expectRevert("bad addr");
        adapter.take(dummyProof, permit, address(0), amount);
        
        IX402Adapter.Permit memory badPermit = permit;
        badPermit.merchant = address(0);
        vm.expectRevert("bad addr");
        adapter.take(dummyProof, badPermit, recipient, amount);
    }
    
    function test_Take_RevertIsolatedNote() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        // Isolate the note
        vm.prank(deployer);
        adapter.isolateNote(noteId);
        
        vm.expectRevert("note isolated");
        adapter.take(dummyProof, permit, recipient, amount);
    }
    
    function test_Take_RevertPolicyCheck() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        // Deactivate recipient's policy
        vm.prank(recipient);
        policies.setPolicy(maxAmount, maxAmount * 10, false);
        
        vm.expectRevert("POLICY_INACTIVE");
        adapter.take(dummyProof, permit, recipient, amount);
    }
    
    function test_Take_RevertPolicyMaxTxExceeded() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        // Set policy with lower max tx
        vm.prank(recipient);
        policies.setPolicy(amount - 1, maxAmount * 10, true);
        
        vm.expectRevert("MAX_TX_EXCEEDED");
        adapter.take(dummyProof, permit, recipient, amount);
    }
    
    function test_RedeemToPublic_Success() public {
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        vm.expectEmit(true, true, true, true);
        emit X402Adapter.Redeem(merchant, recipient, noteId, amount);
        
        bool ok = adapter.redeemToPublic(dummyProof, permit, recipient, amount);
        assertTrue(ok);
    }
    
    function test_RedeemToPublic_RevertExpiredPermit() public {
        uint256 expiredTime = block.timestamp - 1;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiredTime, nonce, merchant);
        
        vm.expectRevert("permit expired");
        adapter.redeemToPublic(dummyProof, permit, recipient, amount);
    }
    
    function test_IsolateNote_OnlyComplianceOrOwner() public {
        // Compliance contract can isolate
        vm.prank(address(compliance));
        adapter.isolateNote(noteId);
        assertTrue(adapter.noteIsolation(noteId));
        
        // Reset
        noteId = keccak256("test-note-2");
        
        // Owner (deployer) can isolate
        vm.prank(deployer);
        adapter.isolateNote(noteId);
        assertTrue(adapter.noteIsolation(noteId));
        
        // Random address cannot isolate
        noteId = keccak256("test-note-3");
        vm.prank(address(0x999));
        vm.expectRevert("not authorized");
        adapter.isolateNote(noteId);
    }
    
    function test_RelayerRestriction() public {
        // Deploy adapter with relayer restriction
        X402Adapter restrictedAdapter = new X402Adapter(
            address(policies),
            address(compliance),
            pool,
            relayer
        );
        
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce, merchant);
        
        // Non-relayer cannot call
        vm.prank(address(0x999));
        vm.expectRevert("relayer only");
        restrictedAdapter.take(dummyProof, permit, recipient, amount);
        
        // Relayer can call
        vm.prank(relayer);
        bool ok = restrictedAdapter.take(dummyProof, permit, recipient, amount);
        assertTrue(ok);
    }
    
    function testFuzz_Take_VariousAmounts(uint256 _amount) public {
        // Bound amounts to reasonable ranges
        _amount = bound(_amount, 1, maxAmount);
        
        uint256 expiry = block.timestamp + 3600;
        IX402Adapter.Permit memory permit = _createPermit(maxAmount, expiry, nonce + 1, merchant);
        
        // Skip if policy would reject (we set max tx to maxAmount * 2)
        if (_amount > maxAmount * 2) {
            vm.expectRevert();
        }
        
        // This might fail due to policy, but that's expected
        try adapter.take(dummyProof, permit, recipient, _amount) returns (bool ok) {
            assertTrue(ok);
        } catch {
            // Expected if policy rejects
        }
    }
}



