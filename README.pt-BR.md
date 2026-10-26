# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

Aplicação web de análise da Fórmula 1 e previsão de corridas com tecnologia de IA.

## Funcionalidades

- **Previsões de corrida** - probabilidade de vitória de cada piloto usando um modelo de Gradient Boosting treinado com dados do FastF1
- **Atualizações após a classificação** - as previsões de Singapura são atualizadas automaticamente enquanto o backend está em execução, assim que o fim oficial da classificação e a classificação completa estão disponíveis
- **Comparações H2H** - estatísticas de pilotos conciliadas, com informação de atualidade dos dados e uma heurística histórica de quem termina à frente
- **Histórico** - previsões passadas verificadas com os resultados reais
- **Calendário da temporada** - calendário de corridas da F1 de 2026

## Stack

**Frontend**
- React + Tailwind CSS (Vite)

**Backend**
- FastAPI (Python)

**ML**
- scikit-learn (Gradient Boosting com histogramas calibrado)
- FastF1 (dados reais de cronometragem e resultados da F1)

## Início rápido (Windows)

Execute `setup.bat` na raiz do repositório para criar o ambiente virtual do backend e instalar todas as dependências. Use `setup.bat run` para também iniciar os dois servidores e, em seguida, abra `http://localhost:5173`.

## Documentação

- [Referência da API](docs/api.md) - endpoints, parâmetros, respostas e erros
- [Segurança](docs/security.md) - tratamento de credenciais, limites de requisições e requisitos de implantação
- `docs/CONTEXT.md` - contexto do projeto e notas sobre a arquitetura atual
- `docs/design.md` - referência do sistema de design
- [Avaliação do modelo H2H](docs/h2h-model-evaluation.md) - protocolo dos experimentos offline e resultados medidos
- [Incerteza do H2H](docs/h2h-uncertainty.md) - pontuações não calibradas, salvaguardas de evidência e auditoria de calibração
- [Monitoramento do H2H](docs/h2h-monitoring.md) - explicações das pontuações, registros pré-corrida e acompanhamento dos resultados publicados
- [Histórico automático de previsões](docs/prediction-history.md) - publicação e arquivamento de previsões e atualização automática dos resultados das corridas
- [Previsões após a classificação](docs/post-qualifying-predictions.md) - atualizações automáticas da previsão de Singapura e regras de publicação

## Configuração

### Frontend

Recomendado: Node.js 22.12 ou posterior.

```powershell
cd frontend
npm ci
npm run dev
```

Executa em `http://localhost:5173`

Se o backend não estiver em `http://localhost:8000`, copie `frontend/.env.example` para `frontend/.env` e defina `VITE_API_BASE_URL`.

Execute as verificações do frontend a partir do diretório `frontend`:

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

### Backend

Recomendado: Python 3.12.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Executa em `http://127.0.0.1:8000`

Verificação de integridade: `http://127.0.0.1:8000/api/health`

Execute os testes do backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m pytest tests
```

Para o formulário de contato, copie `backend/.env.example` para `backend/.env` e configure os valores do Resend e de contato.

Execute um único worker do backend, pois as comparações H2H e as previsões compartilham dados em memória. Vários workers exigem roteamento persistente (sticky routing) ou armazenamento compartilhado.
Consulte [a referência técnica do H2H](docs/h2h.md) para detalhes sobre cache e implantação.

Se o PowerShell bloquear o script de ativação, permita scripts locais para o seu usuário:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Em seguida, execute:

```powershell
.\venv\Scripts\Activate.ps1
```

## Contato

Dúvidas, propostas de parceria ou feedback sobre este projeto:

- LinkedIn: [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
- X / Twitter: [@aevagnarly](https://x.com/aevagnarly)
- E-mail: [hello@akakarantzas.com](mailto:hello@akakarantzas.com)

## Aviso legal

O ChicaneAI é um projeto de fã não oficial. Não é afiliado, endossado nem associado à Fórmula 1, à FIA ou a qualquer equipe de Fórmula 1. F1, FORMULA 1 e marcas relacionadas são marcas da Formula One Licensing BV e de seus respectivos proprietários. A licença MIT cobre apenas o código deste projeto, e não marcas, dados ou fontes de terceiros.

## Licença

MIT - [LICENSE](LICENSE)
