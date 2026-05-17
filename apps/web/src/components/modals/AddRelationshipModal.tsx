import { useState, useEffect } from 'react'
import { personsApi }       from '../../api/persons'
import { api }              from '../../api/client'
import type { Person }      from '../../types'

const RELATIONSHIP_TYPES = [
  { group: 'Parent / Child',  types: ['BIOLOGICAL_PARENT','ADOPTIVE_PARENT','FOSTER_PARENT','STEP_PARENT','GUARDIAN','SURROGATE_PARENT','UNKNOWN_PARENT'] },
  { group: 'Partner',         types: ['MARRIED','PARTNER','LIFE_PARTNER','ENGAGED','DIVORCED','SEPARATED','WIDOWED'] },
  { group: 'Sibling',         types: ['SIBLING','HALF_SIBLING','STEP_SIBLING'] },
  { group: 'Extended family', types: ['COUSIN','GRANDPARENT','AUNT_UNCLE','NIECE_NEPHEW'] },
  { group: 'Other',           types: ['MENTOR','CARETAKER','FRIEND','COMMUNITY','TEACHER','STUDENT','PET','UNKNOWN','CUSTOM'] },
]

interface Props {
  open:         boolean
  fromPersonId: string         // the person we're connecting FROM
  fromPersonName: string
  treeId:       string | null
  onClose:      () => void
  onCreated:    () => void     // refresh graph after creation
}

export function AddRelationshipModal({ open, fromPersonId, fromPersonName, treeId, onClose, onCreated }: Props) {
  const [allPersons, setAllPersons]   = useState<Person[]>([])
  const [search, setSearch]           = useState('')
  const [toPersonId, setToPersonId]   = useState<string | null>(null)
  const [relType, setRelType]         = useState('BIOLOGICAL_PARENT')
  const [isDirectional, setDirectional] = useState(true)
  // direction: "AtoB" means fromPerson is [relType] of toPerson
  //            "BtoA" means toPerson is [relType] of fromPerson
  const [direction, setDirection]     = useState<'AtoB' | 'BtoA'>('AtoB')
  const [isUncertain, setUncertain]   = useState(false)
  const [confidence, setConfidence]   = useState(100)
  const [notes, setNotes]             = useState('')
  const [startYear, setStartYear]     = useState('')
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (!open) return
    personsApi.list(treeId ? { treeId } : {})
      .then(persons => setAllPersons(persons.filter(p => p.id !== fromPersonId)))
  }, [open, treeId, fromPersonId])

  if (!open) return null

  const filtered = allPersons.filter(p => {
    const q = search.toLowerCase()
    return !q ||
      p.fullName?.toLowerCase().includes(q) ||
      p.nickname?.toLowerCase().includes(q)
  })

  const selectedPerson = allPersons.find(p => p.id === toPersonId)

  // Determine actual personAId/personBId based on direction
  const personAId = direction === 'AtoB' ? fromPersonId : toPersonId!
  const personBId = direction === 'AtoB' ? toPersonId!  : fromPersonId

  // Human-readable description of the relationship
  const directionLabel = () => {
    const relLabel = relType.toLowerCase().replace(/_/g, ' ')
    const toName   = selectedPerson?.fullName || selectedPerson?.nickname || 'selected person'
    if (!isDirectional) return `${fromPersonName} ↔ ${toName}: ${relLabel}`
    if (direction === 'AtoB') return `${fromPersonName} is ${relLabel} of ${toName}`
    return `${toName} is ${relLabel} of ${fromPersonName}`
  }

  const handleSubmit = async () => {
    if (!toPersonId) return
    setSaving(true)
    try {
      await api.post('/relationships', {
        personAId,
        personBId,
        type:           relType,
        isDirectional,
        startYearEst:   startYear ? parseInt(startYear) : undefined,
        isUncertain,
        confidenceScore: confidence,
        notes:          notes || undefined,
      })
      onCreated()
      onClose()
      // Reset
      setToPersonId(null)
      setSearch('')
      setNotes('')
      setStartYear('')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--paper)', borderRadius: 12, width: 500, maxWidth: 'calc(100vw - 48px)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(26,23,20,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 500 }}>
              Add relationship
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>
              Connecting from: <strong style={{ color: 'var(--ink)' }}>{fromPersonName}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink3)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: '18px 24px' }}>

          {/* Step 1: pick person */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>
              1. Who are they connected to?
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink3)', fontSize: 14 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name…"
                style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: 'var(--paper)', color: 'var(--ink)', outline: 'none' }}
              />
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
              {filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => setToPersonId(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', cursor: 'pointer',
                    background: toPersonId === p.id ? 'rgba(184,147,74,0.1)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e3edf7', color: '#1d5a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                    {(p.fullName || p.nickname || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{p.fullName || p.nickname || 'Unknown'}</div>
                    {p.birthYearEst && <div style={{ fontSize: 11, color: 'var(--ink3)' }}>b. c.{p.birthYearEst}</div>}
                  </div>
                  {toPersonId === p.id && <i className="ti ti-check" style={{ marginLeft: 'auto', color: 'var(--gold)', fontSize: 16 }} />}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 12, fontSize: 12, color: 'var(--ink3)', textAlign: 'center' }}>No people found</div>
              )}
            </div>
          </div>

          {/* Step 2: relationship type */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>
              2. What is the relationship?
            </div>
            <select
              value={relType}
              onChange={e => {
                setRelType(e.target.value)
                const partnerTypes = ['MARRIED','PARTNER','LIFE_PARTNER','ENGAGED','DIVORCED','SEPARATED','WIDOWED']
                const siblingTypes = ['SIBLING','HALF_SIBLING','STEP_SIBLING']
                setDirectional(!partnerTypes.includes(e.target.value) && !siblingTypes.includes(e.target.value))
              }}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: 'var(--paper)', color: 'var(--ink)', outline: 'none' }}
            >
              {RELATIONSHIP_TYPES.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.types.map(t => (
                    <option key={t} value={t}>{t.toLowerCase().replace(/_/g, ' ')}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Step 3: direction (only for directional types) */}
          {isDirectional && toPersonId && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>
                3. Which direction?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 6, border: `1px solid ${direction === 'AtoB' ? 'var(--gold)' : 'var(--border)'}`, background: direction === 'AtoB' ? 'rgba(184,147,74,0.07)' : 'transparent' }}>
                  <input type="radio" checked={direction === 'AtoB'} onChange={() => setDirection('AtoB')} style={{ accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 13 }}>
                    <strong>{fromPersonName}</strong> is {relType.toLowerCase().replace(/_/g, ' ')} of <strong>{selectedPerson?.fullName || selectedPerson?.nickname}</strong>
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 6, border: `1px solid ${direction === 'BtoA' ? 'var(--gold)' : 'var(--border)'}`, background: direction === 'BtoA' ? 'rgba(184,147,74,0.07)' : 'transparent' }}>
                  <input type="radio" checked={direction === 'BtoA'} onChange={() => setDirection('BtoA')} style={{ accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 13 }}>
                    <strong>{selectedPerson?.fullName || selectedPerson?.nickname}</strong> is {relType.toLowerCase().replace(/_/g, ' ')} of <strong>{fromPersonName}</strong>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: optional details */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>
              {isDirectional && toPersonId ? '4.' : '3.'} Details <span style={{ fontSize: 9, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>optional</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 4 }}>From year</div>
                <input
                  value={startYear}
                  onChange={e => setStartYear(e.target.value)}
                  placeholder="e.g. 1955"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: 'var(--paper)', color: 'var(--ink)', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 4 }}>Confidence</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="range" min={0} max={100} value={confidence} onChange={e => setConfidence(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 12, color: 'var(--ink3)', minWidth: 32 }}>{confidence}%</span>
                </div>
              </div>
            </div>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes or source citation… e.g. 'Confirmed by family records'"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: 'var(--paper)', color: 'var(--ink)', outline: 'none' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--ink2)', marginTop: 8 }}>
              <input type="checkbox" checked={isUncertain} onChange={e => setUncertain(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
              This relationship is uncertain or unconfirmed
            </label>
          </div>

          {/* Summary */}
          {toPersonId && (
            <div style={{ background: 'var(--paper2)', borderRadius: 6, padding: '10px 14px', fontSize: 12.5, color: 'var(--ink2)', borderLeft: '3px solid var(--gold)' }}>
              {directionLabel()}
              {isUncertain && <span style={{ color: 'var(--ink3)', marginLeft: 8 }}>· Uncertain</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--paper)', color: 'var(--ink2)', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!toPersonId || saving}
            style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: toPersonId ? 'var(--gold)' : 'var(--paper3)', color: toPersonId ? '#fff' : 'var(--ink3)', cursor: toPersonId ? 'pointer' : 'not-allowed', fontSize: 13 }}
          >
            {saving ? 'Saving…' : 'Add relationship'}
          </button>
        </div>

      </div>
    </div>
  )
}