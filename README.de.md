# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

KI-gestützte Webanwendung für Formel-1-Analysen und Rennvorhersagen.

## Funktionen

- **Rennvorhersagen** - Siegwahrscheinlichkeit für jeden Fahrer mithilfe eines Gradient-Boosting-Modells, das auf FastF1-Daten trainiert wurde
- **Aktualisierungen nach dem Qualifying** - Die Prognosen für Singapur werden automatisch aktualisiert, solange das Backend läuft, sobald das offizielle Ende des Qualifyings und die vollständige Klassifizierung vorliegen
- **H2H-Vergleiche** - abgeglichene Fahrerstatistiken mit Angabe zur Aktualität und einer historischen Heuristik, wer vor wem ins Ziel kommt
- **Verlauf** - frühere Vorhersagen, geprüft anhand der tatsächlichen Ergebnisse
- **Saisonkalender** - Rennkalender der Formel-1-Saison 2026

## Stack

**Frontend**
- React + Tailwind CSS (Vite)

**Backend**
- FastAPI (Python)

**ML**
- scikit-learn (kalibriertes Histogram-Gradient-Boosting)
- FastF1 (echte Zeitnahme- und Ergebnisdaten der Formel 1)

## Schnellstart (Windows)

Führe `setup.bat` im Stammverzeichnis des Repositorys aus, um die virtuelle Umgebung des Backends zu erstellen und alle Abhängigkeiten zu installieren. Mit `setup.bat run` werden zusätzlich beide Server gestartet. Öffne anschließend `http://localhost:5173`.

## Dokumentation

- [API-Referenz](docs/api.md) - Endpunkte, Parameter, Antworten und Fehler
- [Sicherheit](docs/security.md) - Umgang mit Zugangsdaten, Anfragelimits und Anforderungen an den Betrieb
- `docs/CONTEXT.md` - Projektkontext und aktuelle Hinweise zur Architektur
- `docs/design.md` - Referenz zum Designsystem
- [H2H-Modellbewertung](docs/h2h-model-evaluation.md) - Protokoll der Offline-Experimente und gemessene Ergebnisse
- [H2H-Unsicherheit](docs/h2h-uncertainty.md) - unkalibrierte Werte, Absicherungen bei der Evidenz und Kalibrierungsprüfung
- [H2H-Monitoring](docs/h2h-monitoring.md) - Erklärungen der Werte, Aufzeichnungen vor dem Rennen und Nachverfolgung veröffentlichter Ergebnisse
- [Automatischer Vorhersageverlauf](docs/prediction-history.md) - Veröffentlichung und Archivierung von Prognosen sowie automatische Aktualisierung der Rennergebnisse
- [Vorhersagen nach dem Qualifying](docs/post-qualifying-predictions.md) - automatische Aktualisierung der Singapur-Prognose und Regeln zur Veröffentlichung

## Einrichtung

### Frontend

Empfohlen: Node.js 22.12 oder neuer.

```powershell
cd frontend
npm ci
npm run dev
```

Läuft unter `http://localhost:5173`

Wenn das Backend nicht unter `http://localhost:8000` läuft, kopiere `frontend/.env.example` nach `frontend/.env` und setze `VITE_API_BASE_URL`.

Führe die Frontend-Prüfungen im Verzeichnis `frontend` aus:

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

### Backend

Empfohlen: Python 3.12.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Läuft unter `http://127.0.0.1:8000`

Health-Check: `http://127.0.0.1:8000/api/health`

Backend-Tests ausführen:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

Für das Kontaktformular kopierst du `backend/.env.example` nach `backend/.env` und trägst die Resend- bzw. Kontaktwerte ein.

Starte nur einen einzelnen Backend-Worker, da H2H-Vergleiche und Vorhersagen Daten im Arbeitsspeicher teilen. Mehrere Worker erfordern Sticky Routing oder einen gemeinsamen Speicher.
Details zu Caching und Deployment findest du in der [technischen Referenz zu H2H](docs/h2h.md).

Falls PowerShell das Aktivierungsskript blockiert, erlaube lokale Skripte für deinen Benutzer:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Führe danach Folgendes aus:

```powershell
.\venv\Scripts\Activate.ps1
```

## Kontakt

Fragen, Kooperationsanfragen oder Feedback zu diesem Projekt:

- LinkedIn: [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
- X / Twitter: [@aevagnarly](https://x.com/aevagnarly)
- E-Mail: [hello@akakarantzas.com](mailto:hello@akakarantzas.com)

## Haftungsausschluss

ChicaneAI ist ein inoffizielles Fanprojekt. Es steht in keiner Verbindung zur Formel 1, zur FIA oder zu einem Formel-1-Team und wird von diesen weder unterstützt noch empfohlen. F1, FORMULA 1 und verwandte Marken sind Marken der Formula One Licensing BV und ihrer jeweiligen Inhaber. Die MIT-Lizenz gilt nur für den Code dieses Projekts, nicht für Marken, Daten oder Schriftarten Dritter.

## Lizenz

MIT - [LICENSE](LICENSE)
