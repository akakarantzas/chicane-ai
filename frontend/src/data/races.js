import { useEffect, useState } from 'react'

const RACE_SCHEDULE = [
  { round: 1,  code: 'AU', name: 'Australian GP',    country: 'Australia',      date: 'Mar 8',  raceAt: '2026-03-08T23:59:59Z' },
  { round: 2,  code: 'CN', name: 'Chinese GP',       country: 'China',          date: 'Mar 15', raceAt: '2026-03-15T23:59:59Z' },
  { round: 3,  code: 'JP', name: 'Japanese GP',      country: 'Japan',          date: 'Mar 29', raceAt: '2026-03-29T23:59:59Z' },
  { round: 4,  code: 'BH', name: 'Bahrain GP',       country: 'Bahrain',        date: 'Apr 12', raceAt: '2026-04-12T23:59:59Z' },
  { round: 5,  code: 'SA', name: 'Saudi Arabian GP', country: 'Saudi Arabia',   date: 'Apr 19', raceAt: '2026-04-19T23:59:59Z' },
  { round: 6,  code: 'US', name: 'Miami GP',         country: 'United States',  date: 'May 3',  raceAt: '2026-05-03T23:59:59Z' },
  { round: 7,  code: 'CA', name: 'Canadian GP',      country: 'Canada',         date: 'May 24', raceAt: '2026-05-24T23:59:59Z' },
  { round: 8,  code: 'MC', name: 'Monaco GP',        country: 'Monaco',         date: 'Jun 7',  raceAt: '2026-06-07T23:59:59Z' },
  { round: 9,  code: 'ES', name: 'Spanish GP',       country: 'Spain',          date: 'Jun 14', raceAt: '2026-06-14T23:59:59Z' },
  { round: 10, code: 'AT', name: 'Austrian GP',      country: 'Austria',        date: 'Jun 28', raceAt: '2026-06-28T23:59:59Z' },
  { round: 11, code: 'GB', name: 'British GP',       country: 'United Kingdom', date: 'Jul 5',  raceAt: '2026-07-05T23:59:59Z' },
  { round: 12, code: 'BE', name: 'Belgian GP',       country: 'Belgium',        date: 'Jul 19', raceAt: '2026-07-19T23:59:59Z' },
  { round: 13, code: 'HU', name: 'Hungarian GP',     country: 'Hungary',        date: 'Jul 26', raceAt: '2026-07-26T23:59:59Z' },
  { round: 14, code: 'NL', name: 'Dutch GP',         country: 'Netherlands',    date: 'Aug 23', raceAt: '2026-08-23T23:59:59Z' },
  { round: 15, code: 'IT', name: 'Italian GP',       country: 'Italy',          date: 'Sep 6',  raceAt: '2026-09-06T23:59:59Z' },
  { round: 16, code: 'ES', name: 'Spanish GP',       country: 'Spain',          date: 'Sep 13', raceAt: '2026-09-13T23:59:59Z' },
  { round: 17, code: 'AZ', name: 'Azerbaijan GP',    country: 'Azerbaijan',     date: 'Sep 26', raceAt: '2026-09-26T23:59:59Z' },
  { round: 18, code: 'SG', name: 'Singapore GP',     country: 'Singapore',      date: 'Oct 11', raceAt: '2026-10-11T23:59:59Z' },
  { round: 19, code: 'US', name: 'United States GP', country: 'United States',  date: 'Oct 25', raceAt: '2026-10-25T23:59:59Z' },
  { round: 20, code: 'MX', name: 'Mexico City GP',   country: 'Mexico',         date: 'Nov 1',  raceAt: '2026-11-01T23:59:59Z' },
  { round: 21, code: 'BR', name: 'Sao Paulo GP',     country: 'Brazil',         date: 'Nov 8',  raceAt: '2026-11-08T23:59:59Z' },
  { round: 22, code: 'US', name: 'Las Vegas GP',     country: 'United States',  date: 'Nov 22', raceAt: '2026-11-22T23:59:59Z' },
  { round: 23, code: 'QA', name: 'Qatar GP',         country: 'Qatar',          date: 'Nov 29', raceAt: '2026-11-29T23:59:59Z' },
  { round: 24, code: 'AE', name: 'Abu Dhabi GP',     country: 'UAE',            date: 'Dec 6',  raceAt: '2026-12-06T23:59:59Z' },
]

export function getRaceCalendar(now = new Date()) {
  const currentIndex = RACE_SCHEDULE.findIndex((race) => now <= new Date(race.raceAt))

  return RACE_SCHEDULE.map((race, index) => ({
    ...race,
    status: currentIndex === -1
      ? 'completed'
      : index < currentIndex
        ? 'completed'
        : index === currentIndex
          ? 'current'
          : 'upcoming',
  }))
}

export function getNextRace(now = new Date()) {
  return getRaceCalendar(now).find((race) => race.status === 'current') ?? RACE_SCHEDULE[RACE_SCHEDULE.length - 1]
}

export function useRaceCalendar(refreshMs = 60_000) {
  const [races, setRaces] = useState(() => getRaceCalendar())

  useEffect(() => {
    const id = window.setInterval(() => {
      setRaces(getRaceCalendar())
    }, refreshMs)

    return () => window.clearInterval(id)
  }, [refreshMs])

  return races
}
