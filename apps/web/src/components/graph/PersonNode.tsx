import { Handle, Position } from '@xyflow/react'
import type { GraphNode } from '../../types'

interface PersonNodeProps {
  data: GraphNode
  selected: boolean
}

const GENDER_COLORS: Record<string, { bg: string; color: string }> = {
  Male:   { bg: '#e3edf7', color: '#1d5a8a' },
  Female: { bg: '#f5e8f0', color: '#7a1d5a' },
  Other:  { bg: '#fffdfa', color: '#4a4540' },
}
const DEFAULT_COLOR = { bg: '#fffdfa', color: '#4a4540' }

export function PersonNode({ data, selected }: PersonNodeProps) {
  const palette = GENDER_COLORS[data.sex || data.gender || ''] || DEFAULT_COLOR

  const initials = data.fullName
    ? data.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : data.nickname?.[0]?.toUpperCase() || '?'

  const displayName = data.fullName || data.nickname || 'Unknown'

  const yearStr = (() => {
    const b = data.birthYearEst ? `c.${data.birthYearEst}` : null
    const d = data.deathYearEst ? `${data.deathYearEst}` : data.isDeceased ? '?' : null
    if (b && d) return `${b} – ${d}`
    if (b) return `b. ${b}`
    return null
  })()

  return (
    <div style={{
      background: 'var(--paper, #f7f4ef)',
      border: `1.5px ${data.isUncertain ? 'dashed' : 'solid'} ${selected ? '#b8934a' : 'rgba(26,23,20,0.15)'}`,
      borderRadius: 12,
      padding: '10px 12px',
      minWidth: 120,
      textAlign: 'center',
      opacity: data.isDeceased ? 0.78 : 1,
      boxShadow: selected
        ? '0 0 0 3px rgba(184,147,74,0.2), 0 2px 12px rgba(26,23,20,0.1)'
        : '0 2px 8px rgba(26,23,20,0.08)',
      cursor: 'pointer',
      transition: 'box-shadow 0.15s',
      fontFamily: 'DM Sans, sans-serif',
      position: 'relative',
    }}>
      {data.hasHiddenTree && (
        <div title="Has more family connected" style={{
          position: 'absolute',
          right: -34,
          top: '50%',
          width: 30,
          borderTop: '2px dotted rgba(42,107,106,0.55)',
        }} />
      )}
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />

      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: palette.bg, color: palette.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 6px',
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: 16, fontWeight: 500,
      }}>
        {initials}
      </div>

      {/* Name */}
      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1714', lineHeight: 1.3 }}>
        {displayName}
      </div>

      {/* Years */}
      {yearStr && (
        <div style={{ fontSize: 10, color: '#8a8078', marginTop: 2 }}>{yearStr}</div>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', marginTop: 5 }}>
        {data.isUncertain && (
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 20,
            border: '1px dashed #8a8078', color: '#8a8078',
          }}>Uncertain</span>
        )}
        {data.isDeceased && !data.isUncertain && (
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 20,
            background: '#e2ddd4', color: '#6a6058',
          }}>Deceased</span>
        )}
      </div>
    </div>
  )
}
