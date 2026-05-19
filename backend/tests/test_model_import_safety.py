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


def test_predict_module_currently_loads_model_at_import(monkeypatch):
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

    assert calls
    assert module._model.__class__ is FakeModel
    unload_predict_module()


def test_predict_module_currently_raises_when_model_file_is_missing(monkeypatch):
    unload_predict_module()

    def fake_load(path):
        raise FileNotFoundError(path)

    monkeypatch.setattr("joblib.load", fake_load)

    with pytest.raises(RuntimeError, match="Model file not found"):
        importlib.import_module("app.models.predict")

    unload_predict_module()


@pytest.mark.xfail(
    reason="Future behavior: model loading should be lazy so missing rf_model.pkl does not break module import."
)
def test_predict_module_should_not_crash_import_when_model_file_is_missing(monkeypatch):
    unload_predict_module()

    def fake_load(path):
        raise FileNotFoundError(path)

    monkeypatch.setattr("joblib.load", fake_load)

    importlib.import_module("app.models.predict")
    unload_predict_module()
