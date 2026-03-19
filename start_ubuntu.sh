#!/bin/bash

# Ubuntu 一键启动脚本 (Stock Screener)
# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}   Stock Screener 一键启动工具 (Ubuntu)   ${NC}"
echo -e "${BLUE}==========================================${NC}"

# 1. 检查基础环境
echo -e "${YELLOW}1. 检查系统环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未检测到 Node.js。请运行: sudo apt install nodejs npm${NC}"
    exit 1
fi
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: 未检测到 Python3。请运行: sudo apt install python3 python3-venv${NC}"
    exit 1
fi

# 2. 配置 Python 后端
echo -e "${YELLOW}2. 配置 Python 后端环境...${NC}"
cd backend
if [ ! -d "venv" ]; then
    echo -e "${GREEN}>>> 创建虚拟环境...${NC}"
    python3 -m venv venv || { echo -e "${RED}创建虚拟环境失败。请运行: sudo apt install python3-venv${NC}"; exit 1; }
fi

echo -e "${GREEN}>>> 安装后端 Python 依赖...${NC}"
./venv/bin/pip install --upgrade pip
./venv/bin/pip install uvicorn fastapi yfinance akshare pandas httpx
./venv/bin/pip install -r requirements.txt
cd ..

# 3. 配置 Electron 前端
echo -e "${YELLOW}3. 配置前端 Node.js 环境...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}>>> 安装前端 npm 依赖 (这可能需要 1-2 分钟)...${NC}"
    npm install --silent
fi

# 4. 启动服务
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}>>> 正在启动应用...${NC}"
echo -e "${YELLOW}提示: 后端将运行在 http://localhost:8000${NC}"
echo -e "${YELLOW}提示: 关闭应用窗口将自动停止所有进程${NC}"
echo -e "${BLUE}==========================================${NC}"

# 使用 concurrently 同时启动后端和前端
# 我们直接调用 package.json 中配置好的 dev 命令
# 但先确保 backend 正在运行
npm run dev
