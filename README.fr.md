# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

Application web d'analyse de la Formule 1 et de prédiction des courses, propulsée par l'IA.

## Fonctionnalités

- **Prédictions de course** - probabilité de victoire de chaque pilote grâce à un modèle de Gradient Boosting entraîné sur les données FastF1
- **Mises à jour après les qualifications** - les prévisions de Singapour sont mises à jour automatiquement tant que le backend fonctionne, dès que la fin officielle des qualifications et le classement complet sont disponibles
- **Comparaisons H2H** - statistiques des pilotes rapprochées, avec indication de fraîcheur et une heuristique historique sur le pilote qui termine devant l'autre
- **Historique** - prédictions passées vérifiées par rapport aux résultats réels
- **Calendrier de la saison** - calendrier des courses de F1 pour 2026

## Stack

**Frontend**
- React + Tailwind CSS (Vite)

**Backend**
- FastAPI (Python)

**ML**
- scikit-learn (Gradient Boosting à histogrammes calibré)
- FastF1 (données réelles de chronométrage et de résultats de F1)

## Démarrage rapide (Windows)

Exécutez `setup.bat` à la racine du dépôt pour créer l'environnement virtuel du backend et installer toutes les dépendances. Utilisez `setup.bat run` pour démarrer en plus les deux serveurs, puis ouvrez `http://localhost:5173`.

## Documentation

- [Référence de l'API](docs/api.md) - points d'accès, paramètres, réponses et erreurs
- [Sécurité](docs/security.md) - gestion des identifiants, limites de requêtes et exigences de déploiement
- `docs/CONTEXT.md` - contexte du projet et notes sur l'architecture actuelle
- `docs/design.md` - référence du système de design
- [Évaluation du modèle H2H](docs/h2h-model-evaluation.md) - protocole des expériences hors ligne et résultats mesurés
- [Incertitude H2H](docs/h2h-uncertainty.md) - scores non calibrés, garde-fous sur les preuves et audit de calibration
- [Suivi H2H](docs/h2h-monitoring.md) - explications des scores, enregistrements avant course et suivi des résultats publiés
- [Historique automatique des prédictions](docs/prediction-history.md) - publication et archivage des prévisions, et mise à jour automatique des résultats de course
- [Prédictions après les qualifications](docs/post-qualifying-predictions.md) - mises à jour automatiques des prévisions de Singapour et règles de publication

## Installation

### Frontend

Recommandé : Node.js 22.12 ou version ultérieure.

```powershell
cd frontend
npm ci
npm run dev
```

Disponible sur `http://localhost:5173`

Si le backend n'est pas sur `http://localhost:8000`, copiez `frontend/.env.example` vers `frontend/.env` et définissez `VITE_API_BASE_URL`.

Lancez les vérifications du frontend depuis le répertoire `frontend` :

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

### Backend

Recommandé : Python 3.12.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Disponible sur `http://127.0.0.1:8000`

Vérification de l'état : `http://127.0.0.1:8000/api/health`

Lancer les tests du backend :

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

Pour le formulaire de contact, copiez `backend/.env.example` vers `backend/.env` et renseignez les valeurs Resend et de contact.

N'exécutez qu'un seul worker backend, car les comparaisons H2H et les prédictions partagent des données en mémoire. Plusieurs workers nécessitent un routage persistant (sticky routing) ou un stockage partagé.
Consultez [la référence technique H2H](docs/h2h.md) pour les détails sur le cache et le déploiement.

Si PowerShell bloque le script d'activation, autorisez les scripts locaux pour votre utilisateur :

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Exécutez ensuite :

```powershell
.\venv\Scripts\Activate.ps1
```

## Avertissement

ChicaneAI est un projet de fan non officiel. Il n'est ni affilié à la Formule 1, à la FIA ou à une écurie de Formule 1, ni approuvé ou soutenu par eux. F1, FORMULA 1 et les marques associées sont des marques de Formula One Licensing BV et de leurs propriétaires respectifs. La licence MIT ne couvre que le code de ce projet, et non les marques, données ou polices de tiers.

## Licence

MIT - [LICENSE](LICENSE)
