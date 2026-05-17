-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'SHARED', 'FAMILY_ONLY', 'CONTRIBUTORS_ONLY', 'PRIVATE', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('BIOLOGICAL_PARENT', 'ADOPTIVE_PARENT', 'FOSTER_PARENT', 'STEP_PARENT', 'GUARDIAN', 'SURROGATE_PARENT', 'UNKNOWN_PARENT', 'MARRIED', 'DIVORCED', 'ENGAGED', 'PARTNER', 'LIFE_PARTNER', 'SEPARATED', 'WIDOWED', 'FORMER_PARTNER', 'SIBLING', 'HALF_SIBLING', 'STEP_SIBLING', 'COUSIN', 'GRANDPARENT', 'AUNT_UNCLE', 'NIECE_NEPHEW', 'MENTOR', 'CARETAKER', 'FRIEND', 'COMMUNITY', 'TEACHER', 'STUDENT', 'BUSINESS', 'PET', 'CUSTOM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'DOCUMENT', 'AUDIO', 'VIDEO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tree" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "nickname" TEXT,
    "aliases" TEXT[],
    "maidenName" TEXT,
    "nativeNameScript" TEXT,
    "gender" TEXT,
    "pronouns" TEXT,
    "birthDateExact" TIMESTAMP(3),
    "birthYearEst" INTEGER,
    "birthAgeMin" INTEGER,
    "birthAgeMax" INTEGER,
    "birthPlace" TEXT,
    "deathDateExact" TIMESTAMP(3),
    "deathYearEst" INTEGER,
    "deathPlace" TEXT,
    "causeOfDeath" TEXT,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "isLiving" BOOLEAN,
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" INTEGER,
    "profession" TEXT,
    "education" TEXT,
    "religion" TEXT,
    "community" TEXT,
    "languages" TEXT[],
    "skills" TEXT[],
    "achievements" TEXT[],
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonTree" (
    "personId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,

    CONSTRAINT "PersonTree_pkey" PRIMARY KEY ("personId","treeId")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "personAId" TEXT NOT NULL,
    "personBId" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "customType" TEXT,
    "isDirectional" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "startYearEst" INTEGER,
    "endDate" TIMESTAMP(3),
    "endYearEst" INTEGER,
    "isOngoing" BOOLEAN NOT NULL DEFAULT true,
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" INTEGER,
    "notes" TEXT,
    "sourceNote" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "attribution" TEXT,
    "addedById" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "takenYear" INTEGER,
    "takenPlace" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Tree" ADD CONSTRAINT "Tree_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonTree" ADD CONSTRAINT "PersonTree_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonTree" ADD CONSTRAINT "PersonTree_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_personAId_fkey" FOREIGN KEY ("personAId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_personBId_fkey" FOREIGN KEY ("personBId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Memory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
