use anchor_lang::prelude::*;
use super::{Pool};
pub const NUM_REWARDS: usize = 3;

#[account]
#[derive(Default)]
pub struct Position {
    pub pool: Pubkey,
    pub liquidity: u128,       // 16
    pub tick_lower_index: i32, // 4
    pub tick_upper_index: i32, // 4

    // Q64.64
    pub fee_growth_checkpoint_a: u128, // 16
    pub fee_owed_a: u64,               // 8
    // Q64.64
    pub fee_growth_checkpoint_b: u128, // 16
    pub fee_owed_b: u64,               // 8

    pub reward_infos: [PositionRewardInfo; NUM_REWARDS], // 72
}

#[derive(Default, Debug, PartialEq)]
pub struct PositionUpdate {
    pub liquidity: u128,
    pub fee_growth_checkpoint_a: u128,
    pub fee_owed_a: u64,
    pub fee_growth_checkpoint_b: u128,
    pub fee_owed_b: u64,
    pub reward_infos: [PositionRewardInfo; NUM_REWARDS],
}


#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize, Default, Debug, PartialEq)]
pub struct PositionRewardInfo {
    // Q64.64
    pub growth_inside_checkpoint: u128,
    pub amount_owed: u64,
}

impl Position {

    pub const LEN: usize = 8 + 136 + 72;


    pub fn update(&mut self, update: &PositionUpdate) {
        self.liquidity = update.liquidity;
        self.fee_growth_checkpoint_a = update.fee_growth_checkpoint_a;
        self.fee_growth_checkpoint_b = update.fee_growth_checkpoint_b;
        self.fee_owed_a = update.fee_owed_a;
        self.fee_owed_b = update.fee_owed_b;
        self.reward_infos = update.reward_infos;
    }
    pub fn open_position( &mut self,
        pool: &Account<Pool>,
        tick_lower_index: i32,
        tick_upper_index: i32
    ) -> Result<()> {
        msg!("opening position start");
        self.pool = pool.key();

        self.tick_lower_index = tick_lower_index;
        self.tick_upper_index = tick_upper_index;
        msg!("opening position done");
        Ok(())
    }

}