// ============================================================
//  NearWish Wall — app.js
//  NEAR Testnet integration using near-api-js
// ============================================================

// ⚠️  UPDATE THIS after you deploy your contract!
const CONTRACT_ID = 'auctiontest2026-v2.testnet';

const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const NEAR_CONFIG = {
  networkId:   'testnet',
  keyStore:    new nearApi.keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl:     isLocal ? 'https://rpc.testnet.near.org' : '/api/rpc',
  walletUrl:   'https://testnet.mynearwallet.com/',
  helperUrl:   'https://helper.testnet.near.org',
  explorerUrl: 'https://testnet.nearblocks.io',
};

// 1 NEAR = 10^24 yoctoNEAR
const YOCTO = BigInt('1000000000000000000000000');

let near, wallet, contract;

// ============================================================
//  INIT — runs on page load
// ============================================================
async function init() {
  near     = await nearApi.connect(NEAR_CONFIG);
  wallet   = new nearApi.WalletConnection(near, 'near-wish-wall');
  contract = new nearApi.Contract(wallet.account(), CONTRACT_ID, {
    viewMethods:   ['get_wishes', 'get_wish_count', 'get_total_near', 'get_owner'],
    changeMethods: ['init', 'add_wish'],
  });

  // Update explorer link
  document.getElementById('explorer-link').href =
    `${NEAR_CONFIG.explorerUrl}/accounts/${CONTRACT_ID}`;

  if (wallet.isSignedIn()) {
    const accountId = wallet.getAccountId();
    document.getElementById('account-name').textContent = accountId;
    document.getElementById('account-pill').classList.remove('hidden');
    document.getElementById('connect-btn').classList.add('hidden');
    document.getElementById('not-connected').classList.add('hidden');
    document.getElementById('wish-form').classList.remove('hidden');
  }

  // Attach char counter
  const ta = document.getElementById('wish-msg');
  ta.addEventListener('input', () => {
    document.getElementById('char-used').textContent = ta.value.length;
  });

  await loadWishes();
}

// ============================================================
//  WALLET
// ============================================================
function connectWallet() {
  wallet.requestSignIn(
    CONTRACT_ID,
    'NearWish Wall',
    window.location.href,
    window.location.href
  );
}

function disconnectWallet() {
  wallet.signOut();
  window.location.reload();
}

// ============================================================
//  LOAD WISHES (view call — no wallet needed)
// ============================================================
async function loadWishes() {
  const loading  = document.getElementById('loading');
  const feed     = document.getElementById('wishes-feed');
  const empty    = document.getElementById('empty-state');

  loading.classList.remove('hidden');
  feed.classList.add('hidden');
  empty.classList.add('hidden');

  try {
    let [wishes, countStr, totalYocto] = await Promise.all([
      contract.get_wishes(),
      contract.get_wish_count(),
      contract.get_total_near(),
    ]);

    // near-sdk-go double-encodes: arrays come back as JSON strings
    if (typeof wishes === 'string') {
      try { wishes = JSON.parse(wishes); } catch(e) { wishes = []; }
    }

    // Update stats
    document.getElementById('stat-count').textContent = countStr;
    document.getElementById('stat-total').textContent = formatNear(totalYocto) + ' Ⓝ';

    loading.classList.add('hidden');

    if (!wishes || wishes.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    feed.innerHTML = '';
    // Show newest first
    [...wishes].reverse().forEach((w, i) => {
      feed.appendChild(buildCard(w, i));
    });
    feed.classList.remove('hidden');

  } catch (err) {
    loading.classList.add('hidden');
    feed.innerHTML = `<div class="empty-state"><p>⚠️ Could not load wishes.<br><small>${err.message}</small></p></div>`;
    feed.classList.remove('hidden');
    console.error(err);
  }
}

// ============================================================
//  SUBMIT WISH (change call — wallet required)
// ============================================================
async function submitWish(e) {
  e.preventDefault();
  const message = document.getElementById('wish-msg').value.trim();
  const amount  = parseFloat(document.getElementById('wish-amount').value);

  if (!message) return alert('Please write your wish!');
  if (isNaN(amount) || amount < 0.1) return alert('Minimum donation is 0.1 Ⓝ');

  const btn = document.getElementById('submit-btn');
  const lbl = document.getElementById('submit-label');
  btn.disabled = true;
  lbl.textContent = 'Sending…';

  try {
    const deposit = (BigInt(Math.round(amount * 1e6)) * YOCTO / BigInt(1e6)).toString();
    await contract.add_wish(
      { message },
      '100000000000000', // 100 Tgas
      deposit
    );
    // After returning from wallet, page reloads — loadWishes handles refresh
  } catch (err) {
    console.error(err);
    alert('Transaction failed: ' + err.message);
    btn.disabled = false;
    lbl.textContent = 'Send Wish ✨';
  }
}

// ============================================================
//  HELPERS
// ============================================================
function formatNear(yoctoStr) {
  if (!yoctoStr) return '0';
  // near-sdk-go sometimes wraps strings in extra JSON quotes — strip them
  const cleaned = String(yoctoStr).replace(/^"|"$/g, '').trim();
  if (!cleaned || cleaned === 'null') return '0';
  try {
    const yocto = BigInt(cleaned);
    const near  = Number(yocto * BigInt(1000) / YOCTO) / 1000;
    return near.toFixed(3).replace(/\.?0+$/, '');
  } catch (e) {
    return '0';
  }
}

function timeAgo(ms) {
  const secs = Math.floor((Date.now() - Number(ms)) / 1000);
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.floor(secs/60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
  return `${Math.floor(secs/86400)}d ago`;
}

function avatarLetter(accountId) {
  return (accountId || '?')[0].toUpperCase();
}

function buildCard(w, index) {
  const div = document.createElement('div');
  div.className = 'wish-card';
  div.style.animationDelay = `${index * 0.05}s`;

  const nearAmount = formatNear(w.amount_str);
  const sender     = w.sender || 'anonymous';
  const shortName  = sender.length > 24 ? sender.slice(0,10)+'…'+sender.slice(-6) : sender;

  div.innerHTML = `
    <div class="wish-meta">
      <div class="wish-sender">
        <div class="wish-avatar">${avatarLetter(sender)}</div>
        <span title="${sender}">${shortName}</span>
      </div>
      <div class="wish-badge">💰 ${nearAmount} Ⓝ</div>
    </div>
    <div class="wish-message">${escHtml(w.message)}</div>
    <div class="wish-footer">${timeAgo(w.timestamp)}</div>
  `;
  return div;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
//  STAR CANVAS ANIMATION
// ============================================================
function initStars() {
  const canvas = document.getElementById('stars-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkStar() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.008,
    };
  }

  function setup() {
    resize();
    stars = Array.from({ length: 180 }, mkStar);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.a += s.da;
      if (s.a <= 0 || s.a >= 1) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  setup();
  draw();
}

// ============================================================
//  BOOT
// ============================================================
window.addEventListener('load', () => {
  initStars();
  init().catch(console.error);
});
