import importlib
import sys

import pytest


def unload_predict_module():
    sys.modules.pop("app.models.predict", None)


def test_app_main_imports_without_model_predict_module():
    unload_predict_module()

    import app.main

    assert app.main.app.title == "Chicane.ai API"
    assert "app.models.predict" not in sys.modules


def test_predict_module_import_does_not_load_model(monkeypatch):
    unload_predict_module()
    calls = []

    class FakeModel:
        def predict_proba(self, df):
            return []

    def fake_load(path):
        calls.append(path)
        return FakeModel()

    monkeypatch.setattr("joblib.load", fake_load)

    module = importlib.import_module("app.models.predict")

    assert calls == []
    assert module._model is None
    unload_predict_module()


def test_predict_module_get_model_loads_once_and_caches(monkeypatch):
    unload_predict_module()
    calls = []

    class FakeModel:
        pass

    fake_model = FakeModel()

    def fake_load(path):
        calls.append(path)
        return fake_model

    monkeypatch.setattr("joblib.load", fake_load)

    module = importlib.import_module("app.models.predict")

    assert module.get_model() is fake_model
    assert module.get_model() is fake_model
    assert len(calls) == 1
    unload_predict_module()


def test_predict_module_get_model_raises_clear_error_when_model_file_is_missing(monkeypatch):
    unload_predict_module()

    def fake_load(path):
        raise FileNotFoundError(path)

    monkeypatch.setattr("joblib.load", fake_load)

    module = importlib.import_module("app.models.predict")
    with pytest.raises(RuntimeError, match="Model file not found"):
        module.get_model()

    unload_predict_module()


def test_predict_module_imports_when_model_file_is_missing(monkeypatch):
    unload_predict_module()

    def fake_load(path):
        raise FileNotFoundError(path)

    monkeypatch.setattr("joblib.load", fake_load)

    module = importlib.import_module("app.models.predict")

    assert module._model is None
    unload_predict_module()
