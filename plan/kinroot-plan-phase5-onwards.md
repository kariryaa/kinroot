# Kinroot — Implementation Plan: Phase 5 Onwards
### Picking up after Phase 4 (React frontend working, graph rendering)

---

## Current State (End of Phase 4)

- ✅ PostgreSQL database with full schema (Prisma 6)
- ✅ Node.js/Express API with all routes (persons, relationships, memories, trees)
- ✅ React frontend with graph view, people list, detail panel
- ✅ Seed data (Sharma family, 7 people, relationships, memories)
- ✅ Add person modal (creates person but no relationship linking yet)
- ❌ No way to link people to each other in the UI
- ❌ No way to edit existing people or relationships
- ❌ No authentication
- ❌ No privacy enforcement

---

## Phase 5 — Relationship Management & Editing (Week 3, ~5 days)

This is the most important phase after the graph itself. Without it, the app
is read-only for everything except adding disconnected people.

### 5.1 Add Relationship UI

After a person is created (or when viewing an existing person), the user needs
to be able to say "this person is the biological parent of Ramesh Sharma."

**Backend — relationship creation is already done.** The `POST /api/relationships`
endpoint exists. Nothing to add.

**Frontend — Add Relationship Modal**

Create `apps/web/src/components/modals/AddRelationshipModal.tsx`:

```typescript
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
```

**Wire it into DetailPanel.tsx**

Add an "Add relationship" button to the panel header actions, and a delete
button on each relationship pill:

```typescript
// In DetailPanel.tsx, add to the panel header (after the edit button):
import { AddRelationshipModal } from '../modals/AddRelationshipModal'

// Add state:
const [showRelModal, setShowRelModal] = useState(false)

// Add button in the header actions area:
<button
  onClick={() => setShowRelModal(true)}
  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--paper)', color: 'var(--ink2)', cursor: 'pointer', fontSize: 11.5 }}
>
  <i className="ti ti-link" /> Connect
</button>

// Add modal at the bottom of the component return:
<AddRelationshipModal
  open={showRelModal}
  fromPersonId={personId!}
  fromPersonName={person.fullName || person.nickname || 'Unknown'}
  treeId={null}
  onClose={() => setShowRelModal(false)}
  onCreated={() => {
    setShowRelModal(false)
    // Re-fetch person to refresh relationships
    personsApi.get(personId!).then(setPerson)
  }}
/>
```

### 5.2 Edit Person

**Backend — already exists:** `PATCH /api/persons/:id`

**Frontend — Edit Person Modal**

Create `apps/web/src/components/modals/EditPersonModal.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { personsApi } from '../../api/persons'
import type { Person } from '../../types'

interface Props {
  open:      boolean
  person:    Person | null
  onClose:   () => void
  onUpdated: (p: Person) => void
}

export function EditPersonModal({ open, person, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    fullName: '', nickname: '', birthYearEst: '',
    birthPlace: '', deathYearEst: '', profession: '',
    languages: '', isDeceased: false, isUncertain: false,
    gender: '', pronouns: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!person) return
    setForm({
      fullName:     person.fullName    || '',
      nickname:     person.nickname    || '',
      birthYearEst: person.birthYearEst ? String(person.birthYearEst) : '',
      birthPlace:   person.birthPlace  || '',
      deathYearEst: person.deathYearEst ? String(person.deathYearEst) : '',
      profession:   person.profession  || '',
      languages:    person.languages?.join(', ') || '',
      isDeceased:   person.isDeceased  || false,
      isUncertain:  person.isUncertain || false,
      gender:       person.gender      || '',
      pronouns:     person.pronouns    || '',
    })
  }, [person])

  if (!open || !person) return null

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const updated = await personsApi.update(person.id, {
        fullName:     form.fullName     || undefined,
        nickname:     form.nickname     || undefined,
        birthYearEst: form.birthYearEst ? parseInt(form.birthYearEst) : undefined,
        birthPlace:   form.birthPlace   || undefined,
        deathYearEst: form.deathYearEst ? parseInt(form.deathYearEst) : undefined,
        profession:   form.profession   || undefined,
        languages:    form.languages ? form.languages.split(',').map(l => l.trim()).filter(Boolean) : [],
        isDeceased:   form.isDeceased,
        isUncertain:  form.isUncertain,
        gender:       form.gender       || undefined,
        pronouns:     form.pronouns     || undefined,
      })
      onUpdated(updated)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    border: '1px solid var(--border2)', borderRadius: 6,
    fontSize: 13, fontFamily: 'DM Sans, sans-serif',
    background: 'var(--paper)', color: 'var(--ink)', outline: 'none',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--paper)', borderRadius: 12, width: 480, maxWidth: 'calc(100vw - 48px)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(26,23,20,0.2)' }}>

        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 500 }}>
            Edit person
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink3)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Label>Full name</Label>
              <input style={inputStyle} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Full name…" />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Nickname / alias</Label>
              <input style={inputStyle} value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="Bauji, Dadi…" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Label>Gender</Label>
              <select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <Label>Pronouns</Label>
              <input style={inputStyle} value={form.pronouns} onChange={e => set('pronouns', e.target.value)} placeholder="he/him, she/her…" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Label>Birth year</Label>
              <input style={inputStyle} value={form.birthYearEst} onChange={e => set('birthYearEst', e.target.value)} placeholder="e.g. 1942" />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Birthplace</Label>
              <input style={inputStyle} value={form.birthPlace} onChange={e => set('birthPlace', e.target.value)} placeholder="Village, city…" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Label>Death year</Label>
              <input style={inputStyle} value={form.deathYearEst} onChange={e => set('deathYearEst', e.target.value)} placeholder="e.g. 1994" />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Occupation</Label>
              <input style={inputStyle} value={form.profession} onChange={e => set('profession', e.target.value)} placeholder="Farmer, teacher…" />
            </div>
          </div>

          <div>
            <Label>Languages</Label>
            <input style={inputStyle} value={form.languages} onChange={e => set('languages', e.target.value)} placeholder="Hindi, English, Haryanvi (comma separated)" />
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--ink2)' }}>
              <input type="checkbox" checked={form.isDeceased} onChange={e => set('isDeceased', e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
              Deceased
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--ink2)' }}>
              <input type="checkbox" checked={form.isUncertain} onChange={e => set('isUncertain', e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
              Dates / details uncertain
            </label>
          </div>
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--paper)', color: 'var(--ink2)', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: 'var(--gold)', color: '#fff', cursor: 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 5 }}>{children}</div>
}
```

**Wire into DetailPanel.tsx:**

```typescript
import { EditPersonModal } from '../modals/EditPersonModal'

// Add state:
const [showEditModal, setShowEditModal] = useState(false)

// Wire the existing Edit button:
<button onClick={() => setShowEditModal(true)} ...>
  <i className="ti ti-pencil" /> Edit
</button>

// Add modal:
<EditPersonModal
  open={showEditModal}
  person={person}
  onClose={() => setShowEditModal(false)}
  onUpdated={updated => {
    setPerson(updated)
    setShowEditModal(false)
  }}
/>
```

### 5.3 Add Memory

Add a working "Add memory" button to the detail panel memories section:

```typescript
// In DetailPanel.tsx, replace the placeholder "Add memory" button:
import { memoriesApi } from '../../api/memories'

const [newMemory, setNewMemory]       = useState('')
const [memAttrib, setMemAttrib]       = useState('')
const [memUncertain, setMemUncertain] = useState(false)
const [addingMem, setAddingMem]       = useState(false)
const [showMemForm, setShowMemForm]   = useState(false)

const handleAddMemory = async () => {
  if (!newMemory.trim() || !personId) return
  setAddingMem(true)
  try {
    await memoriesApi.create({
      personId,
      content:     newMemory.trim(),
      attribution: memAttrib || undefined,
      isUncertain: memUncertain,
    })
    // Re-fetch person to show new memory
    const updated = await personsApi.get(personId)
    setPerson(updated)
    setNewMemory('')
    setMemAttrib('')
    setMemUncertain(false)
    setShowMemForm(false)
  } finally {
    setAddingMem(false)
  }
}

// Replace the Add memory button with:
{showMemForm ? (
  <div style={{ background: 'var(--paper2)', borderRadius: 6, padding: 12, marginTop: 8 }}>
    <textarea
      value={newMemory}
      onChange={e => setNewMemory(e.target.value)}
      placeholder='"She used to sing folk songs every evening…"'
      rows={3}
      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', background: 'var(--paper)', color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
    />
    <input
      value={memAttrib}
      onChange={e => setMemAttrib(e.target.value)}
      placeholder="Source / attribution (optional)"
      style={{ width: '100%', marginTop: 6, padding: '6px 10px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12, fontFamily: 'DM Sans, sans-serif', background: 'var(--paper)', color: 'var(--ink)', outline: 'none' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)', cursor: 'pointer' }}>
        <input type="checkbox" checked={memUncertain} onChange={e => setMemUncertain(e.target.checked)} />
        Uncertain
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setShowMemForm(false)} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border2)', background: 'var(--paper)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        <button onClick={handleAddMemory} disabled={addingMem || !newMemory.trim()} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: 'var(--gold)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
          {addingMem ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  </div>
) : (
  <button
    onClick={() => setShowMemForm(true)}
    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 6, border: '1px dashed var(--border2)', background: 'transparent', color: 'var(--ink3)', cursor: 'pointer', fontSize: 12, marginTop: 4 }}
  >
    <i className="ti ti-plus" /> Add memory
  </button>
)}
```

### 5.4 Delete Relationship

In DetailPanel, add a small delete button to each relationship pill:

```typescript
const handleDeleteRelationship = async (relId: string) => {
  if (!confirm('Remove this relationship?')) return
  await api.delete(`/relationships/${relId}`)
  const updated = await personsApi.get(personId!)
  setPerson(updated)
}

// In each relationship pill, add:
<button
  onClick={e => { e.stopPropagation(); handleDeleteRelationship(rel.id) }}
  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', padding: 2 }}
>
  <i className="ti ti-x" style={{ fontSize: 11 }} />
</button>
```

---

## Phase 6 — Authentication with Clerk (Week 4, ~2 days)

### 6.1 Create a Clerk account and app

1. Go to https://clerk.com and sign up (free)
2. Create a new application — choose "Email" as the sign-in method
3. From the Clerk dashboard, copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 6.2 Install Clerk

```bash
# Frontend
cd apps/web
pnpm add @clerk/clerk-react

# Backend
cd apps/api
pnpm add @clerk/express
```

### 6.3 Frontend — wrap app with ClerkProvider

In `apps/web/.env.local`, add:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

In `apps/web/src/main.tsx`:
```typescript
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
```

In `apps/web/src/App.tsx`, wrap the main content with auth gate:
```typescript
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'

// In the return, replace the main content with:
<>
  <SignedIn>
    {/* existing app content */}
  </SignedIn>
  <SignedOut>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--paper)' }}>
      <SignIn />
    </div>
  </SignedOut>
</>
```

Add a sign-out button to the sidebar footer:
```typescript
import { useClerk, useUser } from '@clerk/clerk-react'

const { signOut } = useClerk()
const { user }    = useUser()

// Replace the hardcoded "Ravi Sharma" footer with:
<div onClick={() => signOut()} style={{ cursor: 'pointer', ... }}>
  <div style={{ ...avatarStyle }}>{user?.firstName?.[0] || 'U'}</div>
  <div>
    <div style={{ color: '#9a9288', fontSize: 12 }}>{user?.fullName || user?.emailAddresses[0]?.emailAddress}</div>
    <div style={{ fontSize: 10, color: '#4a4238' }}>Sign out</div>
  </div>
</div>
```

### 6.4 Backend — verify Clerk tokens

In `apps/api/.env`, add:
```
CLERK_SECRET_KEY=sk_test_your_key_here
```

In `apps/api/src/index.ts`, add Clerk middleware:
```typescript
import { clerkMiddleware, requireAuth } from '@clerk/express'

app.use(clerkMiddleware())

// Protect all /api routes
app.use('/api', requireAuth())
```

Pass the auth token from frontend to API:

In `apps/web/src/api/client.ts`:
```typescript
import { useAuth } from '@clerk/clerk-react'

// This won't work directly in axios — use a custom hook instead:
// Create apps/web/src/hooks/useApi.ts:

import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { api } from '../api/client'

export function useApiAuth() {
  const { getToken } = useAuth()
  useEffect(() => {
    const interceptor = api.interceptors.request.use(async config => {
      const token = await getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })
    return () => api.interceptors.request.eject(interceptor)
  }, [getToken])
}
```

Call `useApiAuth()` once at the top of `App.tsx`:
```typescript
import { useApiAuth } from './hooks/useApiAuth'

export default function App() {
  useApiAuth()  // sets up the auth token on every API request
  // ...
}
```

### 6.5 Switching from Clerk to self-hosted JWT later

When you're ready to drop Clerk, the swap is clean:

**Backend:** Replace `@clerk/express` middleware with:
```typescript
import jwt from 'jsonwebtoken'

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

**Frontend:** Replace `@clerk/clerk-react` with a simple auth context that
stores a JWT in memory (not localStorage — see security note in Phase 8).

Everything else (API routes, frontend components) stays identical because
the auth token mechanism is the same — just Bearer token in the
Authorization header.

---

## Phase 7 — Seed Data & Local Testing (Updated)

The original seed was minimal. This version includes gender fields (needed for
node colour coding), more memories, a second tree, and a link between trees
to demonstrate the cross-tree discovery feature.

### Updated seed file: apps/api/prisma/seed.ts

```typescript
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean all data — safe to re-run
  await db.memory.deleteMany()
  await db.relationship.deleteMany()
  await db.personTree.deleteMany()
  await db.media.deleteMany()
  await db.person.deleteMany()
  await db.tree.deleteMany()
  await db.user.deleteMany()

  // ─── User ───────────────────────────────────
  const user = await db.user.create({
    data: { name: 'Arjun Sharma', email: 'arjun@example.com' },
  })
  console.log('✓ User:', user.name)

  // ─── Tree 1: Sharma family ───────────────────
  const sharmaTree = await db.tree.create({
    data: {
      name: 'Sharma family',
      description: 'Paternal lineage from Hisar, Haryana',
      color: '#b8934a',
      ownerId: user.id,
    },
  })

  // Generation 1
  const gopal = await db.person.create({ data: {
    fullName: 'Gopal Sharma', nickname: 'Bauji',
    gender: 'Male',
    birthYearEst: 1928, birthPlace: 'Hisar, Haryana',
    deathYearEst: 1994, deathPlace: 'Hisar, Haryana',
    isDeceased: true, isUncertain: true, confidenceScore: 65,
    profession: 'Travelling merchant',
    languages: ['Hindi', 'Haryanvi'],
    addedById: user.id,
    trees: { create: { treeId: sharmaTree.id } },
  }})

  const savitri = await db.person.create({ data: {
    fullName: 'Savitri Bai', nickname: 'Dadi',
    gender: 'Female',
    birthYearEst: 1932, birthPlace: 'Rohtak, Haryana',
    deathYearEst: 2008, deathPlace: 'Hisar, Haryana',
    isDeceased: true, isUncertain: true, confidenceScore: 70,
    languages: ['Hindi', 'Haryanvi'],
    addedById: user.id,
    trees: { create: { treeId: sharmaTree.id } },
  }})

  // Generation 2
  const ramesh = await db.person.create({ data: {
    fullName: 'Ramesh Sharma', gender: 'Male',
    birthYearEst: 1958, birthPlace: 'Hisar, Haryana',
    isDeceased: false, isLiving: true, confidenceScore: 100,
    profession: 'Retired government officer',
    languages: ['Hindi', 'Haryanvi', 'English'],
    addedById: user.id,
    trees: { create: { treeId: sharmaTree.id } },
  }})

  const priya = await db.person.create({ data: {
    fullName: 'Priya Kumar', maidenName: 'Kumar', gender: 'Female',
    birthYearEst: 1962, birthPlace: 'Karnal, Haryana',
    isDeceased: false, isLiving: true, confidenceScore: 100,
    languages: ['Hindi', 'Punjabi'],
    addedById: user.id,
    trees: { create: { treeId: sharmaTree.id } },
  }})

  const meena = await db.person.create({ data: {
    fullName: 'Meena Devi', gender: 'Female',
    birthYearEst: 1960, birthPlace: 'Hisar, Haryana',
    isDeceased: false, isLiving: true, confidenceScore: 95,
    profession: 'School teacher',
    languages: ['Hindi', 'Haryanvi'],
    addedById: user.id,
    trees: { create: { treeId: sharmaTree.id } },
  }})

  // Generation 3
  const arjun = await db.person.create({ data: {
    fullName: 'Arjun Sharma', gender: 'Male',
    birthYearEst: 1988, birthPlace: 'Hisar, Haryana',
    isDeceased: false, isLiving: true, confidenceScore: 100,
    profession: 'Software engineer',
    languages: ['Hindi', 'English', 'Haryanvi'],
    addedById: user.id,
    trees: { create: { treeId: sharmaTree.id } },
  }})

  const kavya = await db.person.create({ data: {
    fullName: 'Kavya Sharma', gender: 'Female',
    birthYearEst: 1991, birthPlace: 'Hisar, Haryana',
    isDeceased: false, isLiving: true, confidenceScore: 100,
    languages: ['Hindi', 'English'],
    addedById: user.id,
    trees: { create: { treeId: sharmaTree.id } },
  }})

  const unknown = await db.person.create({ data: {
    nickname: "Unknown man from grandfather's village",
    birthYearEst: 1925,
    isDeceased: true, isUncertain: true, confidenceScore: 20,
    addedById: user.id,
    trees: { create: { treeId: sharmaTree.id } },
  }})

  // Set Arjun as the root person of this tree
  await db.tree.update({
    where: { id: sharmaTree.id },
    data: { rootPersonId: arjun.id },
  })
  console.log('✓ Sharma family tree created (8 people)')

  // ─── Tree 2: Kumar family (Priya's side) ────
  const kumarTree = await db.tree.create({
    data: {
      name: 'Kumar lineage',
      description: "Priya's maternal family from Karnal",
      color: '#2a6b6a',
      ownerId: user.id,
    },
  })

  const bhupender = await db.person.create({ data: {
    fullName: 'Bhupender Kumar', nickname: 'Nana',
    gender: 'Male',
    birthYearEst: 1935, birthPlace: 'Karnal, Haryana',
    deathYearEst: 2001,
    isDeceased: true, isUncertain: true, confidenceScore: 60,
    profession: 'Farmer',
    languages: ['Hindi', 'Punjabi'],
    addedById: user.id,
    trees: { create: { treeId: kumarTree.id } },
  }})

  const kamla = await db.person.create({ data: {
    fullName: 'Kamla Devi', nickname: 'Nani',
    gender: 'Female',
    birthYearEst: 1938, birthPlace: 'Karnal, Haryana',
    isDeceased: false, isLiving: true, confidenceScore: 80,
    languages: ['Hindi', 'Punjabi'],
    addedById: user.id,
    trees: { create: { treeId: kumarTree.id } },
  }})

  // Priya belongs to BOTH trees
  await db.personTree.create({
    data: { personId: priya.id, treeId: kumarTree.id },
  })

  await db.tree.update({
    where: { id: kumarTree.id },
    data: { rootPersonId: priya.id },
  })
  console.log('✓ Kumar lineage tree created')

  // ─── Relationships: Sharma tree ─────────────

  await db.relationship.createMany({ data: [
    // Gopal & Savitri married
    { personAId: gopal.id, personBId: savitri.id, type: 'MARRIED',
      startYearEst: 1955, isDirectional: false, isUncertain: true, confidenceScore: 75,
      notes: 'Arranged marriage. Exact date not confirmed.' },

    // Gopal → children
    { personAId: gopal.id, personBId: ramesh.id, type: 'BIOLOGICAL_PARENT', isDirectional: true, confidenceScore: 100 },
    { personAId: gopal.id, personBId: meena.id,  type: 'BIOLOGICAL_PARENT', isDirectional: true, confidenceScore: 95 },

    // Savitri → children
    { personAId: savitri.id, personBId: ramesh.id, type: 'BIOLOGICAL_PARENT', isDirectional: true, confidenceScore: 100 },
    { personAId: savitri.id, personBId: meena.id,  type: 'BIOLOGICAL_PARENT', isDirectional: true, confidenceScore: 95 },

    // Siblings
    { personAId: ramesh.id, personBId: meena.id, type: 'SIBLING', isDirectional: false, confidenceScore: 100 },

    // Ramesh & Priya married
    { personAId: ramesh.id, personBId: priya.id, type: 'MARRIED', startYearEst: 1985, isDirectional: false, confidenceScore: 100 },

    // Ramesh → children
    { personAId: ramesh.id, personBId: arjun.id, type: 'BIOLOGICAL_PARENT', isDirectional: true, confidenceScore: 100 },
    { personAId: ramesh.id, personBId: kavya.id, type: 'BIOLOGICAL_PARENT', isDirectional: true, confidenceScore: 100 },

    // Priya → children
    { personAId: priya.id, personBId: arjun.id, type: 'BIOLOGICAL_PARENT', isDirectional: true, confidenceScore: 100 },
    { personAId: priya.id, personBId: kavya.id, type: 'BIOLOGICAL_PARENT', isDirectional: true, confidenceScore: 100 },

    // Arjun & Kavya siblings
    { personAId: arjun.id, personBId: kavya.id, type: 'SIBLING', isDirectional: false, confidenceScore: 100 },

    // Unknown — possibly related to Gopal
    { personAId: unknown.id, personBId: gopal.id, type: 'UNKNOWN',
      isDirectional: false, isUncertain: true, confidenceScore: 20,
      notes: 'Possibly from the same village. No confirmed relationship.' },
  ]})

  // ─── Relationships: Kumar tree ───────────────

  await db.relationship.createMany({ data: [
    { personAId: bhupender.id, personBId: kamla.id, type: 'MARRIED',
      startYearEst: 1958, isDirectional: false, confidenceScore: 90 },
    { personAId: bhupender.id, personBId: priya.id, type: 'BIOLOGICAL_PARENT',
      isDirectional: true, confidenceScore: 100 },
    { personAId: kamla.id, personBId: priya.id, type: 'BIOLOGICAL_PARENT',
      isDirectional: true, confidenceScore: 100 },
  ]})

  console.log('✓ All relationships created')

  // ─── Memories ────────────────────────────────

  await db.memory.createMany({ data: [
    {
      personId: gopal.id,
      content: 'Used to travel village-to-village selling handmade tools. Would be gone for weeks at a time.',
      attribution: 'Ramesh Sharma (son)', isUncertain: false, addedById: user.id,
    },
    {
      personId: gopal.id,
      content: "Nobody remembers his real birthday. The date in old records may have been guessed by a clerk.",
      attribution: 'Family oral history', isUncertain: true, addedById: user.id,
    },
    {
      personId: gopal.id,
      content: 'Possibly traveled to Bombay in the early 1950s before settling back in Hisar — no one is certain why.',
      attribution: 'Meena Devi (daughter)', isUncertain: true, addedById: user.id,
    },
    {
      personId: savitri.id,
      content: 'Could recite dozens of folk songs from memory. Taught them to all her grandchildren.',
      attribution: 'Meena Devi (daughter)', isUncertain: false, addedById: user.id,
    },
    {
      personId: savitri.id,
      content: 'Made the best makki ki roti in the entire village — people used to come from three streets away.',
      attribution: 'Ramesh Sharma', isUncertain: false, addedById: user.id,
    },
    {
      personId: ramesh.id,
      content: 'Spent 30 years in the state government. Retired as a senior clerk. Never once took a bribe.',
      attribution: 'Self-reported', isUncertain: false, addedById: user.id,
    },
    {
      personId: arjun.id,
      content: 'Grew up in the old haveli near the grain market. Still remembers the smell of mustard fields.',
      attribution: 'Self', isUncertain: false, addedById: user.id,
    },
    {
      personId: bhupender.id,
      content: 'Lost most of his farmland in a flood around 1975. Rebuilt from scratch. Never complained about it.',
      attribution: 'Kamla Devi (wife)', isUncertain: false, addedById: user.id,
    },
    {
      personId: unknown.id,
      content: "Grandfather once mentioned 'a man from our village who went to Lahore before partition and never came back.' Could be this person.",
      attribution: 'Arjun Sharma', isUncertain: true, addedById: user.id,
    },
  ]})
  console.log('✓ Memories created')

  console.log('\n✅ Seed complete!')
  console.log(`   User ID:       ${user.id}`)
  console.log(`   Sharma Tree:   ${sharmaTree.id}`)
  console.log(`   Kumar Tree:    ${kumarTree.id}`)
  console.log(`   Arjun ID:      ${arjun.id}`)
  console.log(`   Priya ID:      ${priya.id}  ← in both trees`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
```

Run it:
```bash
cd apps/api
npx prisma migrate reset   # wipes DB, re-runs migrations, then seed
```

---

## Phase 8 — Privacy Enforcement (Week 4–5, ~3 days)

### 8.1 Attach user ID to all created entities

```typescript
// In persons.ts router, POST handler:
const userId = (req as any).auth?.userId

const person = await db.person.create({
  data: { ...fields, addedById: userId },
})
```

Do the same for relationships and memories.

### 8.2 Visibility filter helper

In `apps/api/src/db.ts`:
```typescript
export function visibilityFilter(userId?: string) {
  if (!userId) return { visibility: 'PUBLIC' as const }
  return {
    OR: [
      { visibility: 'PUBLIC' as const },
      { addedById: userId },
    ],
  }
}
```

Apply to all list queries:
```typescript
const userId = (req as any).auth?.userId
const persons = await db.person.findMany({
  where: {
    ...visibilityFilter(userId),
    // other filters
  }
})
```

### 8.3 Living person protection

Automatically hide sensitive fields for living people when accessed by
non-owners:
```typescript
function sanitizePerson(person: any, requestingUserId?: string) {
  const isOwner = person.addedById === requestingUserId
  if (person.isDeceased || isOwner) return person
  // Strip contact info for living people
  return {
    ...person,
    phone:   undefined,
    email:   undefined,
  }
}
```

---

## Phase 9 — Export, Search & Polish (Week 5–6)

### 9.1 Fuzzy search (frontend)

```bash
cd apps/web && pnpm add fuse.js
```

In `PeoplePage.tsx`, replace the filter with:
```typescript
import Fuse from 'fuse.js'

const fuse = useMemo(() => new Fuse(persons, {
  keys: ['fullName', 'nickname', 'aliases', 'birthPlace', 'profession'],
  threshold: 0.35,
  includeScore: true,
}), [persons])

const filtered = search
  ? fuse.search(search).map(r => r.item)
  : persons
```

### 9.2 JSON export

Already in `trees.ts` router as `GET /api/trees/:id/export`. Add a button
in the sidebar or toolbar:
```typescript
const handleExport = async () => {
  const url = `${import.meta.env.VITE_API_URL}/trees/${activeTreeId}/export`
  const link = document.createElement('a')
  link.href = url
  link.download = 'kinroot-export.json'
  link.click()
}
```

### 9.3 Timeline view

The Timeline page (`PeoplePage` equivalent) fetches all persons with dates,
sorts chronologically, and renders as a vertical list. The design is already
in the prototype HTML from Phase 1 — port it to React with real data.

### 9.4 People list improvements
- Sort by: name, birth year, date added
- Filter by: living/deceased, uncertain, tree
- Click row → navigate to graph view with that person selected

---

## Phase 10 — Self-Hosted Auth (When Ready, ~3 days)

When you want to drop Clerk and run fully self-hosted:

### 10.1 Backend

```bash
cd apps/api
pnpm add bcryptjs jsonwebtoken
pnpm add -D @types/bcryptjs @types/jsonwebtoken
```

Add a `User` auth model (password hash):
```prisma
model User {
  // existing fields...
  passwordHash String?
}
```

Create `apps/api/src/routes/auth.ts`:
```typescript
import { Router }   from 'express'
import bcrypt       from 'bcryptjs'
import jwt          from 'jsonwebtoken'
import { db }       from '../db'

export const authRouter = Router()

// POST /auth/register
authRouter.post('/register', async (req, res) => {
  const { email, name, password } = req.body
  const hash = await bcrypt.hash(password, 12)
  const user = await db.user.create({ data: { email, name, passwordHash: hash } })
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
})

// POST /auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await db.user.findUnique({ where: { email } })
  if (!user?.passwordHash) return res.status(401).json({ error: 'Invalid credentials' })
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
})
```

Replace Clerk middleware with JWT middleware:
```typescript
export function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET!)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

### 10.2 Frontend

Replace Clerk components with a simple login form. Store the JWT in memory
(a React context), not in localStorage (XSS risk). For "remember me",
use an HttpOnly cookie via the API instead.

---

## Milestones Checklist (Updated)

- [x] Phase 0 — Mac fully set up
- [x] Phase 1 — Monorepo scaffolded
- [x] Phase 2 — Database schema + Prisma
- [x] Phase 3 — API with all routes
- [x] Phase 4 — React app, graph view, people list
- [ ] Phase 5a — Add relationship modal (connect people)
- [ ] Phase 5b — Edit person modal
- [ ] Phase 5c — Add memory from UI
- [ ] Phase 5d — Delete relationship from UI
- [ ] Phase 6  — Clerk auth (login/logout working)
- [ ] Phase 7  — Updated seed with 2 trees, gender, richer memories
- [ ] Phase 8  — Privacy enforcement (visibility filter, living protection)
- [ ] Phase 9a — Fuzzy search
- [ ] Phase 9b — JSON export
- [ ] Phase 9c — Timeline view with real data
- [ ] Phase 10 — Self-hosted JWT auth replaces Clerk

---

## Quick Reference — Which Phase Has What

| Feature                          | Phase |
|----------------------------------|-------|
| Add a person                     | ✅ 4  |
| Link people (add relationship)   | 5a    |
| Edit person details              | 5b    |
| Add memory from UI               | 5c    |
| Delete a relationship            | 5d    |
| Login / logout                   | 6     |
| Updated seed data (2 trees)      | 7     |
| Privacy / visibility filters     | 8     |
| Fuzzy search                     | 9a    |
| Export to JSON                   | 9b    |
| Timeline view                    | 9c    |
| Self-hosted auth (no Clerk)      | 10    |
