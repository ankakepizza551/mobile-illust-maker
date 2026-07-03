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
    font-fa
