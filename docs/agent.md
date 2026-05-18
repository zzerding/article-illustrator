# Agent Handoff - Article Illustrator

> 交给同事实现的功能说明，基于当前 React/Vite 文章配图应用。

## 1. 目标

在现有“文章段落 -> AI 配图”流程上，补齐三个能力：

1. 登录后展示用户基本信息。
2. 用 Pollinations 的 text-generation 为文章段落生成配图 prompt。
3. 允许用户分别选择 text 模型和 image 模型。

目标是保持应用仍然是纯前端静态站点，不引入后端。

## 2. 现有基础

- 现有项目是 React + Vite 单页应用。
- 已有 Pollinations BYOP 登录流程。
- 已有段落解析、逐段生成图片、样式选择器等基础能力。
- 现有 auth key 仍建议只保存在 `sessionStorage`，不要改成 `localStorage`。

## 3. Pollinations 官方接口基线

以官方文档为准，建议优先使用以下接口：

- Base URL: `https://gen.pollinations.ai`
- 登录授权: `https://enter.pollinations.ai/authorize`
- 用户资料: `GET /account/profile`
- 余额信息: `GET /account/balance`
- 文本生成: `POST /v1/chat/completions`
- 文本模型发现: `GET /v1/models` 或 `GET /text/models`
- 图片生成: `POST /v1/images/generations`
- 图片模型发现: `GET /v1/models` 或 `GET /image/models`

建议实现时把 `GET /v1/models` 作为统一模型来源，再按 `output_modalities` 和 `supported_endpoints` 过滤成 text / image 两组。

## 4. 用户基本信息展示

### 4.1 需要展示的字段

登录成功后，在顶部栏或用户菜单里展示：

- 头像 `image`
- GitHub 用户名 `githubUsername`
- 账户等级 `tier`
- 余额 `balance`
- 下次重置时间 `nextResetAt`

如果 `name` 或 `email` 没有返回，不要依赖它们做主展示。

### 4.2 数据来源

- 基本资料优先从 `GET /account/profile` 拉取。
- 余额从 `GET /account/balance` 补充显示。
- 如果余额接口不可用或无权限，允许只显示资料，不阻断主流程。

### 4.3 交互要求

- 首次授权后自动加载用户信息。
- 页面刷新后如果 key 还在，自动恢复用户信息。
- 拉取失败时，保留一个降级态，例如“已登录”或头像占位，不要卡住编辑器。

## 5. Prompt 生成流程

### 5.1 核心要求

每个段落点击“配图”后，先调用 text model 生成 prompt，再用 image model 出图。

prompt 生成要求：

- 只输出 prompt，不要解释。
- 输出英文，尽量控制在 60 词以内。
- 描述要具体、可视化。
- 避免真实人名、版权角色、敏感隐私内容。

### 5.2 推荐接口

使用 `POST /v1/chat/completions` 作为主流程，而不是只用简单 `GET /text/{prompt}`。

原因：

- 更容易切换模型。
- 便于后续加系统提示词、结构化输出和失败回退。
- 和图片生成流程保持一致，方便扩展。

### 5.3 安全建议

如果文章里可能包含姓名、邮箱、电话、地址等信息，文本请求建议启用 Pollinations 的 `safe` 机制，例如 `privacy,secrets`，至少不要把原文完整暴露到日志里。

## 6. Text / Image 模型选择

### 6.1 产品形态

在编辑器顶部或侧边设置区提供两个独立选择器：

- Text model: 控制 prompt 生成模型
- Image model: 控制最终出图模型

这两个选择器是全局设置，作用于后续生成，不要求做到“每个段落单独配置”。

### 6.2 数据源与过滤

模型列表不要手写死在 UI 里。建议：

1. 启动时拉 `GET /v1/models`。
2. Text 选择器只显示 `output_modalities` 包含 `text`，且支持 `/v1/chat/completions` 或 `/text/{prompt}` 的模型。
3. Image 选择器只显示 `output_modalities` 包含 `image`，且支持 `/v1/images/generations` 或 `/image/{prompt}` 的模型。
4. 如果接口失败，回退到内置最小模型列表。

### 6.3 推荐默认值

- Text 默认：`openai-fast` 或 `openai`
- Image 默认：`flux`

如果产品想更偏高级，可把 `gpt-5.4-mini`、`gptimage`、`zimage` 放到推荐项里，但不要一次把所有模型都平铺到主界面。

### 6.4 显示方式

模型选项里建议显示：

- 模型名
- 简短描述
- `paid_only` 标签
- 可选的成本信息或上下文长度

## 7. 生成链路

### 7.1 顺序

1. 用户选中段落。
2. 使用当前 text model 生成 prompt。
3. 把 prompt 交给当前 image model 生成图片。
4. 在卡片里展示图片、下载入口、重新生成入口。

### 7.2 Prompt 和 image model 的关系

prompt 生成时，允许把选中的 image model 作为上下文传给 text model，让它输出更适合目标出图模型的 prompt。

这不是强依赖，但建议保留这个入口，后面如果要做更细的 prompt tuning 会更容易。

## 8. 状态与错误处理

- `401`：清除 session key，回到登录页。
- `402`：提示余额不足。
- `403`：如果是 profile / balance 读取失败，允许降级；如果是生成接口失败，提示无权限或模型不可用。
- `429` / `5xx`：显示可重试错误，不要清空用户输入。
- 模型列表拉取失败：继续使用默认模型，页面可用优先。

## 9. 数据存储

- Auth key: `sessionStorage`
- 模型偏好: `localStorage`
- 文章正文和生成结果: 只保留在前端内存中
- 不要增加服务端持久化

## 10. 验收标准

1. 登录后，顶部能看到头像、用户名、等级和余额信息。
2. 用户能在 UI 里切换 text model 和 image model。
3. 段落配图时，先用 text model 生成 prompt，再用 image model 出图。
4. 刷新页面后，模型偏好还能恢复。
5. 任一接口失败时，核心编辑器仍可继续使用。
6. 模型来源以 Pollinations 官方接口为准，不依赖手写死列表。

## 11. 实施建议

- 先做用户信息展示和模型设置存储。
- 再把 prompt 生成从“固定模型”改成“可配置模型”。
- 最后把图片生成切到可配置 image model。
- 不要在同一个提交里顺手重构无关 UI，保持改动可回滚。

## 12. 开发任务拆分

### 阶段 1：接口配置整理

目标：把现有 Pollinations endpoint 统一到官方 `gen.pollinations.ai` 基线。

任务：

- 更新 `src/config.js`，新增 `API_BASE_URL = "https://gen.pollinations.ai"`。
- 保留 `AUTH_URL = "https://enter.pollinations.ai/authorize"`。
- 新增 `PROFILE_API = "/account/profile"`、`BALANCE_API = "/account/balance"`、`MODELS_API = "/v1/models"`。
- 新增默认模型配置：`DEFAULT_TEXT_MODEL = "openai-fast"`、`DEFAULT_IMAGE_MODEL = "flux"`。
- 检查现有 `TEXT_API` 和 `IMAGE_API` 使用点，准备迁移到 `/v1/chat/completions` 和 `/v1/images/generations`。

验收：

- 配置集中在一个文件里。
- 旧 endpoint 不再散落在组件里。
- 本阶段不要求 UI 行为变化。

### 阶段 2：用户信息展示

目标：登录后展示真实用户资料和余额。

任务：

- 在 `AuthContext` 中增加 `profile`、`balance`、`accountLoading`、`accountError` 状态。
- 登录成功或刷新恢复 key 后，调用 `GET /account/profile`。
- profile 成功后再调用 `GET /account/balance`。
- 顶部栏展示头像、GitHub 用户名、tier、余额。
- profile / balance 失败时只降级展示，不影响编辑器。

验收：

- 登录后能看到头像和 GitHub 用户名。
- 余额接口失败时，用户仍可继续生成。
- `401` 会清除 key 并回到登录态。

### 阶段 3：模型发现与偏好存储

目标：让用户选择 text model 和 image model，并记住选择。

任务：

- 新增模型加载逻辑，调用 `GET /v1/models`。
- 按 `output_modalities` 和 `supported_endpoints` 过滤 text / image 模型。
- 新增 `ModelSettings` 或同等组件，包含两个 select / popover。
- 将用户选择保存到 `localStorage`。
- 模型接口失败时，回退到内置列表：text 使用 `openai-fast`、`openai`；image 使用 `flux`、`gptimage`。

验收：

- 用户可以独立切换 text model 和 image model。
- 刷新后保留上次选择。
- 模型列表加载失败时页面仍可用。

### 阶段 4：Prompt 生成改造

目标：用用户选择的 text model 生成配图 prompt。

任务：

- 将现有 `generateImagePrompt` 改为调用 `POST /v1/chat/completions`。
- 请求体使用当前 text model。
- prompt 模板里加入段落原文、风格、目标 image model。
- 返回内容做 trim，并去掉可能出现的包裹引号或多余前缀。
- 处理 `401`、`402`、`403`、`429` 和 `5xx`。

验收：

- 配图前能生成英文 image prompt。
- 切换 text model 后，新生成请求使用新模型。
- 生成失败时段落卡片进入可重试状态。

### 阶段 5：图片生成改造

目标：用用户选择的 image model 生成图片。

任务：

- 将图片生成切到 `POST /v1/images/generations`。
- 请求体包含 `prompt`、`model`、`size = "1024x576"`、`response_format = "url"`。
- 使用 `Authorization: Bearer ${apiKey}` 鉴权。
- 保存返回的图片 URL、prompt、text model、image model。
- 重新生成时沿用当前段落、当前风格和当前模型配置。

验收：

- 切换 image model 后，新生成请求使用新模型。
- 图片能正常展示和下载。
- 图片生成失败不清空段落和已生成结果。

### 阶段 6：体验收尾

目标：让功能完整可交付。

任务：

- 增加模型加载 skeleton 或轻量 loading 状态。
- 在生成中状态显示当前 text / image 模型名。
- 在 prompt 展示区记录本次使用的模型。
- 补齐中英文文案。
- 手动测试登录、刷新、切换模型、生成、重新生成、余额不足、无权限等路径。

验收：

- `pnpm build` 通过。
- 无明显 console error。
- 移动端模型选择器可用。
- 同事能只看本文档完成实现和验收。

## 13. 参考链接

- Pollinations Docs: https://gen.pollinations.ai/docs
- Pollinations LLM 说明: https://gen.pollinations.ai/docs/llm.txt
- OpenAPI Schema: https://gen.pollinations.ai/docs/open-api/generate-schema
