import { useEffect, useMemo, useState } from 'react'
import { personsApi } from '../api/persons'
import type { Person } from '../types'

interface PeoplePageProps {
  activeTreeId: string | null
  onSelectPerson: (id: string) => void
}

export function PeoplePage({ activeTreeId, onSelectPerson }: PeoplePageProps) {
  const [persons, setPersons] = useState<Person[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'birth' | 'added'>('name')
  const [statusFilter, setStatusFilter] = useState<'all' | 'living' | 'deceased' | 'uncertain'>('all')

  useEffect(() => {
    setLoading(true)
    personsApi.list(activeTreeId ? { treeId: activeTreeId } : {})
      .then(setPersons)
      .finally(() => setLoading(false))
  }, [activeTreeId])

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim()
    const scorePerson = (person: Person) => {
      if (!normalizedSearch) return 1
      const haystack = [
        person.fullName,
        person.nickname,
        person.birthPlace,
        person.profession,
        ...(person.aliases || []),
      ].filter(Boolean).join(' ').toLowerCase()
      if (haystack.includes(normalizedSearch)) return 1
      const tokens = normalizedSearch.split(/\s+/)
      return tokens.every(token => haystack.includes(token)) ? 0.8 : 0
    }

    return persons
      .filter(person => {
        if (statusFilter === 'living' && person.isDeceased) return false
        if (statusFilter === 'deceased' && !person.isDeceased) return false
        if (statusFilter === 'uncertain' && !person.isUncertain) return false
        return scorePerson(person) > 0
      })
      .sort((a, b) => {
        if (sortBy === 'birth') return (a.birthYearEst ?? 9999) - (b.birthYearEst ?? 9999)
        if (sortBy === 'added') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        return (a.fullName || a.nickname || 'Unknown').localeCompare(b.fullName || b.nickname || 'Unknown')
      })
  }, [persons, search, sortBy, statusFilter])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink3)', fontSize: 15 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, nickname, village, year…"
            style={{
              width: '100%', padding: '8px 12px 8px 34px',
              background: 'var(--paper)', border: '1px solid var(--border2)',
              borderRadius: 6, fontSize: 13, outline: 'none',
              fontFamily: 'DM Sans, sans-serif', color: 'var(--ink)',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
          style={{ padding: '8px 10px', background: 'var(--paper)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif', color: 'var(--ink2)' }}
        >
          <option value="all">All statuses</option>
          <option value="living">Living</option>
          <option value="deceased">Deceased</option>
          <option value="uncertain">Uncertain</option>
        </select>
        <select
          value={sortBy}
          onChange={event => setSortBy(event.target.value as typeof sortBy)}
          style={{ padding: '8px 10px', background: 'var(--paper)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif', color: 'var(--ink2)' }}
        >
          <option value="name">Sort by name</option>
          <option value="birth">Sort by birth year</option>
          <option value="added">Sort by date added</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 12 }}>
        {loading ? 'Loading…' : `${filtered.length} people`}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Name', 'Born', 'Status', 'Confidence'].map(h => (
              <th key={h} style={{
                textAlign: 'left', fontSize: 10.5, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--ink3)', fontWeight: 500,
                padding: '8px 12px', borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => {
            const name = p.fullName || p.nickname || 'Unknown'
            const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
            const year = p.birthYearEst ? `c. ${p.birthYearEst}` : p.birthDateExact ? new Date(p.birthDateExact).getFullYear().toString() : '—'
            const conf = p.confidenceScore ?? null

            return (
              <tr key={p.id} onClick={() => onSelectPerson(p.id)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: '#e3edf7', color: '#1d5a8a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Cormorant Garamond, serif', fontSize: 13, fontWeight: 500,
                    }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, color: p.isUncertain ? 'var(--ink3)' : 'var(--ink)', fontStyle: p.isUncertain ? 'italic' : 'normal' }}>{name}</div>
                      {p.birthPlace && <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{p.birthPlace}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13, color: p.birthYearEst ? 'var(--ink3)' : 'var(--ink3)', fontStyle: p.birthYearEst ? 'italic' : 'normal' }}>{year}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  {p.isDeceased
                    ? <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--paper2)', color: 'var(--ink3)' }}>Deceased</span>
                    : p.isUncertain
                    ? <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, border: '1px dashed var(--ink3)', color: 'var(--ink3)' }}>Uncertain</span>
                    : <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#e3edf7', color: '#1d5a8a' }}>Living</span>}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  {conf !== null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 48, height: 3, borderRadius: 2, background: 'var(--paper3)' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${conf}%`,
                          background: conf >= 80 ? 'var(--teal)' : conf >= 50 ? 'var(--gold)' : 'var(--rust)',
                        }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{conf}%</span>
                    </div>
                  ) : <span style={{ color: 'var(--ink3)', fontSize: 12 }}>—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
