# AI 驱动的企业物资管理系统

基于 Next.js 的企业内部物资管理系统，深度集成钉钉免密登录与 AI 智能助手。

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **后端**: Next.js Route Handlers + Prisma ORM + PostgreSQL
- **鉴权**: 钉钉 SSO + JWT (jose)
- **AI**: Vercel AI SDK + OpenAI 兼容接口 (Function Calling)
- **部署**: Docker Compose

## 核心功能

- 物资大厅：卡片展示、分类筛选、关键词搜索、分页
- 物资 CRUD：管理员可新增/编辑/删除物资
- 领取/归还：普通用户领取普通物资，特殊物资仅限管理员分配
- AI 助手：自然语言查询库存，修改操作需确认卡片二次确认
- 流转台账：所有库存变动生成不可篡改日志
- 系统配置：AI 模型和钉钉凭证动态配置，敏感信息加密存储
- 钉钉通知：领取/分配成功后推送工作通知

## 快速开始

### 环境要求

- Node.js 22+
- Docker & Docker Compose
- 钉钉企业内部应用凭证

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量
cp .env.example .env
# 编辑 .env 填入钉钉和 AI 相关配置

# 3. 启动 PostgreSQL
docker compose up db -d

# 4. 数据库迁移
npx prisma migrate dev

# 5. 填充测试数据
npx prisma db seed

# 6. 启动开发服务器
npm run dev
```

开发模式下可使用 mock 登录：在登录页输入 `admin_001` 或 `user_001`。

### Docker 部署

```bash
# 编辑 .env 填入生产环境配置
cp .env.example .env

# 构建并启动
docker compose up -d --build

# 首次运行迁移（已内置于容器启动流程）
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | 是 |
| `JWT_SECRET` | JWT 签名密钥（至少 32 字符） | 是 |
| `CONFIG_ENCRYPTION_KEY` | 配置加密密钥（32 字符） | 是 |
| `DINGTALK_APP_KEY` | 钉钉应用 AppKey | 是 |
| `DINGTALK_APP_SECRET` | 钉钉应用 AppSecret | 是 |
| `DINGTALK_AGENT_ID` | 钉钉应用 AgentId（通知用） | 否 |
| `AI_BASE_URL` | AI 模型 API 地址 | 否 |
| `AI_API_KEY` | AI 模型 API Key | 否 |
| `AI_MODEL` | 模型名称（默认 gpt-4o） | 否 |

## 项目结构

```
app/
  (main)/              # 需要登录的主布局
    materials/         # 物资大厅
    records/           # 流转台账（Admin）
    settings/          # 系统配置（Admin）
  api/
    auth/              # 钉钉登录、登出、当前用户
    items/             # 物资 CRUD + 领取/归还/分配
    records/           # 台账查询
    config/            # 系统配置
    ai/chat/           # AI 对话流
  login/               # 登录页
components/
  ai/                  # AI 悬浮助手组件
  layout/              # 布局组件（侧边栏、导航栏、鉴权守卫）
  ui/                  # shadcn/ui 组件
lib/
  auth.ts              # JWT 工具
  prisma.ts            # Prisma 客户端
  dingtalk.ts          # 钉钉 API
  dingtalk-notify.ts   # 钉钉通知
  crypto.ts            # AES 加解密
  store.ts             # Zustand 全局状态
  validators.ts        # Zod 校验
  api-utils.ts         # API 鉴权工具
prisma/
  schema.prisma        # 数据模型
  seed.ts              # 测试数据
```
