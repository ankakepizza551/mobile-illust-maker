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
