use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("BxuyonCEw9nnh2qKPUURvx7E8mDJ2CGH1jenxhpjsriC");

#[program]
pub mod dark_pool {
    use super::*;

    /// Phase 1: Commit an order hash on-chain (no details revealed)
    pub fn commit_order(ctx: Context<CommitOrder>, commit_hash: [u8; 32]) -> Result<()> {
        let commitment = &mut ctx.accounts.commitment;
        commitment.trader = ctx.accounts.trader.key();
        commitment.commit_hash = commit_hash;
        commitment.timestamp = Clock::get()?.unix_timestamp;
        commitment.state = OrderState::Committed;
        commitment.nonce = ctx.accounts.trader_state.nonce;
        commitment.bump = ctx.bumps.commitment;

        let trader_state = &mut ctx.accounts.trader_state;
        trader_state.nonce += 1;

        msg!("OrderCommitted: trader={} nonce={}", commitment.trader, commitment.nonce);
        Ok(())
    }

    /// Phase 2: Reveal order details, lock USDC in escrow
    pub fn reveal_order(
        ctx: Context<RevealOrder>,
        market: Pubkey,
        is_yes: bool,
        size: u64,
        limit_price_bps: u16,
        expiry: i64,
        salt: [u8; 32],
    ) -> Result<()> {
        let commitment = &mut ctx.accounts.commitment;

        // Verify hash
        let hash_input = [
            market.as_ref(),
            &[is_yes as u8],
            &size.to_le_bytes(),
            &limit_price_bps.to_le_bytes(),
            &expiry.to_le_bytes(),
            &salt,
        ].concat();
        let computed = anchor_lang::solana_program::keccak::hash(&hash_input);
        require!(computed.0 == commitment.commit_hash, ErrorCode::HashMismatch);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp <= expiry, ErrorCode::OrderExpired);

        // Transfer USDC to escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.trader_usdc.to_account_info(),
                    to: ctx.accounts.escrow_usdc.to_account_info(),
                    authority: ctx.accounts.trader.to_account_info(),
                },
            ),
            size,
        )?;

        let order = &mut ctx.accounts.order;
        order.trader = ctx.accounts.trader.key();
        order.market = market;
        order.is_yes = is_yes;
        order.size = size;
        order.limit_price_bps = limit_price_bps;
        order.expiry = expiry;
        order.state = OrderState::Revealed;
        order.commitment = ctx.accounts.commitment.key();
        order.bump = ctx.bumps.order;

        commitment.state = OrderState::Revealed;

        msg!("OrderRevealed: market={} isYes={} size={} price={}", market, is_yes, size, limit_price_bps);
        Ok(())
    }

    /// Phase 3: Settle a matched pair (called by matching engine)
    pub fn settle_match(
        ctx: Context<SettleMatch>,
        matched_size: u64,
        matched_price_bps: u16,
    ) -> Result<()> {
        let buy_order = &mut ctx.accounts.buy_order;
        let sell_order = &mut ctx.accounts.sell_order;

        require!(buy_order.is_yes, ErrorCode::InvalidSide);
        require!(!sell_order.is_yes, ErrorCode::InvalidSide);
        require!(buy_order.market == sell_order.market, ErrorCode::MarketMismatch);
        require!(buy_order.limit_price_bps >= sell_order.limit_price_bps, ErrorCode::PriceMismatch);

        // Calculate settlement
        let buyer_pays = (matched_size as u128 * matched_price_bps as u128 / 10000) as u64;
        let seller_receives = buyer_pays;
        let buyer_refund = matched_size.saturating_sub(buyer_pays);

        // Transfer from escrow to seller
        let escrow_seeds = &[b"escrow".as_ref(), &[ctx.accounts.escrow_usdc.bump]];
        let signer = &[&escrow_seeds[..]];

        if seller_receives > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_usdc.to_account_info(),
                        to: ctx.accounts.seller_usdc.to_account_info(),
                        authority: ctx.accounts.escrow_authority.to_account_info(),
                    },
                    signer,
                ),
                seller_receives,
            )?;
        }

        // Refund buyer's excess
        if buyer_refund > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_usdc.to_account_info(),
                        to: ctx.accounts.buyer_usdc.to_account_info(),
                        authority: ctx.accounts.escrow_authority.to_account_info(),
                    },
                    signer,
                ),
                buyer_refund,
            )?;
        }

        buy_order.state = OrderState::Settled;
        sell_order.state = OrderState::Settled;

        msg!("Settled match: {} USDC at {} bps", matched_size, matched_price_bps);
        Ok(())
    }
}

// ── Accounts ────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CommitOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(
        init,
        payer = trader,
        space = 8 + OrderCommitment::INIT_SPACE,
        seeds = [b"commit", trader.key().as_ref(), &trader_state.nonce.to_le_bytes()],
        bump
    )]
    pub commitment: Account<'info, OrderCommitment>,

    #[account(
        init_if_needed,
        payer = trader,
        space = 8 + TraderState::INIT_SPACE,
        seeds = [b"trader", trader.key().as_ref()],
        bump
    )]
    pub trader_state: Account<'info, TraderState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(mut, has_one = trader)]
    pub commitment: Account<'info, OrderCommitment>,

    #[account(
        init,
        payer = trader,
        space = 8 + RevealedOrderAccount::INIT_SPACE,
        seeds = [b"order", commitment.key().as_ref()],
        bump
    )]
    pub order: Account<'info, RevealedOrderAccount>,

    #[account(mut, token::authority = trader)]
    pub trader_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    pub matching_engine: Signer<'info>,

    #[account(mut)]
    pub buy_order: Account<'info, RevealedOrderAccount>,

    #[account(mut)]
    pub sell_order: Account<'info, RevealedOrderAccount>,

    #[account(mut)]
    pub escrow_usdc: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for escrow
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub buyer_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ── Account Data ────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct OrderCommitment {
    pub trader: Pubkey,
    pub commit_hash: [u8; 32],
    pub timestamp: i64,
    pub state: OrderState,
    pub nonce: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RevealedOrderAccount {
    pub trader: Pubkey,
    pub market: Pubkey,
    pub is_yes: bool,
    pub size: u64,
    pub limit_price_bps: u16,
    pub expiry: i64,
    pub state: OrderState,
    pub commitment: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TraderState {
    pub nonce: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderState {
    Committed,
    Revealed,
    Matched,
    Settled,
    Cancelled,
}

// ── Errors ──────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Commit hash does not match revealed data")]
    HashMismatch,
    #[msg("Order has expired")]
    OrderExpired,
    #[msg("Invalid order side for this operation")]
    InvalidSide,
    #[msg("Orders must be on the same market")]
    MarketMismatch,
    #[msg("Buy price must be >= sell price")]
    PriceMismatch,
}
