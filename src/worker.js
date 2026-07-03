export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/generate" && request.method === "POST") {
      return handleGenerate(request);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(HTML, {
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleGenerate(request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return json({ error: "APIキーが必要です" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "リクエストの形式が不正です" }, 400);
  }

  const { prompt, size, quality, style } = body;
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return json({ error: "プロンプトを入力してください" }, 400);
  }

  const upstream = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: auth,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: size || "1024x1024",
      quality: quality || "standard",
      style: style || "vivid",
      response_format: "b64_json",
    }),
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    const message = data?.error?.message || "画像生成に失敗しました";
    return json({ error: message }, upstream.status);
  }

  const item = data.data && data.data[0];
  if (!item) {
    return json({ error: "生成結果が空でした" }, 502);
  }

  return json({
    b64: item.b64_json,
    revisedPrompt: item.revised_prompt || prompt,
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const HTML = `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>Exposure — AI画像生成</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #16141c;
    --panel: #1f1c26;
    --panel-raised: #26222f;
    --line: #332e3d;
    --amber: #e8a33d;
    --amber-dim: #6b5227;
    --silver: #8fa3b8;
    --text: #ede9e3;
    --text-muted: #948f9c;
    --danger: #d9695f;
    --radius: 3px;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: var(--amber-dim); color: var(--text); }

  .topbar {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--line);
  }
  .brand {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 20px;
    letter-spacing: 0.02em;
  }
  .brand .dot { color: var(--amber); }
  .brand-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 2px;
  }
  .settings-btn {
    background: none;
    border: 1px solid var(--line);
    color: var(--text-muted);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    padding: 8px 12px;
    border-radius: var(--radius);
    cursor: pointer;
    letter-spacing: 0.04em;
  }
  .settings-btn:active { background: var(--panel-raised); }

  main { max-width: 640px; margin: 0 auto; padding: 20px 16px 100px; }

  .panel {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 18px;
    margin-bottom: 16px;
  }

  textarea#prompt {
    width: 100%;
    min-height: 84px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    padding: 12px;
    resize: vertical;
    outline: none;
  }
  textarea#prompt:focus { border-color: var(--amber-dim); }
  textarea#prompt::placeholder { color: var(--text-muted); }

  .exposure-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
    display: block;
  }

  .dial-row { margin-bottom: 16px; }
  .dial-row:last-child { margin-bottom: 0; }
  .dial-options {
    display: flex;
    gap: 6px;
  }
  .dial-opt {
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--line);
    color: var(--text-muted);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    padding: 10px 6px;
    border-radius: var(--radius);
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s, color 0.15s;
  }
  .dial-opt.active {
    border-color: var(--amber);
    color: var(--amber);
    box-shadow: inset 0 0 0 1px var(--amber);
  }
  .dial-opt:active { background: var(--panel-raised); }

  .generate-btn {
    width: 100%;
    background: var(--amber);
    color: #16141c;
    border: none;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 15px;
    padding: 14px;
    border-radius: var(--radius);
    cursor: pointer;
    margin-top: 4px;
  }
  .generate-btn:active { opacity: 0.85; }
  .generate-btn:disabled {
    background: var(--panel-raised);
    color: var(--text-muted);
    cursor: default;
  }

  .status-line {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 10px;
    min-height: 14px;
  }
  .status-line.error { color: var(--danger); }

  .gallery-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 24px 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }
  .gallery-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .gallery-count {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-muted);
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .gallery-item {
    position: relative;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--line);
    aspect-ratio: 1 / 1;
    cursor: pointer;
    background: var(--panel);
  }
  .gallery-item img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .gallery-empty {
    color: var(--text-muted);
    font-size: 13px;
    padding: 32px 0;
    text-align: center;
  }

  /* lightbox */
  .lightbox {
    position: fixed; inset: 0;
    background: rgba(10,9,13,0.92);
    display: none;
    flex-direction: column;
    z-index: 50;
    padding: 16px;
  }
  .lightbox.open { display: flex; }
  .lightbox img {
    max-width: 100%; max-height: 60vh; object-fit: contain;
    margin: auto auto 12px;
    border-radius: var(--radius);
  }
  .lightbox-meta {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 12px;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 12px;
    max-height: 20vh;
    overflow-y: auto;
  }
  .lightbox-actions { display: flex; gap: 8px; }
  .lightbox-actions button {
    flex: 1;
    padding: 12px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    cursor: pointer;
  }
  .lightbox-actions .danger { color: var(--danger); border-color: var(--danger); }
  .lightbox-close {
    align-self: flex-end;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 22px;
    cursor: pointer;
    padding: 4px 8px;
  }

  /* settings modal */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(10,9,13,0.85);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 60;
    padding: 20px;
  }
  .modal-backdrop.open { display: flex; }
  .modal {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 20px;
    width: 100%;
    max-width: 400px;
  }
  .modal h2 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 16px;
    margin: 0 0 4px;
  }
  .modal p { font-size: 12px; color: var(--text-muted); margin: 0 0 14px; line-height: 1.5; }
  .modal input {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--text);
    padding: 10px 12px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    outline: none;
    margin-bottom: 12px;
  }
  .modal input:focus { border-color: var(--amber-dim); }
  .modal-actions { display: flex; gap: 8px; }
  .modal-actions button {
    flex: 1;
    padding: 11px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    cursor: pointer;
  }
  .modal-actions .primary { background: var(--amber); color: #16141c; border-color: var(--amber); font-weight: 600; }

  .spinner {
    width: 14px; height: 14px;
    border: 2px solid var(--bg);
    border-top-color: #16141c;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .spinner { animation: none; }
  }
</style>
</head>
<body>

<div class="topbar">
  <div>
    <div class="brand">Exposure<span class="dot">.</span></div>
    <div class="brand-sub">DALL·E 3 Generator</div>
  </div>
  <button class="settings-btn" id="openSettings">API KEY</button>
</div>

<main>
  <div class="panel">
    <textarea id="prompt" placeholder="生成したい画像を説明してください..."></textarea>

    <div class="dial-row" style="margin-top:16px;">
      <span class="exposure-label">サイズ</span>
      <div class="dial-options" id="sizeOptions">
        <div class="dial-opt active" data-value="1024x1024">1:1</div>
        <div class="dial-opt" data-value="1792x1024">横長</div>
        <div class="dial-opt" data-value="1024x1792">縦長</div>
      </div>
    </div>

    <div class="dial-row">
      <span class="exposure-label">画質</span>
      <div class="dial-options" id="qualityOptions">
        <div class="dial-opt active" data-value="standard">standard</div>
        <div class="dial-opt" data-value="hd">hd</div>
      </div>
    </div>

    <div class="dial-row">
      <span class="exposure-label">スタイル</span>
      <div class="dial-options" id="styleOptions">
        <div class="dial-opt active" data-value="vivid">vivid</div>
        <div class="dial-opt" data-value="natural">natural</div>
      </div>
    </div>

    <button class="generate-btn" id="generateBtn">生成する</button>
    <div class="status-line" id="statusLine"></div>
  </div>

  <div class="gallery-header">
    <span class="gallery-title">Gallery</span>
    <span class="gallery-count" id="galleryCount">0</span>
  </div>
  <div class="gallery-grid" id="galleryGrid"></div>
  <div class="gallery-empty" id="galleryEmpty">まだ画像がありません</div>
</main>

<div class="lightbox" id="lightbox">
  <button class="lightbox-close" id="closeLightbox">&times;</button>
  <img id="lightboxImg" src="" alt="" />
  <div class="lightbox-meta" id="lightboxMeta"></div>
  <div class="lightbox-actions">
    <button id="downloadBtn">ダウンロード</button>
    <button class="danger" id="deleteBtn">削除</button>
  </div>
</div>

<div class="modal-backdrop" id="settingsModal">
  <div class="modal">
    <h2>OpenAI APIキー</h2>
    <p>DALL·E 3の呼び出しに使用します。ブラウザのlocalStorageにのみ保存され、このデバイス外には送信されません。</p>
    <input type="password" id="apiKeyInput" placeholder="sk-..." autocomplete="off" />
    <div class="modal-actions">
      <button id="cancelSettings">キャンセル</button>
      <button class="primary" id="saveSettings">保存</button>
    </div>
  </div>
</div>

<script>
(function() {
  const DB_NAME = 'exposure-gallery';
  const STORE = 'images';
  let db;

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbAdd(item) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function dbDelete(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function dbAll() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => b.ts - a.ts));
      req.onerror = () => reject(req.error);
    });
  }

  const state = {
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
    items: [],
    activeItem: null,
  };

  const el = {
    prompt: document.getElementById('prompt'),
    generateBtn: document.getElementById('generateBtn'),
    statusLine: document.getElementById('statusLine'),
    galleryGrid: document.getElementById('galleryGrid'),
    galleryEmpty: document.getElementById('galleryEmpty'),
    galleryCount: document.getElementById('galleryCount'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxMeta: document.getElementById('lightboxMeta'),
    settingsModal: document.getElementById('settingsModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
  };

  function setupDials(containerId, key) {
    const container = document.getElementById(containerId);
    container.addEventListener('click', (e) => {
      const opt = e.target.closest('.dial-opt');
      if (!opt) return;
      [...container.children].forEach(c => c.classList.remove('active'));
      opt.classList.add('active');
      state[key] = opt.dataset.value;
    });
  }
  setupDials('sizeOptions', 'size');
  setupDials('qualityOptions', 'quality');
  setupDials('styleOptions', 'style');

  function setStatus(msg, isError) {
    el.statusLine.textContent = msg || '';
    el.statusLine.classList.toggle('error', !!isError);
  }

  function renderGallery() {
    el.galleryCount.textContent = state.items.length;
    el.galleryEmpty.style.display = state.items.length ? 'none' : 'block';
    el.galleryGrid.innerHTML = '';
    for (const item of state.items) {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + item.b64;
      img.loading = 'lazy';
      div.appendChild(img);
      div.addEventListener('click', () => openLightbox(item));
      el.galleryGrid.appendChild(div);
    }
  }

  function openLightbox(item) {
    state.activeItem = item;
    el.lightboxImg.src = 'data:image/png;base64,' + item.b64;
    el.lightboxMeta.textContent = item.prompt + ' — ' + item.size + ' / ' + item.quality + ' / ' + item.style;
    el.lightbox.classList.add('open');
  }
  document.getElementById('closeLightbox').addEventListener('click', () => {
    el.lightbox.classList.remove('open');
  });
  document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!state.activeItem) return;
    const a = document.createElement('a');
    a.href = 'data:image/png;base64,' + state.activeItem.b64;
    a.download = 'exposure-' + state.activeItem.id + '.png';
    a.click();
  });
  document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!state.activeItem) return;
    await dbDelete(state.activeItem.id);
    state.items = state.items.filter(i => i.id !== state.activeItem.id);
    el.lightbox.classList.remove('open');
    renderGallery();
  });

  // settings modal
  document.getElementById('openSettings').addEventListener('click', () => {
    el.apiKeyInput.value = localStorage.getItem('openai_api_key') || '';
    el.settingsModal.classList.add('open');
  });
  document.getElementById('cancelSettings').addEventListener('click', () => {
    el.settingsModal.classList.remove('open');
  });
  document.getElementById('saveSettings').addEventListener('click', () => {
    localStorage.setItem('openai_api_key', el.apiKeyInput.value.trim());
    el.settingsModal.classList.remove('open');
    setStatus('APIキーを保存しました');
  });

  el.generateBtn.addEventListener('click', async () => {
    const prompt = el.prompt.value.trim();
    if (!prompt) { setStatus('プロンプトを入力してください', true); return; }
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      setStatus('APIキーを設定してください', true);
      el.settingsModal.classList.add('open');
      return;
    }

    el.generateBtn.disabled = true;
    el.generateBtn.innerHTML = '<span class="spinner"></span>生成中...';
    setStatus('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          prompt,
          size: state.size,
          quality: state.quality,
          style: state.style,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成に失敗しました');

      const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        b64: data.b64,
        prompt: data.revisedPrompt || prompt,
        size: state.size,
        quality: state.quality,
        style: state.style,
        ts: Date.now(),
      };
      await dbAdd(item);
      state.items.unshift(item);
      renderGallery();
      setStatus('生成完了');
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      el.generateBtn.disabled = false;
      el.generateBtn.textContent = '生成する';
    }
  });

  (async function init() {
    db = await openDb();
    state.items = await dbAll();
    renderGallery();
  })();
})();
</script>

</body>
</html>`
