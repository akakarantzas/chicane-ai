# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

AI を活用したフォーミュラ 1 の分析・レース予測 Web アプリです。

## 機能

- **レース予測** - FastF1 のデータで学習した Gradient Boosting モデルにより、各ドライバーの勝利確率を算出します
- **予選後の更新** - バックエンドの稼働中、公式の予選終了と完全な結果が出た時点で、シンガポールの予測を自動的に更新します
- **H2H 比較** - 突き合わせ済みのドライバー統計に、データの鮮度レポートと、どちらが先にフィニッシュするかを示す過去データに基づくヒューリスティックを加えています
- **履歴** - 過去の予測を実際の結果で検証します
- **シーズンカレンダー** - 2026 年の F1 レーススケジュール

## 技術スタック

**フロントエンド**
- React + Tailwind CSS (Vite)

**バックエンド**
- FastAPI (Python)

**ML**
- scikit-learn (キャリブレーション済みヒストグラム Gradient Boosting)
- FastF1 (F1 の実際のタイミングおよび結果データ)

## クイックスタート (Windows)

リポジトリのルートで `setup.bat` を実行すると、バックエンドの仮想環境が作成され、すべての依存関係がインストールされます。`setup.bat run` を使うと、両方のサーバーも起動します。その後、`http://localhost:5173` を開いてください。

## ドキュメント

- [API リファレンス](docs/api.md) - エンドポイント、パラメーター、レスポンス、エラー
- [セキュリティ](docs/security.md) - 認証情報の扱い、リクエスト制限、デプロイ要件
- `docs/CONTEXT.md` - プロジェクトの背景と現在のアーキテクチャに関するメモ
- `docs/design.md` - デザインシステムのリファレンス
- [H2H モデル評価](docs/h2h-model-evaluation.md) - オフライン実験の手順と測定結果
- [H2H の不確実性](docs/h2h-uncertainty.md) - 未校正スコア、エビデンスの安全策、キャリブレーション監査
- [H2H モニタリング](docs/h2h-monitoring.md) - スコアの説明、レース前の記録、公開済み結果の追跡
- [予測履歴の自動化](docs/prediction-history.md) - 予測の公開とアーカイブ、レース結果の自動更新
- [予選後の予測](docs/post-qualifying-predictions.md) - シンガポールの予測の自動更新と公開ルール

## セットアップ

### フロントエンド

推奨: Node.js 22.12 以降。

```powershell
cd frontend
npm ci
npm run dev
```

`http://localhost:5173` で動作します

バックエンドが `http://localhost:8000` で動作していない場合は、`frontend/.env.example` を `frontend/.env` にコピーし、`VITE_API_BASE_URL` を設定してください。

`frontend` ディレクトリでフロントエンドのチェックを実行します:

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

### バックエンド

推奨: Python 3.12。

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

`http://127.0.0.1:8000` で動作します

ヘルスチェック: `http://127.0.0.1:8000/api/health`

バックエンドのテストを実行します:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

お問い合わせフォームを使うには、`backend/.env.example` を `backend/.env` にコピーし、Resend と連絡先の値を設定してください。

H2H 比較と予測はメモリ上のデータを共有するため、バックエンドのワーカーは 1 つだけで実行してください。複数のワーカーを使う場合は、スティッキールーティングまたは共有ストレージが必要です。
キャッシュとデプロイの詳細は、[H2H 技術リファレンス](docs/h2h.md)を参照してください。

PowerShell が有効化スクリプトをブロックする場合は、現在のユーザーに対してローカルスクリプトを許可してください:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

その後、次を実行します:

```powershell
.\venv\Scripts\Activate.ps1
```

## ライセンス

MIT
