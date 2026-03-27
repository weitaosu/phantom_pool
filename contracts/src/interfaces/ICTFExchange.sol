// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface for Polymarket's CTF Exchange
interface ICTFExchange {
    function fillOrder(
        address buyer,
        address seller,
        address market,
        uint256 size,
        uint256 price
    ) external;
}
