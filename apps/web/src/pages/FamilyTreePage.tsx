import { useCallback, useEffect, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../api/client'
import { AddPersonModal } from '../components/modals/AddPersonModal'
import { PersonNode } from '../components/graph/PersonNode'
import { DetailPanel } from '../components/panel/DetailPanel'
import { personsApi } from '../api/persons'
import { treesApi } from '../api/trees'
import type { GraphData, GraphNode, Tree } from '../types'

const nodeTypes = { person: PersonNode }
const PARENT_TYPES = new Set([
  'BIOLOGICAL_PARENT', 'ADOPTIVE_PARENT', 'FOSTER_PARENT',
  'STEP_PARENT', 'GUARDIAN', 'SURROGATE_PARENT', 'UNKNOWN_PARENT',
])
const PARTNER_TYPES = new Set([
  'MARRIED', 'PARTNER', 'LIFE_PARTNER', 'ENGAGED',
  'DIVORCED', 'SEPARATED', 'WIDOWED', 'FORMER_PARTNER',
])
const SIBLING_TYPES = new Set(['SIBLING', 'HALF_SIBLING', 'STEP_SIBLING'])

interface FamilyTreePageProps {
  activeTreeId: string | null
  selectedPersonId: string | null
  onSelectPerson: (id: string) => void
}

function visibleFamily(data: GraphData, selectedPersonId: string) {
  const nodeById = new Map(data.nodes.map(node => [node.id, node]))
  const parents = new Set<string>()
  const partners = new Set<string>()
  const children = new Set<string>()
  const siblings = new Set<string>()

  for (const edge of data.edges) {
    if (PARENT_TYPES.has(edge.type)) {
      if (edge.target === selectedPersonId) parents.add(edge.source)
      if (edge.source === selectedPersonId) children.add(edge.target)
    }

    if (PARTNER_TYPES.has(edge.type)) {
      if (edge.source === selectedPersonId) partners.add(edge.target)
      if (edge.target === selectedPersonId) partners.add(edge.source)
    }

    if (SIBLING_TYPES.has(edge.type)) {
      if (edge.source === selectedPersonId) siblings.add(edge.target)
      if (edge.target === selectedPersonId) siblings.add(edge.source)
    }
  }

  const visibleIds = new Set([
    selectedPersonId,
    ...parents,
    ...partners,
    ...children,
    ...siblings,
  ])

  // Include the other parent for selected person's children, but do not expand that parent's family.
  for (const edge of data.edges) {
    if (!PARENT_TYPES.has(edge.type)) continue
    if ([...children].includes(edge.target)) visibleIds.add(edge.source)
  }

  const visibleEdges = data.edges.filter(edge => {
    if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return false
    if (PARENT_TYPES.has(edge.type)) {
      return edge.target === selectedPersonId || children.has(edge.target)
    }
    return edge.source === selectedPersonId || edge.target === selectedPersonId
  })

  const hasHiddenTree = new Map<string, boolean>()
  for (const id of visibleIds) {
    hasHiddenTree.set(id, data.edges.some(edge =>
      (edge.source === id && !visibleIds.has(edge.target)) ||
      (edge.target === id && !visibleIds.has(edge.source))
    ))
  }

  return {
    nodes: [...visibleIds].map(id => {
      const node = nodeById.get(id)
      return node ? { ...node, hasHiddenTree: hasHiddenTree.get(id) || false } : null
    }).filter(Boolean) as GraphNode[],
    edges: visibleEdges,
    parents,
    partners,
    children,
    siblings,
  }
}

function buildFamilyLayout(data: GraphData, selectedPersonId: string): { nodes: Node[]; edges: Edge[] } {
  const family = visibleFamily(data, selectedPersonId)
  const positions = new Map<string, { x: number; y: number }>()
  const centerX = 520
  const selectedY = 360
  const rowGap = 250
  const colGap = 300

  const sorted = (ids: Set<string>) => [...ids].sort((a, b) => {
    const aNode = family.nodes.find(node => node.id === a)
    const bNode = family.nodes.find(node => node.id === b)
    const aName = aNode?.fullName || aNode?.nickname || ''
    const bName = bNode?.fullName || bNode?.nickname || ''
    return aName.localeCompare(bName)
  })

  const placeRow = (ids: string[], y: number, preferredCenter = centerX) => {
    const startX = preferredCenter - ((ids.length - 1) * colGap) / 2
    ids.forEach((id, index) => positions.set(id, { x: startX + index * colGap, y }))
  }

  const siblings = sorted(family.siblings)
  const partners = sorted(family.partners)
  const currentRow = [...siblings, selectedPersonId, ...partners]
  placeRow(currentRow, selectedY)
  positions.set(selectedPersonId, { x: centerX, y: selectedY })
  partners.forEach((id, index) => positions.set(id, { x: centerX + (index + 1) * colGap, y: selectedY }))
  siblings.forEach((id, index) => positions.set(id, { x: centerX - (siblings.length - index) * colGap, y: selectedY }))

  placeRow(sorted(family.parents), selectedY - rowGap, centerX)
  placeRow(sorted(family.children), selectedY + rowGap)

  const nodes: Node[] = family.nodes.map(node => ({
    id: node.id,
    type: 'person',
    position: positions.get(node.id) || { x: centerX, y: selectedY },
    data: node,
    selected: node.id === selectedPersonId,
  }))

  const edges: Edge[] = family.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    label: edge.type.toLowerCase().replace(/_/g, ' '),
    style: {
      stroke: PARTNER_TYPES.has(edge.type) ? 'var(--gold)' : SIBLING_TYPES.has(edge.type) ? 'var(--teal)' : '#6f6760',
      strokeWidth: 1.8,
      strokeDasharray: edge.isUncertain || edge.isInferred ? '5 3' : undefined,
    },
    labelStyle: { fontSize: 10, fill: '#8a8078', fontFamily: 'DM Sans, sans-serif' },
    labelBgStyle: { fill: '#f7f4ef', fillOpacity: 0.9 },
    labelBgPadding: [4, 3] as [number, number],
  }))

  return { nodes, edges }
}

function FamilyTreeCanvas({ rootPersonId, selectedPersonId, refreshKey, onSelectPerson }: {
  rootPersonId: string | null
  selectedPersonId: string | null
  refreshKey: number
  onSelectPerson: (id: string) => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { fitView } = useReactFlow()
  const focusPersonId = selectedPersonId || rootPersonId

  useEffect(() => {
    if (!focusPersonId) return
    setLoading(true)
    setError(null)
    personsApi.getGraph(focusPersonId)
      .then(data => {
        const layout = buildFamilyLayout(data, focusPersonId)
        setNodes(layout.nodes)
        setEdges(layout.edges)
        window.requestAnimationFrame(() => fitView({ padding: 0.35, maxZoom: 1.05, duration: 350 }))
      })
      .catch(() => setError('Could not load family tree. Is the API running?'))
      .finally(() => setLoading(false))
  }, [focusPersonId, refreshKey, fitView])

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    onSelectPerson(node.id)
  }, [onSelectPerson])

  if (!focusPersonId) {
    return <div style={emptyStateStyle}>Select a family tree to view the focused tree.</div>
  }

  if (loading) {
    return <div style={emptyStateStyle}>Arranging family tree...</div>
  }

  if (error) {
    return <div style={{ ...emptyStateStyle, color: 'var(--rust)' }}>{error}</div>
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.35, maxZoom: 1.05 }}
      minZoom={0.35}
      maxZoom={1.6}
      nodesDraggable={false}
    >
      <Background color="#e2ddd4" gap={40} size={1} />
      <Controls style={{ background: '#f7f4ef', border: '1px solid rgba(26,23,20,0.12)', borderRadius: 6 }} />
    </ReactFlow>
  )
}

export function FamilyTreePage({ activeTreeId, selectedPersonId, onSelectPerson }: FamilyTreePageProps) {
  const [tree, setTree] = useState<Tree | null>(null)
  const [rootPersonId, setRootPersonId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!activeTreeId) return
    treesApi.get(activeTreeId).then(nextTree => {
      setTree(nextTree)
      const persons = (nextTree as any).persons as { person: { id: string } }[]
      const rootId = (nextTree as any).rootPersonId || persons?.[0]?.person.id || null
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'var(--paper)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', color: 'var(--ink)', flex: 1 }}>
          {tree?.name || 'Select a family tree'}
        </div>
        <button onClick={() => setShowAddModal(true)} style={primaryButtonStyle}>
          <i className="ti ti-user-plus" /> Add person
        </button>
        <button onClick={handleExport} disabled={!activeTreeId} style={secondaryButtonStyle}>
          <i className="ti ti-download" /> Export
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ReactFlowProvider>
            <FamilyTreeCanvas
              rootPersonId={rootPersonId}
              selectedPersonId={selectedPersonId}
              refreshKey={refreshKey}
              onSelectPerson={onSelectPerson}
            />
          </ReactFlowProvider>
        </div>
        <DetailPanel
          personId={selectedPersonId || rootPersonId}
          treeId={activeTreeId}
          onSelectPerson={onSelectPerson}
          onDataChanged={() => setRefreshKey(key => key + 1)}
        />
      </div>

      <AddPersonModal
        open={showAddModal}
        treeId={activeTreeId}
        onClose={() => setShowAddModal(false)}
        onCreated={id => {
          onSelectPerson(id)
          setRefreshKey(key => key + 1)
        }}
      />
    </div>
  )
}

const emptyStateStyle = {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--ink3)',
  fontFamily: 'Cormorant Garamond, serif',
  fontSize: '1.2rem',
}

const primaryButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 16px',
  borderRadius: 6,
  background: 'var(--gold)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'DM Sans, sans-serif',
}

const secondaryButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  borderRadius: 6,
  background: 'var(--paper)',
  color: 'var(--ink2)',
  border: '1px solid var(--border2)',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'DM Sans, sans-serif',
}
