# AZ Studio 工作交接记录

更新日期：2026 年 9 月 21 日。

本文供接手项目的 LLM 阅读。本文只把仓库、页面或接口验证过的结果称为已确认。部分早期操作只能根据本次对话和 Git 历史概括，不能代替逐项审计。

## 项目与当前状态

项目目录：`/Users/zq/Downloads/Adam/my-project/azstudio`。

技术结构：React、Vite、TypeScript 前端，通过 WordPress REST API 读取 Project 与 ACF 数据。WordPress 管理内容，React 渲染主页、Projects 列表和项目详情页。默认 API 地址在 `src/lib/wordpress.ts`，为 `https://public-api.wordpress.com/wp/v2/sites/mixzq9.wordpress.com`，也可由 `VITE_WORDPRESS_API_BASE` 覆盖。

Git 远程仓库：`https://github.com/mixzq/azstudio.git`。截至 2026 年 9 月 21 日，`main` 和 `origin/main` 都指向 `3a6a421`，提交说明为 `Link homepage service cards to service page`。当前工作区存在尚未提交的代码修改，涉及 `src/App.tsx`、`src/components/SeoFooter.tsx`、`src/components/WorksFloatingCards.tsx`、`src/lib/wordpress.ts` 和 `src/styles.css`。以下内容仍未跟踪，属于用户资料或工作文档，不要自动加入提交：`.codex/`、`OKR.md`、`log.md`、`public/PIC/Grete/`、`public/PIC/fotland_bryggeri/Codex 图像 2026年9月7日 19_40_49 1.webp`。

本地 Landing Page 曾于 `http://127.0.0.1:4178/start` 完成桌面端和移动端检查。服务是否仍在运行需要重新检查。线上网站为 `https://azstudio.no/`。2026 年 9 月 21 日检查线上首页与 WordPress REST API 时，线上仍是已部署版本，本地 Landing Page 与当前未提交修改尚未推送或部署。

## 已完成的主要工作

### WordPress 与 ACF 连接

项目数据入口是 `getWordPressWorks()`，位于 `src/lib/wordpress.ts`。它先请求 `projects`，没有项目或请求失败时回退到 `posts`。请求附带 `acf_format=standard`，让 ACF 图片字段尽量返回格式化数据。图片字段的前端解析兼容媒体 ID、图片 URL 和 Image Array；媒体 ID 会引发额外媒体接口请求。

曾出现 CMS 图片字段返回媒体 ID，而前端只接受 URL，造成已发布项目图片或详情信息未按预期显示。Git 提交 `0474241` 增加媒体 ID 支持，`e8783d2` 使用格式化 ACF 图片响应。此问题的兼容代码已存在，但不能据此认定每张新图片都已正确使用最佳尺寸。

2026 年 9 月 14 日已通过 WordPress 后台检查字段组 `Project Details`：`card_image`、`hero_background`、`hero_logo`、`social_image` 都是图片字段，返回格式已选 Image Array，媒体库范围是全部；字段组已启用，也已启用 REST API。因此没有重复保存字段组。没有上传、替换或删除项目图片。后台设置与 REST 接口实际响应并非同一证据，改前端之前必须重新取得响应样本。我不确定当前每个字段是否都实际返回完整尺寸列表。

曾通过 WordPress API 查询到 ID 为 56 的 Project，文章标题为 `Fotland Bryggeri`，slug 为 `test-project`。因此前端链接仍可能是 `/projects/test-project`。标题与 slug 不一致是 CMS 当前数据问题，不是卡片标题的本地模拟数据。

### 本地测试数据与项目列表

过去为了预览曾在 `src/lib/wordpress.ts` 放入 `LOCAL_PREVIEW_WORK`，使开发模式以本地 Test Project 替代 CMS 同 slug 项目。结果是 Projects 页的卡片图片与文字来自本地模拟，不是 WordPress。

这个模拟项及其开发模式覆盖逻辑已删除。现在 `getWordPressWorks()` 返回 CMS 项目并按 `displayOrder` 排序。主页、Projects 页与项目详情的数据入口一致。已在本地 Projects 页观察到 CMS 卡片标题 `Fotland Bryggeri`，图片地址来自 WordPress 图片服务，链接仍为 `/projects/test-project`。删除模拟数据的修改包含在提交 `c69dc40`。

注意：`src/components/WorksFloatingCards.tsx` 约第 158 行仍有 `projectDetails` 本地 Fotland 数据，约第 216 行的 `getProjectDetail()` 决定优先级。当 slug 是 `fotland-bryggeri`，或标题包含 `fotland` 时，详情页优先使用本地内容。它与已经删除的 Test Project 模拟项不同，仍是待处理问题。不要写成详情页已经完全由 CMS 驱动。修改前应把本地 Hero、Logo、正文与两段故事内容逐项对照 CMS，避免无意中丢失视觉内容。

### 页面与互动调整

主页项目卡片的旧占位残影和部分无用互动逻辑曾被检查及调整，对应 Git 提交 `7ab9245` 与 `3d58875`。项目详情的页面性能也做过一次优化。具体性能改善幅度没有可靠基线，不能在交接时声称已达到某个速度目标。

Projects 页卡片现在只显示项目标题，顶部分类与底部摘要已从 JSX 和相关 CSS 移除。标题字号缩小。页面文字改为 `Selected works`。Service 页三种服务之间的分割线已移除，服务栏目比例和文字宽度已调整。项目详情 Hero 内的 Logo 与双栏故事文字已调整排版。Footer 字号整体缩小。鼠标互动网格亮度已提高。这些改动包含在 `c69dc40`，且提交前 `npm run build` 和 `git diff --check` 均通过。

项目全站排版曾参照用户的 Figma 截图和 Chrome 开发者工具数值调整。当前 CSS 是实际结果，不应只根据历史口头说明重新覆盖。

### Landing Page

2026 年 9 月 21 日已在本地新增独立路由 `/start`。页面用于让第一次接触 AZ Studio 的潜在客户了解服务、代表案例、合作流程并提交项目咨询。它没有加入顶部主导航，Footer 的 Contact 栏目中增加了 `Start` 链接并指向 `/start`。

Landing Page 当前包含：使用现有 MorphingText 逻辑循环展示 `Style`、`Voice` 和 `Audience` 的 Hero；三项精简服务；一个优先从 WordPress CMS 取得的代表案例；四步合作流程；客户评价占位区域；姓名、邮箱和项目说明三个字段的联系表单。客户评价目前没有真实内容，页面明确显示待客户确认，不能把占位文案当作真实评价发布。

代表案例默认以本地 Fotland Bryggeri 素材作为接口失败时的兜底，CMS 成功返回后优先选择 slug 为 `fotland-bryggeri` 的项目，否则选择接口返回的第一个项目。当前 CMS 实际 slug 使用下划线，例如 `fotland_bryggeri`，因此现有逻辑会回退到第一个项目。上线前应确认 Landing Page 是否应按标题、项目 ID 或明确 CMS 字段选择代表案例，避免排序改变后案例自动变化。

本地验证结果：`npm run build` 通过；桌面端 1440 × 1000 和移动端 390 × 844 均没有横向溢出；页面具有三项服务、一个案例和三个表单字段；自动检查期间没有浏览器控制台错误。该功能尚未提交或推送。

### Git 与发布

最近与本次内容有关的 Git 提交依次为：

| 提交 | 日期 | 已确认的用途 |
| --- | --- | --- |
| `3d58875` | 2026 年 9 月 11 日 | 项目页面和主页性能调整 |
| `0474241` | 2026 年 9 月 11 日 | WordPress 媒体 ID 兼容 |
| `e8783d2` | 2026 年 9 月 11 日 | 格式化 ACF 图片响应 |
| `7605f3f` | 2026 年 9 月 13 日 | 字体和项目文案排版 |
| `c69dc40` | 2026 年 9 月 14 日 | Projects、Service 与项目展示调整，删除本地 Test Project 模拟 |
| `3a6a421` | 2026 年 9 月 18 日 | 主页 Service 悬浮卡片链接到 Service 页面 |

`3a6a421` 已从 `main` 推到 `origin/main`。当前 Landing Page、Footer Start 链接、WordPress 会话缓存和其他本地代码修改尚未提交或推送。未跟踪素材与交接文档也没有推送。

## 发生过的故障与处理经验

### WordPress 已发布但前端没有按预期显示

已确认过的原因之一是 ACF 图片值可能是媒体 ID，原来的前端解析不足。采用兼容 ID、URL、Image Array 的方式修复，并在 REST 请求中加入 `acf_format=standard`。如果再次发生，先看接口的 `acf` 实际值、字段名、文章 slug 与图片响应，不要直接假定是 ACF 插件速度问题。

2026 年 9 月 21 日检查新项目 `GreteSy` 时，REST API 已正常返回该项目，状态为 `publish`，卡片图片与详情内容均存在，但 ACF 字段 `show_on_home` 为 `false`。主页在 `WorksFloatingCards.tsx` 中过滤 `showOnHome === false` 的项目，所以它没有出现在主页。用户随后确认已在 WordPress 后台开启 Show on Home。该问题不是接口缓存或详情页缺失造成的。修改后的 API 状态没有在本文更新时重新验证，因此这里只记录用户确认，不把它写成接口复查结果。

### Projects 卡片仍显示 Test Project

原因是开发模式的 `LOCAL_PREVIEW_WORK` 覆盖了 CMS 项目。已经删除覆盖逻辑。现在列表会显示 API 给出的标题，现有 CMS 项目标题是 Fotland Bryggeri，slug 仍是 `test-project`。

### 页面图片模糊与加载缓慢

当前代码只从 ACF Image Array 中挑出一个 URL，通常优先 `large`，没有完整保留候选尺寸。Hero 的 JSX 虽有 `srcSet` 与 `sizes="100vw"`，但 CMS 映射没有实际填充 `heroBackgroundSrcSet`。这是明确的代码缺口。图片是否还受源图质量、WordPress 转码或浏览器缓存影响，需要逐张用网络面板验证，我不确定。

本地 `src/lib/wordpress.ts` 现在包含 `azstudio:wordpress-works:v1` 的 Session Storage 缓存，内存缓存新鲜时间为 60 秒。2026 年 9 月 18 日检查线上 Chrome 时，`azstudio.no` 的 Session Storage 为 0 条，说明当时线上部署尚未包含本地缓存。Chrome 同时开启省内存模式，项目页被标记为高内存占用，因此切回标签页时发生完整重载可能与浏览器回收标签页有关。这是有证据支持的推测，但无法确认某一次具体重载是否一定由标签页回收触发。Session Storage 缓存只能减少重复数据请求，不能阻止 Chrome 回收高内存页面。

本地已有 Fotland 素材：卡片 WebP 为 1195 × 1626，Hero WebP 为 2560 × 1768，Logo 有 SVG 与 PNG，内容已拆成四张 3200 像素宽的 WebP，也有各自 1280 像素版本。原来的长 PNG 为 5340 × 17240，约 45 MB。这只是本地素材盘点，没有上传到 CMS，也没有替换现有字段。

### Design Mode 交接

Design Mode 扩展曾用于收集页面视觉编辑。一次检查时侧栏显示 17 条记录，包含样式、文字与 DOM 修改。MCP 连接也曾显示离线，导致读取或清除操作失败。用户曾提出清除目前修改，但未确认一次实际的全部清除操作，不能声称 Design Mode 记录已清空。未来如果继续使用，先检查会话是否连接，读取当前变更，再区分已经落地的 CSS 与仍待处理的记录。

### Git 写入限制

项目位于本轮工作区可写目录之外。曾通过权限工具取得项目写入许可，但 `git add` 因 `.git/index.lock` 无法创建而失败。改用获得批准的提升权限命令完成提交，然后成功推送。之后的 LLM 不应把这种权限错误误判为仓库损坏。

## 当前待办与安全边界

下一阶段优先确认 Landing Page 的代表案例选择规则并替换真实客户评价，然后实现完整响应式图片数据，在 React 中输出各位置自己的 `srcSet` 和 `sizes`；正文图片继续从 WordPress 正文获取。还需要在部署后验证 Session Storage 缓存，再统一 Fotland 详情页的数据优先级。任何 CMS 图片替换、项目文章保存、发布或删除都需要明确核对目标与当前数据。未跟踪素材属于用户，不自动提交或清理。

本文创建本身尚未推送 GitHub。下一位 LLM 应先运行 `git status --short`，不要假定文档已在远程仓库。WordPress 登录由用户已有后台会话提供，不在本文保存账号、令牌或上传权限。更新 Project、替换媒体及发布线上内容必须重新核对编辑对象和用户指示。

## 接手后的第一轮检查

1. 读取 `log.md`、`OKR.md` 和用户提供的 `AGENTS.md` 指令；如果项目内另有 `AGENTS.md`，也要读取。
2. 检查 `git status --short`、当前分支与最近提交，保护用户未跟踪文件。
3. 运行 `npm run build`，确认起点可构建。
4. 请求 `https://public-api.wordpress.com/wp/v2/sites/mixzq9.wordpress.com/projects?per_page=100&acf_format=standard`，或使用当前环境变量指定的 API 地址，保存经过适当脱敏的响应样本，确认 `acf` 图片字段有哪些 `sizes`、宽高与 URL。这里给出的请求用于复现数据，不代表已验证当前响应。
5. 对主页卡片、Projects 卡片、Hero 和正文图片分别检查浏览器实际下载资源。
6. 完成一个改动后再验证本地页面，未经用户要求不要自动提交或推送。
