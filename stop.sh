#!/usr/bin/env bash
# 节日祝福生成器服务停止脚本（端口固定 3000）
# 返回值：0 = 服务已停止（或本未运行）；1 = 停止后端口仍被占用
set -u

PORT=3000
PID_FILE="$(cd "$(dirname "$0")" && pwd)/.server.pid"

# 通过 ss 提取监听指定端口的进程 PID（不用 fuser/lsof，它们不一定存在）
# 注意：这里刻意不加 2>/dev/null，若 ss 不存在要让报错可见，避免脚本“装死”
listener_pids() {
  ss -ltnp | grep -E "[:.]${PORT}[[:space:]]" | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u
}

pids="$(listener_pids)"

if [ -z "${pids}" ]; then
  # 端口无监听时，兜底清理 PID 文件中记录但已脱离端口的残留进程
  if [ -f "${PID_FILE}" ]; then
    stale="$(cat "${PID_FILE}")"
    if [ -n "${stale}" ] && ps -p "${stale}" > /dev/null 2>&1; then
      echo "[stop] 端口 ${PORT} 无监听，但清理残留进程 ${stale}..."
      kill "${stale}" 2>/dev/null || kill -9 "${stale}" 2>/dev/null
    fi
    rm -f "${PID_FILE}"
  fi
  echo "[stop] 端口 ${PORT} 无服务在运行，无需停止。"
  exit 0
fi

echo "[stop] 发现监听端口 ${PORT} 的进程：$(echo ${pids} | tr '\n' ' ')"
for pid in ${pids}; do
  echo "[stop] 向进程 ${pid} 发送 SIGTERM..."
  kill "${pid}"
done

# 等待进程退出、端口释放（最多 10 秒）
for i in $(seq 1 10); do
  pids="$(listener_pids)"
  [ -z "${pids}" ] && break
  sleep 1
done

# 仍未退出则强制结束
if [ -n "${pids}" ]; then
  echo "[stop] 进程未在 10 秒内退出，强制结束（SIGKILL）：$(echo ${pids} | tr '\n' ' ')"
  for pid in ${pids}; do
    kill -9 "${pid}"
  done
  sleep 1
fi

# 清理包装链残留（npm start / sh -c 等子进程），防止孤儿进程继续占端口
leftover="$(pgrep -f 'node .*server\.js' || true)"
if [ -n "${leftover}" ]; then
  echo "[stop] 清理残留子进程：$(echo ${leftover} | tr '\n' ' ')"
  for pid in ${leftover}; do
    kill -9 "${pid}"
  done
  sleep 1
fi

rm -f "${PID_FILE}"

# 最终校验端口是否已释放
if [ -n "$(listener_pids)" ]; then
  echo "[stop] 端口 ${PORT} 仍被占用，停止失败！"
  exit 1
fi

echo "[stop] 服务已停止，端口 ${PORT} 已释放。"
exit 0
