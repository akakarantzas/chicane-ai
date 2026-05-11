DRIVER_ROSTER_2026_ORDERED = [
    {"abbrev": "NOR", "full_name": "Lando Norris", "team": "McLaren", "number": "1"},
    {"abbrev": "PIA", "full_name": "Oscar Piastri", "team": "McLaren", "number": "81"},
    {"abbrev": "RUS", "full_name": "George Russell", "team": "Mercedes", "number": "63"},
    {"abbrev": "ANT", "full_name": "Kimi Antonelli", "team": "Mercedes", "number": "12"},
    {"abbrev": "VER", "full_name": "Max Verstappen", "team": "Red Bull Racing", "number": "3"},
    {"abbrev": "HAD", "full_name": "Isack Hadjar", "team": "Red Bull Racing", "number": "6"},
    {"abbrev": "LEC", "full_name": "Charles Leclerc", "team": "Ferrari", "number": "16"},
    {"abbrev": "HAM", "full_name": "Lewis Hamilton", "team": "Ferrari", "number": "44"},
    {"abbrev": "ALB", "full_name": "Alex Albon", "team": "Williams", "number": "23"},
    {"abbrev": "SAI", "full_name": "Carlos Sainz", "team": "Williams", "number": "55"},
    {"abbrev": "LIN", "full_name": "Arvid Lindblad", "team": "Racing Bulls", "number": "41"},
    {"abbrev": "LAW", "full_name": "Liam Lawson", "team": "Racing Bulls", "number": "30"},
    {"abbrev": "STR", "full_name": "Lance Stroll", "team": "Aston Martin", "number": "18"},
    {"abbrev": "ALO", "full_name": "Fernando Alonso", "team": "Aston Martin", "number": "14"},
    {"abbrev": "OCO", "full_name": "Esteban Ocon", "team": "Haas", "number": "31"},
    {"abbrev": "BEA", "full_name": "Oliver Bearman", "team": "Haas", "number": "87"},
    {"abbrev": "HUL", "full_name": "Nico Hulkenberg", "team": "Audi", "number": "27"},
    {"abbrev": "BOR", "full_name": "Gabriel Bortoleto", "team": "Audi", "number": "5"},
    {"abbrev": "GAS", "full_name": "Pierre Gasly", "team": "Alpine", "number": "10"},
    {"abbrev": "COL", "full_name": "Franco Colapinto", "team": "Alpine", "number": "43"},
    {"abbrev": "PER", "full_name": "Sergio Perez", "team": "Cadillac", "number": "11"},
    {"abbrev": "BOT", "full_name": "Valtteri Bottas", "team": "Cadillac", "number": "77"},
]

DRIVER_ROSTER_2026 = {
    driver["abbrev"]: {
        "full_name": driver["full_name"],
        "team": driver["team"],
        "number": driver["number"],
    }
    for driver in DRIVER_ROSTER_2026_ORDERED
}

PREDICTION_DRIVER_GRID_2026 = [
    {
        "driver": driver["full_name"].split()[-1],
        "team": driver["team"],
    }
    for driver in DRIVER_ROSTER_2026_ORDERED
]
