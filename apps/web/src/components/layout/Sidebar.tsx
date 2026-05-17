import { useEffect, useState } from 'react'
import { treesApi } from '../../api/trees'
import type { Tree } from '../../types'

interface SidebarProps {
  activeTreeId: string | null
  onSelectTree: (id: string) => void
  activeView: string
  onSelectView: (view: string) => void
}

export function Sidebar({ activeTreeId, onSelectTree, activeView, onSelectView }: SidebarProps) {
  const [trees, setTrees] = useState<Tree[]>([])

  useEffect(() => {
    treesApi.list().then(setTrees).catch(console.error)
  }, [])

  const navItems = [
    { id: 'family-tree', icon: 'ti-binary-tree-2', label: 'Family Tree' },
    { id: 'graph',    icon: 'ti-affiliate',   label: 'Graph' },
    { id: 'people',   icon: 'ti-users',        label: 'People' },
    { id: 'timeline', icon: 'ti-timeline',     label: 'Timeline' },
  ]

  return (
    <aside style={{
      width: 220, minWidth: 220,
      background: '#1a1714',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.55rem', fontWeight: 600,
          letterSpacing: '0.02em', color: '#f2d08a',
        }}>Kinroot</div>
        <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4a4238', marginTop: 2 }}>
          Human relationship archive
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '14px 12px 6px', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4238', fontWeight: 500 }}>
        Navigation
      </div>
      {navItems.map(item => (
        <div
          key={item.id}
          onClick={() => onSelectView(item.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 14px', margin: '1px 8px',
            borderRadius: 6, fontSize: 13, cursor: 'pointer',
            background: activeView === item.id ? 'rgba(242,208,138,0.1)' : 'transparent',
            color: activeView === item.id ? '#f2d08a' : '#9a9288',
          }}
        >
          <i className={`ti ${item.icon}`} style={{ fontSize: 15 }} />
          {item.label}
        </div>
      ))}

      {/* Trees */}
      <div style={{ padding: '14px 12px 6px', marginTop: 8, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4238', fontWeight: 500 }}>
        Family trees
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {trees.map(tree => (
          <div
            key={tree.id}
            onClick={() => onSelectTree(tree.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', margin: '1px 8px',
              borderRadius: 6, fontSize: 12, cursor: 'pointer',
              color: activeTreeId === tree.id ? '#c0b8ac' : '#7a7068',
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: '50', flexShrink: 0,
              background: tree.color || '#8a8078',
            }} />
            {tree.name}
            {tree._count && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4a4238' }}>
                {tree._count.persons}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 9,
        fontSize: 12, color: '#6a6058',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#3a3028',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 13, color: '#d4a85c', flexShrink: 0,
        }}>R</div>
        <div>
          <div style={{ color: '#9a9288', fontSize: 12 }}>Ravi Sharma</div>
          <div style={{ fontSize: 10, color: '#4a4238' }}>Private workspace</div>
        </div>
      </div>
    </aside>
  )
}
