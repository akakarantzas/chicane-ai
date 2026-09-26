from datetime import datetime, timezone

import pytest

from app.services.h2h_dataset import export_dataset, main
from app.services.h2h_schedule import RaceEvent


def calendar(year):
    return [RaceEvent(year, i, f"Race {i}", datetime(year, 3, i, tzinfo=timezone.utc)) for i in (1, 2)]


def results(year):
    return [{"year": year, "round": i, "race": f"Race {i}", "race_date": f"{year}-03-0{i}",
             "position": pos, "abbreviation": code, "source": "jolpica", "status": "Finished"}
            for i in (1, 2) for pos, code in enumerate(("NOR", "PIA"), 1)]


def run(loader=results, fallback=lambda *args: []):
    return export_dataset([2024], schedule_loader=calendar, result_loader=loader,
                          fallback_loader=fallback, now=datetime(2025, 1, 1, tzinfo=timezone.utc))


def test_export_provenance_and_coverage():
    dataset = run()
    assert len(dataset["rows"]) == 4
    season = dataset["provenance"]["seasons"]["2024"]
    assert season["coverage"]["missing_rounds"] == []
    assert season["fastf1_fallback_rounds"] == []
    assert all(row["source"] == "jolpica" for row in dataset["rows"])


def test_missing_race_fallback_is_scoped_and_recorded():
    def fallback(year, events):
        assert [event.round for event in events] == [2]
        return [row | {"source": "fastf1"} for row in results(year) if row["round"] == 2]
    dataset = run(lambda year: results(year)[:2], fallback)
    assert len(dataset["rows"]) == 4
    assert dataset["provenance"]["seasons"]["2024"]["fastf1_fallback_rounds"] == [2]


def test_incomplete_or_quarantined_dataset_fails():
    with pytest.raises(ValueError, match="incomplete"):
        run(lambda year: results(year)[:2])
    with pytest.raises(ValueError, match="dropped"):
        run(lambda year: results(year) + [results(year)[0]])
    with pytest.raises(ValueError, match="years"):
        export_dataset([1900])


def test_existing_dataset_not_overwritten_or_refetched(tmp_path, monkeypatch):
    target = tmp_path / "existing.json"
    target.write_text("original")
    def blocked(*args, **kwargs):
        raise AssertionError("must not fetch when output exists")
    monkeypatch.setattr("app.services.h2h_dataset.export_dataset", blocked)
    with pytest.raises(SystemExit):
        main(["--output", str(target)])
    assert target.read_text() == "original"
