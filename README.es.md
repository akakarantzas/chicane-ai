# ChicaneAI

[English](README.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

![ChicaneAI banner](docs/hero-banner.png)

Aplicación web de análisis de Fórmula 1 y predicción de carreras impulsada por IA.

## Características

- **Predicciones de carrera** - probabilidad de victoria de cada piloto mediante un modelo de Gradient Boosting entrenado con datos de FastF1
- **Actualizaciones tras la clasificación** - los pronósticos de Singapur se actualizan automáticamente mientras el backend está en ejecución, una vez que están disponibles la finalización oficial de la clasificación y la clasificación completa
- **Comparaciones H2H** - estadísticas de pilotos conciliadas, con informe de actualidad y una heurística histórica de quién termina por delante
- **Historial** - predicciones pasadas verificadas con los resultados reales
- **Calendario de la temporada** - calendario de carreras de F1 de 2026

## Stack

**Frontend**
- React + Tailwind CSS (Vite)

**Backend**
- FastAPI (Python)

**ML**
- scikit-learn (Gradient Boosting con histogramas calibrado)
- FastF1 (datos reales de cronometraje y resultados de F1)

## Inicio rápido (Windows)

Ejecuta `setup.bat` desde la raíz del repositorio para crear el entorno virtual del backend e instalar todas las dependencias. Usa `setup.bat run` para iniciar además ambos servidores y luego abre `http://localhost:5173`.

## Documentación

- [Referencia de la API](docs/api.md) - endpoints, parámetros, respuestas y errores
- [Seguridad](docs/security.md) - gestión de credenciales, límites de solicitudes y requisitos de despliegue
- `docs/CONTEXT.md` - contexto del proyecto y notas sobre la arquitectura actual
- `docs/design.md` - referencia del sistema de diseño
- [Evaluación del modelo H2H](docs/h2h-model-evaluation.md) - protocolo de experimentos sin conexión y resultados medidos
- [Incertidumbre de H2H](docs/h2h-uncertainty.md) - puntuaciones no calibradas, salvaguardas de evidencia y auditoría de calibración
- [Monitorización de H2H](docs/h2h-monitoring.md) - explicaciones de las puntuaciones, registros previos a la carrera y seguimiento de resultados publicados
- [Historial automático de predicciones](docs/prediction-history.md) - publicación y archivo de pronósticos y actualización automática de los resultados de carrera
- [Predicciones tras la clasificación](docs/post-qualifying-predictions.md) - actualizaciones automáticas del pronóstico de Singapur y reglas de publicación

## Configuración

### Frontend

Recomendado: Node.js 22.12 o posterior.

```powershell
cd frontend
npm ci
npm run dev
```

Se ejecuta en `http://localhost:5173`

Si el backend no está en `http://localhost:8000`, copia `frontend/.env.example` a `frontend/.env` y define `VITE_API_BASE_URL`.

Ejecuta las comprobaciones del frontend desde el directorio `frontend`:

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

Se ejecuta en `http://127.0.0.1:8000`

Comprobación de estado: `http://127.0.0.1:8000/api/health`

Ejecutar las pruebas del backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

Para el formulario de contacto, copia `backend/.env.example` a `backend/.env` y configura los valores de Resend y de contacto.

Ejecuta un único worker del backend, porque las comparaciones H2H y las predicciones comparten datos en memoria. Varios workers requieren enrutamiento persistente (sticky routing) o almacenamiento compartido.
Consulta [la referencia técnica de H2H](docs/h2h.md) para conocer los detalles de caché y despliegue.

Si PowerShell bloquea el script de activación, permite los scripts locales para tu usuario:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Después, ejecuta:

```powershell
.\venv\Scripts\Activate.ps1
```

## Contacto

Preguntas, consultas de colaboración o comentarios sobre este proyecto:

- LinkedIn: [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
- X / Twitter: [@aevagnarly](https://x.com/aevagnarly)
- Correo electrónico: [hello@akakarantzas.com](mailto:hello@akakarantzas.com)

## Aviso legal

ChicaneAI es un proyecto de aficionados no oficial. No está afiliado, respaldado ni asociado con la Fórmula 1, la FIA ni ningún equipo de Fórmula 1. F1, FORMULA 1 y las marcas relacionadas son marcas de Formula One Licensing BV y de sus respectivos propietarios. La licencia MIT cubre únicamente el código de este proyecto, no las marcas, datos ni fuentes de terceros.

## Licencia

MIT - [LICENSE](LICENSE)
