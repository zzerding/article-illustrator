# Agent Instructions — Article Illustrator

> 本文件供 AI 编码 Agent 使用，包含项目完整构建指南。
> 阅读本文件后，Agent 应能独立完成从零到部署的全流程。

---

## 0. 任务概述

构建一个**纯静态单页应用**，功能：
1. 用户通过 Pollinations BYOP 授权，获取自己的 `sk_...` API Key
2. 用户粘贴文章文本，应用解析为段落列表
3. 用户为任意段落选择风格后，AI 生成配图并展示

技术栈：**Vanilla HTML/CSS/JS**（无构建工具，直接部署到 Cloudflare Pages）

---

## 1. 项目文件结构

```
article-illustrator/
├── index.html          # 唯一入口，SPA 全部逻辑在此
├── style.css           # 样式（可内联到 html，但分离更易维护）
├── app.js              # 业务逻辑
├── _redirects          # Cloudflare Pages 重定向规则（SPA 路由）
└── README.md
```

`_redirects` 内容：
```
/*  /index.html  200
```

---

## 2. 环境变量 / 配置常量

在 `app.js` 顶部定义，部署前替换占位符：

```javascript
const CONFIG = {
  // 在 enter.pollinations.ai 创建的 App Key
  CLIENT_ID: 'pk_YOUR_APP_KEY',

  // 当前应用的完整 URL（Cloudflare Pages 分配的域名或自定义域名）
  // 本地开发时改为 'http://localhost:8788'
  REDIRECT_URI: 'https://YOUR_APP.pages.dev',

  // Pollinations API endpoints
  AUTH_URL: 'https://enter.pollinations.ai/authorize',
  TEXT_API: 'https://text.pollinations.ai/openai',
  IMAGE_API: 'https://image.pollinations.ai/prompt',
  USERINFO_API: 'https://enter.pollinations.ai/api/device/userinfo',
};
```

> ⚠️ `CLIENT_ID` 和 `REDIRECT_URI` 是唯二需要在 Cloudflare Pages 环境变量中配置的值。  
> 因为是纯静态应用，实际上是**硬编码在 JS 中**，通过 CI/CD 替换。

---

## 3. BYOP 授权流程实现

### 3.1 发起授权

```javascript
function startAuth() {
  const params = new URLSearchParams({
    redirect_uri: CONFIG.REDIRECT_URI,
    client_id: CONFIG.CLIENT_ID,
    scope: 'generate',
    budget: '10',      // 默认限额 10 Pollen
    expiry: '7',
  });
  window.location.href = `${CONFIG.AUTH_URL}?${params}`;
}
```

### 3.2 处理回调（页面加载时执行）

```javascript
function handleCallback() {
  // key 在 URL fragment，不会发送到服务器
  const hash = new URLSearchParams(location.hash.slice(1));
  const apiKey = hash.get('api_key');
  const error = hash.get('error');

  if (error) {
    showError('授权被拒绝，请重试');
    return;
  }

  if (apiKey) {
    // 存入 sessionStorage（关闭标签页失效，不存 localStorage）
    sessionStorage.setItem('pollen_key', apiKey);
    // 清除 URL fragment，避免 key 暴露在地址栏
    history.replaceState(null, '', location.pathname);
    fetchUserInfo(apiKey);
    showEditor();
    return;
  }

  // 无 key 也无 error，检查 sessionStorage
  const savedKey = sessionStorage.getItem('pollen_key');
  if (savedKey) {
    fetchUserInfo(savedKey);
    showEditor();
  } else {
    showLanding();
  }
}
```

### 3.3 获取用户信息

```javascript
async function fetchUserInfo(apiKey) {
  try {
    const res = await fetch(CONFIG.USERINFO_API, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (res.status === 401) return handleExpiredKey();
    const user = await res.json();
    document.getElementById('username').textContent = user.preferred_username || user.name;
    document.getElementById('avatar').src = user.picture || '';
  } catch (e) {
    // userinfo 失败不阻断主流程
    console.warn('userinfo failed', e);
  }
}
```

### 3.4 登出

```javascript
function logout() {
  sessionStorage.removeItem('pollen_key');
  showLanding();
}
```

---

## 4. 段落解析

```javascript
function parseArticle(text) {
  return text
    .split(/\n{2,}/)                     // 双换行分段
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length >= 20)         // 过滤过短段落
    .slice(0, 50);                       // 最多 50 段
}
```

---

## 5. Prompt 生成（调用 Pollinations Text API）

```javascript
const STYLE_PROMPTS = {
  photo:       'photorealistic, professional photography, high detail',
  illustration:'editorial illustration, flat design, clean lines',
  painting:    'oil painting, artistic, rich texture',
  free:        '',  // 不附加风格约束
};

async function generateImagePrompt(paragraph, style, apiKey) {
  const styleHint = STYLE_PROMPTS[style] ? `Style: ${STYLE_PROMPTS[style]}.` : '';
  const userMessage = `
Convert the following article paragraph into an image generation prompt.
Requirements:
- English only, max 60 words
- No real person names or copyrighted characters
- Vivid, visual description suitable for Flux image model
- ${styleHint}

Paragraph:
"""${paragraph}"""

Output ONLY the prompt, no explanation.
  `.trim();

  const res = await fetch(CONFIG.TEXT_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai',
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 120,
    }),
  });

  if (res.status === 401) { handleExpiredKey(); throw new Error('401'); }
  if (res.status === 402) { throw new Error('INSUFFICIENT_POLLEN'); }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}
```

---

## 6. 图像生成

```javascript
async function generateImage(imagePrompt, apiKey) {
  const encoded = encodeURIComponent(imagePrompt);
  const url = `${CONFIG.IMAGE_API}/${encoded}?model=flux&width=1024&height=576&nologo=true`;

  // Pollinations image API：GET 请求，返回图片二进制
  // 鉴权方式：URL 参数 token（image API 不支持 header auth）
  const urlWithAuth = `${url}&token=${apiKey}`;

  // 用 img.src 直接加载即可，无需 fetch
  return urlWithAuth;
}
```

> ⚠️ **注意**：Pollinations image API 通过 URL 参数 `token` 鉴权，而非 Authorization header。
> 与 Text API 不同，需确认最新文档。如 API 更新，以官方文档为准。

---

## 7. 错误处理函数

```javascript
function handleExpiredKey() {
  sessionStorage.removeItem('pollen_key');
  showToast('授权已过期，请重新登录', 'error');
  setTimeout(showLanding, 2000);
}

function handleInsufficientPollen() {
  showToast('Pollen 余额不足，请前往 Pollinations 充值', 'error', {
    link: 'https://pollinations.ai',
    linkText: '去充值'
  });
}
```

---

## 8. UI 状态管理

应用有三个主要状态，通过 CSS class 切换：

```javascript
// 状态切换
function showLanding() {
  document.body.dataset.state = 'landing';
}
function showEditor() {
  document.body.dataset.state = 'editor';
}

// CSS 控制显示/隐藏
// [data-state="landing"] #editor { display: none; }
// [data-state="editor"]  #landing { display: none; }
```

---

## 9. 段落卡片组件（动态生成）

```javascript
function renderParagraphs(paragraphs) {
  const container = document.getElementById('paragraphs');
  container.innerHTML = '';

  paragraphs.forEach((text, index) => {
    const card = document.createElement('div');
    card.className = 'paragraph-card';
    card.dataset.index = index;
    card.innerHTML = `
      <div class="para-text">${escapeHtml(text)}</div>
      <div class="para-actions">
        <button class="btn-illustrate" onclick="openStylePicker(${index})">
          🎨 配图
        </button>
      </div>
      <div class="para-image" id="img-${index}" hidden></div>
    `;
    container.appendChild(card);
  });
}
```

---

## 10. 风格选择器（浮层）

```javascript
// 点击「配图」后弹出风格选择浮层
function openStylePicker(paragraphIndex) {
  const picker = document.getElementById('style-picker');
  picker.dataset.target = paragraphIndex;
  picker.hidden = false;
}

async function selectStyle(style) {
  const picker = document.getElementById('style-picker');
  const index = parseInt(picker.dataset.target);
  picker.hidden = true;

  await illustrateParagraph(index, style);
}

// 主配图函数
async function illustrateParagraph(index, style) {
  const apiKey = sessionStorage.getItem('pollen_key');
  const paragraph = window._paragraphs[index];
  const imgContainer = document.getElementById(`img-${index}`);
  const btn = document.querySelector(`[data-index="${index}"] .btn-illustrate`);

  // 加载态
  btn.disabled = true;
  btn.textContent = '生成中…';
  imgContainer.hidden = false;
  imgContainer.innerHTML = '<div class="skeleton"></div>';

  try {
    const prompt = await generateImagePrompt(paragraph, style, apiKey);
    const imgUrl = await generateImage(prompt, apiKey);

    imgContainer.innerHTML = `
      <img src="${imgUrl}" alt="配图" onload="this.classList.add('loaded')" />
      <div class="img-actions">
        <a href="${imgUrl}" download="illustration-${index}.jpg">↓ 下载</a>
        <button onclick="illustrateParagraph(${index}, '${style}')">↺ 重新生成</button>
      </div>
      <div class="img-prompt" title="${escapeHtml(prompt)}">Prompt: ${escapeHtml(prompt.slice(0, 60))}…</div>
    `;
  } catch (e) {
    if (e.message === 'INSUFFICIENT_POLLEN') {
      handleInsufficientPollen();
    } else if (e.message !== '401') {
      showToast('生成失败，请重试', 'error');
    }
    imgContainer.innerHTML = '<div class="error-state">生成失败</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = '🎨 配图';
  }
}
```

---

## 11. Cloudflare Pages 部署步骤

1. 在 Cloudflare Pages 创建项目，连接 GitHub 仓库（或直接上传）
2. 构建设置：
   - **Framework preset**: None
   - **Build command**: 留空（纯静态，无需构建）
   - **Build output directory**: `/`（或项目根目录）
3. 替换 `app.js` 中的 `CONFIG.CLIENT_ID` 和 `CONFIG.REDIRECT_URI`
4. 在 Pollinations App Key 设置中，将 Cloudflare Pages 域名加入 **Redirect URIs**
5. 推送代码，Pages 自动部署

### 本地开发

```bash
# 使用 Cloudflare Wrangler 本地预览（保持与线上环境一致）
npx wrangler pages dev . --port 8788

# 或者最简单的方式
npx serve .
```

本地开发时，将 `CONFIG.REDIRECT_URI` 改为 `http://localhost:8788`，  
并在 Pollinations App Key 的 Redirect URIs 中添加该地址。

---

## 12. 安全注意事项

| 风险 | 缓解措施 |
|------|---------|
| `sk_...` 泄露 | 存 `sessionStorage` 不存 `localStorage`；URL fragment 立即清除 |
| XSS | 所有用户输入通过 `escapeHtml()` 转义再插入 DOM |
| CSRF | BYOP 回调通过 fragment 传递，不经服务器；可选加 `state` 参数校验 |
| Prompt Injection | 用户文章内容用三引号包裹，系统 prompt 与用户内容隔离 |

```javascript
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

---

## 13. 待确认事项（构建前需人工核实）

- [ ] `CONFIG.CLIENT_ID`：需要在 [enter.pollinations.ai](https://enter.pollinations.ai) 创建并填入
- [ ] `CONFIG.REDIRECT_URI`：Cloudflare Pages 部署后的实际域名
- [ ] Image API 鉴权方式：确认 `?token=` 参数是否仍有效（以 Pollinations 最新文档为准）
- [ ] Text API endpoint：确认 `https://text.pollinations.ai/openai` 路径正确
- [ ] `openai` 模型名称：确认当前可用的文本模型 ID

---

## 14. 可选扩展功能（后续迭代）

- **导出功能**：将文章+配图打包为 Markdown 或 ZIP 下载
- **批量配图**：一键为所有段落生成配图（加并发限制，避免超速）
- **Prompt 编辑**：生成后允许用户手动修改 prompt 再重新生成
- **历史记录**：用 IndexedDB 保存本次 session 的配图记录
