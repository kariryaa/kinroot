import { useState, useEffect } from 'react'
import { GraphView }      from '../components/graph/GraphView'
import { DetailPanel }    from '../components/panel/DetailPanel'
import { AddPersonModal } from '../components/modals/AddPersonModal'
import { api }            from '../api/client'
import { treesApi }       from '../api/trees'
import type { Tree }      from '../types'

interface GraphPageProps {
  activeTreeId: string | null
  selectedPersonId: string | null
  onSelectPerson: (id: string) => void
}

export function GraphPage({ activeTreeId, selectedPersonId, onSelectPerson }: GraphPageProps) {
  const [tree, setTree]                 = useState<Tree | null>(null)
  const [rootPersonId, setRootPersonId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [graphRefreshKey, setGraphRefreshKey] = useState(0)

  useEffect(() => {
    if (!activeTreeId) return
    treesApi.get(activeTreeId).then(t => {
      setTree(t)
      const persons = (t as any).persons as { person: { id: string } }[]
      const rootId  = (t as any).rootPersonId || persons?.[0]?.person.id || null
      const selectedInTree = selectedPersonId && persons?.some(entry => entry.person.id === selectedPersonId)
      setRootPersonId(rootId)
      if (rootId && !selectedInTree) onSelectPerson(rootId)
    })
  }, [activeTreeId])

  const handleExport = () => {
    if (!activeTreeId) return
    const baseUrl = api.defaults.baseURL || ''
    const link = document.createElement('a')
    link.href = `${baseUrl}/trees/${activeTreeId}/export`
    link.download = `kinroot-${tree?.name || activeTreeId}.json`
    link.click()
  }

  return (
    // Outer: full height, column layout (toolbar on top, content below)
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 10,
        background: 'var(--paper)',
        borderBottom: '1px solid var(--border)',
        zIndex: 10,
      }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.15rem',
          color: 'var(--ink)',
          flex: 1,
        }}>
          {tree?.name || 'Select a family tree'}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 6,
            background: 'var(--gold)', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <i className="ti ti-user-plus" />
          Add person
        </button>
        <button
          onClick={handleExport}
          disabled={!activeTreeId}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 6,
            background: 'var(--paper)', color: 'var(--ink2)',
            border: '1px solid var(--border2)', cursor: activeTreeId ? 'pointer' : 'not-allowed',
            fontSize: 13, fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <i className="ti ti-download" />
          Export
        </button>
      </div>

      {/* ── Body: graph canvas + detail panel side by side ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Graph canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <GraphView
            rootPersonId={rootPersonId}
            selectedPersonId={selectedPersonId}
            refreshKey={graphRefreshKey}
            onSelectPerson={onSelectPerson}
          />
        </div>

        {/* Detail panel */}
        <DetailPanel
          personId={selectedPersonId}
          treeId={activeTreeId}
          onSelectPerson={onSelectPerson}
          onDataChanged={() => setGraphRefreshKey(key => key + 1)}
        />

      </div>

      {/* ── Add person modal ── */}
      <AddPersonModal
        open={showAddModal}
        treeId={activeTreeId}
        onClose={() => setShowAddModal(false)}
        onCreated={id => {
          onSelectPerson(id)
          setGraphRefreshKey(key => key + 1)
        }}
      />
    </div>
  )
}
