# 🛠️ AI 物资管理系统 - 技术架构与实现指南

## 1. 核心技术栈清单 (Tech Stack)
为了保证开发效率和代码健壮性，请严格遵守以下技术栈选型，**切勿手动实现已有成熟库的功能**。

### 1.1 前端 (Frontend)
* **核心框架**：Next.js 14+ (App Router) + React 18+ + TypeScript.
* **样式方案**：Tailwind CSS + `clsx` + `tailwind-merge` (用于动态类名).
* **UI 组件库**：`shadcn/ui` (基于 Radix UI，极简且可定制).
* **表单与校验**：`react-hook-form` + `zod` (完美配合 shadcn/ui 的 Form 组件).
* **复杂表格**：`@tanstack/react-table` (用于物资列表和流转台账的排序、分页、过滤).
* **数据请求与状态管理**：
    * 服务端状态：`@tanstack/react-query` (SWR的平替，用于前端数据获取与缓存).
    * 全局轻量状态：`zustand` (用于控制 AI 侧边栏的开闭状态、全局提示等).
* **图标与日期**：`lucide-react` (图标), `date-fns` (日期格式化).

### 1.2 后端 (Backend - Next.js Route Handlers)
* **API 路由**：Next.js App Router 目录下的 `app/api/` 路由。
* **鉴权与会话**：`jose` (用于轻量级 JWT 签发与验证，配合 Next.js Middleware 实现钉钉登录拦截)。
* **AI 编排引擎**：`ai` 和 `@ai-sdk/react` (Vercel AI SDK，提供极简的 `useChat` hook 和强大的 Function Calling 封装)。
* **大模型调用**：`@ai-sdk/openai` (OpenAI 兼容接口，方便接入 GPT-4o、DeepSeek 等)。

### 1.3 数据库 (Database)
* **关系型数据库**：PostgreSQL.
* **ORM 框架**：`prisma` (提供类型安全的数据库操作客户端，对 TypeScript 支持极佳)。

---

## 2. 避免“造轮子”实施规范 (Anti-Reinventing-the-Wheel)
Cursor 在生成代码时，请遵循以下“不造轮子”原则：

1.  **UI 组件库**：
    * 不要手搓 Dialog, Select, Dropdown, Toast。请使用 `npx shadcn-ui@latest add [component-name]` 安装对应组件。
    * 需要的 shadcn 组件列表：`button`, `card`, `dialog`, `input`, `label`, `form`, `table`, `toast`, `select`, `badge`, `avatar`, `scroll-area`.
2.  **钉钉对接**：
    * 钉钉免登获取 `authCode`，前端请直接使用现成的钉钉官方 JSAPI：`dingtalk-jsapi`。
    * 发送钉钉工作通知，请直接调用钉钉官方 OpenAPI 服务端接口，使用原生的 `fetch` 即可，不要引入臃肿的第三方 SDK。
3.  **AI 交互控制**：
    * 前端对话框不要自己写消息流（Streaming）解析逻辑。直接使用 Vercel AI SDK 提供的 `useChat()` hook。
    * 后端 Function Calling 不要自己写 JSON Schema 校验，使用 Zod 定义 Tool 的 parameters。

---

## 3. 数据库模型定义 (Prisma Schema)
*提示 Cursor：请使用以下 `schema.prisma` 初始化数据库层，这是整个系统的底层骨架。*

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum ItemLevel {
  NORMAL
  SPECIAL
}

enum ActionType {
  CLAIM
  RETURN
  ADD
  EDIT
  DELETE
}

model User {
  id              String   @id @default(uuid())
  dingtalk_userid String   @unique
  name            String
  avatar          String?
  role            Role     @default(USER)
  records         Record[] @relation("UserRecords")
  adminRecords    Record[] @relation("AdminRecords")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Item {
  id          String    @id @default(uuid())
  name        String
  imageUrl    String?
  stock       Int       @default(0)
  category    String
  level       ItemLevel @default(NORMAL)
  records     Record[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Record {
  id         String     @id @default(uuid())
  userId     String
  user       User       @relation("UserRecords", fields: [userId], references: [id])
  itemId     String
  item       Item       @relation(fields: [itemId], references: [id])
  quantity   Int
  actionType ActionType
  adminId    String?    // 如果是管理员代办，记录管理员ID
  admin      User?      @relation("AdminRecords", fields: [adminId], references: [id])
  createdAt  DateTime   @default(now())
}

model SystemConfig {
  id          Int      @id @default(autoincrement())
  configKey   String   @unique
  configValue String
  updatedAt   DateTime @updatedAt
}
```

---

## 4. 核心系统集成方案指导

### 4.1 钉钉免密登录鉴权流 (Auth Flow)
1. **前端初始化**：页面加载时检查本地是否存在有效 Token，若无，调用 `dingtalk-jsapi` 获取 `authCode`。
2. **后端验证**：新建路由 `POST /api/auth/dingtalk`。接收 `authCode`，调用钉钉接口换取 `userid`。
3. **数据库匹配**：通过 `userid` 查询 Prisma 数据库，若存在则签发 JWT；若不存在则自动落库注册并签发 JWT。
4. **会话保持**：将 JWT 设置为 `HttpOnly Cookie`，由 Next.js `middleware.ts` 全局拦截校验，向后续 API 注入用户信息头。

### 4.2 AI 助手功能调用架构 (Vercel AI SDK Tools)
*提示 Cursor：AI 侧的“改库前确认卡片”是本项目核心，请使用 `ai` 库的 `tool` 功能实现。*

1.  **定义工具 (Tools)**：
    * 定义 `queryInventory` tool：执行 `prisma.item.findMany()`。
    * 定义 `prepareInventoryUpdate` tool：接收修改意图，**不直接修改数据库**，而是返回新旧数据对比 JSON。
2.  **前端渲染拦截**：
    * 当前端 `useChat` 接收到 `toolInvocation` 的名字为 `prepareInventoryUpdate` 时，渲染**自定义的 React 确认卡片组件**。
3.  **最终执行**：
    * 用户点击卡片上的“确认修改”，前端再向常规的业务 API (`POST /api/items/update`) 发送真实修改请求，而不是让 AI 直接写库。