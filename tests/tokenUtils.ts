import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, Token, MintLayout } from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as spl from '@solana/spl-token';

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);


export const createUserAndAssociatedWallet = async (connection: anchor.web3.Connection, mint?: anchor.web3.PublicKey): Promise<[anchor.web3.Keypair, anchor.web3.PublicKey | undefined]> => {
    const user = new anchor.web3.Keypair();
    let userAssociatedTokenAccount: anchor.web3.PublicKey | undefined = undefined;

    // Fund user with some SOL
    let txFund = new anchor.web3.Transaction();
    txFund.add(anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: user.publicKey,
        lamports: 500 * anchor.web3.LAMPORTS_PER_SOL,
    }));
    const sigTxFund = await provider.sendAndConfirm(txFund);
    console.log(`[${user.publicKey.toBase58()}] Funded new account with 5 SOL: ${sigTxFund}`);

    if (mint) {
        // Create a token account for the user and mint some tokens
        userAssociatedTokenAccount = await spl.Token.getAssociatedTokenAddress(
            spl.ASSOCIATED_TOKEN_PROGRAM_ID,
            spl.TOKEN_PROGRAM_ID,
            mint,
            user.publicKey
        )

        const txFundTokenAccount = new anchor.web3.Transaction();
        txFundTokenAccount.add(spl.Token.createAssociatedTokenAccountInstruction(
            spl.ASSOCIATED_TOKEN_PROGRAM_ID,
            spl.TOKEN_PROGRAM_ID,
            mint,
            userAssociatedTokenAccount,
            user.publicKey,
            user.publicKey,
        ))
        txFundTokenAccount.add(spl.Token.createMintToInstruction(
            spl.TOKEN_PROGRAM_ID,
            mint,
            userAssociatedTokenAccount,
            provider.wallet.publicKey,
            [],
            1337000000,
        ));
        const txFundTokenSig = await provider.sendAndConfirm(txFundTokenAccount, [user]);
        console.log(`[${userAssociatedTokenAccount.toBase58()}] New associated account for mint ${mint.toBase58()}: ${txFundTokenSig}`);
    }
    return [user, userAssociatedTokenAccount];
  }

  export const createAssociatedWallet = async (connection: anchor.web3.Connection, user: anchor.web3.Keypair, mint?: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {
    let userAssociatedTokenAccount: anchor.web3.PublicKey | undefined = undefined;

    // Fund user with some SOL
    if (mint) {
        // Create a token account for the user and mint some tokens
        userAssociatedTokenAccount = await spl.Token.getAssociatedTokenAddress(
            spl.ASSOCIATED_TOKEN_PROGRAM_ID,
            spl.TOKEN_PROGRAM_ID,
            mint,
            user.publicKey
        )
        const txFundTokenAccount = new anchor.web3.Transaction();
        txFundTokenAccount.add(spl.Token.createAssociatedTokenAccountInstruction(
            spl.ASSOCIATED_TOKEN_PROGRAM_ID,
            spl.TOKEN_PROGRAM_ID,
            mint,
            userAssociatedTokenAccount,
            user.publicKey,
            user.publicKey,
        ))
        txFundTokenAccount.add(spl.Token.createMintToInstruction(
            spl.TOKEN_PROGRAM_ID,
            mint,
            userAssociatedTokenAccount,
            provider.wallet.publicKey,
            [],
            1337000000,
        ));
        const txFundTokenSig = await provider.sendAndConfirm(txFundTokenAccount, [user]);
        console.log(`[${userAssociatedTokenAccount.toBase58()}] New associated account for mint ${mint.toBase58()}: ${txFundTokenSig}`);
    }
    return userAssociatedTokenAccount;
  }

 export const createMint = async (connection: anchor.web3.Connection): Promise<anchor.web3.PublicKey> => {
    const tokenMint = new anchor.web3.Keypair();
    const lamportsForMint = await provider.connection.getMinimumBalanceForRentExemption(spl.MintLayout.span);
    let tx = new anchor.web3.Transaction();

    // Allocate mint
    tx.add(
        anchor.web3.SystemProgram.createAccount({
            programId: spl.TOKEN_PROGRAM_ID,
            space: spl.MintLayout.span,
            fromPubkey: provider.wallet.publicKey,
            newAccountPubkey: tokenMint.publicKey,
            lamports: lamportsForMint,
        })
    )
    // Allocate wallet account
    tx.add(
        spl.Token.createInitMintInstruction(
            spl.TOKEN_PROGRAM_ID,
            tokenMint.publicKey,
            6,
            provider.wallet.publicKey,
            provider.wallet.publicKey,
        )
    );
    const signature = await provider.sendAndConfirm(tx, [tokenMint]);

    console.log(`[${tokenMint.publicKey}] Created new mint account at ${signature}`);
    return tokenMint.publicKey;
  }

  export const readAccount = async (accountPublicKey: anchor.web3.PublicKey, provider: anchor.Provider): Promise<[spl.AccountInfo, string]> => {
    const tokenInfoLol = await provider.connection.getAccountInfo(accountPublicKey);
    const data = Buffer.from(tokenInfoLol.data);
    const accountInfo: spl.AccountInfo = spl.AccountLayout.decode(data);

    const amount = (accountInfo.amount as any as Buffer).readBigUInt64LE();
    return [accountInfo, amount.toString()];
  }

  const getPdaParams = async (connection: anchor.web3.Connection, alice: anchor.web3.PublicKey, bob: anchor.web3.PublicKey, mint: anchor.web3.PublicKey): Promise<PDAParameters> => {
    const uid = new anchor.BN(parseInt((Date.now() / 1000).toString()));
    const uidBuffer = uid.toBuffer('le', 8);

    let [statePubKey, stateBump] = await anchor.web3.PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode("state"), alice.toBuffer(), mint.toBuffer()], program.programId,
    );
    let [walletPubKeyTokenA, walletBumpTokenA] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("wallet"), alice.toBuffer(), bob.toBuffer(), mint.toBuffer(), uidBuffer], program.programId,
    );
    let [walletPubKeyTokenB, walletBumpTokenB] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("wallet"), alice.toBuffer(), bob.toBuffer(), mint.toBuffer(), uidBuffer], program.programId,
  );
    return {
        idx: uid,
        escrowBumpTokenA: walletBumpTokenA,
        escrowBumpTokenB: walletBumpTokenB,
        escrowWalletTokenAKey: walletPubKeyTokenA,
        escrowWalletTokenBKey: walletPubKeyTokenB,
        stateBump,
        stateKey: statePubKey,
    }
}

export async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  programId = spl.TOKEN_PROGRAM_ID,
  associatedTokenProgramId = spl.ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> {

  const [address] = await PublicKey.findProgramAddress(
      [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
      associatedTokenProgramId
  );

  return address;
}