# Fitness Meal Plan · 健康管理微信小程序

> 融合健身训练管理与饮食营养管控的个人健康管理小程序，基于微信原生框架开发，本地存储为主，可选云开发多设备同步。

---

## 项目简介

本项目面向个人健康管理场景，**融合健身运动管理与饮食营养管理两大核心功能域**。基于《中国居民膳食营养素参考摄入量》标准与全身抗阻训练体系，通过 Mifflin-St Jeor 公式计算个性化营养目标、器械负重系数推荐训练重量、三餐转盘趣味化选餐交互、365 天自动清理过期数据，帮助用户科学规划健身训练、管控日常全维度营养摄入。

**核心架构决策**：

- 📱 **纯微信原生小程序**，零跨端框架（无 Taro/uni-app），零运行时 npm 依赖
- 💾 **本地 storage 为一等公民**，所有功能在无云开发时完整可用
- ☁️ **微信云开发可选启用**，`cloudReady=true` 时自动开启多用户云端同步，所有云调用带降级守卫
- 🔒 **沙盒天然隔离**，不同设备用户数据互不可见，云端读写统一携带 `openid` 过滤

---

## 技术栈

### 前端主体

| 技术 | 版本 | 说明 |
|---|---|---|
| 微信小程序原生框架 | ≥ 2.19.5 | 运行平台，双线程模型（逻辑层 + 视图层） |
| JavaScript (ES6+) | — | 主体语言，经微信编译器 Babel 转 ES5 |
| WXML | — | 小程序页面结构模板 |
| WXSS | — | 小程序样式，支持 CSS 变量、深色模式适配 |
| 微信 Storage API | — | 核心主存储（`wx.setStorageSync` / `getStorageSync`） |

### 可选后端（云开发）

| 技术 | 版本 | 说明 |
|---|---|---|
| 微信云开发 | — | 云函数 + 云数据库 NoSQL |
| wx-server-sdk | ~2.6.3 | 每个云函数独立声明 |

### 自研模块（零第三方依赖）

| 模块 | 位置 | 用途 |
|---|---|---|
| 日志系统 | `utils/logger.js` | 4 级日志（DEBUG/INFO/WARN/ERROR）+ sessionId 追踪 |
| 本地存储 CRUD | `utils/cloud-storage.js` | 封装 wx.setStorageSync + 365 天自动清理 |
| 领域计算函数 | `utils/util.js` | Mifflin-St Jeor BMR → TDEE → 6 项营养素区间 |

### 明确排除

| 排除项 | 说明 |
|---|---|
| TypeScript / React / Vue / Taro / uni-app | 纯原生 JS |
| 独立后端服务（Node / Java / Python） | 无 RESTful API、无 HTTP 请求 |
| WeUI / Vant / NutUI 等组件库 | 全手写组件 |
| Jest / Mocha 测试框架 | 无测试用例 |
| PaddleJS / onnxruntime-web | node_modules 残留，业务代码零引用 |

---

## 功能特性

### 🏋️ 健身管理

- **器械库**：60+ 种器械，按部位（胸/背/肩/臂/腿/核心）→ 肌群 → 类型（自由重量/固定器械/绳索/自重）三级分类
- **负重推荐**：`推荐重量 = 用户体重 × 器械 base_load_factor`，自重类无重量推荐
- **训练计划**：自由编排器械、保存模板、月历排期、状态追踪（待执行/已完成/已取消/已逾期）
- **体重记录**：历史趋势折线图 + 批量管理 + 7 天 / 30 天切换

### 🥗 饮食管理

- **三餐转盘**：早/午/晚独立转盘，趣味化选餐 + 一键录入，支持自定义食物
- **手动添加**：从 60+ 预置食物库 + 自定义食物中选择，按餐次和重量录入
- **营养目标**：Mifflin-St Jeor 公式 → BMR → TDEE → 能量/蛋白质/脂肪/碳水/膳食纤维/盐 6 项推荐区间
- **每日统计**：实时汇总摄入，自动判定达标 / 不足 / 超标，差异化颜色高亮
- **食物库管理**：内置食物批量删除（存 `removed_builtin_foods` 过滤）、自定义食物 CRUD、删除级联清理转盘池

### 🛠️ 架构特性

- **可选云开发**：关闭时 100% 本地可用；开启时本地先写 + 云端附加，全部云调用带降级守卫
- **自动清理**：每次登录触发，每日节流一次，清理 365 天前的过期记录（本地 + 云端）
- **数据隔离**：本地微信沙盒天然隔离，云端统一 `where({ openid })` 过滤
- **深色模式**：CSS 变量驱动，`@media (prefers-color-scheme: dark)` 自动切换
- **跨日期导航**：`pending_diet_date` storage 中转，绕开 `switchTab` 不支持 query 参数的限制

### ❌ 未实现（原始需求设计但代码中不存在）

| 功能 | 原因 |
|---|---|
| 食物拍照识别 | 未引入 `wx.chooseMedia` / AI 推理 |
| 营养缺口补充推荐 | 未对接 Skill 服务层，降级为本地计算 |
| 健身定时提醒推送 | 未申请微信订阅消息模板，`sendSubscribeMsg` 云函数模板 ID 为占位符 |

---

## 目录结构

```
Fitness_Meal_Plan/
├── app.js                  # 小程序入口：globalData + 生命周期 + cloudReady 守卫
├── app.json                # 页面路由 / tabBar / window 配置
├── app.wxss                # 全局样式：CSS 变量主题 + 深色模式适配
├── sitemap.json            # 微信搜索抓取规则
├── project.config.json     # 微信开发者工具项目配置（libVersion 2.19.5）
├── package.json            # Node 包描述（dependencies 为空）
├── .gitignore              # 排除 node_modules / debug.log / IDE 临时文件
│
├── data/                   # 预置字典数据（JSON + JS 双格式）
│   ├── equipment.json / .js    # 60+ 器械库
│   ├── food.json / .js         # 60+ 食物库
│   └── exercise.json / .js     # 30+ 训练动作库
│
├── utils/                  # 自研工具模块（零第三方依赖）
│   ├── logger.js               # 4 级日志 + sessionId 追踪
│   ├── cloud-storage.js        # Storage CRUD + 365 天自动清理
│   └── util.js                 # 日期工具 + 营养目标计算（Mifflin-St Jeor）
│
├── pages/                  # 10 个页面（每个 4 文件：.js / .json / .wxml / .wxss）
│   ├── login/                  # 登录页
│   ├── profile/                # 个人资料采集
│   ├── diet/               ← tabBar  # 饮食首页
│   ├── diet-wheel/             # 三餐转盘选择器
│   ├── diet-calendar/          # 饮食日历
│   ├── fitness/            ← tabBar  # 训练首页
│   ├── equipment/              # 器械库
│   ├── plan-create/            # 生成训练计划
│   ├── calendar/               # 训练日历
│   └── mine/               ← tabBar  # 我的页面
│
└── cloudfunctions/          # 云函数源码（可选部署，wx-server-sdk ~2.6.3）
    ├── login/                  # 微信登录鉴权（前端已调用）
    ├── calcNutritionTarget/    # 营养素目标计算（前端已降级为本地计算）
    ├── calcWeightRecommend/    # 负重推荐（前端已降级为内联计算）
    └── sendSubscribeMsg/       # 订阅消息推送（模板 ID 占位，未启用）
```

---

## 环境要求

### 开发环境

| 环境 | 版本 | 说明 |
|---|---|---|
| 微信开发者工具 | 最新稳定版 | 必需 IDE，含编译、调试、云开发管理能力 |
| 微信小程序基础库 | ≥ 2.19.5 | `project.config.json` 中 `libVersion` 锁定值 |
| 操作系统 | Windows / macOS / Linux | 微信开发者工具全平台支持 |
| Git | 任意版本 | 克隆、提交代码 |

### 运行环境

| 环境 | 版本 | 说明 |
|---|---|---|
| 微信客户端 | iOS / Android 主流版本 | — |
| 微信小程序基础库 | ≥ 2.19.5 | — |
| 存储 | 默认 10MB（微信沙盒上限） | 超出需主动申请 |

### 可选：微信云开发（多设备同步）

| 配置项 | 说明 |
|---|---|
| 云环境 | 在微信云开发控制台创建，项目中**未硬编码** `cloudEnv`，使用自动默认环境 |
| 需要创建的集合 | `diet_record` / `fitness_plan` / `fitness_record` / `weight_record` / `user_info` / `user_nutrition_target` |
| 需要部署的云函数 | `cloudfunctions/login/`（必需）、`cloudfunctions/updateUser/`（前端调用但源码缺失） |

### 环境变量

| 变量 | 位置 | 说明 |
|---|---|---|
| `cloudReady` | `app.js` globalData | **全局开关**，`true` 启用云开发，`false` 纯本地模式。由 `wx.cloud.init()` 是否成功自动设置 |
| `cloudEnv` | `app.js` globalData | 云环境 ID，**未硬编码**，使用自动默认环境；如需指定，在 `app.js` 的 `globalData.cloudEnv` 中设置 |
| AppID | `project.config.json` → `appid` | 已填 `wx36c8793f7db46b6d`，替换为你自己的小程序 AppID |

---

## 部署与启动

### 步骤 1：克隆代码

```bash
git clone https://github.com/WJH03126/Jasper_Diet-_and_Fitness_Plan.git
cd Jasper_Diet-_and_Fitness_Plan
```

### 步骤 2：用微信开发者工具打开

1. 打开微信开发者工具，选择"导入项目"
2. 项目目录选择刚克隆的文件夹根目录
3. AppID 填入你的小程序 AppID（已填默认的，替换为自己的）
4. 项目类型选择"小程序"
5. 点击"导入"

### 步骤 3：运行（纯本地模式，无需云开发）

直接点击开发者工具的"编译"按钮即可运行。此时 `cloudReady=false`，所有功能使用本地 storage，完全可用。

### 步骤 4（可选）：启用云开发

如需多设备数据同步：

1. 在微信云开发控制台创建一个云环境
2. 打开云开发面板，在数据库中手动创建以下集合（6 个）：

```
diet_record
fitness_plan
fitness_record
weight_record
user_info
user_nutrition_target
```

3. 在微信开发者工具的"云开发"面板中，将云环境与当前项目关联
4. 进入 `cloudfunctions/login/` 目录，右键 → 上传并部署（云端安装依赖）
5. （可选）将 `cloudfunctions/` 下所有云函数都上传部署
6. 重新编译，控制台应显示 `cloudInit ok`，globalData.cloudReady 将自动变为 `true`

### 步骤 5（可选）：设置云环境 ID

如需指定特定云环境（而非使用自动默认），编辑 `app.js`：

```javascript
// app.js → globalData
globalData: {
  userInfo: null,
  openid: null,
  nutritionTarget: null,
  cloudReady: false,
  cloudEnv: '你的云环境ID'   // ← 添加这一行
}
```

然后在 `onLaunch` 中 `wx.cloud.init({ env: this.globalData.cloudEnv })` 会使用指定环境。

---

## 接口简要说明

### cloudReady 守卫机制（核心设计）

所有云能力通过 `cloudReady` 全局 flag 守卫，确保云开发关闭时功能完整可用：

```
app.js onLaunch()
  → wx.cloud.init() 尝试
    → 成功: cloudReady = true
    → 失败: cloudReady = false

所有业务代码
  → if (cloudReady) { wx.cloud.callFunction / wx.cloud.database() }
  → else { 本地 storage 操作 }
```

### 已调用的云函数

| 云函数 | 调用位置 | 降级策略 |
|---|---|---|
| `login` | `pages/login/login.js:47` | 失败 → `mockLogin()`（本地生成 openid + token） |
| `updateUser` | `pages/profile/profile.js:115` | 失败 → 直接 `wx.cloud.database().collection('user_info').update()` |

### 云端数据库读写模式

| 操作类型 | cloudReady=false | cloudReady=true |
|---|---|---|
| 读取 | 仅 `wx.getStorageSync(local_key)` | 本地先读 → 云端附加查询（带 `where({ openid })` 过滤） |
| 写入 | 仅 `wx.setStorageSync(local_key)` | 本地先写 → 云端附加写入（附加 `openid` 字段） |
| 删除 | 仅从本地 storage 数组中移除 | 本地移除 → 云端双重验证删除（`record_id + openid`） |

### 自动清理链路

```
app.setLoginData() 被调用
  → _runDailyCleanup()
    → 检查 last_cleanup_date 今日是否已执行（每日节流）
    → cleanupOldRecords(MAX_RECORD_AGE_DAYS=365)
      → 本地 storage 清理：保留最近 365 天
      → cloudReady=true 时：cleanupOldRecordsCloud() 清理云端集合
```

### 本地 Storage Key 对照表

| Key | 内容 | 对应云端集合 |
|---|---|---|
| `token` | 登录凭证 | — |
| `openid` | 用户身份标识 | — |
| `userInfo` | 用户资料对象 | `user_info` |
| `nutritionTarget` | 当前营养目标区间 | `user_nutrition_target` |
| `local_diet_records` | 全部饮食记录 | `diet_record` |
| `local_fitness_plans` | 全部训练计划 | `fitness_plan` |
| `local_fitness_records` | 全部训练执行记录 | `fitness_record` |
| `local_weight_records` | 全部体重记录 | `weight_record` |
| `custom_foods` | 用户创建的自定义食物 | — |
| `removed_builtin_foods` | 被删除的内置食物 ID | — |
| `last_cleanup_date` | 上次清理日期（每日节流） | — |
| `pending_diet_date` | 跨日期导航中转 | — |

---

## 常见问题

### Q1：Git 在终端中找不到？

PowerShell 默认 PATH 可能不包含 Git 安装目录。在当前会话中手动刷新：

```powershell
$env:PATH = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')
```

如果仍找不到，确认 Git 已安装并已将 `C:\Program Files\Git\cmd` 加入系统 PATH。

### Q2：云开发"环境未找到"错误？

云环境未在项目中关联，或 `cloudfunctions/` 下有云函数已部署但本地调用时云开发未启用。

**解决**：在微信开发者工具的"云开发"面板中手动关联一个云环境。

### Q3：node_modules 里有 PaddleJS / onnxruntime-web，但前端 dependencies 是空的？

这些包是"食物拍照识别"功能的遗留依赖，业务代码**零引用**，`project.config.json` 中 `nodeModules: false` 确保它们不会被打进线上包。如需彻底清理，删除 `node_modules/` 目录和 `package-lock.json` 即可。

### Q4：退出登录后数据没了？

**不会**。退出登录（`app.clearLoginData()`）**仅清除** `token` 和 `openid`，`userInfo`、`nutritionTarget`、全部历史记录都会保留。重新登录后数据完整恢复。

### Q5：两个设备数据不同步？

请确认：

1. 两台设备使用**同一个微信账号**登录
2. 两台设备的小程序都开启了云开发（`cloudReady=true`）
3. 云开发数据库中有正确创建的 6 个集合
4. 两台设备的 `openid` 一致（云函数自动获取，正常情况下同一个微信账号的 openid 是相同的）

### Q6：cloudReady 为 false 时还能正常用吗？

**完全可以**。所有业务功能在纯本地模式下 100% 可用。云开发只是多设备同步的可选补充层，不是必需品。

### Q7：Mifflin-St Jeor 和 Harris-Benedict 用的是哪个公式？

**Mifflin-St Jeor**（更准确的版本，由 Mifflin 等人 1990 年提出）：

- 男性 BMR = `10 × 体重 + 6.25 × 身高 − 5 × 年龄 + 5`
- 女性 BMR = `10 × 体重 + 6.25 × 身高 − 5 × 年龄 − 161`

> 注意：`cloudfunctions/calcNutritionTarget/index.js` 中使用的是 Harris-Benedict 公式，但该云函数前端**未被调用**，实际生效的是 `utils/util.js` 中的 Mifflin-St Jeor 版本。

### Q8：微信开发者工具项目配置文件里有哪些需要改的？

| 字段 | 默认值 | 是否需要改 | 说明 |
|---|---|---|---|
| `appid` | `wx36c8793f7db46b6d` | ✅ | 替换为你自己的小程序 AppID |
| `cloudfunctionRoot` | `"cloudfunctions/"` | ❌ | 保持不变 |
| `nodeModules` | `false` | ❌ | 打包时排除 node_modules |
| `libVersion` | `2.19.5` | ❌ | 最低基础库版本 |

---

## 许可证

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源。

```
MIT License

Copyright (c) 2026 WJH03126

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files, to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software.
```

---

## 文档索引

| 文档 | 说明 |
|---|---|
| [健康管理微信小程序 需求规格说明书.md](./健康管理微信小程序%20需求规格说明书.md) | 功能需求 + 数据模型 + 业务规则（V2.0 代码对齐版） |
| [项目技术栈说明.md](./项目技术栈说明.md) | 技术选型 + 依赖 + 架构详情 |
| [cloudfunctions/login/index.js](./cloudfunctions/login/index.js) | 登录云函数源码 |
