export const DRIVERS = [
  { abbrev: 'NOR', fullName: 'Lando Norris',      team: 'McLaren',           number: '1'  },
  { abbrev: 'PIA', fullName: 'Oscar Piastri',     team: 'McLaren',           number: '81' },
  { abbrev: 'RUS', fullName: 'George Russell',    team: 'Mercedes',          number: '63' },
  { abbrev: 'ANT', fullName: 'Kimi Antonelli',    team: 'Mercedes',          number: '12' },
  { abbrev: 'VER', fullName: 'Max Verstappen',    team: 'Red Bull Racing',   number: '3'  },
  { abbrev: 'HAD', fullName: 'Isack Hadjar',      team: 'Red Bull Racing',   number: '6'  },
  { abbrev: 'LEC', fullName: 'Charles Leclerc',   team: 'Ferrari',           number: '16' },
  { abbrev: 'HAM', fullName: 'Lewis Hamilton',    team: 'Ferrari',           number: '44' },
  { abbrev: 'ALB', fullName: 'Alex Albon',        team: 'Williams',          number: '23' },
  { abbrev: 'SAI', fullName: 'Carlos Sainz',      team: 'Williams',          number: '55' },
  { abbrev: 'LIN', fullName: 'Arvid Lindblad',    team: 'Racing Bulls',      number: '41' },
  { abbrev: 'LAW', fullName: 'Liam Lawson',       team: 'Racing Bulls',      number: '30' },
  { abbrev: 'STR', fullName: 'Lance Stroll',      team: 'Aston Martin',      number: '18' },
  { abbrev: 'ALO', fullName: 'Fernando Alonso',   team: 'Aston Martin',      number: '14' },
  { abbrev: 'OCO', fullName: 'Esteban Ocon',      team: 'Haas',              number: '31' },
  { abbrev: 'BEA', fullName: 'Oliver Bearman',    team: 'Haas',              number: '87' },
  { abbrev: 'HUL', fullName: 'Nico Hulkenberg',   team: 'Audi',              number: '27' },
  { abbrev: 'BOR', fullName: 'Gabriel Bortoleto', team: 'Audi',              number: '5'  },
  { abbrev: 'GAS', fullName: 'Pierre Gasly',      team: 'Alpine',            number: '10' },
  { abbrev: 'COL', fullName: 'Franco Colapinto',  team: 'Alpine',            number: '43' },
  { abbrev: 'PER', fullName: 'Sergio Perez',      team: 'Cadillac',          number: '11' },
  { abbrev: 'BOT', fullName: 'Valtteri Bottas',   team: 'Cadillac',          number: '77' },
]

export const DRIVER_MAP = Object.fromEntries(DRIVERS.map((driver) => [driver.abbrev, driver]))

export const TEAM_COLORS = {
  McLaren: '#FF8000',
  Mercedes: '#27F4D2',
  'Red Bull Racing': '#3671C6',
  Ferrari: '#E80020',
  Williams: '#64C4FF',
  'Racing Bulls': '#6692FF',
  'Aston Martin': '#229971',
  Haas: '#B6BABD',
  Audi: '#52E252',
  Sauber: '#52E252',
  Alpine: '#FF87BC',
  Cadillac: '#D4AF37',
  fallback: '#FF003C',
}

export function getTeamColor(teamName) {
  return TEAM_COLORS[teamName] ?? TEAM_COLORS.fallback
}
