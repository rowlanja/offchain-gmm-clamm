use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::{state::*};

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    /// CHECK: safe, the account that will be the owner of the position can be arbitrary
    pub owner: UncheckedAccount<'info>,

    #[account(init,
      payer = funder,
      space = Position::LEN,
      seeds = [b"position".as_ref()],
      bump,
    )]
    pub position: Box<Account<'info, Position>>,

    pub pool: Box<Account<'info, Pool>>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/*
  Opens a new Pool Position.
*/
pub fn handler(
    ctx: Context<OpenPosition>,
    tick_lower_index: i32,
    tick_upper_index: i32,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let position = &mut ctx.accounts.position;

    Ok(position.open_position(
        pool,
        tick_lower_index,
        tick_upper_index,
    )?)
}