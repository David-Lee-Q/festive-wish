# 中外节日专属祝福生成器

选择节日 + 填写受赠人档案，一键生成「应景应人」的专属祝福语与 AI 手绘插画，自动合成带祝福语、落款和分享二维码的祝福卡片，支持下载与分享。

## 功能特性

- **24 个节日，三类分组**：中国节日、世界节日、少数民族节日（泼水节、火把节、三月三、那达慕、雪顿节、开斋节、古尔邦节等，卡片带民族标记），界面为居中三段式胶囊切换 + 单行卡片横滑。
- **日期智能选节**：基于 ICU 历法支持公历、农历与伊斯兰历，以及「第 N 周的星期 X」（如复活节、母亲节），进入页面自动高亮今日或 7 天内将至的应景节日，页面主题与背景元素同步切换。
- **专属祝福文案**：按受赠人姓名、年龄、性别、职业与敬赠人关系生成个性化祝福，含标题、称呼、正文、应景诗句与祝词；模型异常时自动降级为模板文案，保证可用。
- **AI 插画配图**：后端代理调用文生图模型，按节日场景 + 人物特征 + 随机艺术风格生成插画，任务轮询制（并发 2，任务 15 分钟过期）。
- **祝福卡片合成**：前端 Canvas 绘制 1080 宽竖版卡片（插画 + 称呼 + 祝福正文 + 诗句 + 落款 + 二维码），称呼顶格加冒号、正文首行缩进两格，面板高度按文案长度自适应，二维码紧贴插画右下角，运行时按当前地址生成。
- **下载与分享**：插画与图文祝福卡 PNG 一键下载（文件名按节日与受赠人生成），Web Share API 原生分享。
- **使用统计**：首页展示「已有 X 人生成了 Y 张卡片」，按 IP+UA 哈希去重计用户，数据持久化，保留 30 天每日明细。

## 技术栈

- 后端：Node.js + Express（单文件 `server.js`），OpenAI 兼容模型接口（文本 + 文生图均由后端代理）
- 前端：原生 HTML/CSS/JS（无构建步骤），Canvas 卡片合成，qrcode-generator 生成二维码
- 依赖仅 `express` 与 `dotenv`

## 快速开始

要求：Node.js 18+。

```bash
# 安装依赖
npm install

# 配置环境变量（模型密钥只存服务端）
cp .env.example .env
```

编辑 `.env` 填入 `MODEL_API_KEY` 等真实值，然后启动：

```bash
# 方式一：使用启动脚本（推荐，幂等，端口固定 3000）
./start.sh

# 方式二：直接运行
npm start
```

打开 http://localhost:3000 即可使用。

停止服务：

```bash
./stop.sh
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MODEL_BASE_URL` | 模型服务地址（OpenAI 兼容） | 空 |
| `MODEL_API_KEY` | 服务端密钥，严禁暴露给前端 | 空 |
| `MODEL_TEXT` | 文本生成模型 | `cosmo-mind-turbo` |
| `MODEL_IMAGE` | 文生图模型 | `cosmo-mind-image` |
| `PORT` | 服务端口 | `3000` |

## 项目结构

```
├── server.js            # 后端：路由、模型代理、限流、统计
├── festivals.js         # 24 个节日数据源（场景、配色、主题、日期规则）
├── start.sh / stop.sh   # 服务启停脚本（端口 3000，PID 文件 .server.pid）
├── data/                # 运行时统计持久化（stats.json，已 git 忽略）
└── public/
    ├── index.html       # 单页应用
    ├── app.js           # 前端主逻辑（节日选择、生成、卡片合成）
    ├── styles.css       # 样式（主题变量随节日切换）
    ├── festival-date.js # 公历/农历/伊斯兰历日期匹配
    ├── festival-icons.js# 节日背景元素与图标
    ├── qrcode.min.js    # 二维码库
    ├── elements/        # 43 张背景元素图
    └── icons/           # 节日图标
```

## API

### `GET /api/festivals`

返回全部节日（不含内部提示词字段）。

### `POST /api/blessing`

生成祝福文案。限流：40 次 / 10 分钟。

```json
{
  "name": "小雨",
  "age": 28,
  "gender": "female",
  "occupation": "设计师",
  "giver": "妈妈",
  "festival": "mid-autumn"
}
```

响应：

```json
{
  "profile": { "name": "小雨", "age": 28, "gender": "female", "occupation": "设计师", "giver": "妈妈" },
  "festival": { "id": "mid-autumn", "name": "中秋节", "group": "cn", "date": "八月十五" },
  "blessing": {
    "title": "月圆人圆",
    "salutation": "小雨",
    "blessing": "……正文……",
    "verse": "但愿人长久\n千里共婵娟",
    "wish": "中秋快乐"
  }
}
```

模型异常时返回模板文案并附 `fallback: true`。

### `POST /api/image`

提交插画生成任务。限流：20 次 / 10 分钟。请求体同上，返回 `{ "jobId": "..." }`。

### `GET /api/image/:id`

轮询任务状态：`pending` / `done`（附 `image` base64）/ `error`。任务 15 分钟后过期。

### `GET /api/stats`

使用统计：`{ "totalGenerations": 128, "totalImages": 96, "users": 34, "daily": { "2026-09-21": 12 } }`，`daily` 为最近 30 天每日生成量。

### `GET /api/health`

健康检查。

## 设计要点

- **密钥安全**：模型 API Key 仅存于服务端 `.env`，前端只与本机后端通信，接口响应不含任何密钥信息。
- **内容约束**：祝福文案不出现年龄数字、称呼不添加修饰前缀、无表情符号；所有模型输出经白名单清洗与长度截断后再展示。
- **限流**：按 IP 对 `/api/blessing`（40 次）与 `/api/image`（20 次）做 10 分钟窗口限流，超限返回 429。
- **容错**：文案生成失败自动降级模板文案；图片任务失败可重试；静态资源 no-cache 便于热更新。

## 运维说明

- 修改 `server.js` 后需重启（`./stop.sh` 与 `./start.sh` 请**分两次执行**，串成一条命令会因前台挂起被超时杀掉）；修改 `public/` 下静态文件即时生效，无需重启。
- 服务日志写入 `server.log`，PID 记录于 `.server.pid`。
- `data/`、`.env`、`.server.pid`、`server.log` 均已被 `.gitignore` 忽略。
