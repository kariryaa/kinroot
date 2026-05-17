import { useEffect, useMemo, useState } from 'react'
import { personsApi } from '../api/persons'
import type { Person } from '../types'

interface TimelinePageProps {
  activeTreeId: string | null
  onSelectPerson: (id: string) => void
}

function displayName(person: Person) {
  return person.fullName || person.nickname || 'Unknown person'
}

function yearOf(person: Person) {
  return person.birthYearEst || (person.birthDateExact ? new Date(person.birthDateExact).getFullYear() : null)
}

export function TimelinePage({ activeTreeId, onSelectPerson }: TimelinePageProps) {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'uncertain' | 'living' | 'deceased'>('all')

  useEffect(() => {
    setLoading(true)
    personsApi.list(activeTreeId ? { treeId: activeTreeId } : {})
      .then(setPersons)
      .finally(() => setLoading(false))
  }, [activeTreeId])

  const entries = useMemo(() => {
    return persons
      .filter(person => {
        if (filter === 'uncertain') return person.isUncertain
        if (filter === 'living') return !person.isDeceased
        if (filter === 'deceased') return person.isDeceased
        return true
      })
      .map(person => ({ person, year: yearOf(person) }))
      .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || displayName(a.person).localeCompare(displayName(b.person)))
  }, [persons, filter])

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--paper)', padding: '22px 28px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.45rem', color: 'var(--ink)' }}>Timeline</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
              {loading ? 'Loading...' : `${entries.length} people with archived life details`}
            </div>
          </div>
          <select
            value={filter}
            onChange={event => setFilter(event.target.value as typeof filter)}
            style={{ padding: '7px 10px', border: '1px solid var(--border2)', borderRadius: 6, background: 'var(--paper)', color: 'var(--ink2)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}
          >
            <option value="all">All people</option>
            <option value="living">Living</option>
            <option value="deceased">Deceased</option>
            <option value="uncertain">Uncertain</option>
          </select>
        </div>

        <div style={{ position: 'relative', paddingLeft: 30 }}>
          <div style={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 1, background: 'var(--border2)' }} />

          {entries.map(({ person, year }) => (
            <button
              key={person.id}
              onClick={() => onSelectPerson(person.id)}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '86px 1fr',
                gap: 16,
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                padding: '12px 0',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', left: -27, top: 19, width: 10, height: 10, borderRadius: '50%', background: person.isUncertain ? 'var(--paper)' : 'var(--gold)', border: `1px ${person.isUncertain ? 'dashed' : 'solid'} var(--gold)` }} />
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: year ? 'var(--ink)' : 'var(--ink3)', fontStyle: year ? 'normal' : 'italic' }}>
                {year ? `c.${year}` : 'Unknown'}
              </span>
              <span>
                <span style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)', fontWeight: 500, fontStyle: person.isUncertain ? 'italic' : 'normal' }}>
                  {displayName(person)}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>
                  {[person.birthPlace, person.profession, person.isDeceased ? 'Deceased' : 'Living'].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          ))}

          {!loading && entries.length === 0 && (
            <div style={{ padding: '40px 0', color: 'var(--ink3)', fontSize: 13 }}>
              No timeline entries match this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
