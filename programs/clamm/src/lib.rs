use anchor_lang::prelude::*;

use solana_program::{msg};
pub mod instructions;
pub mod math;
pub mod manager;
pub mod state;
pub mod errors;
pub mod util;
use instructions::*;


declare_id!("7PQg31yGoMQXDwkSC6FJYy23YaWX69LkSbPpLBNEfS34");

#[program]
pub mod clamm {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        tick_spacing: u16,
        initial_sqrt_price: u128,
    ) -> Result<()> {
        msg!("Handling create");
        return instructions::initialize_pool::handler(
            ctx,
            tick_spacing,
            initial_sqrt_price,
        );
    }

    pub fn initialize_tick_array(
        ctx: Context<InitializeTickArray>,
        start_tick_index: i32,
    ) -> Result<()> {
        return instructions::initialize_tick_array::handler(ctx, start_tick_index);
    }

    pub fn open_position(
        ctx: Context<OpenPosition>,
        tick_lower_index: i32,
        tick_upper_index: i32,
    ) -> Result<()> {
        return instructions::open_position::handler(
            ctx,
            tick_lower_index,
            tick_upper_index,
        );
    }

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_authority: Pubkey,
        collect_protocol_fees_authority: Pubkey,
        reward_emissions_super_authority: Pubkey,
        default_protocol_fee_rate: u16,
    ) -> Result<()> {
        return instructions::initialize_config::handler(
            ctx,
            fee_authority,
            collect_protocol_fees_authority,
            reward_emissions_super_authority,
            default_protocol_fee_rate,
        );
    }

    pub fn add_liquidity(
        ctx: Context<ModifyLiquidity>,
        liquidity_amount: u128,
        token_max_a: u64,
        token_max_b: u64,
    ) -> Result<()> {
        msg!("Handling add liquidity");
        return instructions::add_liquidity::handler(
            ctx,
            liquidity_amount,
            token_max_a,
            token_max_b,
        );
    }
}
