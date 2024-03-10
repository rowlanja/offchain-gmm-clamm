use crate::errors::ErrorCode;
use crate::math::{add_liquidity_delta, checked_mul_div};
use crate::state::*;

// Calculates the next global reward growth variables based on the given timestamp.
// The provided timestamp must be greater than or equal to the last updated timestamp.
pub fn next_whirlpool_reward_infos(
    whirlpool: &Pool,
    next_timestamp: u64,
) -> Result<[PoolRewardInfo; NUM_REWARDS], ErrorCode> {
    let curr_timestamp = whirlpool.reward_last_updated_timestamp;
    if next_timestamp < curr_timestamp {
        return Err(ErrorCode::InvalidTimestamp.into());
    }

    // No-op if no liquidity or no change in timestamp
    if whirlpool.liquidity == 0 || next_timestamp == curr_timestamp {
        return Ok(whirlpool.reward_infos);
    }

    // Calculate new global reward growth
    let mut next_reward_infos = whirlpool.reward_infos;
    let time_delta = u128::from(next_timestamp - curr_timestamp);
    for i in 0..NUM_REWARDS {
        if !next_reward_infos[i].initialized() {
            continue;
        }
        let reward_info = &mut next_reward_infos[i];

        // Calculate the new reward growth delta.
        // If the calculation overflows, set the delta value to zero.
        // This will halt reward distributions for this reward.
        let reward_growth_delta = checked_mul_div(
            time_delta,
            reward_info.emissions_per_second_x64,
            whirlpool.liquidity,
        )
        .unwrap_or(0);

        // Add the reward growth delta to the global reward growth.
        let curr_growth_global = reward_info.growth_global_x64;
        reward_info.growth_global_x64 = curr_growth_global.wrapping_add(reward_growth_delta);
    }

    Ok(next_reward_infos)
}

// Calculates the next global liquidity for a whirlpool depending on its position relative
// to the lower and upper tick indexes and the liquidity_delta.
pub fn next_whirlpool_liquidity(
    whirlpool: &Pool,
    tick_upper_index: i32,
    tick_lower_index: i32,
    liquidity_delta: i128,
) -> Result<u128, ErrorCode> {
    if whirlpool.tick_current_index < tick_upper_index
        && whirlpool.tick_current_index >= tick_lower_index
    {
        add_liquidity_delta(whirlpool.liquidity, liquidity_delta)
    } else {
        Ok(whirlpool.liquidity)
    }
}