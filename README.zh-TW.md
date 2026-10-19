# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

由 AI 驅動的 Formula 1 數據分析與賽事預測網頁應用程式。

## 功能

- **賽事預測** - 使用以 FastF1 資料訓練的 Gradient Boosting 模型，預測每位車手的獲勝機率
- **排位賽後更新** - 後端執行期間，官方排位賽結束且完整成績公布後，新加坡站預測會自動更新
- **H2H 對比** - 經過核對的車手統計數據，附資料新鮮度報告，以及判斷誰會先完賽的歷史啟發式方法
- **歷史紀錄** - 以實際結果驗證過往預測
- **賽季行事曆** - 2026 年 F1 賽程

## 技術堆疊

**前端**
- React + Tailwind CSS (Vite)

**後端**
- FastAPI (Python)

**機器學習**
- scikit-learn (經校準的直方圖 Gradient Boosting)
- FastF1 (真實的 F1 計時與賽果資料)

## 快速開始 (Windows)

在儲存庫根目錄執行 `setup.bat`，即可建立後端虛擬環境並安裝所有相依套件。使用 `setup.bat run` 可同時啟動前後端兩個伺服器，然後開啟 `http://localhost:5173`。

## 文件

- [API 參考](docs/api.md) - 端點、參數、回應與錯誤
- [安全性](docs/security.md) - 憑證處理、請求限制與部署需求
- `docs/CONTEXT.md` - 專案背景與目前架構說明
- `docs/design.md` - 設計系統參考
- [H2H 模型評估](docs/h2h-model-evaluation.md) - 離線實驗流程與實測結果
- [H2H 不確定性](docs/h2h-uncertainty.md) - 未校準分數、證據保護機制與校準稽核
- [H2H 監控](docs/h2h-monitoring.md) - 分數說明、賽前紀錄與已發布結果的追蹤
- [自動預測歷史](docs/prediction-history.md) - 預測的發布、封存與賽果自動更新
- [排位賽後預測](docs/post-qualifying-predictions.md) - 新加坡站預測的自動更新與發布規則

## 安裝設定

### 前端

建議使用 Node.js 22.12 或更新版本。

```powershell
cd frontend
npm ci
npm run dev
```

執行於 `http://localhost:5173`

如果後端不在 `http://localhost:8000`，請將 `frontend/.env.example` 複製為 `frontend/.env`，並設定 `VITE_API_BASE_URL`。

在 `frontend` 目錄中執行前端檢查：

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

### 後端

建議使用 Python 3.12。

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

執行於 `http://127.0.0.1:8000`

健康檢查：`http://127.0.0.1:8000/api/health`

執行後端測試：

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

若要使用聯絡表單，請將 `backend/.env.example` 複製為 `backend/.env`，並設定 Resend 與聯絡相關的值。

請只執行單一後端 worker，因為 H2H 對比與預測共用記憶體中的資料。若使用多個 worker，則需要 sticky routing 或共用儲存空間。
快取與部署的詳細資訊請參閱 [H2H 技術參考](docs/h2h.md)。

如果 PowerShell 封鎖了啟用腳本，請為你的使用者帳戶允許本機腳本：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

接著執行：

```powershell
.\venv\Scripts\Activate.ps1
```

## 免責聲明

ChicaneAI 是非官方的粉絲專案，與 Formula 1、FIA 或任何 Formula 1 車隊均無隸屬、背書或關聯。F1、FORMULA 1 及相關標誌為 Formula One Licensing BV 及其各自所有者的商標。MIT 授權僅涵蓋本專案的程式碼，不包含第三方的商標、資料或字型。

## 授權

MIT - [LICENSE](LICENSE)
