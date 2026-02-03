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
    

}

main().catch((err) => {
    console.error(err);
});
