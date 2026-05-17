export type Visibility =
  | 'PUBLIC' | 'SHARED' | 'FAMILY_ONLY'
  | 'CONTRIBUTORS_ONLY' | 'PRIVATE' | 'ADMIN_ONLY'

export interface Tree {
  id: string
  name: string
  description?: string
  color?: string
  ownerId: string
  _count?: { persons: number }
}

export interface Person {
  id: string
  fullName?: string
  nickname?: string
  aliases: string[]
  maidenName?: string
  gender?: string
  sex?: string
  pronouns?: string
  birthDateExact?: string
  birthYearEst?: number
  birthAgeMin?: number
  birthAgeMax?: number
  birthPlace?: string
  currentLocation?: string
  currentAddress?: string
  deathDateExact?: string
  deathYearEst?: number
  deathPlace?: string
  isDeceased: boolean
  isLiving?: boolean
  isUncertain: boolean
  confidenceScore?: number
  profession?: string
  company?: string
  interests?: string
  activities?: string
  bioNotes?: string
  languages: string[]
  visibility: Visibility
  createdAt: string
  updatedAt: string
  // included relations
  memories?: Memory[]
  media?: Media[]
  relationshipsA?: Relationship[]
  relationshipsB?: Relationship[]
  trees?: { tree: Tree }[]
}

export interface Relationship {
  id: string
  personAId: string
  personBId: string
  type: string
  customType?: string
  isInferred?: boolean
  inferredFrom?: string[]
  isDirectional: boolean
  startYearEst?: number
  endYearEst?: number
  isOngoing: boolean
  isUncertain: boolean
  confidenceScore?: number
  notes?: string
  personA?: Person
  personB?: Person
}

export interface Memory {
  id: string
  personId: string
  content: string
  isUncertain: boolean
  attribution?: string
  visibility: Visibility
  createdAt: string
  replies?: Memory[]
}

export interface Media {
  id: string
  personId: string
  type: 'PHOTO' | 'DOCUMENT' | 'AUDIO' | 'VIDEO'
  url: string
  caption?: string
  takenYear?: number
}

// Graph-specific types returned by /persons/:id/graph
export interface GraphNode {
  [key: string]: unknown
  id: string
  fullName?: string
  nickname?: string
  birthYearEst?: number
  deathYearEst?: number
  isDeceased: boolean
  isUncertain: boolean
  gender?: string
  sex?: string
  hasHiddenTree?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
  isUncertain: boolean
  isInferred?: boolean
  confidenceScore?: number
  startYearEst?: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
