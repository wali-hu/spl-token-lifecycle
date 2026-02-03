# SPL Token Lifecycle Demo

This project is a step‑by‑step demo of a realistic SPL Token lifecycle on Solana Devnet using three different wallets:

- **Wallet A** – Team wallet
  - Initial **mint authority**
- **Wallet B** – Admin wallet
  - **Freeze authority** from the start
  - Later becomes **mint authority** as well
- **Wallet C** – Normal user wallet
  - Receives tokens, gets frozen/thawed, and ends with a final balance

The script walks through creating a mint, minting tokens, transferring, freezing/thawing an account, transferring mint authority, and finally revoking both mint and freeze authority.

---

## Requirements

- Node.js (v18+ recommended)
- npm or yarn
- Solana CLI (optional, but useful for inspecting accounts)
- All three wallets funded on **Devnet** (you already have balances, so no airdrop is taken in code)

---

## Install & Setup

1. **Clone or create project folder**

```bash
git clone <this-repo-url> spl-token-lifecycle
cd spl-token-lifecycle
```

2. **Install dependencies**

```bash
npm install
```

(If you haven’t initialized yet:)

```bash
npm init -y
npm install @solana/web3.js @solana/spl-token bs58 dotenv
npm install --save-dev typescript ts-node @types/node
npx tsc --init
```

3. **Create `.env` file**

In the project root, create a `.env` file:

```env
WALLET_A_SECRET_KEY=... # Team / initial mint authority
WALLET_B_SECRET_KEY=... # Admin / freeze (later mint) authority
WALLET_C_SECRET_KEY=... # Normal user
```

> These must be **base58-encoded secret keys**, same format you’re using in the code.

4. **Project structure**

```text
.
├─ src/
│  └─spl-token-lifecycle.ts         
├─ .env
├─ package.json
├─ tsconfig.json
└─ .gitignore
```

Make sure your main file path in `npm` script matches (e.g. `src/index.ts`).

---

## How to Run

From the project root:

```bash
npm run start
```

Or if you wired script manually:

```bash
ts-node src/spl-token-lifecycle.ts
```

The script connects to **Devnet**:

```ts
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
```

---

## What the Script Does (High-level Flow)

### Phase 1 – Project Start

1. Connects to Devnet and loads **Wallet A, B, C** from `.env`.
2. Creates a new SPL token **mint**:
   - `mintAuthority = Wallet A`
   - `freezeAuthority = Wallet B`
3. Creates token accounts:
   - Team token account for Wallet A
   - User token account for Wallet C

### Phase 2 – Project Growth (Wallet A)

1. **Wallet A mints** an initial supply to its own token account.
2. **Wallet A transfers** some tokens to Wallet C’s token account.
3. **Wallet A transfers mint authority to Wallet B** using `setAuthority` with `AuthorityType.MintTokens`.

### Phase 2 – Admin Actions (Wallet B)

1. **Wallet B freezes** Wallet C’s token account using `freezeAccount`.
2. **Wallet B thaws** Wallet C’s token account using `thawAccount`.
3. Now that B is mint authority, **Wallet B mints extra tokens directly to C’s token account**.

### Phase 3 – Finalization

1. **Wallet B revokes mint authority**
   - `AuthorityType.MintTokens` set to `null` → supply becomes fixed.
2. **Wallet B revokes freeze authority**
   - `AuthorityType.FreezeAccount` set to `null` → no more freezing possible.
3. Final mint state shows both authorities as `null`, and final balances of A and C are logged.

---

## Key Concepts Demonstrated

- **Mint Authority**
  - Who can create new tokens (`mintTo`).
  - Transferred from Wallet A → Wallet B.
  - Finally revoked (set to `null`) for fixed supply.

- **Freeze Authority**
  - Who can `freezeAccount` and `thawAccount`.
  - Held by Wallet B from the start.
  - Used to freeze/thaw Wallet C’s account.
  - Finally revoked (set to `null`) to remove admin control.

- **Realistic Token Lifecycle**
  - Centralized start: team controls mint, admin can freeze.
  - Growth: controlled minting & distribution, safety controls (freeze).
  - Finalization: authorities revoked for decentralization and trust.

---

## Notes

- This project is meant for **Devnet only**.
- Never commit your real mainnet private keys or `.env` to Git.
- You can inspect the mint and token accounts using the Solana CLI or explorers like:
  - [Solana Explorer](https://explorer.solana.com/?cluster=devnet)

```bash
solana balance <PUBLIC_KEY> --url https://api.devnet.solana.com
```
