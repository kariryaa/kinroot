import { Router } from 'express'
import { db } from '../db.js'

export const personsRouter = Router()

const BIOLOGICAL_PARENT = 'BIOLOGICAL_PARENT'
const SIBLING_TYPES = new Set(['SIBLING', 'HALF_SIBLING', 'STEP_SIBLING'])

function pairKey(a: string, b: string) {
  return [a, b].sort().join(':')
}

function inferSiblingRelationships(relationships: any[], peopleById?: Map<string, any>) {
  const explicitSiblingPairs = new Set<string>()
  const childrenByParent = new Map<string, string[]>()

  for (const relationship of relationships) {
    if (SIBLING_TYPES.has(relationship.type)) {
      explicitSiblingPairs.add(pairKey(relationship.personAId, relationship.personBId))
    }

    if (relationship.type !== BIOLOGICAL_PARENT || !relationship.isDirectional) continue

    const children = childrenByParent.get(relationship.personAId) || []
    children.push(relationship.personBId)
    childrenByParent.set(relationship.personAId, children)
  }

  const sharedParentsByPair = new Map<string, string[]>()
  for (const [parentId, childIds] of childrenByParent) {
    for (let i = 0; i < childIds.length; i += 1) {
      for (let j = i + 1; j < childIds.length; j += 1) {
        const firstChildId = childIds[i]
        const secondChildId = childIds[j]
        if (!firstChildId || !secondChildId) continue

        const key = pairKey(firstChildId, secondChildId)
        const sharedParents = sharedParentsByPair.get(key) || []
        sharedParents.push(parentId)
        sharedParentsByPair.set(key, sharedParents)
      }
    }
  }

  return Array.from(sharedParentsByPair.entries())
    .filter(([key]) => !explicitSiblingPairs.has(key))
    .map(([key, sharedParentIds]) => {
      const [personAId, personBId] = key.split(':')
      if (!personAId || !personBId) return null
      const type = sharedParentIds.length >= 2 ? 'SIBLING' : 'HALF_SIBLING'

      return {
        id: `inferred-${type.toLowerCase()}-${personAId}-${personBId}`,
        personAId,
        personBId,
        type,
        isDirectional: false,
        isOngoing: true,
        isUncertain: false,
        confidenceScore: 100,
        notes: 'Inferred from shared biological parent relationship(s).',
        isInferred: true,
        inferredFrom: sharedParentIds,
        ...(peopleById ? {
          personA: peopleById.get(personAId),
          personB: peopleById.get(personBId),
        } : {}),
      }
    })
    .filter(Boolean)
}

// GET /api/persons — list all (with optional tree filter)
personsRouter.get('/', async (req, res) => {
  try {
    const { treeId, search } = req.query

    const persons = await db.person.findMany({
      where: {
        ...(treeId ? { trees: { some: { treeId: String(treeId) } } } : {}),
        ...(search ? {
          OR: [
            { fullName: { contains: String(search), mode: 'insensitive' } },
            { nickname: { contains: String(search), mode: 'insensitive' } },
            { aliases: { has: String(search) } },
            { birthPlace: { contains: String(search), mode: 'insensitive' } },
          ]
        } : {}),
      },
      include: {
        trees: { include: { tree: true } },
        _count: { select: { memories: true, media: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(persons)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch persons' })
  }
})

// GET /api/persons/:id — single person with all relations
personsRouter.get('/:id', async (req, res) => {
  try {
    const person = await db.person.findUnique({
      where: { id: req.params.id },
      include: {
        trees: { include: { tree: true } },
        memories: { orderBy: { createdAt: 'desc' } },
        media: true,
        relationshipsA: {
          include: { personB: true },
        },
        relationshipsB: {
          include: { personA: true },
        },
      },
    })

    if (!person) return res.status(404).json({ error: 'Person not found' })

    const treeIds = person.trees.map((entry: any) => entry.treeId)
    const treePersons = treeIds.length > 0
      ? await db.person.findMany({
          where: { trees: { some: { treeId: { in: treeIds } } } },
        })
      : [person]
    const treePersonIds = treePersons.map((entry: any) => entry.id)
    const treeRelationships = await db.relationship.findMany({
      where: {
        AND: [
          { personAId: { in: treePersonIds } },
          { personBId: { in: treePersonIds } },
        ],
      },
    })
    const peopleById = new Map(treePersons.map((entry: any) => [entry.id, entry]))
    const inferredRelationships = inferSiblingRelationships(treeRelationships, peopleById)
      .filter((relationship: any) => relationship.personAId === person.id || relationship.personBId === person.id)

    res.json({
      ...person,
      relationshipsA: [
        ...person.relationshipsA,
        ...inferredRelationships
          .filter((relationship: any) => relationship.personAId === person.id)
          .map((relationship: any) => ({ ...relationship, personB: relationship.personB })),
      ],
      relationshipsB: [
        ...person.relationshipsB,
        ...inferredRelationships
          .filter((relationship: any) => relationship.personBId === person.id)
          .map((relationship: any) => ({ ...relationship, personA: relationship.personA })),
      ],
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch person' })
  }
})

// GET /api/persons/:id/graph
personsRouter.get('/:id/graph', async (req, res) => {
  try {
    // Get the tree(s) this person belongs to
    const personWithTrees = await db.person.findUnique({
      where: { id: req.params.id },
      include: { trees: true },
    })

    if (!personWithTrees) return res.status(404).json({ error: 'Not found' })

    // Get ALL people in the same tree(s)
    const treeIds = personWithTrees.trees.map((t: any) => t.treeId)

    const allPersons = treeIds.length > 0
      ? await db.person.findMany({
          where: { trees: { some: { treeId: { in: treeIds } } } },
        })
      : [personWithTrees]

    const allPersonIds = allPersons.map((p: any) => p.id)

    // Get ALL relationships between people in this tree
    const allRelationships = await db.relationship.findMany({
      where: {
        AND: [
          { personAId: { in: allPersonIds } },
          { personBId: { in: allPersonIds } },
        ],
      },
    })

    // Build flat node + edge lists
    const nodes = allPersons.map((p: any) => ({
      id:           p.id,
      fullName:     p.fullName,
      nickname:     p.nickname,
      birthYearEst: p.birthYearEst,
      birthDateExact: p.birthDateExact,
      deathYearEst: p.deathYearEst,
      isDeceased:   p.isDeceased,
      isUncertain:  p.isUncertain,
      gender:       p.gender,
      sex:          p.sex,
    }))

    const inferredRelationships = inferSiblingRelationships(allRelationships)

    const edges = [...allRelationships, ...inferredRelationships].map((r: any) => ({
      id:             r.id,
      source:         r.personAId,
      target:         r.personBId,
      type:           r.type,
      isUncertain:    r.isUncertain,
      confidenceScore: r.confidenceScore,
      startYearEst:   r.startYearEst,
      isInferred:     r.isInferred || false,
    }))

    res.json({ nodes, edges })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to build graph' })
  }
})

// // GET /api/persons/:id/graph — person + their network (2 hops)
// personsRouter.get('/:id/graph', async (req, res) => {
//   try {
//     const person = await db.person.findUnique({
//       where: { id: req.params.id },
//       include: {
//         relationshipsA: { include: { personB: { include: {
//           relationshipsA: { include: { personB: true } },
//           relationshipsB: { include: { personA: true } },
//         }}}},
//         relationshipsB: { include: { personA: { include: {
//           relationshipsA: { include: { personB: true } },
//           relationshipsB: { include: { personA: true } },
//         }}}},
//       },
//     })

//     if (!person) return res.status(404).json({ error: 'Not found' })

//     // Build flat node + edge lists for the graph view
//     const nodes = new Map()
//     const edges: any[] = []

//     const addNode = (p: any) => {
//       if (!nodes.has(p.id)) nodes.set(p.id, {
//         id: p.id,
//         fullName: p.fullName,
//         nickname: p.nickname,
//         birthYearEst: p.birthYearEst,
//         birthDateExact: p.birthDateExact,
//         deathYearEst: p.deathYearEst,
//         isDeceased: p.isDeceased,
//         isUncertain: p.isUncertain,
//         gender: p.gender,
//       })
//     }

//     addNode(person)

//     const processRel = (rel: any, personA: any, personB: any) => {
//       addNode(personA)
//       addNode(personB)
//       edges.push({
//         id: rel.id,
//         source: personA.id,
//         target: personB.id,
//         type: rel.type,
//         isUncertain: rel.isUncertain,
//         confidenceScore: rel.confidenceScore,
//         startYearEst: rel.startYearEst,
//       })
//     }

//     person.relationshipsA.forEach((r: any) => processRel(r, person, r.personB))
//     person.relationshipsB.forEach((r: any) => processRel(r, r.personA, person))

//     res.json({
//       nodes: Array.from(nodes.values()),
//       edges,
//     })
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to build graph' })
//   }
// })

// POST /api/persons — create (all fields optional)
personsRouter.post('/', async (req, res) => {
  try {
    const {
      fullName, nickname, aliases, gender, pronouns,
      sex,
      birthYearEst, birthDateExact, birthPlace,
      currentLocation, currentAddress,
      deathYearEst, deathDateExact, deathPlace, isDeceased, isUncertain,
      profession, company, languages, interests, activities, bioNotes, visibility,
      treeId,
    } = req.body

    const person = await db.person.create({
      data: {
        fullName,
        nickname,
        aliases: aliases || [],
        gender,
        sex,
        pronouns,
        birthYearEst,
        birthDateExact: birthDateExact ? new Date(birthDateExact) : undefined,
        birthPlace,
        currentLocation,
        currentAddress,
        deathYearEst,
        deathDateExact: deathDateExact ? new Date(deathDateExact) : undefined,
        deathPlace,
        isDeceased: isDeceased || false,
        isUncertain: isUncertain || false,
        profession,
        company,
        languages: languages || [],
        interests,
        activities,
        bioNotes,
        visibility: visibility || 'PRIVATE',
        ...(treeId ? {
          trees: { create: { treeId } }
        } : {}),
      },
    })

    res.status(201).json(person)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create person' })
  }
})

// PATCH /api/persons/:id — update any fields
personsRouter.patch('/:id', async (req, res) => {
  try {
    const person = await db.person.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(person)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update person' })
  }
})

// DELETE /api/persons/:id — soft delete (set visibility to PRIVATE + flag)
personsRouter.delete('/:id', async (req, res) => {
  try {
    // Soft delete: just set visibility to PRIVATE
    // For hard delete, use db.person.delete()
    const person = await db.person.update({
      where: { id: req.params.id },
      data: { visibility: 'PRIVATE' },
    })
    res.json({ ok: true, id: person.id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete person' })
  }
})
