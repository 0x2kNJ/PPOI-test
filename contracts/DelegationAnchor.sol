// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DelegationAnchor
 * @notice Stores the latest Merkle root posted by the Bermuda pool or authorized poster
 * @dev Used for verifying delegation leaf commitments are included in the pool's Merkle tree
 */
contract DelegationAnchor {
  address public immutable poolOrPoster;
  bytes32 public latestRoot;

  event RootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot, address indexed updater);

  /**
   * @param _poolOrPoster Address authorized to update the root (Bermuda pool or delegated poster)
   * @param _initialRoot Initial Merkle root (can be zero for empty tree)
   */
  constructor(address _poolOrPoster, bytes32 _initialRoot) {
    require(_poolOrPoster != address(0), "invalid poster");
    poolOrPoster = _poolOrPoster;
    latestRoot = _initialRoot;
    emit RootUpdated(bytes32(0), _initialRoot, address(0));
  }

  /**
   * @notice Update the Merkle root (only callable by pool or authorized poster)
   * @param newRoot New Merkle root from the pool
   */
  function updateRoot(bytes32 newRoot) external {
    require(msg.sender == poolOrPoster, "only poster");
    bytes32 oldRoot = latestRoot;
    latestRoot = newRoot;
    emit RootUpdated(oldRoot, newRoot, msg.sender);
  }

  /**
   * @notice Get the current Merkle root
   * @return Current root stored in contract
   */
  function getRoot() external view returns (bytes32) {
    return latestRoot;
  }
}

