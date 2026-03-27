// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DarkPoolTron
 * @notice Dark pool for prediction markets on TRON with USDT TRC-20 settlement.
 *         Two-role model: Traders submit private orders, Market Makers provide liquidity.
 *         Designed for TRON Nile testnet deployment via TronIDE.
 */
contract DarkPoolTron {
    address public owner;
    address public matchingEngine;

    // TRC-20 USDT interface (same as ERC-20)
    address public usdt;

    enum OrderState { NONE, COMMITTED, REVEALED, MATCHED, SETTLED, CANCELLED }

    struct Commitment {
        address trader;
        bytes32 commitHash;
        uint256 blockNum;
        OrderState state;
    }

    struct RevealedOrder {
        address trader;
        bool    isYes;
        uint256 size;
        uint256 limitPriceBps;
        uint256 expiry;
    }

    struct MatchedPair {
        bytes32 buyOrderId;
        bytes32 sellOrderId;
        uint256 matchedSize;
        uint256 matchedPriceBps;
        bool    settled;
    }

    // Market Maker state
    mapping(address => bool) public isMarketMaker;
    mapping(address => uint256) public mmBalances;
    mapping(address => uint256) public mmEarnedFees;

    mapping(bytes32 => Commitment) public commitments;
    mapping(bytes32 => RevealedOrder) public revealedOrders;
    mapping(bytes32 => MatchedPair) public matchedPairs;
    mapping(address => uint256) public nonces;

    uint256 public constant SETTLEMENT_FEE_BPS = 10; // 0.1% fee

    // Events
    event OrderCommitted(bytes32 indexed orderId, address indexed trader);
    event OrderRevealed(bytes32 indexed orderId, bool isYes, uint256 size);
    event OrderMatched(bytes32 indexed pairId, uint256 size, uint256 price);
    event MatchSettled(bytes32 indexed pairId, address buyer, address seller, uint256 size, uint256 price);
    event LiquidityDeposited(address indexed mm, uint256 amount);
    event LiquidityWithdrawn(address indexed mm, uint256 amount);

    constructor(address _usdt, address _matchingEngine) {
        owner = msg.sender;
        usdt = _usdt;
        matchingEngine = _matchingEngine;
    }

    // ── Market Maker Functions ──────────────────────────────────

    function depositLiquidity(uint256 amount) external {
        require(amount > 0, "Zero amount");
        (bool ok,) = usdt.call(abi.encodeWithSignature(
            "transferFrom(address,address,uint256)", msg.sender, address(this), amount
        ));
        require(ok, "USDT transfer failed");

        mmBalances[msg.sender] += amount;
        isMarketMaker[msg.sender] = true;
        emit LiquidityDeposited(msg.sender, amount);
    }

    function withdrawLiquidity(uint256 amount) external {
        require(mmBalances[msg.sender] >= amount, "Insufficient balance");
        mmBalances[msg.sender] -= amount;
        if (mmBalances[msg.sender] == 0) isMarketMaker[msg.sender] = false;

        (bool ok,) = usdt.call(abi.encodeWithSignature(
            "transfer(address,uint256)", msg.sender, amount
        ));
        require(ok, "USDT transfer failed");
        emit LiquidityWithdrawn(msg.sender, amount);
    }

    // ── Trader Functions ────────────────────────────────────────

    function commitOrder(bytes32 commitHash) external returns (bytes32 orderId) {
        orderId = keccak256(abi.encodePacked(msg.sender, commitHash, block.number, nonces[msg.sender]));
        require(commitments[orderId].state == OrderState.NONE, "Exists");

        commitments[orderId] = Commitment({
            trader: msg.sender,
            commitHash: commitHash,
            blockNum: block.number,
            state: OrderState.COMMITTED
        });

        nonces[msg.sender]++;
        emit OrderCommitted(orderId, msg.sender);
    }

    function revealOrder(
        bytes32 orderId,
        bool isYes,
        uint256 size,
        uint256 limitPriceBps,
        uint256 expiry,
        bytes32 salt
    ) external {
        Commitment storage c = commitments[orderId];
        require(c.trader == msg.sender, "Not yours");
        require(c.state == OrderState.COMMITTED, "Wrong state");

        bytes32 expected = keccak256(abi.encodePacked(isYes, size, limitPriceBps, expiry, salt));
        require(c.commitHash == expected, "Hash mismatch");

        // Escrow USDT
        (bool ok,) = usdt.call(abi.encodeWithSignature(
            "transferFrom(address,address,uint256)", msg.sender, address(this), size
        ));
        require(ok, "USDT transfer failed");

        revealedOrders[orderId] = RevealedOrder({
            trader: msg.sender,
            isYes: isYes,
            size: size,
            limitPriceBps: limitPriceBps,
            expiry: expiry
        });

        c.state = OrderState.REVEALED;
        emit OrderRevealed(orderId, isYes, size);
    }

    // ── Matching & Settlement ───────────────────────────────────

    function executeMatch(
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        uint256 matchedSize,
        uint256 matchedPriceBps
    ) external onlyMatchingEngine returns (bytes32 pairId) {
        require(commitments[buyOrderId].state == OrderState.REVEALED, "Buy not revealed");
        require(commitments[sellOrderId].state == OrderState.REVEALED, "Sell not revealed");

        pairId = keccak256(abi.encodePacked(buyOrderId, sellOrderId, block.number));

        matchedPairs[pairId] = MatchedPair({
            buyOrderId: buyOrderId,
            sellOrderId: sellOrderId,
            matchedSize: matchedSize,
            matchedPriceBps: matchedPriceBps,
            settled: false
        });

        // Settle atomically
        RevealedOrder storage buy = revealedOrders[buyOrderId];
        RevealedOrder storage sell = revealedOrders[sellOrderId];

        uint256 buyerPays = (matchedSize * matchedPriceBps) / 10000;
        uint256 fee = (buyerPays * SETTLEMENT_FEE_BPS) / 10000;

        // Transfer to seller (minus fee)
        (bool ok1,) = usdt.call(abi.encodeWithSignature(
            "transfer(address,uint256)", sell.trader, buyerPays - fee
        ));
        require(ok1, "Seller payout failed");

        // Refund buyer's excess
        uint256 buyerRefund = matchedSize - buyerPays;
        if (buyerRefund > 0) {
            (bool ok2,) = usdt.call(abi.encodeWithSignature(
                "transfer(address,uint256)", buy.trader, buyerRefund
            ));
            require(ok2, "Buyer refund failed");
        }

        matchedPairs[pairId].settled = true;
        commitments[buyOrderId].state = OrderState.SETTLED;
        commitments[sellOrderId].state = OrderState.SETTLED;

        emit MatchSettled(pairId, buy.trader, sell.trader, matchedSize, matchedPriceBps);
        emit OrderMatched(pairId, matchedSize, matchedPriceBps);
    }

    function cancelOrder(bytes32 orderId) external {
        Commitment storage c = commitments[orderId];
        require(c.trader == msg.sender, "Not yours");
        require(c.state == OrderState.REVEALED, "Wrong state");
        require(block.number > revealedOrders[orderId].expiry, "Not expired");

        (bool ok,) = usdt.call(abi.encodeWithSignature(
            "transfer(address,uint256)", msg.sender, revealedOrders[orderId].size
        ));
        require(ok, "Refund failed");
        c.state = OrderState.CANCELLED;
    }

    modifier onlyMatchingEngine() {
        require(msg.sender == matchingEngine, "Not engine");
        _;
    }
}
