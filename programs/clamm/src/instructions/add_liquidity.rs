use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::ErrorCode;
use crate::manager::liquidity_manager::{
    calculate_liquidity_token_deltas, calculate_modify_liquidity, sync_modify_liquidity_values,
};
use crate::math::convert_to_liquidity_delta;
use crate::state::*;
use crate::util::{to_timestamp_u64, transfer_from_owner_to_vault, verify_position_authority};

#[derive(Accounts)]
pub struct ModifyLiquidity<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    pub position_authority: Signer<'info>,

    // #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(mut)]
    pub position: Account<'info, Position>,

    #[account(mut)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,
    #[account(mut)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,
}

pub fn handler(
    ctx: Context<ModifyLiquidity>,
    liquidity_amount: u128,
    token_max_a: u64,
    token_max_b: u64,
) -> Result<()> {
    msg!("opening position");
    let clock = Clock::get()?;

    if liquidity_amount == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }
    let liquidity_delta = convert_to_liquidity_delta(liquidity_amount, true)?;
    let timestamp = to_timestamp_u64(clock.unix_timestamp)?;
    msg!("opening position [calculate_modify_liquidity]");
    let update = calculate_modify_liquidity(
        &ctx.accounts.pool,
        &ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        liquidity_delta,
        timestamp,
    )?;
    msg!("opening position [sync_modify_liquidity_values]");
    sync_modify_liquidity_values(
        &mut ctx.accounts.pool,
        &mut ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        update,
        timestamp,
    )?;
    msg!("opening position  [calculate_liquidity_token_deltas]");
    let (delta_a, delta_b) = calculate_liquidity_token_deltas(
        ctx.accounts.pool.tick_current_index,
        ctx.accounts.pool.sqrt_price,
        &ctx.accounts.position,
        liquidity_delta,
    )?;

    if delta_a > token_max_a {
        return Err(ErrorCode::TokenMaxExceeded.into());
    } else if delta_b > token_max_b {
        return Err(ErrorCode::TokenMaxExceeded.into());
    }
    msg!("opening position [transfer_from_owner_to_vault]");
    transfer_from_owner_to_vault(
        &ctx.accounts.position_authority,
        &ctx.accounts.token_owner_account_a,
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_program,
        delta_a,
    )?;
    msg!("opening position [transfer_from_owner_to_vault]");
    transfer_from_owner_to_vault(
        &ctx.accounts.position_authority,
        &ctx.accounts.token_owner_account_b,
        &ctx.accounts.token_vault_b,
        &ctx.accounts.token_program,
        delta_b,
    )?;

    Ok(())
}