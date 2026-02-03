import {
    Connection,
    Keypair,
    PublicKey,
    clusterApiUrl
} from '@solana/web3.js';
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    transfer,
    getAccount,
    getMint,
    setAuthority,
    AuthorityType,
    freezeAccount,
    thawAccount,
} from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    const walletASecret = process.env.WALLET_A_SECRET_KEY;
    const walletBSecret = process.env.WALLET_B_SECRET_KEY;
    const walletCSecret = process.env.WALLET_C_SECRET_KEY;

    if (!walletASecret || !walletBSecret || !walletCSecret) {
        throw new Error('Missing WALLET_A_SECRET_KEY / WALLET_B_SECRET_KEY / WALLET_C_SECRET_KEY in .env');
    }

    const walletA = Keypair.fromSecretKey(bs58.decode(walletASecret));
    const walletB = Keypair.fromSecretKey(bs58.decode(walletBSecret));
    const walletC = Keypair.fromSecretKey(bs58.decode(walletCSecret));

    console.log('Wallet A (Team / Mint)  :', walletA.publicKey.toBase58());
    console.log('Wallet B (Admin / Freeze):',walletB.publicKey.toBase58());
    console.log('Wallet C (User)         :', walletC.publicKey.toBase58()); 

    const balA = await connection.getBalance(walletA.publicKey);
    const balB = await connection.getBalance(walletB.publicKey);
    const balC = await connection.getBalance(walletC.publicKey);
    console.log('Balance A:', balA, 'lamports');
    console.log('Balance B:', balB, 'lamports');
    console.log('Balance C:', balC, 'lamports');

    const decimals = 9;

    console.log('\n=== PHASE 1: PROJECT START -> create mint ===');

    const mint = await createMint(
        connection,
        walletA,
        walletA.publicKey,
        walletB.publicKey,
        decimals
    );
    console.log('Created mint:', mint.toBase58());

    const teamTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletA,
        mint,
        walletA.publicKey
    );
    console.log('Team Token Account (A):', teamTokenAccount.address.toBase58());

    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletA,
        mint,
        walletC.publicKey
    );
    console.log('User Token Account (C):', userTokenAccount.address.toBase58());
    
     console.log('\n=== PHASE 2: PROJECT GROWTH ===');

    const initialMintAmount = 1_000n * 10n ** BigInt(decimals);
    const mintTx1 = await mintTo(
        connection,
        walletA,               
        mint,
        teamTokenAccount.address,
        walletA,                
        initialMintAmount
    );
    console.log('Minted initial supply to A. Tx:', mintTx1);

    let teamAccountInfo = await getAccount(connection, teamTokenAccount.address);
    console.log('Team balance after mint', teamAccountInfo.amount.toString());

    const amountToUser = 100n * 10n ** BigInt(decimals);
    const transferTx = await transfer(
        connection,
        walletA,
        teamTokenAccount.address,
        userTokenAccount.address,
        walletA,
        amountToUser
    );
    console.log('Transferred tokens from A to C. Tx:', transferTx);

    let userAccountInfo = await getAccount(connection, userTokenAccount.address);
    teamAccountInfo = await getAccount(connection, teamTokenAccount.address);
    console.log('User balance after receiving tokens:', userAccountInfo.amount.toString());
    console.log('Team balance after transfer:', teamAccountInfo.amount.toString());

    console.log('\n=== PHASE 2.1: TRANSFER MINT AUTHORITY A -> B ===');

    const transferMintAuthTx = await setAuthority(
        connection,
        walletA,
        mint,
        walletA.publicKey,
        AuthorityType.MintTokens,
        walletB.publicKey
    );
    console.log('Mint authority transferred A -> B. Tx:', transferMintAuthTx);

    let mintInfo = await getMint(connection, mint);
    console.log('Mint authority after transfer:', mintInfo.mintAuthority?.toBase58() || 'null');
    console.log('Freeze authority (should still be B):', mintInfo.freezeAuthority?.toBase58() || 'null');

    console.log('\n--- Admin B FREEZES user C account ---');

    const freezeTx = await freezeAccount(
        connection,
        walletB,
        userTokenAccount.address,
        mint,
        walletB.publicKey
    );
    console.log('Freeze Tx:', freezeTx);

    console.log('\n--- Admin B THAWS user C account ---');
    const thawTx = await thawAccount(
        connection,
        walletB,
        userTokenAccount.address,
        mint,
        walletB.publicKey
    );
    console.log('Thaw Tx:', thawTx);

    console.log('\n=== PHASE 2.2: PROJECT GROWTH (Wallet B mints & transfers) ===');

    const extraMintAmount = 500n * 10n ** BigInt(decimals);
    const mintTx2 = await mintTo(
        connection,
        walletB,
        mint,
        userTokenAccount.address,
        walletB,
        extraMintAmount
    );
    console.log('Wallet B minted extra tokens to C. Tx:', mintTx2);

    userAccountInfo = await getAccount(connection, userTokenAccount.address);
    console.log('User balance after B mint:', userAccountInfo.amount.toString());

    console.log('\n=== PHASE 3: FINALIZATION (B revokes mint & freeze) ===');

    mintInfo = await getMint(connection, mint);
    console.log('Before revoke: mintAuthority  =', mintInfo.mintAuthority?.toBase58() || 'null');
    console.log('Before revoke: freezeAuthority =', mintInfo.freezeAuthority?.toBase58() || 'null');

    console.log('\n--- Wallet A REVOKES mint authority (fixed supply) ---');
    const revokeMintTx = await setAuthority(
        connection,
        walletA,
        mint,
        walletA.publicKey,
        AuthorityType.MintTokens,
        null
    );
    console.log('Revoke Mint Authority Tx:', revokeMintTx);

    console.log('\n--- Wallet B REVOKES freeze authority (no more freeze) ---');
    const revokeFreezeTx = await setAuthority(
        connection,
        walletB,
        mint,
        walletB.publicKey,
        AuthorityType.FreezeAccount,
        null
    );
    console.log('Revoke Freeze Authority Tx:', revokeFreezeTx);

    mintInfo = await getMint(connection, mint);
    console.log('\n=== FINAL MINT STATE ===');
    console.log('Mint:', mint.toBase58());
    console.log('mintAuthority  =', mintInfo.mintAuthority?.toBase58() || 'null');
    console.log('freezeAuthority =', mintInfo.freezeAuthority?.toBase58() || 'null');

    teamAccountInfo = await getAccount(connection, teamTokenAccount.address);
    userAccountInfo = await getAccount(connection, userTokenAccount.address);
    console.log('Final Team balance:', teamAccountInfo.amount.toString());
    console.log('Final User balance:', userAccountInfo.amount.toString());



}

main().catch((err) => {
    console.error(err);
});
