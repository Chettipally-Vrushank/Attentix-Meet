import { prisma } from "./apps/signal/src/db/client.ts";

async function run() {
  const meetings = await prisma.meeting.findMany();
  console.log("ALL MEETINGS:", meetings);
  
  const participants = await prisma.meetingParticipant.findMany();
  console.log("ALL PARTICIPANTS:", participants);

  const logs = await prisma.engagementLog.findMany();
  console.log("LOGS COUNT:", logs.length);
}

run().catch(console.error);
