import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../../api/client'
import { memoriesApi } from '../../api/memories'
import { personsApi } from '../../api/persons'
import type { Person, Relationship } from '../../types'
import { AddRelationshipModal } from '../modals/AddRelationshipModal'
import { EditPersonModal } from '../modals/EditPersonModal'

interface DetailPanelProps {
  personId: string | null
  treeId: string | null
  onDataChanged?: () => void
  onSelectPerson?: (id: string) => void
}

type RelationshipWithOther = Relationship & { other?: Person }

function initials(person: Person) {
  const name = person.fullName || person.nickname || ''
  return name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function yearDisplay(person: Person) {
  const birth = person.birthYearEst ? `c.${person.birthYearEst}` : person.birthDateExact ? new Date(person.birthDateExact).getFullYear().toString() : null
  const death = person.deathYearEst ? `${person.deathYearEst}` : person.deathDateExact ? new Date(person.deathDateExact).getFullYear().toString() : null
  if (birth && death) return `${birth} - ${death}`
  if (birth) return `b. ${birth}`
  return null
}

function relationshipLabel(rel: RelationshipWithOther, personId: string) {
  const base = rel.type.toLowerCase().replace(/_/g, ' ')
  if (rel.isInferred) return `${base} (inferred)`
  if (!rel.isDirectional) return base
  return rel.personAId === personId ? `${base} of` : `has ${base}`
}

export function DetailPanel({ personId, treeId, onDataChanged, onSelectPerson }: DetailPanelProps) {
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRelModal, setShowRelModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMemForm, setShowMemForm] = useState(false)
  const [newMemory, setNewMemory] = useState('')
  const [memoryAttribution, setMemoryAttribution] = useState('')
  const [memoryUncertain, setMemoryUncertain] = useState(false)
  const [addingMemory, setAddingMemory] = useState(false)
  const [quickAdding, setQuickAdding] = useState<string | null>(null)

  const refreshPerson = async () => {
    if (!personId) return null
    const updated = await personsApi.get(personId)
    setPerson(updated)
    return updated
  }

  useEffect(() => {
    if (!personId) {
      setPerson(null)
      return
    }
    setLoading(true)
    personsApi.get(personId)
      .then(setPerson)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [personId])

  const handleRelationshipCreated = async () => {
    setShowRelModal(false)
    await refreshPerson()
    onDataChanged?.()
  }

  const handleDeleteRelationship = async (relationshipId: string) => {
    if (!window.confirm('Remove this relationship?')) return
    await api.delete(`/relationships/${relationshipId}`)
    await refreshPerson()
    onDataChanged?.()
  }

  const handleAddMemory = async () => {
    if (!newMemory.trim() || !personId) return
    setAddingMemory(true)
    try {
      await memoriesApi.create({
        personId,
        content: newMemory.trim(),
        attribution: memoryAttribution.trim() || undefined,
        isUncertain: memoryUncertain,
      })
      await refreshPerson()
      setNewMemory('')
      setMemoryAttribution('')
      setMemoryUncertain(false)
      setShowMemForm(false)
      onDataChanged?.()
    } finally {
      setAddingMemory(false)
    }
  }

  const handleDeleteMemory = async (memoryId: string) => {
    if (!window.confirm('Remove this memory?')) return
    await memoriesApi.delete(memoryId)
    await refreshPerson()
    onDataChanged?.()
  }

  const createPerson = (data: Partial<Person>) =>
    personsApi.create({ ...data, treeId: treeId || undefined } as Partial<Person> & { treeId?: string })

  const createRelationship = (personAId: string, personBId: string, type: string, isDirectional: boolean) =>
    api.post('/relationships', {
      personAId,
      personBId,
      type,
      isDirectional,
      confidenceScore: 100,
    })

  const handleQuickAdd = async (kind: 'parents' | 'child' | 'sibling' | 'partner' | 'pet' | 'friend') => {
    if (!personId || !person) return
    setQuickAdding(kind)
    try {
      const name = person.fullName || person.nickname || 'this person'
      let createdId: string | null = null

      if (kind === 'parents') {
        const father = await createPerson({ fullName: `Unknown father of ${name}`, sex: 'Male' })
        const mother = await createPerson({ fullName: `Unknown mother of ${name}`, sex: 'Female' })
        await createRelationship(father.id, personId, 'BIOLOGICAL_PARENT', true)
        await createRelationship(mother.id, personId, 'BIOLOGICAL_PARENT', true)
        await createRelationship(father.id, mother.id, 'PARTNER', false)
        createdId = father.id
      } else if (kind === 'child') {
        const child = await createPerson({ fullName: `Unknown child of ${name}`, sex: 'Other' })
        await createRelationship(personId, child.id, 'BIOLOGICAL_PARENT', true)
        createdId = child.id
      } else if (kind === 'sibling') {
        const sibling = await createPerson({ fullName: `Unknown sibling of ${name}`, sex: 'Other' })
        const parentRels = allRelationships.filter(rel => rel.type === 'BIOLOGICAL_PARENT' && rel.personBId === personId && rel.personAId)
        if (parentRels.length > 0) {
          await Promise.all(parentRels.map(rel => createRelationship(rel.personAId, sibling.id, 'BIOLOGICAL_PARENT', true)))
        } else {
          await createRelationship(personId, sibling.id, 'SIBLING', false)
        }
        createdId = sibling.id
      } else if (kind === 'partner') {
        const partner = await createPerson({ fullName: `Partner of ${name}`, sex: 'Other' })
        await createRelationship(personId, partner.id, 'PARTNER', false)
        createdId = partner.id
      } else if (kind === 'pet') {
        const pet = await createPerson({ fullName: `Pet of ${name}`, sex: 'Other' })
        await createRelationship(personId, pet.id, 'PET', false)
        createdId = pet.id
      } else if (kind === 'friend') {
        const friend = await createPerson({ fullName: `Friend of ${name}`, sex: 'Other' })
        await createRelationship(personId, friend.id, 'FRIEND', false)
        createdId = friend.id
      }

      await refreshPerson()
      onDataChanged?.()
      if (createdId) onSelectPerson?.(createdId)
    } finally {
      setQuickAdding(null)
    }
  }

  if (!personId) return (
    <div style={{ width: 320, borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#8a8078', padding: 24 }}>
        <i className="ti ti-user" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }} />
        <div style={{ fontSize: 12 }}>Click a person to see their profile</div>
      </div>
    </div>
  )

  if (loading || !person) return (
    <div style={{ width: 320, borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#8a8078', fontSize: 12 }}>Loading...</div>
    </div>
  )

  const allRelationships: RelationshipWithOther[] = [
    ...(person.relationshipsA || []).map(rel => ({ ...rel, other: rel.personB })),
    ...(person.relationshipsB || []).map(rel => ({ ...rel, other: rel.personA })),
  ]
  const displaySex = person.sex || person.gender
  const palette = displaySex === 'Male' ? { bg: '#e3edf7', color: '#1d5a8a' }
    : displaySex === 'Female' ? { bg: '#f5e8f0', color: '#7a1d5a' }
    : { bg: '#fffdfa', color: '#4a4540' }

  return (
    <>
      <aside style={{
        width: 320,
        minWidth: 320,
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--paper)',
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: palette.bg,
              color: palette.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 22,
              fontWeight: 500,
              flexShrink: 0,
            }}>
              {initials(person)}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setShowEditModal(true)}
                title="Edit person"
                style={actionButtonStyle}
              >
                <i className="ti ti-pencil" /> Edit
              </button>
              <button
                onClick={() => setShowRelModal(true)}
                title="Add relationship"
                style={actionButtonStyle}
              >
                <i className="ti ti-link" /> Connect
              </button>
            </div>
          </div>

          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2 }}>
            {person.fullName || person.nickname || 'Unknown person'}
          </div>

          {person.nickname && person.fullName && (
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>"{person.nickname}"</div>
          )}

          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
            {[yearDisplay(person), person.isDeceased ? 'Deceased' : person.isLiving ? 'Living' : null]
              .filter(Boolean).join(' · ')}
          </div>

          {person.isUncertain && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 6,
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 20,
              border: '1px dashed #8a8078',
              color: '#8a8078',
            }}>
              <i className="ti ti-help" style={{ fontSize: 11 }} />
              Uncertain information
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            color: 'var(--ink3)',
            padding: '6px 10px',
            background: 'var(--paper2)',
            borderRadius: 6,
            border: '1px solid var(--border)',
            marginBottom: 16,
          }}>
            <i className="ti ti-shield-lock" style={{ fontSize: 13, color: 'var(--teal)' }} />
            Private - visible only to you
          </div>

          <Section title="Identity">
            <Field label="Full name" value={person.fullName} />
            <Field label="Nickname" value={person.nickname} />
            <Field label="Born" value={yearDisplay(person)} uncertain={person.isUncertain && !person.birthDateExact} />
            <Field label="Birthplace" value={person.birthPlace} />
            <Field label="Died" value={person.deathPlace ? [person.deathYearEst, person.deathPlace].filter(Boolean).join(', ') : person.deathYearEst ? String(person.deathYearEst) : null} />
            <Field label="Sex" value={displaySex} />
            <Field label="Occupation" value={person.profession} />
            <Field label="Company" value={person.company} />
            <Field label="Location" value={person.currentLocation} />
            <Field label="Address" value={person.currentAddress} />
            {person.languages.length > 0 && (
              <Field label="Languages" value={person.languages.join(', ')} />
            )}
            {person.confidenceScore != null && (
              <ConfidenceBar value={person.confidenceScore} />
            )}
          </Section>

          {(person.interests || person.activities || person.bioNotes) && (
            <Section title="Biography">
              <Field label="Interests" value={person.interests} />
              <Field label="Activities" value={person.activities} />
              <Field label="Notes" value={person.bioNotes} />
            </Section>
          )}

          <Section title="Relationships">
            {allRelationships.length === 0 ? (
              <EmptyLine>No relationships recorded yet.</EmptyLine>
            ) : allRelationships.map(rel => {
              const other = rel.other
              if (!other) return null
              const otherName = other.fullName || other.nickname || 'Unknown'
              const otherInitials = otherName.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
              return (
                <div key={rel.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 8px 7px 10px',
                  background: 'var(--paper2)',
                  borderRadius: 6,
                  marginBottom: 5,
                  border: rel.isUncertain ? '1px dashed var(--border2)' : '1px solid transparent',
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#ede9e1',
                    color: '#4a4540',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}>{otherInitials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{otherName}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>
                      {relationshipLabel(rel, person.id)}
                      {rel.confidenceScore != null && <span> · {rel.confidenceScore}%</span>}
                    </div>
                  </div>
                  {rel.isUncertain && (
                    <i className="ti ti-help" title="Uncertain relationship" style={{ fontSize: 12, color: 'var(--ink3)' }} />
                  )}
                  {rel.isInferred ? (
                    <i className="ti ti-sparkles" title="Inferred from shared biological parent(s)" style={{ fontSize: 12, color: 'var(--gold)' }} />
                  ) : (
                    <button
                      onClick={event => { event.stopPropagation(); handleDeleteRelationship(rel.id) }}
                      title="Delete relationship"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', padding: 2, display: 'flex' }}
                    >
                      <i className="ti ti-x" style={{ fontSize: 12 }} />
                    </button>
                  )}
                </div>
              )
            })}
          </Section>

          <Section title="Memories & stories">
            {(person.memories || []).map(memory => (
              <div key={memory.id} style={{
                background: 'var(--paper2)',
                borderRadius: 6,
                padding: '10px 12px',
                marginBottom: 8,
                borderLeft: `3px solid ${memory.isUncertain ? 'var(--ink3)' : 'var(--gold)'}`,
                position: 'relative',
              }}>
                <button
                  onClick={() => handleDeleteMemory(memory.id)}
                  title="Delete memory"
                  style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', padding: 2 }}
                >
                  <i className="ti ti-x" style={{ fontSize: 12 }} />
                </button>
                <div style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: 13.5,
                  fontStyle: 'italic',
                  color: 'var(--ink2)',
                  lineHeight: 1.5,
                  paddingRight: 14,
                }}>"{memory.content}"</div>
                {(memory.attribution || memory.isUncertain) && (
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 5 }}>
                    {memory.attribution ? `- ${memory.attribution}` : 'Unattributed'}
                    {memory.isUncertain && <span style={{ marginLeft: 6 }}>· Uncertain</span>}
                  </div>
                )}
              </div>
            ))}

            {showMemForm ? (
              <div style={{ background: 'var(--paper2)', borderRadius: 6, padding: 12, marginTop: 8 }}>
                <textarea
                  value={newMemory}
                  onChange={event => setNewMemory(event.target.value)}
                  placeholder='"She used to sing folk songs every evening..."'
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', background: 'var(--paper)', color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
                />
                <input
                  value={memoryAttribution}
                  onChange={event => setMemoryAttribution(event.target.value)}
                  placeholder="Source / attribution (optional)"
                  style={{ width: '100%', marginTop: 6, padding: '6px 10px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12, fontFamily: 'DM Sans, sans-serif', background: 'var(--paper)', color: 'var(--ink)', outline: 'none' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={memoryUncertain} onChange={event => setMemoryUncertain(event.target.checked)} style={{ accentColor: 'var(--gold)' }} />
                    Uncertain
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowMemForm(false)} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border2)', background: 'var(--paper)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button onClick={handleAddMemory} disabled={addingMemory || !newMemory.trim()} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: newMemory.trim() ? 'var(--gold)' : 'var(--paper3)', color: newMemory.trim() ? '#fff' : 'var(--ink3)', cursor: newMemory.trim() ? 'pointer' : 'not-allowed', fontSize: 12 }}>
                      {addingMemory ? 'Saving...' : 'Save'}
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
          </Section>

          <Section title="Add directly">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['parents', 'Parents', 'ti-users-plus'],
                ['child', 'Child', 'ti-user-plus'],
                ['sibling', 'Sibling', 'ti-binary-tree'],
                ['partner', 'Partner', 'ti-heart'],
                ['pet', 'Pet', 'ti-paw'],
                ['friend', 'Friend', 'ti-user-heart'],
              ].map(([kind, label, icon]) => (
                <button
                  key={kind}
                  onClick={() => handleQuickAdd(kind as 'parents' | 'child' | 'sibling' | 'partner' | 'pet' | 'friend')}
                  disabled={quickAdding !== null}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--paper)', color: 'var(--ink2)', cursor: quickAdding ? 'wait' : 'pointer', fontSize: 12 }}
                >
                  <i className={`ti ${icon}`} />
                  {quickAdding === kind ? 'Adding...' : label}
                </button>
              ))}
            </div>
          </Section>
        </div>
      </aside>

      <AddRelationshipModal
        open={showRelModal}
        fromPersonId={person.id}
        fromPersonName={person.fullName || person.nickname || 'Unknown'}
        treeId={treeId}
        onClose={() => setShowRelModal(false)}
        onCreated={handleRelationshipCreated}
      />
      <EditPersonModal
        open={showEditModal}
        person={person}
        onClose={() => setShowEditModal(false)}
        onUpdated={updated => {
          setPerson(updated)
          onDataChanged?.()
        }}
      />
    </>
  )
}

const actionButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 8px',
  borderRadius: 6,
  border: '1px solid var(--border2)',
  background: 'var(--paper)',
  color: 'var(--ink2)',
  cursor: 'pointer',
  fontSize: 11.5,
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink3)',
        fontWeight: 500,
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {title}
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, uncertain }: { label: string; value?: string | null; uncertain?: boolean }) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      fontSize: 12.5,
      padding: '5px 0',
      borderBottom: '1px solid var(--border)',
      color: 'var(--ink2)',
    }}>
      <span style={{ color: 'var(--ink3)', minWidth: 80, fontSize: 11.5 }}>{label}</span>
      <span style={{ flex: 1, fontStyle: uncertain ? 'italic' : 'normal' }}>
        {uncertain && <i className="ti ti-help" style={{ fontSize: 11, marginRight: 4, color: 'var(--ink3)' }} />}
        {value}
      </span>
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
      <span style={{ color: 'var(--ink3)', minWidth: 80, fontSize: 11.5 }}>Confidence</span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--paper3)' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 2, background: value >= 80 ? 'var(--teal)' : value >= 50 ? 'var(--gold)' : 'var(--rust)' }} />
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{value}%</span>
    </div>
  )
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: 'var(--ink3)', padding: '4px 0 8px' }}>{children}</div>
}
