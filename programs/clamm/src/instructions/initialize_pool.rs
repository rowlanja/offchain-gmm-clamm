use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use solana_program::{msg};

#[derive(Accounts)]
#[instruction(tick_spacing: u16)]
pub struct InitializePool<'info> {
    pub whirlpools_config: Box<Account<'info, PoolsConfig>>,
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
      init,
      payer = user,
      space = 800,
      // seeds = [b"pool-state".as_ref(), token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
      seeds = [
        b"pool".as_ref(),
        whirlpools_config.key().as_ref(),
        token_mint_a.key().as_ref(),
        token_mint_b.key().as_ref(),
        tick_spacing.to_le_bytes().as_ref()
      ],
      bump
    )]
    pub pool_state: Box<Account<'info, Pool>>,

    #[account(init,
      payer = user,
      token::mint = token_mint_a,
      token::authority = pool_state)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(init,
      payer = user,
      token::mint = token_mint_b,
      token::authority = pool_state)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    pub token_mint_a: Account<'info, Mint>,
    pub token_mint_b: Account<'info, Mint>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePool>,
    tick_spacing: u16,
    initial_sqrt_price: u128,
) -> Result<()> {
    msg!("Creating pools");

    let token_mint_a = ctx.accounts.token_mint_a.key();
    let token_mint_b = ctx.accounts.token_mint_b.key();
    let whirlpools_config = &ctx.accounts.whirlpools_config;
    let default_fee_rate: u16 = 1;
    let bump = *ctx.bumps.get("pool_state").unwrap();
    let pool = &mut ctx.accounts.pool_state;

    Ok(pool.initialize(
        whirlpools_config,
        bump,
        tick_spacing,
        initial_sqrt_price,
        default_fee_rate,
        token_mint_a,
        ctx.accounts.token_vault_a.key(),
        token_mint_b,
        ctx.accounts.token_vault_b.key(),
    )?)
    // Ok(())
}