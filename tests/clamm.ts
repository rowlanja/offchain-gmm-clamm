import * as anchor from "@coral-xyz/anchor";
import * as tokenUtils from "./tokenUtils";
import * as spl from '@solana/spl-token';
import { Program } from "@coral-xyz/anchor";
import { Clamm } from "../target/types/clamm";
import { PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { TokenUtil } from "@orca-so/common-sdk";

describe("clamm", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Clamm as Program<Clamm>;
  const tick_spacing = new anchor.BN(1);
  const initial_sqrt_price = new anchor.BN(4295048018);
  const fee_rate = new anchor.BN(1);
  const start_tick_idx = new anchor.BN(0);
  const end_tick_idx = new anchor.BN(10);
  const token_amount = new anchor.BN(100);
  const token_max_a = new anchor.BN(5000000);
  const token_max_b = new anchor.BN(5000000);
  let tokenA: anchor.web3.PublicKey;
  let tokenB: anchor.web3.PublicKey;
  let alice: anchor.web3.Keypair;
  let aliceTokenAWallet: anchor.web3.PublicKey;
  let aliceTokenBWallet: anchor.web3.PublicKey;

  beforeEach(async () => {
     tokenA = await tokenUtils.createMint(provider.connection);
     tokenB = await tokenUtils.createMint(provider.connection);
    [alice, aliceTokenAWallet] = await tokenUtils.createUserAndAssociatedWallet(provider.connection, tokenA);
    aliceTokenBWallet = await tokenUtils.createAssociatedWallet(provider.connection, alice, tokenB);
  });

  it("Creates pool!", async () => {
    // Add your test here.
    // 1. Create Pool
    const [poolPDA, ] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode('pool-state'),tokenA.toBuffer(),tokenB.toBuffer()],program.programId)
    const [poolWalletTokenAPDA, ] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode('pool-wallet-token-a'),tokenA.toBuffer()],program.programId)
    const [poolWalletTokenBPDA, ] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode('pool-wallet-token-b'),tokenB.toBuffer()],program.programId)
    const whirlpoolsConfigKeypair = Keypair.generate()
    // 1. Create config

    console.log("creating config [PART 1]")
    await program.methods
      .initializeConfig(alice.publicKey, alice.publicKey, alice.publicKey, fee_rate)
      .accounts({funder: alice.publicKey, config: whirlpoolsConfigKeypair.publicKey})
      .signers([alice, whirlpoolsConfigKeypair])
      .rpc();

    console.log("creating pool [PART 2]")
    await program.methods
      .initializePool(tick_spacing,initial_sqrt_price)
      .accounts({
        user: alice.publicKey,
        whirlpoolsConfig: whirlpoolsConfigKeypair.publicKey,
        tokenMintA: tokenA,
        tokenMintB: tokenB,
        poolState: poolPDA,
        tokenVaultA: poolWalletTokenAPDA,
        tokenVaultB: poolWalletTokenBPDA,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .signers([alice])
      .rpc();

    const [ticketArrayPDA, ] = await PublicKey.findProgramAddress([
      anchor.utils.bytes.utf8.encode('tick_array'),
      poolPDA.toBuffer()
    ],program.programId)
    console.log("creating Init Tick Array [PART 3]")

    // 2. Init Tick Array
    await program.methods
      .initializeTickArray(start_tick_idx)
      .accounts({
        pool: poolPDA,
        funder: alice.publicKey,
        tickArray: ticketArrayPDA
      })
      .signers([alice])
      .rpc();

    const [positionPDA, ] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode('position'), ],program.programId)

    console.log("creating open position [PART 4]")
    // 3. Open position
    await program.methods
      .openPosition(start_tick_idx, end_tick_idx)
      .accounts({
        position: positionPDA,
        funder: alice.publicKey,
        owner: alice.publicKey,
        pool: poolPDA,
      })
      .signers([alice])
      .rpc();
    // 4. Increase liquidity

    const [tickArrayLower, ] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode('pool-wallet-token-b'),tokenB.toBuffer()],program.programId)
    const [tickArrayUpper, ] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode('pool-wallet-token-b'),tokenB.toBuffer()],program.programId)
    console.log("add liquidity [PART 5]")

    // || \\ Print balances of tokens
    // || \\ Started
    console.log("Alice token a balance", (await tokenUtils.readAccount(aliceTokenAWallet, provider))[1]);
    console.log("Alice token b balance", (await tokenUtils.readAccount(aliceTokenBWallet, provider))[1]);

    console.log("Pool token a balance", (await tokenUtils.readAccount(poolWalletTokenAPDA, provider))[1]);
    console.log("Pool token b balance", (await tokenUtils.readAccount(poolWalletTokenBPDA, provider))[1]);
    // || \\ Finished

    await program.methods
      .addLiquidity(token_amount, token_max_a, token_max_b)
      .accounts({
        pool: poolPDA,
        positionAuthority: alice.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        position: positionPDA,
        tokenOwnerAccountA: aliceTokenAWallet,
        tokenOwnerAccountB: aliceTokenBWallet,
        tokenVaultA: poolWalletTokenAPDA,
        tokenVaultB: poolWalletTokenBPDA,
        tickArrayLower: ticketArrayPDA,
        tickArrayUpper: ticketArrayPDA,
      })
      .signers([alice])
      .rpc();

    // || \\ Print balances of tokens
    // || \\ Started
    console.log("Alice balance", (await tokenUtils.readAccount(aliceTokenAWallet, provider))[1]);
    console.log("Alice token b balance", (await tokenUtils.readAccount(aliceTokenBWallet, provider))[1]);
    console.log("Pool token a balance", (await tokenUtils.readAccount(poolWalletTokenAPDA, provider))[1]);
    console.log("Pool token b balance", (await tokenUtils.readAccount(poolWalletTokenBPDA, provider))[1]);
    // || \\ Finished

      console.log("FINISHED")
  })
});
