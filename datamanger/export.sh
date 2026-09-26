#!/usr/bin/env bash
# 研宇宙 Research Universe - 重新导出数据库快照（非交互式）
#
# 用法:
#   ./export.sh              # 直接跑，连接信息取自 环境变量 > .dbconfig > 内置默认值
#   ./export.sh --ask        # 强制交互式输入连接信息
#   ./export.sh --help       # 查看帮助
#
# 连接信息优先级: 环境变量(DB_HOST/DB_PORT/DB_USER/DB_PASS) > .dbconfig > 默认值
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="research_universe_dev"
CONFIG_FILE="$SCRIPT_DIR/.dbconfig"
FULL_SQL="$SCRIPT_DIR/research_universe_dev.sql"
SCHEMA_SQL="$SCRIPT_DIR/research_universe_dev_schema.sql"

# ---------- 参数 ----------
ASK=0
for arg in "$@"; do
  case "$arg" in
    --ask)     ASK=1 ;;
    --no-pause|--nopause) ;;   # 由 .bat 启动器透传，忽略
    -h|--help)
      sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "[警告] 忽略未知参数: $arg" ;;
  esac
done

echo "============================================================"
echo "  研宇宙 Research Universe - 重新导出数据库快照"
echo "  源库: $DB_NAME"
echo "============================================================"
echo

# ---------- 定位 mysqldump / mysql ----------
find_bin() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then command -v "$name"; return; fi
  local p
  for p in \
    "/c/Program Files/MySQL/MySQL Server 8.0/bin/$name" \
    "/c/Program Files/MySQL/MySQL Server 8.4/bin/$name" \
    "/c/Program Files/MySQL/MySQL Server 5.7/bin/$name" \
    "/c/Program Files (x86)/MySQL/MySQL Server 8.0/bin/$name" \
    "/d/Program Files/MySQL/MySQL Server 8.0/bin/$name" \
    "/e/Program Files/MySQL/MySQL Server 8.0/bin/$name" \
    "/mnt/c/Program Files/MySQL/MySQL Server 8.0/bin/$name" \
    "/usr/local/mysql/bin/$name" \
    "/opt/homebrew/bin/$name" \
    "/usr/bin/$name" ; do
    [ -x "$p" ] && { printf '%s' "$p"; return; }
  done
}

DUMP="$(find_bin mysqldump)"
MYSQL="$(find_bin mysql)"
if [ -z "$DUMP" ]; then
  echo "[错误] 未找到 mysqldump，请安装 MySQL 或将其 bin 目录加入 PATH。"
  exit 1
fi

# ---------- 连接信息 ----------
DB_HOST="${DB_HOST:-}"; DB_PORT="${DB_PORT:-}"; DB_USER="${DB_USER:-}"; DB_PASS="${DB_PASS:-}"

if [ -f "$CONFIG_FILE" ]; then
  # .dbconfig 为 KEY=VALUE 纯文本，已有环境变量优先
  while IFS='=' read -r k v; do
    k="$(printf '%s' "$k" | tr -d ' \t\r')"
    case "$k" in ''|'#'*) continue ;; esac
    case "$k" in
      DB_HOST) [ -n "$DB_HOST" ] || DB_HOST="$v" ;;
      DB_PORT) [ -n "$DB_PORT" ] || DB_PORT="$v" ;;
      DB_USER) [ -n "$DB_USER" ] || DB_USER="$v" ;;
      DB_PASS) [ -n "$DB_PASS" ] || DB_PASS="$v" ;;
    esac
  done < "$CONFIG_FILE"
fi

DB_HOST="${DB_HOST:-localhost}"; DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}";       DB_PASS="${DB_PASS:-000000}"

# 仅在显式 --ask 时才询问，避免每次运行的交互式问答
if [ "$ASK" = "1" ]; then
  read -rp "MySQL 主机 [$DB_HOST]: " _i; DB_HOST="${_i:-$DB_HOST}"
  read -rp "MySQL 端口 [$DB_PORT]: " _i; DB_PORT="${_i:-$DB_PORT}"
  read -rp "MySQL 用户名 [$DB_USER]: " _i; DB_USER="${_i:-$DB_USER}"
  read -rsp "MySQL 密码 [回车保持不变]: " _i; echo; [ -n "$_i" ] && DB_PASS="$_i"
fi

echo "[信息] 客户端: $DUMP"
echo "[信息] 目标  : $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo

COMMON=(--single-transaction --routines --triggers --events
        --default-character-set=utf8mb4 --set-gtid-purged=OFF
        --hex-blob --complete-insert --skip-comments)

echo "[1/3] 导出完整快照(结构 + 数据)..."
if ! MYSQL_PWD="$DB_PASS" "$DUMP" -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
       "${COMMON[@]}" --databases "$DB_NAME" > "$FULL_SQL"; then
  echo "[失败] 完整快照导出失败（检查 MySQL 是否启动 / 账号密码 / 库是否存在）。"
  exit 1
fi

echo "[2/3] 导出结构快照(仅表定义)..."
if ! MYSQL_PWD="$DB_PASS" "$DUMP" -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
       "${COMMON[@]}" --no-data --databases "$DB_NAME" > "$SCHEMA_SQL"; then
  echo "[失败] 结构快照导出失败。"
  exit 1
fi

echo "[3/3] 生成行数清单 (MANIFEST.md)..."
if [ -z "$MYSQL" ]; then
  echo "[跳过] 未找到 mysql 客户端，MANIFEST.md 未刷新。"
else
  MYSQL_ARGS=(-h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -N -B)

  TABLES="$(MYSQL_PWD="$DB_PASS" "$MYSQL" "${MYSQL_ARGS[@]}" -e \
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME" 2>/dev/null)"
  TABLES="$(printf '%s' "$TABLES" | tr -d '\r')"

  # 把所有 COUNT(*) 拼成一条 UNION ALL，一次查询拿全量行数（不再逐表 33 次往返）
  QUERY=""; FIRST=1
  while IFS= read -r t; do
    [ -z "$t" ] && continue
    if [ "$FIRST" = "1" ]; then
      QUERY="SELECT '$t' AS t, COUNT(*) AS c FROM \`$t\`"; FIRST=0
    else
      QUERY="$QUERY UNION ALL SELECT '$t', COUNT(*) FROM \`$t\`"
    fi
  done <<< "$TABLES"

  ROWS=""; TABLE_COUNT=0; TOTAL=0
  if [ -n "$QUERY" ]; then
    while IFS=$'\t' read -r t c; do
      t="${t%$'\r'}"; c="${c%$'\r'}"; [ -z "$t" ] && continue
      [ -z "$c" ] && c=0
      ROWS="${ROWS}| \`${t}\` | ${c} |"$'\n'
      TABLE_COUNT=$((TABLE_COUNT + 1))
      TOTAL=$((TOTAL + c))
    done < <(MYSQL_PWD="$DB_PASS" "$MYSQL" "${MYSQL_ARGS[@]}" -e "$QUERY" "$DB_NAME" 2>/dev/null)
  fi

  {
    echo "# 数据清单 · $DB_NAME"
    echo
    echo "> 本文件由 \`export.sh\` / \`export.bat\` 自动生成，记录快照生成时刻的表结构与行数，用于比对与追溯。"
    echo "> 表的功能分组说明见 [README.md](./README.md)。"
    echo
    echo "## 快照信息"
    echo
    echo "| 项目 | 值 |"
    echo "| --- | --- |"
    echo "| 数据库名 | \`$DB_NAME\` |"
    echo "| 表数量 | $TABLE_COUNT |"
    echo "| 数据总行数 | $TOTAL |"
    echo "| 导出时间 | $(date '+%Y-%m-%d %H:%M:%S') |"
    echo "| 导出方式 | \`mysqldump\` 逻辑导出（结构 + 数据） |"
    echo "| 字符集 | \`utf8mb4\` / \`utf8mb4_unicode_ci\` |"
    echo "| 完整快照文件 | \`research_universe_dev.sql\` |"
    echo "| 仅结构文件 | \`research_universe_dev_schema.sql\` |"
    echo
    echo "## 逐表行数"
    echo
    echo "| 表名 | 行数 |"
    echo "| --- | --- |"
    printf '%s' "$ROWS"
    echo "| **合计** | **$TOTAL** |"
  } > "$SCRIPT_DIR/MANIFEST.md"
fi

echo
echo "[成功] 快照已刷新:"
echo "       $FULL_SQL"
echo "       $SCHEMA_SQL"
echo "       $SCRIPT_DIR/MANIFEST.md"
