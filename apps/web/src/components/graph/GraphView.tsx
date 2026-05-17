import { useEffect, useState, useCallback } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  ControlButton, ReactFlowProvider,
  useNodesState, useEdgesState, useReactFlow,
  type Node, type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { personsApi } from '../../api/persons'
import { PersonNode } from './PersonNode'
import type { GraphData } from '../../types'

const nodeTypes = { person: PersonNode }

// ── Layout ────────────────────────────────────────────────────────────

function buildLayout(data: GraphData, rootId: string): { nodes: Node[]; edges: Edge[] } {
  const PARENT_TYPES = new Set([
    'BIOLOGICAL_PARENT', 'ADOPTIVE_PARENT', 'FOSTER_PARENT',
    'STEP_PARENT', 'GUARDIAN', 'SURROGATE_PARENT', 'UNKNOWN_PARENT',
  ])
  const PARTNER_TYPES = new Set([
    'MARRIED', 'PARTNER', 'LIFE_PARTNER', 'ENGAGED',
    'DIVORCED', 'SEPARATED', 'WIDOWED', 'FORMER_PARTNER',
  ])
  const SIBLING_TYPES = new Set(['SIBLING', 'HALF_SIBLING', 'STEP_SIBLING'])
  const SAME_GENERATION_TYPES = new Set([
    'FRIEND', 'MENTOR', 'CARETAKER', 'COMMUNITY', 'TEACHER', 'STUDENT',
    'BUSINESS', 'PET', 'UNKNOWN', 'CUSTOM', 'COUSIN',
  ])

  // BFS to assign generations relative to root
  const generations = new Map<string, number>()
  const visited     = new Set<string>()
  const queue: { id: string; gen: number }[] = [{ id: rootId, gen: 0 }]

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    generations.set(id, gen)

    for (const e of data.edges) {
      if (PARENT_TYPES.has(e.type)) {
        // source is parent of target → target is child (gen + 1), source is parent (gen - 1)
        if (e.source === id && !visited.has(e.target))
          queue.push({ id: e.target, gen: gen + 1 })
        if (e.target === id && !visited.has(e.source))
          queue.push({ id: e.source, gen: gen - 1 })
      }
      if (SIBLING_TYPES.has(e.type)) {
        if (e.source === id && !visited.has(e.target))
          queue.push({ id: e.target, gen })
        if (e.target === id && !visited.has(e.source))
          queue.push({ id: e.source, gen })
      }
      if (PARTNER_TYPES.has(e.type)) {
        if (e.source === id && !visited.has(e.target))
          queue.push({ id: e.target, gen })
        if (e.target === id && !visited.has(e.source))
          queue.push({ id: e.source, gen })
      }
      if (SAME_GENERATION_TYPES.has(e.type)) {
        if (e.source === id && !visited.has(e.target))
          queue.push({ id: e.target, gen })
        if (e.target === id && !visited.has(e.source))
          queue.push({ id: e.source, gen })
      }
    }
  }

  // Any disconnected nodes default to gen 0
  data.nodes.forEach(n => {
    if (!generations.has(n.id)) generations.set(n.id, 0)
  })

  // Group nodes by generation
  const byGen = new Map<number, string[]>()
  generations.forEach((gen, id) => {
    if (!byGen.has(gen)) byGen.set(gen, [])
    byGen.get(gen)!.push(id)
  })

  // Layout constants
  const X_SPACING = 220
  const Y_SPACING = 240
  const CENTER_X  = 500

  const genValues = Array.from(byGen.keys()).sort((a, b) => a - b)
  const minGen    = genValues[0]

  const positions = new Map<string, { x: number; y: number }>()

  genValues.forEach(gen => {
    const ids    = byGen.get(gen)!
    const count  = ids.length
    const y      = (gen - minGen) * Y_SPACING + 80
    const totalW = (count - 1) * X_SPACING
    const startX = CENTER_X - totalW / 2

    // Sort: root first, then root's partners adjacent, then others
    ids.sort((a, b) => {
      if (a === rootId) return -1
      if (b === rootId) return 1
      const aIsPartner = data.edges.some(e =>
        PARTNER_TYPES.has(e.type) &&
        ((e.source === rootId && e.target === a) || (e.target === rootId && e.source === a))
      )
      const bIsPartner = data.edges.some(e =>
        PARTNER_TYPES.has(e.type) &&
        ((e.source === rootId && e.target === b) || (e.target === rootId && e.source === b))
      )
      if (aIsPartner) return -1
      if (bIsPartner) return 1
      return 0
    })

    ids.forEach((id, i) => {
      positions.set(id, { x: startX + i * X_SPACING, y })
    })
  })

  // Build React Flow nodes
  const nodes: Node[] = data.nodes.map(n => ({
    id:       n.id,
    type:     'person',
    position: positions.get(n.id) || { x: CENTER_X, y: 300 },
    data:     n,
  }))

  // Edge colour map
  const edgeColors: Record<string, string> = {
    MARRIED:           '#b8934a',
    PARTNER:           '#b8934a',
    LIFE_PARTNER:      '#b8934a',
    ENGAGED:           '#b8934a',
    DIVORCED:          '#b8934a',
    BIOLOGICAL_PARENT: '#4a4540',
    ADOPTIVE_PARENT:   '#4a4540',
    FOSTER_PARENT:     '#4a4540',
    STEP_PARENT:       '#4a4540',
    GUARDIAN:          '#4a4540',
    SIBLING:           '#2a6b6a',
    HALF_SIBLING:      '#2a6b6a',
    STEP_SIBLING:      '#2a6b6a',
    FRIEND:            '#9b4a2a',
    MENTOR:            '#9b4a2a',
  }

  const edges: Edge[] = data.edges.map(e => ({
    id:     e.id,
    source: e.source,
    target: e.target,
    label:  e.type.toLowerCase().replace(/_/g, ' '),
    style: {
      stroke:          edgeColors[e.type] || '#8a8078',
      strokeDasharray: e.isUncertain || e.isInferred ? '5 3' : undefined,
      strokeWidth:     1.5,
    },
    data: { isInferred: e.isInferred || false },
    labelStyle:     { fontSize: 10, fill: '#8a8078', fontFamily: 'DM Sans, sans-serif' },
    labelBgStyle:   { fill: '#f7f4ef', fillOpacity: 0.85 },
    labelBgPadding: [4, 3] as [number, number],
  }))

  return { nodes, edges }
}

// ── Inner canvas (needs ReactFlowProvider above it) ───────────────────

interface GraphViewProps {
  rootPersonId:     string | null
  selectedPersonId: string | null
  refreshKey?:      number
  onSelectPerson:   (id: string) => void
}

function GraphCanvas({ rootPersonId, selectedPersonId, refreshKey = 0, onSelectPerson }: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading]            = useState(false)
  const [error, setError]                = useState<string | null>(null)
  const { fitView, setCenter }           = useReactFlow()

  // Load graph data whenever the root person changes
  useEffect(() => {
    if (!rootPersonId) return
    setLoading(true)
    setError(null)

    personsApi.getGraph(rootPersonId)
      .then(data => {
        const { nodes: n, edges: e } = buildLayout(data, rootPersonId)
        setNodes(n)
        setEdges(e)
      })
      .catch(() => setError('Could not load graph. Is the API running?'))
      .finally(() => setLoading(false))
  }, [rootPersonId, refreshKey])

  // Highlight the selected node
  useEffect(() => {
    setNodes(prev => prev.map(n => ({
      ...n,
      selected: n.id === selectedPersonId,
    })))
  }, [selectedPersonId])

  useEffect(() => {
    if (!selectedPersonId || loading || nodes.length === 0) return

    const selectedNode = nodes.find(node => node.id === selectedPersonId)
    if (!selectedNode) return

    const width = selectedNode.measured?.width || selectedNode.width || 140
    const height = selectedNode.measured?.height || selectedNode.height || 90

    window.requestAnimationFrame(() => {
      setCenter(
        selectedNode.position.x + width / 2,
        selectedNode.position.y + height / 2,
        { zoom: 0.95, duration: 450 },
      )
    })
  }, [selectedPersonId, nodes, loading, setCenter])

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    onSelectPerson(node.id)
  }, [onSelectPerson])

  const handleReset = useCallback(() => {
    fitView({ padding: 0.5, maxZoom: 0.85, duration: 400 })
  }, [fitView])

  // ── Loading / error / empty states ───────────────────────────────────

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 1, color: '#8a8078',
      fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem',
    }}>
      Loading graph…
    </div>
  )

  if (error) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 1, color: '#9b4a2a', fontSize: 13,
    }}>
      {error}
    </div>
  )

  if (!rootPersonId) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 1, color: '#8a8078', fontSize: 13,
    }}>
      Select a family tree to view the graph.
    </div>
  )

  // ── Graph ─────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#e2ddd4" gap={40} size={1} />

        <Controls style={{
          background: '#f7f4ef',
          border: '1px solid rgba(26,23,20,0.12)',
          borderRadius: 6,
        }}>
          <ControlButton
            onClick={handleReset}
            title="Reset view — fit all nodes"
            style={{ fontSize: 15 }}
          >
            <i className="ti ti-focus-2" />
          </ControlButton>
        </Controls>

        <MiniMap
          nodeColor={n => (n.data as any).isDeceased ? '#c8c0b4' : '#b8934a'}
          style={{
            background: '#ede9e1',
            border: '1px solid rgba(26,23,20,0.12)',
            borderRadius: 6,
          }}
        />
      </ReactFlow>
    </div>
  )
}

// ── Exported wrapper (provides the ReactFlow context) ─────────────────

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  )
}
