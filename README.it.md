# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

Applicazione web basata sull'IA per l'analisi della Formula 1 e la previsione delle gare.

## Funzionalità

- **Previsioni di gara** - probabilità di vittoria per ogni pilota tramite un modello di Gradient Boosting addestrato sui dati di FastF1
- **Aggiornamenti dopo le qualifiche** - le previsioni per Singapore vengono aggiornate automaticamente mentre il backend è in esecuzione, non appena sono disponibili la conclusione ufficiale delle qualifiche e la classifica completa
- **Confronti H2H** - statistiche dei piloti riconciliate, con indicazione dell'aggiornamento dei dati e un'euristica storica su chi termina davanti
- **Cronologia** - previsioni passate verificate rispetto ai risultati reali
- **Calendario della stagione** - calendario delle gare di F1 del 2026

## Stack

**Frontend**
- React + Tailwind CSS (Vite)

**Backend**
- FastAPI (Python)

**ML**
- scikit-learn (Gradient Boosting a istogrammi calibrato)
- FastF1 (dati reali di cronometraggio e risultati della F1)

## Avvio rapido (Windows)

Esegui `setup.bat` dalla radice del repository per creare l'ambiente virtuale del backend e installare tutte le dipendenze. Usa `setup.bat run` per avviare anche i due server, quindi apri `http://localhost:5173`.

## Documentazione

- [Riferimento API](docs/api.md) - endpoint, parametri, risposte ed errori
- [Sicurezza](docs/security.md) - gestione delle credenziali, limiti delle richieste e requisiti di distribuzione
- `docs/CONTEXT.md` - contesto del progetto e note sull'architettura attuale
- `docs/design.md` - riferimento del design system
- [Valutazione del modello H2H](docs/h2h-model-evaluation.md) - protocollo degli esperimenti offline e risultati misurati
- [Incertezza H2H](docs/h2h-uncertainty.md) - punteggi non calibrati, salvaguardie sulle evidenze e verifica della calibrazione
- [Monitoraggio H2H](docs/h2h-monitoring.md) - spiegazione dei punteggi, registrazioni pre-gara e tracciamento dei risultati pubblicati
- [Cronologia automatica delle previsioni](docs/prediction-history.md) - pubblicazione e archiviazione delle previsioni e aggiornamento automatico dei risultati di gara
- [Previsioni dopo le qualifiche](docs/post-qualifying-predictions.md) - aggiornamenti automatici delle previsioni per Singapore e regole di pubblicazione

## Configurazione

### Frontend

Consigliato: Node.js 22.12 o successivo.

```powershell
cd frontend
npm ci
npm run dev
```

Disponibile su `http://localhost:5173`

Se il backend non è su `http://localhost:8000`, copia `frontend/.env.example` in `frontend/.env` e imposta `VITE_API_BASE_URL`.

Esegui i controlli del frontend dalla directory `frontend`:

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

### Backend

Consigliato: Python 3.12.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Disponibile su `http://127.0.0.1:8000`

Controllo dello stato: `http://127.0.0.1:8000/api/health`

Esegui i test del backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

Per il modulo di contatto, copia `backend/.env.example` in `backend/.env` e configura i valori di Resend e di contatto.

Esegui un solo worker del backend, perché i confronti H2H e le previsioni condividono dati in memoria. Più worker richiedono un routing persistente (sticky routing) o uno storage condiviso.
Consulta [il riferimento tecnico H2H](docs/h2h.md) per i dettagli su cache e distribuzione.

Se PowerShell blocca lo script di attivazione, consenti gli script locali per il tuo utente:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Poi esegui:

```powershell
.\venv\Scripts\Activate.ps1
```

## Licenza

MIT
