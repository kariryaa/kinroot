import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data (safe to re-run)
  await db.memory.deleteMany()
  await db.relationship.deleteMany()
  await db.personTree.deleteMany()
  await db.media.deleteMany()
  await db.person.deleteMany()
  await db.tree.deleteMany()
  await db.user.deleteMany()

  // ─── User ───────────────────────────────────────────
  const user = await db.user.create({
    data: {
      name: 'Ravi Sharma',
      email: 'ravi@example.com',
    },
  })
  console.log('✓ Created user:', user.name)

  // ─── Tree ───────────────────────────────────────────
  const tree = await db.tree.create({
  data: {
    name: 'Sharma family',
    description: 'Paternal lineage from Hisar, Haryana',
    color: '#b8934a',
    ownerId: user.id,
    // rootPersonId set after persons are created
  },
})
  console.log('✓ Created tree:', tree.name)

  // ─── Generation 1 — Grandparents ────────────────────
  const gopal = await db.person.create({
    data: {
      fullName: 'Gopal Sharma',
      nickname: 'Bauji',
      birthYearEst: 1928,
      birthPlace: 'Hisar, Haryana',
      deathYearEst: 1994,
      deathPlace: 'Hisar, Haryana',
      isDeceased: true,
      isUncertain: true,
      confidenceScore: 65,
      profession: 'Travelling merchant',
      languages: ['Hindi', 'Haryanvi'],
      addedById: user.id,
      trees: { create: { treeId: tree.id } },
    },
  })

  const savitri = await db.person.create({
    data: {
      fullName: 'Savitri Bai',
      nickname: 'Dadi',
      birthYearEst: 1932,
      birthPlace: 'Rohtak, Haryana',
      deathYearEst: 2008,
      deathPlace: 'Hisar, Haryana',
      isDeceased: true,
      isUncertain: true,
      confidenceScore: 70,
      languages: ['Hindi', 'Haryanvi'],
      addedById: user.id,
      trees: { create: { treeId: tree.id } },
    },
  })
  console.log('✓ Created grandparents')

  // ─── Generation 2 — Parents & Aunt ──────────────────
  const ramesh = await db.person.create({
    data: {
      fullName: 'Ramesh Sharma',
      birthYearEst: 1958,
      birthPlace: 'Hisar, Haryana',
      isDeceased: false,
      isLiving: true,
      confidenceScore: 100,
      profession: 'Retired government officer',
      languages: ['Hindi', 'Haryanvi', 'English'],
      addedById: user.id,
      trees: { create: { treeId: tree.id } },
    },
  })

  const priya = await db.person.create({
    data: {
      fullName: 'Priya Kumar',
      maidenName: 'Kumar',
      birthYearEst: 1962,
      birthPlace: 'Karnal, Haryana',
      isDeceased: false,
      isLiving: true,
      confidenceScore: 100,
      languages: ['Hindi', 'Punjabi'],
      addedById: user.id,
      trees: { create: { treeId: tree.id } },
    },
  })

  const meena = await db.person.create({
    data: {
      fullName: 'Meena Devi',
      birthYearEst: 1960,
      birthPlace: 'Hisar, Haryana',
      isDeceased: false,
      isLiving: true,
      confidenceScore: 95,
      profession: 'School teacher',
      languages: ['Hindi', 'Haryanvi'],
      addedById: user.id,
      trees: { create: { treeId: tree.id } },
    },
  })
  console.log('✓ Created generation 2')

  // ─── Generation 3 — Children ────────────────────────
  const arjun = await db.person.create({
    data: {
      fullName: 'Arjun Sharma',
      birthYearEst: 1988,
      birthPlace: 'Hisar, Haryana',
      isDeceased: false,
      isLiving: true,
      confidenceScore: 100,
      profession: 'Software engineer',
      languages: ['Hindi', 'English', 'Haryanvi'],
      addedById: user.id,
      trees: { create: { treeId: tree.id } },
    },
  })
    await db.tree.update({
        where: { id: tree.id },
        data: { rootPersonId: arjun.id },
    })

  const kavya = await db.person.create({
    data: {
      fullName: 'Kavya Sharma',
      birthYearEst: 1991,
      birthPlace: 'Hisar, Haryana',
      isDeceased: false,
      isLiving: true,
      confidenceScore: 100,
      languages: ['Hindi', 'English'],
      addedById: user.id,
      trees: { create: { treeId: tree.id } },
    },
  })
  console.log('✓ Created generation 3')

  // ─── Unknown person ──────────────────────────────────
  const unknown = await db.person.create({
    data: {
      nickname: 'Unknown man from grandfather\'s village',
      birthYearEst: 1925,
      isDeceased: true,
      isUncertain: true,
      confidenceScore: 20,
      addedById: user.id,
      trees: { create: { treeId: tree.id } },
    },
  })
  console.log('✓ Created unknown person')

  // ─── Relationships ───────────────────────────────────

  // Gopal + Savitri married
  await db.relationship.create({
    data: {
      personAId: gopal.id,
      personBId: savitri.id,
      type: 'MARRIED',
      startYearEst: 1955,
      isDirectional: false,
      isUncertain: true,
      confidenceScore: 75,
      notes: 'Arranged marriage. Exact date not confirmed.',
    },
  })

  // Gopal + Savitri → Ramesh (biological child)
  await db.relationship.create({
    data: {
      personAId: gopal.id,
      personBId: ramesh.id,
      type: 'BIOLOGICAL_PARENT',
      isDirectional: true,
      isUncertain: false,
      confidenceScore: 100,
    },
  })
  await db.relationship.create({
    data: {
      personAId: savitri.id,
      personBId: ramesh.id,
      type: 'BIOLOGICAL_PARENT',
      isDirectional: true,
      confidenceScore: 100,
    },
  })

  // Gopal + Savitri → Meena
  await db.relationship.create({
    data: {
      personAId: gopal.id,
      personBId: meena.id,
      type: 'BIOLOGICAL_PARENT',
      isDirectional: true,
      confidenceScore: 95,
    },
  })
  await db.relationship.create({
    data: {
      personAId: savitri.id,
      personBId: meena.id,
      type: 'BIOLOGICAL_PARENT',
      isDirectional: true,
      confidenceScore: 95,
    },
  })

  // Ramesh + Meena are siblings
  await db.relationship.create({
    data: {
      personAId: ramesh.id,
      personBId: meena.id,
      type: 'SIBLING',
      isDirectional: false,
      confidenceScore: 100,
    },
  })

  // Ramesh married Priya
  await db.relationship.create({
    data: {
      personAId: ramesh.id,
      personBId: priya.id,
      type: 'MARRIED',
      startYearEst: 1985,
      isDirectional: false,
      confidenceScore: 100,
    },
  })

  // Ramesh + Priya → Arjun
  await db.relationship.create({
    data: {
      personAId: ramesh.id,
      personBId: arjun.id,
      type: 'BIOLOGICAL_PARENT',
      isDirectional: true,
      confidenceScore: 100,
    },
  })
  await db.relationship.create({
    data: {
      personAId: priya.id,
      personBId: arjun.id,
      type: 'BIOLOGICAL_PARENT',
      isDirectional: true,
      confidenceScore: 100,
    },
  })

  // Ramesh + Priya → Kavya
  await db.relationship.create({
    data: {
      personAId: ramesh.id,
      personBId: kavya.id,
      type: 'BIOLOGICAL_PARENT',
      isDirectional: true,
      confidenceScore: 100,
    },
  })
  await db.relationship.create({
    data: {
      personAId: priya.id,
      personBId: kavya.id,
      type: 'BIOLOGICAL_PARENT',
      isDirectional: true,
      confidenceScore: 100,
    },
  })

  // Arjun + Kavya are siblings
  await db.relationship.create({
    data: {
      personAId: arjun.id,
      personBId: kavya.id,
      type: 'SIBLING',
      isDirectional: false,
      confidenceScore: 100,
    },
  })

  // Unknown person — possibly related to Gopal
  await db.relationship.create({
    data: {
      personAId: unknown.id,
      personBId: gopal.id,
      type: 'UNKNOWN',
      isDirectional: false,
      isUncertain: true,
      confidenceScore: 20,
      notes: 'Possibly from the same village. No confirmed relationship.',
    },
  })
  console.log('✓ Created relationships')

  // ─── Memories ────────────────────────────────────────

  await db.memory.create({
    data: {
      personId: gopal.id,
      content: 'Used to travel village-to-village selling handmade tools. Would be gone for weeks at a time.',
      attribution: 'Ramesh Sharma (son)',
      isUncertain: false,
      addedById: user.id,
    },
  })

  await db.memory.create({
    data: {
      personId: gopal.id,
      content: 'Nobody remembers his real birthday. The date in old records may have been guessed by a clerk.',
      attribution: 'Family oral history',
      isUncertain: true,
      addedById: user.id,
    },
  })

  await db.memory.create({
    data: {
      personId: savitri.id,
      content: 'Could recite dozens of folk songs from memory. Taught them to all her grandchildren.',
      attribution: 'Meena Devi (daughter)',
      isUncertain: false,
      addedById: user.id,
    },
  })

  await db.memory.create({
    data: {
      personId: arjun.id,
      content: 'Grew up in the old haveli near the grain market. Still remembers the smell of mustard fields.',
      attribution: 'Self',
      isUncertain: false,
      addedById: user.id,
    },
  })
  console.log('✓ Created memories')

  console.log('\n✅ Seed complete!')
  console.log(`   User ID:  ${user.id}`)
  console.log(`   Tree ID:  ${tree.id}`)
  console.log(`   Arjun ID: ${arjun.id}  ← use this as rootPersonId in the graph`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())