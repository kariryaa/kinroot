import { Router } from 'express'
import { db } from '../db.js'

export const relationshipsRouter = Router()

// POST /api/relationships
relationshipsRouter.post('/', async (req, res) => {
  try {
    const {
      personAId, personBId, type, customType,
      isDirectional, startYearEst, endYearEst,
      isUncertain, confidenceScore, notes, sourceNote,
      visibility,
    } = req.body

    if (!personAId || !personBId || !type) {
      return res.status(400).json({ error: 'personAId, personBId, and type are required' })
    }

    const relationship = await db.relationship.create({
      data: {
        personAId, personBId, type, customType,
        isDirectional: isDirectional || false,
        startYearEst, endYearEst,
        isUncertain: isUncertain || false,
        confidenceScore,
        notes, sourceNote,
        visibility: visibility || 'PRIVATE',
      },
      include: {
        personA: true,
        personB: true,
      },
    })

    res.status(201).json(relationship)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create relationship' })
  }
})

// DELETE /api/relationships/:id
relationshipsRouter.delete('/:id', async (req, res) => {
  try {
    await db.relationship.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete relationship' })
  }
})
