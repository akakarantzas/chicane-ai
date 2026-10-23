# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

由 AI 驱动的 Formula 1 数据分析与赛事预测 Web 应用。

## 功能

- **赛事预测** - 使用基于 FastF1 数据训练的 Gradient Boosting 模型，预测每位车手的获胜概率
- **排位赛后更新** - 后端运行期间，官方排位赛结束且完整成绩公布后，新加坡站预测会自动更新
- **H2H 对比** - 经过核对的车手统计数据，附带数据新鲜度报告，以及判断谁会先完赛的历史启发式方法
- **历史记录** - 用真实结果验证过往预测
- **赛季日历** - 2026 年 F1 赛程

## 技术栈

**前端**
- React + Tailwind CSS (Vite)

**后端**
- FastAPI (Python)

**机器学习**
- scikit-learn (经过校准的直方图 Gradient Boosting)
- FastF1 (真实的 F1 计时与赛果数据)

## 快速开始 (Windows)

在仓库根目录运行 `setup.bat`，即可创建后端虚拟环境并安装所有依赖。使用 `setup.bat run` 可同时启动前后端两个服务器，然后打开 `http://localhost:5173`。

## 文档

- [API 参考](docs/api.md) - 端点、参数、响应与错误
- [安全](docs/security.md) - 凭据处理、请求限制与部署要求
- `docs/CONTEXT.md` - 项目背景与当前架构说明
- `docs/design.md` - 设计系统参考
- [H2H 模型评估](docs/h2h-model-evaluation.md) - 离线实验流程与实测结果
- [H2H 不确定性](docs/h2h-uncertainty.md) - 未校准分数、证据保护机制与校准审计
- [H2H 监控](docs/h2h-monitoring.md) - 分数说明、赛前记录与已发布结果的跟踪
- [自动预测历史](docs/prediction-history.md) - 预测的发布、归档与赛果自动更新
- [排位赛后预测](docs/post-qualifying-predictions.md) - 新加坡站预测的自动更新与发布规则

## 安装配置

### 前端

建议使用 Node.js 22.12 或更高版本。

```powershell
cd frontend
npm ci
npm run dev
```

运行在 `http://localhost:5173`

如果后端不在 `http://localhost:8000`，请将 `frontend/.env.example` 复制为 `frontend/.env`，并设置 `VITE_API_BASE_URL`。

在 `frontend` 目录中运行前端检查：

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

### 后端

建议使用 Python 3.12。

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

运行在 `http://127.0.0.1:8000`

健康检查：`http://127.0.0.1:8000/api/health`

运行后端测试：

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

如需使用联系表单，请将 `backend/.env.example` 复制为 `backend/.env`，并配置 Resend 与联系相关的值。

请只运行单个后端 worker，因为 H2H 对比与预测共享内存中的数据。若使用多个 worker，则需要 sticky routing 或共享存储。
缓存与部署的详细信息请参阅 [H2H 技术参考](docs/h2h.md)。

如果 PowerShell 阻止了激活脚本，请为你的用户账户允许本地脚本：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

然后运行：

```powershell
.\venv\Scripts\Activate.ps1
```

## 联系方式

关于本项目的问题、合作咨询或反馈：

- LinkedIn: [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
- X / Twitter: [@aevagnarly](https://x.com/aevagnarly)
- 电子邮件: [hello@akakarantzas.com](mailto:hello@akakarantzas.com)

## 免责声明

ChicaneAI 是非官方的粉丝项目，与 Formula 1、FIA 或任何 Formula 1 车队均无隶属、背书或关联。F1、FORMULA 1 及相关标志为 Formula One Licensing BV 及其各自所有者的商标。MIT 许可证仅涵盖本项目的代码，不包含第三方的商标、数据或字体。

## 许可证

MIT - [LICENSE](LICENSE)
