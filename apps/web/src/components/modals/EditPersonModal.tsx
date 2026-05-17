import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { personsApi } from '../../api/persons'
import type { Person } from '../../types'

interface Props {
  open: boolean
  person: Person | null
  onClose: () => void
  onUpdated: (person: Person) => void
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border2)',
  borderRadius: 6,
  fontSize: 13,
  fontFamily: 'DM Sans, sans-serif',
  background: 'var(--paper)',
  color: 'var(--ink)',
  outline: 'none',
}

export function EditPersonModal({ open, person, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    fullName: '',
    nickname: '',
    sex: '',
    birthYearEst: '',
    birthMonth: '',
    birthDay: '',
    birthPlace: '',
    currentLocation: '',
    currentAddress: '',
    deathYearEst: '',
    deathMonth: '',
    deathDay: '',
    deathPlace: '',
    profession: '',
    company: '',
    interests: '',
    activities: '',
    bioNotes: '',
    languages: '',
    confidenceScore: '100',
    isDeceased: false,
    isLiving: true,
    isUncertain: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!person) return
    const birthDate = person.birthDateExact ? new Date(person.birthDateExact) : null
    const deathDate = person.deathDateExact ? new Date(person.deathDateExact) : null
    setForm({
      fullName: person.fullName || '',
      nickname: person.nickname || '',
      sex: person.sex || '',
      birthYearEst: person.birthYearEst ? String(person.birthYearEst) : birthDate ? String(birthDate.getUTCFullYear()) : '',
      birthMonth: birthDate ? String(birthDate.getUTCMonth() + 1).padStart(2, '0') : '',
      birthDay: birthDate ? String(birthDate.getUTCDate()).padStart(2, '0') : '',
      birthPlace: person.birthPlace || '',
      currentLocation: person.currentLocation || '',
      currentAddress: person.currentAddress || '',
      deathYearEst: person.deathYearEst ? String(person.deathYearEst) : deathDate ? String(deathDate.getUTCFullYear()) : '',
      deathMonth: deathDate ? String(deathDate.getUTCMonth() + 1).padStart(2, '0') : '',
      deathDay: deathDate ? String(deathDate.getUTCDate()).padStart(2, '0') : '',
      deathPlace: person.deathPlace || '',
      profession: person.profession || '',
      company: person.company || '',
      interests: person.interests || '',
      activities: person.activities || '',
      bioNotes: person.bioNotes || '',
      languages: person.languages?.join(', ') || '',
      confidenceScore: person.confidenceScore != null ? String(person.confidenceScore) : '100',
      isDeceased: person.isDeceased || false,
      isLiving: person.isLiving ?? !person.isDeceased,
      isUncertain: person.isUncertain || false,
    })
  }, [person])

  if (!open || !person) return null

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm(current => ({ ...current, [key]: value }))

  const parseOptionalInt = (value: string) => {
    const trimmed = value.trim().replace(/^c\.\s*/i, '')
    if (!trimmed) return undefined
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  const exactDate = (year: string, month: string, day: string) => {
    if (!year || !month || !day) return undefined
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const updated = await personsApi.update(person.id, {
        fullName: form.fullName.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
        sex: form.sex || undefined,
        gender: undefined,
        pronouns: undefined,
        birthDateExact: exactDate(form.birthYearEst, form.birthMonth, form.birthDay),
        birthYearEst: parseOptionalInt(form.birthYearEst),
        birthPlace: form.birthPlace.trim() || undefined,
        currentLocation: form.currentLocation.trim() || undefined,
        currentAddress: form.currentAddress.trim() || undefined,
        deathDateExact: exactDate(form.deathYearEst, form.deathMonth, form.deathDay),
        deathYearEst: parseOptionalInt(form.deathYearEst),
        deathPlace: form.deathPlace.trim() || undefined,
        profession: form.profession.trim() || undefined,
        company: form.company.trim() || undefined,
        interests: form.interests.trim() || undefined,
        activities: form.activities.trim() || undefined,
        bioNotes: form.bioNotes.trim() || undefined,
        languages: form.languages.split(',').map(language => language.trim()).filter(Boolean),
        confidenceScore: parseOptionalInt(form.confidenceScore),
        isDeceased: form.isDeceased,
        isLiving: form.isDeceased ? false : form.isLiving,
        isUncertain: form.isUncertain,
      })
      onUpdated(updated)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--paper)', borderRadius: 8, width: 580, maxWidth: 'calc(100vw - 32px)', maxHeight: '86vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(26,23,20,0.2)' }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 500 }}>
            Edit person
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink3)', padding: 4 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Full name">
              <input style={inputStyle} value={form.fullName} onChange={event => set('fullName', event.target.value)} placeholder="Full name..." />
            </Field>
            <Field label="Nickname">
              <input style={inputStyle} value={form.nickname} onChange={event => set('nickname', event.target.value)} placeholder="Bauji, Dadi..." />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Sex">
              <select style={inputStyle} value={form.sex} onChange={event => set('sex', event.target.value)}>
                <option value="">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 1.2fr', gap: 12 }}>
            <Field label="Birth year">
              <input style={inputStyle} value={form.birthYearEst} onChange={event => set('birthYearEst', event.target.value)} placeholder="e.g. 1942" />
            </Field>
            <Field label="Month">
              <input style={inputStyle} value={form.birthMonth} onChange={event => set('birthMonth', event.target.value)} placeholder="MM" />
            </Field>
            <Field label="Day">
              <input style={inputStyle} value={form.birthDay} onChange={event => set('birthDay', event.target.value)} placeholder="DD" />
            </Field>
            <Field label="Birthplace">
              <input style={inputStyle} value={form.birthPlace} onChange={event => set('birthPlace', event.target.value)} placeholder="Village, city..." />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 1.2fr', gap: 12 }}>
            <Field label="Death year">
              <input style={inputStyle} value={form.deathYearEst} onChange={event => set('deathYearEst', event.target.value)} placeholder="e.g. 1994" />
            </Field>
            <Field label="Month">
              <input style={inputStyle} value={form.deathMonth} onChange={event => set('deathMonth', event.target.value)} placeholder="MM" />
            </Field>
            <Field label="Day">
              <input style={inputStyle} value={form.deathDay} onChange={event => set('deathDay', event.target.value)} placeholder="DD" />
            </Field>
            <Field label="Death place">
              <input style={inputStyle} value={form.deathPlace} onChange={event => set('deathPlace', event.target.value)} placeholder="Village, city..." />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Occupation">
              <input style={inputStyle} value={form.profession} onChange={event => set('profession', event.target.value)} placeholder="Farmer, teacher..." />
            </Field>
            <Field label="Company">
              <input style={inputStyle} value={form.company} onChange={event => set('company', event.target.value)} placeholder="Workplace, business..." />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Current location">
              <input style={inputStyle} value={form.currentLocation} onChange={event => set('currentLocation', event.target.value)} placeholder="City, village, region..." />
            </Field>
            <Field label="Confidence">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min={0} max={100} value={form.confidenceScore} onChange={event => set('confidenceScore', event.target.value)} style={{ flex: 1, accentColor: 'var(--gold)' }} />
                <span style={{ fontSize: 12, color: 'var(--ink3)', minWidth: 34 }}>{form.confidenceScore}%</span>
              </div>
            </Field>
          </div>

          <Field label="Languages">
            <input style={inputStyle} value={form.languages} onChange={event => set('languages', event.target.value)} placeholder="Hindi, English, Haryanvi" />
          </Field>

          <Field label="Address">
            <textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.currentAddress} rows={2} onChange={event => set('currentAddress', event.target.value)} placeholder="Current or last known address..." />
          </Field>

          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Interests">
              <textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.interests} rows={2} onChange={event => set('interests', event.target.value)} placeholder="Music, farming, reading..." />
            </Field>
            <Field label="Activities">
              <textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.activities} rows={2} onChange={event => set('activities', event.target.value)} placeholder="Community work, travel..." />
            </Field>
          </div>

          <Field label="Bio notes">
            <textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.bioNotes} rows={3} onChange={event => set('bioNotes', event.target.value)} placeholder="Short biographical notes..." />
          </Field>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--ink2)' }}>
              <input type="checkbox" checked={form.isDeceased} onChange={event => set('isDeceased', event.target.checked)} style={{ accentColor: 'var(--gold)' }} />
              Deceased
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--ink2)' }}>
              <input type="checkbox" checked={form.isLiving} disabled={form.isDeceased} onChange={event => set('isLiving', event.target.checked)} style={{ accentColor: 'var(--gold)' }} />
              Living
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--ink2)' }}>
              <input type="checkbox" checked={form.isUncertain} onChange={event => set('isUncertain', event.target.checked)} style={{ accentColor: 'var(--gold)' }} />
              Details uncertain
            </label>
          </div>
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--paper)', color: 'var(--ink2)', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: 'var(--gold)', color: '#fff', cursor: saving ? 'wait' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 5 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
