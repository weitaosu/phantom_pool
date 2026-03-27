// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

/**
 * @title DarkPoolArbiter
 * @notice Commit-reveal dark pool with escrow for prediction market trading.
 *         Designed to work with Alkahest conditional escrows when available,
 *         with standalone fallback for hackathon demo.
 *
 * Flow: commit (hash) → reveal (details + USDC escrow) → match → settle
 */
contract DarkPoolArbiter {
    // ── State ───────────────────────────────────────────────────
    address public owner;
    address public matchingEngine;
    IERC20 public usdc;

    enum OrderState { NONE, COMMITTED, REVEALED, MATCHED, SETTLED, CANCELLED }

    struct Commitment {
        address trader;
        bytes32 commitHash;
        uint256 timestamp;
        OrderState state;
    }

    struct RevealedOrder {
        address trader;
        address market;
        bool    isYes;
        uint256 size;           // USDC amount (6 decimals)
        uint256 limitPriceBps;  // 0-10000
        uint256 expiry;
        bytes32 salt;
    }

    struct MatchedPair {
        bytes32 buyOrderId;
        bytes32 sellOrderId;
        uint256 matchedSize;
        uint256 matchedPriceBps;
        bool    settled;
    }

    mapping(bytes32 => Commitment) public commitments;
    mapping(bytes32 => RevealedOrder) public revealedOrders;
    mapping(bytes32 => MatchedPair) public matchedPairs;
    mapping(address => uint256) public nonces;

    // ── Events ──────────────────────────────────────────────────
    event OrderCommitted(bytes32 indexed orderId, address indexed trader, uint256 timestamp);
    event OrderRevealed(bytes32 indexed orderId, address indexed market, bool isYes, uint256 size);
    event OrderMatched(bytes32 indexed pairId, bytes32 buyOrder, bytes32 sellOrder, uint256 size, uint256 price);
    event OrderSettled(bytes32 indexed pairId, bytes32 buyOrder, bytes32 sellOrder);
    event OrderCancelled(bytes32 indexed orderId);

    // ── Constructor ─────────────────────────────────────────────
    constructor(address _usdc, address _matchingEngine) {
        owner = msg.sender;
        usdc = IERC20(_usdc);
        matchingEngine = _matchingEngine;
    }

    // ── Phase 1: COMMIT ─────────────────────────────────────────
    function commitOrder(bytes32 commitHash) external returns (bytes32 orderId) {
        orderId = keccak256(abi.encodePacked(msg.sender, commitHash, block.timestamp, nonces[msg.sender]));
        require(commitments[orderId].state == OrderState.NONE, "Order exists");

        commitments[orderId] = Commitment({
            trader: msg.sender,
            commitHash: commitHash,
            timestamp: block.timestamp,
            state: OrderState.COMMITTED
        });

        nonces[msg.sender]++;
        emit OrderCommitted(orderId, msg.sender, block.timestamp);
    }

    // ── Phase 2: REVEAL ─────────────────────────────────────────
    function revealOrder(
        bytes32 orderId,
        address market,
        bool isYes,
        uint256 size,
        uint256 limitPriceBps,
        uint256 expiry,
        bytes32 salt
    ) external {
        Commitment storage c = commitments[orderId];
        require(c.trader == msg.sender, "Not your order");
        require(c.state == OrderState.COMMITTED, "Wrong state");
        require(block.timestamp <= expiry, "Expired");

        bytes32 expectedHash = keccak256(abi.encodePacked(market, isYes, size, limitPriceBps, expiry, salt));
        require(c.commitHash == expectedHash, "Hash mismatch");

        // Escrow USDC
        require(usdc.transferFrom(msg.sender, address(this), size), "USDC transfer failed");

        revealedOrders[orderId] = RevealedOrder({
            trader: msg.sender,
            market: market,
            isYes: isYes,
            size: size,
            limitPriceBps: limitPriceBps,
            expiry: expiry,
            salt: salt
        });

        c.state = OrderState.REVEALED;
        emit OrderRevealed(orderId, market, isYes, size);
    }

    // ── Phase 3: MATCH (called by matching engine) ──────────────
    function recordAndFulfillMatch(
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        uint256 matchedPriceBps,
        uint256 matchedSize
    ) external onlyMatchingEngine returns (bytes32 pairId) {
        require(commitments[buyOrderId].state == OrderState.REVEALED, "Buy not revealed");
        require(commitments[sellOrderId].state == OrderState.REVEALED, "Sell not revealed");

        RevealedOrder storage buyOrder = revealedOrders[buyOrderId];
        RevealedOrder storage sellOrder = revealedOrders[sellOrderId];
        require(buyOrder.market == sellOrder.market, "Market mismatch");
        require(buyOrder.isYes == true, "Buy must be YES side");
        require(sellOrder.isYes == false, "Sell must be NO side");
        require(buyOrder.limitPriceBps >= sellOrder.limitPriceBps, "Price mismatch");
        require(matchedSize <= buyOrder.size && matchedSize <= sellOrder.size, "Size exceeds order");

        pairId = keccak256(abi.encodePacked(buyOrderId, sellOrderId, block.timestamp));

        matchedPairs[pairId] = MatchedPair({
            buyOrderId: buyOrderId,
            sellOrderId: sellOrderId,
            matchedSize: matchedSize,
            matchedPriceBps: matchedPriceBps,
            settled: false
        });

        commitments[buyOrderId].state = OrderState.MATCHED;
        commitments[sellOrderId].state = OrderState.MATCHED;

        emit OrderMatched(pairId, buyOrderId, sellOrderId, matchedSize, matchedPriceBps);
    }

    // ── Phase 4: SETTLE ─────────────────────────────────────────
    function settleMatch(bytes32 pairId) external onlyMatchingEngine {
        MatchedPair storage pair = matchedPairs[pairId];
        require(!pair.settled, "Already settled");

        RevealedOrder storage buyOrder = revealedOrders[pair.buyOrderId];
        RevealedOrder storage sellOrder = revealedOrders[pair.sellOrderId];

        // Calculate settlement amounts
        uint256 buyerPays = (pair.matchedSize * pair.matchedPriceBps) / 10000;
        uint256 sellerReceives = buyerPays;

        // Transfer USDC: buyer's escrow → seller, remainder back to buyer
        require(usdc.transfer(sellOrder.trader, sellerReceives), "Seller payout failed");
        uint256 buyerRefund = pair.matchedSize - buyerPays;
        if (buyerRefund > 0) {
            require(usdc.transfer(buyOrder.trader, buyerRefund), "Buyer refund failed");
        }

        pair.settled = true;
        commitments[pair.buyOrderId].state = OrderState.SETTLED;
        commitments[pair.sellOrderId].state = OrderState.SETTLED;

        emit OrderSettled(pairId, pair.buyOrderId, pair.sellOrderId);
    }

    // ── CANCEL ──────────────────────────────────────────────────
    function cancelOrder(bytes32 orderId) external {
        Commitment storage c = commitments[orderId];
        require(c.trader == msg.sender, "Not your order");
        require(c.state == OrderState.REVEALED, "Can only cancel revealed");

        RevealedOrder storage order = revealedOrders[orderId];
        require(block.timestamp > order.expiry, "Not expired yet");

        require(usdc.transfer(msg.sender, order.size), "Refund failed");
        c.state = OrderState.CANCELLED;
        emit OrderCancelled(orderId);
    }

    // ── Admin ───────────────────────────────────────────────────
    function setMatchingEngine(address _engine) external onlyOwner {
        matchingEngine = _engine;
    }

    // ── Modifiers ───────────────────────────────────────────────
    modifier onlyMatchingEngine() {
        require(msg.sender == matchingEngine, "Not matching engine");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}
