# NearWish Wall 🌟

> A decentralized wishing well on **NEAR Protocol** — leave your wish forever on the blockchain and donate NEAR to the community.

## 🏗 Project Structure

```
near-wish-wall/
├── contract/          # Go smart contract (near-sdk-go)
│   ├── main.go
│   └── go.mod
├── frontend/          # Web dApp (HTML + CSS + JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```

## 🚀 Quick Start

### 1. Build the contract (Linux / WSL2)
```bash
cd contract
near-go build
# Output: main.wasm
```

### 2. Deploy to Testnet
```bash
near contract deploy YOUR_ACCOUNT.testnet \
  use-file main.wasm \
  with-init-call init json-args '{"owner":"YOUR_ACCOUNT.testnet"}' \
  prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-keychain send
```

### 3. Update frontend
In `frontend/app.js`, replace `YOUR_ACCOUNT.testnet` with your real contract account.

### 4. Launch frontend
Open `frontend/index.html` in your browser, or deploy to Vercel/Netlify.

## 📜 Contract Methods

| Method | Type | Description |
|--------|------|-------------|
| `init(owner)` | init | Initialize the contract |
| `add_wish(message)` | payable/mutating | Add a wish with NEAR donation |
| `get_wishes()` | view | Return all wishes |
| `get_wish_count()` | view | Number of wishes |
| `get_total_near()` | view | Total yoctoNEAR donated |

## 🛠 Tech Stack

- **Smart Contract:** Go + [near-sdk-go](https://github.com/vlmoon99/near-sdk-go)
- **Frontend:** Vanilla HTML/CSS/JS + [near-api-js](https://github.com/near/near-api-js)
- **Network:** NEAR Testnet
