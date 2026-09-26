#!/usr/bin/env bash
# 研宇宙 Research Universe - 数据库一键导入（非交互式）
#
# 用法:
#   ./import.sh              # 直接跑，连接信息取自 环境变量 > .dbconfig > 内置默认值
#   ./import.sh --ask        # 强制交互式输入连接信息
#   ./import.sh --help       # 查看帮助
#
# 连接信息优先级: 环境变量(DB_HOST/DB_PORT/DB_USER/DB_PASS) > .dbconfig > 默认值
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQLFILE="$SCRIPT_DIR/research_universe_dev.sql"
DB_NAME="research_universe_dev"
CONFIG_FILE="$SCRIPT_DIR/.dbconfig"

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
echo "  研宇宙 Research Universe - 数据库一键导入"
echo "  目标库: $DB_NAME"
echo "============================================================"
echo

if [ ! -f "$SQLFILE" ]; then
  echo "[错误] 找不到快照文件: $SQLFILE"
  exit 1
fi

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

MYSQL="$(find_bin mysql)"
if [ -z "$MYSQL" ]; then
  echo "[错误] 未找到 mysql 客户端，手动导入方式："
  echo "       mysql -uroot -p --default-character-set=utf8mb4 < research_universe_dev.sql"
  exit 1
fi

# ---------- 连接信息 ----------
DB_HOST="${DB_HOST:-}"; DB_PORT="${DB_PORT:-}"; DB_USER="${DB_USER:-}"; DB_PASS="${DB_PASS:-}"

if [ -f "$CONFIG_FILE" ]; then
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

if [ "$ASK" = "1" ]; then
  read -rp "MySQL 主机 [$DB_HOST]: " _i; DB_HOST="${_i:-$DB_HOST}"
  read -rp "MySQL 端口 [$DB_PORT]: " _i; DB_PORT="${_i:-$DB_PORT}"
  read -rp "MySQL 用户名 [$DB_USER]: " _i; DB_USER="${_i:-$DB_USER}"
  read -rsp "MySQL 密码 [回车保持不变]: " _i; echo; [ -n "$_i" ] && DB_PASS="$_i"
fi

echo "[信息] 客户端: $MYSQL"
echo "[信息] 目标  : $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "[信息] 正在导入，请稍候..."
echo

# MYSQL_PWD 传密码，避免出现在命令行与历史记录中
if MYSQL_PWD="$DB_PASS" "$MYSQL" -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
     --default-character-set=utf8mb4 < "$SQLFILE"; then
  echo
  echo "[成功] 数据库 $DB_NAME 导入完成。"
  echo
  echo "下一步: 打开 backend/.env，确认连接串为"
  echo "        DATABASE_URL=\"mysql://$DB_USER:密码@$DB_HOST:$DB_PORT/$DB_NAME\""
else
  echo
  echo "[失败] 导入失败，请检查:"
  echo "       1. MySQL 服务是否已启动"
  echo "       2. 用户名 / 密码 / 端口是否正确"
  echo "       3. 该账号是否具备建库权限"
  exit 1
fi
