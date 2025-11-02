// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimplePolicyGate
 * @notice Minimal policy gate for demo purposes: max per-tx and daily limits per user (spend proxy)
 * @dev Non-custodial: only the policy owner (user address) can set or revoke their policy
 */
contract SimplePolicyGate {
    struct Policy {
        uint256 maxTransactionSize; // Maximum amount allowed per transaction
        uint256 dailyLimit;         // Maximum cumulative amount per 24h window
        uint256 dailySpent;         // Spent in current 24h window
        uint256 lastReset;          // Timestamp of last daily window reset
        bool active;                // Whether policy is active
    }

    // user (policy owner) => policy
    mapping(address => Policy) public policies;

    event PolicyUpdated(address indexed user, uint256 maxTx, uint256 dailyLimit, bool active);
    event PolicyConsumed(address indexed user, uint256 amount, uint256 newDailySpent);

    /// @notice Set or update policy. Only the user (policy owner) may call this.
    function setPolicy(
        uint256 maxTransactionSize,
        uint256 dailyLimit,
        bool active
    ) external {
        Policy storage p = policies[msg.sender];
        p.maxTransactionSize = maxTransactionSize;
        p.dailyLimit = dailyLimit;
        p.active = active;
        // Initialize/reset daily window if first-time or inactive->active
        if (p.lastReset == 0 || !p.active) {
            p.lastReset = block.timestamp;
            p.dailySpent = 0;
        }
        emit PolicyUpdated(msg.sender, maxTransactionSize, dailyLimit, active);
    }

    /// @notice View-only check whether an amount is allowed under current policy for a given user
    function check(address user, uint256 amount) external view returns (bool ok, string memory reason) {
        Policy memory p = policies[user];
        if (!p.active) return (false, "POLICY_INACTIVE");

        // Reset window snapshot for view logic
        uint256 snapshotDailySpent = p.dailySpent;
        if (block.timestamp > p.lastReset + 1 days) {
            snapshotDailySpent = 0;
        }

        if (amount > p.maxTransactionSize) return (false, "MAX_TX_EXCEEDED");
        if (snapshotDailySpent + amount > p.dailyLimit) return (false, "DAILY_LIMIT_EXCEEDED");
        return (true, "OK");
    }

    /// @notice Consume policy limits for a user (mutates state). Intended to be called by integrators after successful payment.
    /// @dev Caller-agnostic for demo simplicity; production systems should restrict caller.
    function consume(address user, uint256 amount) external {
        Policy storage p = policies[user];
        require(p.active, "POLICY_INACTIVE");

        // Reset daily window if needed
        if (block.timestamp > p.lastReset + 1 days) {
            p.lastReset = block.timestamp;
            p.dailySpent = 0;
        }

        require(amount <= p.maxTransactionSize, "MAX_TX_EXCEEDED");
        require(p.dailySpent + amount <= p.dailyLimit, "DAILY_LIMIT_EXCEEDED");

        p.dailySpent += amount;
        emit PolicyConsumed(user, amount, p.dailySpent);
    }
}




