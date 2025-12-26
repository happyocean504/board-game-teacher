# 技术架构文档 - 私人桌游规则导师

## 1. 技术栈选型

### 前端框架
- **Core**: React 18+
- **Build Tool**: Vite (快速构建，轻量级)
- **Language**: TypeScript
- **Routing**: React Router DOM
- **UI Framework**: Tailwind CSS + Shadcn/UI (或类似轻量级移动端组件库，如 Ant Design Mobile)
- **State Management**: Zustand (轻量级，适合移动端状态管理)

### 核心库
- **PDF 处理**: `react-pdf` (渲染), `jspdf` (图片转PDF)
- **HTTP Client**: `axios` 或 `fetch`
- **Markdown Rendering**: `react-markdown` (用于渲染 AI 的文字回复)
- **Icons**: `lucide-react`

### AI & TTS
- **AI Integration**: OpenAI SDK (配置 `baseURL` 以支持 DeepSeek, Moonshot 等国内模型)。
- **TTS**: 
    - **Primary (High Quality)**: 阿里云 TTS / 华为云 TTS。
        - *实现注*: 由于云厂商 API 存在跨域(CORS)限制且需隐藏 SecretKey，需通过 **Vercel Serverless Functions** 或 **Cloudflare Workers** 进行 API 转发。
    - **Fallback**: Web Speech API (浏览器原生)。
- **STT (语音转文字)**: Web Speech API。

## 2. 系统架构

### 2.1 目录结构
```
src/
├── assets/          # 静态资源
├── components/      # 通用组件 (Button, Input, Modal...)
├── features/        # 业务功能模块
│   ├── home/        # 首页
│   ├── rule-add/    # 规则添加页
│   ├── explanation/ # 讲解页 (Chat, PDFViewer, Controls)
│   └── settings/    # 设置页
├── hooks/           # 自定义 Hooks (useTTS, useAI, useAudio...)
├── lib/             # 工具库 (api client, pdf helpers...)
├── services/        # API 服务层
├── store/           # 全局状态 (Zustand)
├── types/           # TS 类型定义
└── App.tsx
api/                 # Serverless Functions (Vercel/Netlify 格式)
└── tts.ts           # TTS 转发服务 (处理鉴权与跨域)
```

### 2.2 数据流
1.  **用户上传**: 图片 -> `jspdf` 合并 -> PDF Blob -> 存储 (IndexedDB 或 本地临时 URL)。
2.  **规则解析**: PDF -> 文本提取 (OCR 或 PDF 解析库) -> 发送给 LLM。
3.  **LLM 交互**: 
    - System Prompt (内置) + User Query + Rule Content -> LLM API。
    - LLM Response (Stream) -> 前端显示 -> TTS 播放。
4.  **TTS 播放**: 
    - 方案 A (云端): 文本 -> `/api/tts` (后端转发) -> 阿里云/华为云 -> Audio Stream -> 前端播放。
    - 方案 B (原生): 文本 -> Web Speech API -> 播放。

## 3. 关键模块实现方案

### 3.1 PDF 阅读器
- 使用 `react-pdf` 实现移动端阅读器。
- 支持手势缩放 (Pinch-to-zoom) 和翻页。

### 3.2 聊天界面 (Chat Interface)
- 消息列表自动滚动到底部。
- 气泡组件区分 User 和 AI。
- AI 气泡集成 Audio Player 控制 (Play/Pause/Stop)。

### 3.3 状态机 Prompt 管理
- 将用户提供的 Prompt 硬编码为 System Message。
- 维护对话上下文 (Context Window)，确保 AI 记住当前讲解状态。

### 3.4 本地存储
- 使用 `localStorage` 存储：
    - 用户设置 (API Key, Endpoint, TTS 配置)。
    - 游戏列表元数据 (ID, Name, Date)。
- 使用 `IndexedDB` (推荐 `idb` 库) 存储：
    - 较大的 PDF 文件 (避免 localStorage 容量限制)。

## 4. 部署方案
- **推荐**: Vercel (同时托管前端静态页和 Serverless API)。
- **替代**: 静态托管 + 独立后端 (如 Node.js/Go)。
- **纯静态模式**: 仅支持 Web Speech API，无法使用阿里云/华为云 TTS (因跨域和安全限制)。

## 5. 安全性
- API Key 仅存储在用户浏览器本地。
- 所有 API 请求直连服务商，不经过中间服务器 (除非使用内置转发服务)。
