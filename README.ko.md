# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

AI 기반 포뮬러 1 분석 및 레이스 예측 웹 앱입니다.

## 기능

- **레이스 예측** - FastF1 데이터로 학습한 Gradient Boosting 모델로 각 드라이버의 우승 확률을 계산합니다
- **예선 후 업데이트** - 백엔드가 실행되는 동안 공식 예선 종료와 전체 결과가 나오면 싱가포르 예측이 자동으로 업데이트됩니다
- **H2H 비교** - 대조 검증을 거친 드라이버 통계에 데이터 최신성 보고와, 누가 먼저 결승선을 통과할지에 대한 과거 데이터 기반 휴리스틱을 제공합니다
- **기록** - 과거 예측을 실제 결과와 대조해 검증합니다
- **시즌 캘린더** - 2026년 F1 레이스 일정

## 기술 스택

**프런트엔드**
- React + Tailwind CSS (Vite)

**백엔드**
- FastAPI (Python)

**ML**
- scikit-learn (보정된 히스토그램 Gradient Boosting)
- FastF1 (실제 F1 타이밍 및 결과 데이터)

## 빠른 시작 (Windows)

저장소 루트에서 `setup.bat`을 실행하면 백엔드 가상 환경이 만들어지고 모든 의존성이 설치됩니다. `setup.bat run`을 사용하면 두 서버도 함께 시작됩니다. 그런 다음 `http://localhost:5173`을 여세요.

## 문서

- [API 레퍼런스](docs/api.md) - 엔드포인트, 매개변수, 응답 및 오류
- [보안](docs/security.md) - 자격 증명 처리, 요청 제한 및 배포 요구 사항
- `docs/CONTEXT.md` - 프로젝트 배경과 현재 아키텍처 메모
- `docs/design.md` - 디자인 시스템 레퍼런스
- [H2H 모델 평가](docs/h2h-model-evaluation.md) - 오프라인 실험 절차와 측정 결과
- [H2H 불확실성](docs/h2h-uncertainty.md) - 보정되지 않은 점수, 근거 안전장치 및 보정 감사
- [H2H 모니터링](docs/h2h-monitoring.md) - 점수 설명, 레이스 전 기록 및 공개된 결과 추적
- [예측 기록 자동화](docs/prediction-history.md) - 예측 게시와 보관, 레이스 결과 자동 업데이트
- [예선 후 예측](docs/post-qualifying-predictions.md) - 싱가포르 예측 자동 업데이트와 게시 규칙

## 설정

### 프런트엔드

권장: Node.js 22.12 이상.

```powershell
cd frontend
npm ci
npm run dev
```

`http://localhost:5173`에서 실행됩니다

백엔드가 `http://localhost:8000`에서 실행되지 않는 경우, `frontend/.env.example`을 `frontend/.env`로 복사하고 `VITE_API_BASE_URL`을 설정하세요.

`frontend` 디렉터리에서 프런트엔드 검사를 실행합니다:

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

### 백엔드

권장: Python 3.12.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

`http://127.0.0.1:8000`에서 실행됩니다

상태 확인: `http://127.0.0.1:8000/api/health`

백엔드 테스트 실행:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

문의 양식을 사용하려면 `backend/.env.example`을 `backend/.env`로 복사하고 Resend 및 연락처 값을 설정하세요.

H2H 비교와 예측은 메모리의 데이터를 공유하므로 백엔드 워커는 하나만 실행하세요. 여러 워커를 사용하려면 스티키 라우팅이나 공유 스토리지가 필요합니다.
캐싱과 배포에 대한 자세한 내용은 [H2H 기술 레퍼런스](docs/h2h.md)를 참고하세요.

PowerShell이 활성화 스크립트를 차단하면 현재 사용자에 대해 로컬 스크립트를 허용하세요:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

그런 다음 실행하세요:

```powershell
.\venv\Scripts\Activate.ps1
```

## 문의

이 프로젝트에 대한 질문, 제휴 문의 또는 피드백:

- LinkedIn: [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
- X / Twitter: [@aevagnarly](https://x.com/aevagnarly)
- 이메일: [hello@akakarantzas.com](mailto:hello@akakarantzas.com)

## 면책 조항

ChicaneAI는 비공식 팬 프로젝트이며, 포뮬러 1, FIA 또는 어떤 포뮬러 1 팀과도 제휴, 보증 또는 연관 관계가 없습니다. F1, FORMULA 1 및 관련 상표는 Formula One Licensing BV와 각 소유자의 상표입니다. MIT 라이선스는 이 프로젝트의 코드에만 적용되며, 제3자의 상표, 데이터, 글꼴에는 적용되지 않습니다.

## 라이선스

MIT - [LICENSE](LICENSE)
