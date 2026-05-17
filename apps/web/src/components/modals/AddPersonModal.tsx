import { useState } from 'react'
import { personsApi } from '../../api/persons'

interface AddPersonModalProps {
  open: boolean
  treeId: string | null
  onClose: () => void
  onCreated: (id: string) => void
}

export function AddPersonModal({ open, treeId, onClose, onCreated }: AddPersonModalProps) {
  const [form, setForm] = useState({
    fullName: '', nickname: '', sex: '', birthYearEst: '', birthMonth: '', birthDay: '', birthPlace: '',
    deathYearEst: '', deathMonth: '', deathDay: '',
    currentLocation: '', currentAddress: '',
    isUncertain: false, isDeceased: false,
    profession: '', company: '', interests: '', activities: '', bioNotes: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const exactDate = (year: string, month: string, day: string) => {
    if (!year || !month || !day) return undefined
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const person = await personsApi.create({
        fullName:     form.fullName || undefined,
        nickname:     form.nickname || undefined,
        sex:          form.sex || undefined,
        birthDateExact: exactDate(form.birthYearEst, form.birthMonth, form.birthDay),
        birthYearEst: form.birthYearEst ? parseInt(form.birthYearEst) : undefined,
        birthPlace:   form.birthPlace || undefined,
        deathDateExact: exactDate(form.deathYearEst, form.deathMonth, form.deathDay),
        deathYearEst: form.deathYearEst ? parseInt(form.deathYearEst) : undefined,
        currentLocation: form.currentLocation || undefined,
        currentAddress:  form.currentAddress || undefined,
        isUncertain:  form.isUncertain,
        isDeceased:   form.isDeceased,
        profession:   form.profession || undefined,
        company:      form.company || undefined,
        interests:    form.interests || undefined,
        activities:   form.activities || undefined,
        bioNotes:     form.bioNotes || undefined,
        treeId:       treeId || undefined,
      } as any)
      onCreated(person.id)
      onClose()
      setForm({ fullName: '', nickname: '', sex: '', birthYearEst: '', birthMonth: '', birthDay: '', birthPlace: '', deathYearEst: '', deathMonth: '', deathDay: '', currentLocation: '', currentAddress: '', isUncertain: false, isDeceased: false, profession: '', company: '', interests: '', activities: '', bioNotes: '', notes: '' })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,23,20,0.5)',
      zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--paper)',
        borderRadius: 8, width: 560,
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(26,23,20,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 500 }}>Add a person</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>Every field is optional — add as little as you know.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink3)', padding: 4 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <FormGroup label="Name">
            <input className="kinput" value={form.fullName} onChange={e => set('fullName', e.target.value)}
              placeholder="Full name, nickname, or 'Unknown grandfather'…" />
          </FormGroup>

          <FormGroup label="Nickname / alias">
            <input className="kinput" value={form.nickname} onChange={e => set('nickname', e.target.value)}
              placeholder="e.g. Bauji, Dadi, Chachaji…" />
          </FormGroup>

          <div style={{ display: 'flex', gap: 12 }}>
            <FormGroup label="Sex" style={{ flex: 1 }}>
              <select className="kinput" value={form.sex} onChange={e => set('sex', e.target.value)}>
                <option value="">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormGroup>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px 92px 1.25fr', gap: 12 }}>
            <FormGroup label="Birth year">
              <input className="kinput" value={form.birthYearEst} onChange={e => set('birthYearEst', e.target.value)}
                placeholder="e.g. 1942 or c.1942" />
            </FormGroup>
            <FormGroup label="Month">
              <input className="kinput" value={form.birthMonth} onChange={e => set('birthMonth', e.target.value)} placeholder="MM" />
            </FormGroup>
            <FormGroup label="Day">
              <input className="kinput" value={form.birthDay} onChange={e => set('birthDay', e.target.value)} placeholder="DD" />
            </FormGroup>
            <FormGroup label="Birthplace">
              <input className="kinput" value={form.birthPlace} onChange={e => set('birthPlace', e.target.value)}
                placeholder="Village, city, region…" />
            </FormGroup>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px 92px', gap: 12 }}>
            <FormGroup label="Death year">
              <input className="kinput" value={form.deathYearEst} onChange={e => set('deathYearEst', e.target.value)} placeholder="e.g. 1994" />
            </FormGroup>
            <FormGroup label="Month">
              <input className="kinput" value={form.deathMonth} onChange={e => set('deathMonth', e.target.value)} placeholder="MM" />
            </FormGroup>
            <FormGroup label="Day">
              <input className="kinput" value={form.deathDay} onChange={e => set('deathDay', e.target.value)} placeholder="DD" />
            </FormGroup>
          </div>

          <FormGroup label="Occupation">
            <input className="kinput" value={form.profession} onChange={e => set('profession', e.target.value)}
              placeholder="e.g. Farmer, teacher, merchant…" />
          </FormGroup>

          <FormGroup label="Company">
            <input className="kinput" value={form.company} onChange={e => set('company', e.target.value)}
              placeholder="Organisation, workplace, farm, family business…" />
          </FormGroup>

          <FormGroup label="Current location">
            <input className="kinput" value={form.currentLocation} onChange={e => set('currentLocation', e.target.value)}
              placeholder="City, village, region…" />
          </FormGroup>

          <FormGroup label="Address">
            <textarea className="kinput" value={form.currentAddress} onChange={e => set('currentAddress', e.target.value)}
              rows={2} placeholder="Current or last known address…" style={{ resize: 'vertical' }} />
          </FormGroup>

          <div style={{ display: 'flex', gap: 12 }}>
            <FormGroup label="Interests" style={{ flex: 1 }}>
              <textarea className="kinput" value={form.interests} onChange={e => set('interests', e.target.value)} rows={2} placeholder="Music, farming, poetry…" style={{ resize: 'vertical' }} />
            </FormGroup>
            <FormGroup label="Activities" style={{ flex: 1 }}>
              <textarea className="kinput" value={form.activities} onChange={e => set('activities', e.target.value)} rows={2} placeholder="Community work, travel…" style={{ resize: 'vertical' }} />
            </FormGroup>
          </div>

          <FormGroup label="Bio notes">
            <textarea className="kinput" value={form.bioNotes} onChange={e => set('bioNotes', e.target.value)} rows={3} placeholder="Short biographical notes…" style={{ resize: 'vertical' }} />
          </FormGroup>

          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--ink2)' }}>
              <input type="checkbox" checked={form.isUncertain} onChange={e => set('isUncertain', e.target.checked)} />
              Dates / details uncertain
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--ink2)' }}>
              <input type="checkbox" checked={form.isDeceased} onChange={e => set('isDeceased', e.target.checked)} />
              Deceased
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{
            padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border2)',
            background: 'var(--paper)', color: 'var(--ink2)', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding: '7px 16px', borderRadius: 6, border: 'none',
            background: 'var(--gold)', color: '#fff', cursor: 'pointer', fontSize: 13,
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Adding…' : 'Add person'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormGroup({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 5 }}>
        {label} <span style={{ fontSize: 9, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>optional</span>
      </div>
      {children}
    </div>
  )
}
