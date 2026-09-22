#!/usr/bin/env bash
# 节日祝福生成器服务启动脚本（端口固定 3000）
# 返回值：0 = 已运行或启动成功；2 = 启动失败
set -u

cd "$(dirname "$0")"

PORT=3000
LOG_FILE="$(pwd)/server.log"
PID_FILE="$(pwd)/.server.pid"

port_in_use() {
  ss -ltn | grep -c "[:.]${PORT}[[:space:]]" || true
}

# 1. 启动前校验：端口已监听说明服务已在运行，直接返回 0
if [ "$(port_in_use)" -gt 0 ]; then
  echo "[start] 端口 ${PORT} 已有服务在监听，服务已启动，无需重复启动。"
  exit 0
fi

# 2. 清理构建缓存（本项目无构建步骤，仅在存在时清理，避免旧产物干扰）
[ -d .next ] && rm -rf .next
[ -d node_modules/.cache ] && rm -rf node_modules/.cache

# 3. 导出环境变量后再启动（nohup 第一个参数只能是可执行文件，环境变量前置写法对 nohup 无效）
export PORT="${PORT}"
export NODE_ENV=production

# 生产模式直接运行 node（无 dev 热重载，内存峰值可控），显式限制堆内存防止 OOM
nohup node --max-old-space-size=512 server.js >> "${LOG_FILE}" 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" > "${PID_FILE}"
echo "[start] 已发起启动，PID=${SERVER_PID}，等待端口 ${PORT} 就绪..."

# 4. 轮询健康检查等待就绪（最多 30 秒）。注意：这里只是启动探测，服务进程本身不带任何超时包装
ready=0
for i in $(seq 1 30); do
  if curl -sf --max-time 2 "http://127.0.0.1:${PORT}/api/health" > /dev/null; then
    ready=1
    break
  fi
  if ! ps -p "${SERVER_PID}" > /dev/null 2>&1; then
    echo "[start] 进程 ${SERVER_PID} 已退出，启动失败。"
    break
  fi
  sleep 1
done

if [ "${ready}" -eq 1 ]; then
  echo "[start] 服务启动成功：http://localhost:${PORT}"
  exit 0
fi

echo "[start] 服务启动失败，最近日志如下："
tail -n 20 "${LOG_FILE}"
exit 2
