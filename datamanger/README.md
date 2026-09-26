# 研宇宙 Research Universe · 数据库快照包

本目录是「研宇宙」后端 **MySQL 数据库的完整快照**，包含建库语句、33 张表的结构与全部业务数据。

把整个项目打包发给别人时，对方只要导入本目录里的 SQL 文件，就能得到一套和你这里**完全一致**的数据环境 —— 不用再手工造数据。

---

## 一、目录内容

| 文件 | 说明 |
| --- | --- |
| `research_universe_dev.sql` | **完整快照**：建库 + 结构 + 全部数据（推荐用这个） |
| `research_universe_dev_schema.sql` | **仅结构**：只有表定义，不含数据（想看表设计或建空库时用） |
| `import.sh` / `import.bat` | 一键导入数据库（`.bat` 是 Windows 启动器，内部调用 `.sh`） |
| `export.sh` / `export.bat` | 重新导出快照（数据更新后刷新快照用） |
| `.dbconfig` | **本机连接配置**（已加入 `.gitignore`，勿提交真实密码） |
| `.dbconfig.example` | 连接配置模板 |
| `MANIFEST.md` | 本次快照的表清单与行数统计（**由导出脚本自动生成**） |
| `README.md` | 本文档 |
| `_bak/` | 上一次重新打包前的旧快照备份，确认无误后可自行删除 |

---

## 二、环境要求

- **MySQL 5.7 及以上**（推荐 MySQL 8.0）
- 字符集 `utf8mb4`（快照里已声明，无需手动设置）
- `mysql` / `mysqldump` 命令行客户端可用（脚本会自动探测常见安装路径）
- Windows 下走 `.bat` 时需要 **Git for Windows**（提供 `bash.exe`）；没有的话直接用 `.sh` 或下面的「方式 B」手动导入

> 不会判断有没有装？在终端执行 `mysql --version`，能打印版本号就行。

---

## 三、快速开始（三步）

### 步骤 1 · 导入数据库

**方式 A：用脚本（推荐，全程零提问）**

Windows（在 `datamanger` 目录下双击或命令行执行）：

```bat
import.bat
```

Linux / macOS：

```bash
cd datamanger
chmod +x import.sh
./import.sh
```

脚本**不再逐个询问**用户名 / 主机 / 端口 / 密码，连接信息按下面的优先级自动解析：

```
环境变量(DB_HOST/DB_PORT/DB_USER/DB_PASS)  >  .dbconfig  >  内置默认值
内置默认值 = root / 000000 @ localhost:3306
```

确实需要手动输入时，加 `--ask`：

```bash
./import.sh --ask        # Windows: import.bat --ask
```

> 如果脚本因为环境问题跑不起来，直接用下面的方式 B 手动导入即可，效果完全相同。

**方式 B：手动命令导入**

```bash
# Windows
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -p --default-character-set=utf8mb4 < research_universe_dev.sql

# Linux / macOS
mysql -uroot -p --default-character-set=utf8mb4 < research_universe_dev.sql
```

导入脚本做的事：读取 `research_universe_dev.sql` → 自动建库 `research_universe_dev` → 建表 → 灌数据。**库不存在会自动创建**，不用提前手工建库。

### 步骤 2 · 让后端连上这个库

打开后端目录的 `backend/.env`，把 `DATABASE_URL` 指向刚导入的库：

```env
DATABASE_URL="mysql://root:你的密码@localhost:3306/research_universe_dev"
```

如果密码是本地开发默认的 `000000`，就保持原样即可。

### 步骤 3 · 启动后端验证

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

浏览器访问 <http://localhost:8081/api/v1/health>，返回正常即说明数据库接好了。

---

## 四、数据概览

- 库名：`research_universe_dev`
- 表数量：**33 张**，数据总量 **296 行**
- 主要数据：5 个科研项目、5 个账号、30 篇文献、40 个数据变量、15 条假设、14 条任务、13 次分析运行、5 份写作稿等
- 逐表行数见 **[MANIFEST.md](./MANIFEST.md)**

### 表按功能分组

| 功能域 | 相关表 |
| --- | --- |
| 账号与权限 | `user`、`studentverification`、`logindevice`、`verificationcode`、`quota`、`notificationpref` |
| 项目主体 | `project`、`projectmember`、`projectprogress`、`projectschedule`、`projectversion`、`projectcompliance`、`stageartifacts` |
| 可行性与假设 | `hypothesis`、`introstate`、`healthreport` |
| 文献综述 | `litpaper`、`litselection`、`litverify`、`ddlkeyword`、`kbqa` |
| 数据分析 | `datafile`、`datavariable`、`analysismethodstate`、`analysisrun` |
| 论文写作 | `writingdoc`、`stepdraft` |
| 选刊与评审 | `journalstate`、`reviewstate` |
| 导出与集成 | `exportstate`、`zoterobinding` |
| 消息通知 | `notification` |
| 任务 | `task` |

### 可用演示账号

| 账号 | 说明 |
| --- | --- |
| 手机号 `13800000000` | 演示账号（后端 `account.service.ts` 的 `DEMO_PHONE`），已完成学生认证 |

> 开发态（`.env` 里 `SMS_DEV_RETURN_CODE=true`）短信验证码由接口直接回传，登录时用返回的 code 即可，无需真实短信。
> 按后端约定，`intent=login` 时账号不存在会直接报错，只有 `intent=register` 才会创建新账号。

---

## 五、常见问题

**Q1：导入报 `ERROR 1045 Access denied`**
账号或密码不对。用 `mysql -uroot -p` 手工登录验证一下密码，然后改 `.dbconfig` 或加 `--ask` 重跑。

**Q2：导入报 `ERROR 1044 Access denied for user ... to database`**
该账号没有建库权限，换 `root` 账号导入，或让管理员授权 `CREATE` 权限。

**Q3：中文变成 `???` 或乱码**
导入时没带字符集参数。请务必加 `--default-character-set=utf8mb4`（脚本里已包含）。另外确认 MySQL 服务端 `character_set_server` 为 `utf8mb4`。

**Q4：目标机器上已有同名库 `research_universe_dev` 会怎样？**
快照里对每张表都带 `DROP TABLE IF EXISTS`，**同名表会被重建覆盖**，但**整库不会被删除**。所以导入前请确认该库没有你要保留的数据，否则先备份。

**Q5：我只想要空库（不要示例数据）**
用 `research_universe_dev_schema.sql`，导入方式和上面一样。

**Q6：MySQL 5.7 能用吗？**
可以。快照里的字段类型（`json`、`datetime(3)`、`mediumtext`）在 5.7 均受支持，排序规则用的是 `utf8mb4_unicode_ci`，不是 8.0 独有的 `utf8mb4_0900_ai_ci`。

**Q7：`mysql` / `mysqldump` 找不到怎么办？**
把 MySQL 的 `bin` 目录加到系统 `PATH`，或在脚本里把路径写死成绝对路径。脚本已经内置了 Windows 常见安装路径的探测。

**Q8：怎么换连接信息，但又不想每次输入？**
编辑本目录的 `.dbconfig`：

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=你的密码
```

或者临时用环境变量覆盖（不用改文件）：

```bash
DB_PASS=xxxx ./export.sh
```

**Q9：Windows 双击 `.bat` 报「未找到 Git Bash」？**
装一个 [Git for Windows](https://git-scm.com/download/win) 即可。`.bat` 本身只是启动器，真正干活的是同目录的 `.sh`；也可以直接在 Git Bash 里跑 `./export.sh`。

**Q10：`.bat` 双击后中文正常，但在别处打开脚本是乱码？**
`.bat` 是纯 ASCII 文件，任何编辑器都不会乱码。只有 `.sh` 脚本含中文，请用 UTF-8 打开。

---

## 六、数据变化后如何更新快照

改完数据后，回到本目录执行：

```bash
./export.sh          # Windows: export.bat
```

脚本会一次性完成三件事，**不需要任何交互**：

1. 重新生成 `research_universe_dev.sql`（结构 + 数据）
2. 重新生成 `research_universe_dev_schema.sql`（仅结构）
3. 重新生成 `MANIFEST.md`（表数量 + 逐表行数 + 总行数）

想手动输入连接信息就加 `--ask`。

手动导出等价命令：

```bash
mysqldump -uroot -p --databases research_universe_dev \
  --single-transaction --routines --triggers --events \
  --default-character-set=utf8mb4 --set-gtid-purged=OFF \
  --hex-blob --complete-insert --skip-comments \
  > research_universe_dev.sql
```

---

## 七、安全提示

- 快照包含**真实业务数据**（用户手机号、教育邮箱、项目内容等），仅限开发、演示、交接使用，**不要公开传播或提交到公开仓库**。
- 本快照**不含任何 API Key、JWT 密钥或服务端配置**，后端密钥请通过各自机器上的 `backend/.env` 自行配置。
- `.dbconfig` 与 `_bak/` 已加入本目录 `.gitignore`；数据库账号口令请勿写进任何会提交到版本库的文件里。

---

*生成方式：`mysqldump` 逻辑导出（结构 + 数据）。本次快照已通过「导入到临时库并逐表比对行数」的完整性验证（33 表、296 行零差异，中文内容无损）。*
