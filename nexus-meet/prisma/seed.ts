import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
    // Create two users
    const host = await prisma.user.upsert({
        where: { email: "host@nexus.dev" },
        update: {},
        create: {
            email: "host@nexus.dev",
            name: "Alice Host",
            passwordHash: "password123",  // dev only — use bcrypt in production
            role: "HOST",
        },
    });

    const participant = await prisma.user.upsert({
        where: { email: "bob@nexus.dev" },
        update: {},
        create: {
            email: "bob@nexus.dev",
            name: "Bob Participant",
            passwordHash: "password123",
            role: "PARTICIPANT",
        },
    });

    // Create a meeting and add both users to participant_list
    const meeting = await prisma.meeting.create({
        data: {
            title: "Test Meeting",
            hostId: host.id,
            scheduledAt: new Date(),
            status: "ACTIVE",
            participants: {
                create: [
                    { userId: host.id },
                    { userId: participant.id },
                ],
            },
        },
    });

    console.log(`✅ Seeded meeting: ${meeting.id}`);
    console.log(`   Host:        ${host.id}`);
    console.log(`   Participant: ${participant.id}`);
}

main().then(() => prisma.$disconnect());