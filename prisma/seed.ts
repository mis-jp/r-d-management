/**
 * Local development seed. Creates demo accounts with a shared, non-production password.
 * Refuses to run when NODE_ENV=production.
 */
import { PrismaClient, type Priority, type TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo accounts in production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Password123!";
const DAY = 86_400_000;

const now = new Date();
const daysAgo = (n: number, hour = 10) => {
  const d = new Date(now.getTime() - n * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};
/** Calendar date stored at 12:00 UTC (matches the app's date-only convention). */
const dateOnly = (offsetDays: number) => {
  const d = new Date(now.getTime() + offsetDays * DAY);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
};

const people = {
  admin: { name: "Dr. Elena Cruz", email: "admin@rnd.local", role: "ADMIN" as const, jobTitle: "Head of R&D", color: "#4f46e5" },
  maria: { name: "Maria Santos", email: "maria.santos@rnd.local", role: "EMPLOYEE" as const, jobTitle: "Senior Research Engineer", color: "#0891b2" },
  james: { name: "James Lee", email: "james.lee@rnd.local", role: "EMPLOYEE" as const, jobTitle: "Firmware Engineer", color: "#059669" },
  aisha: { name: "Aisha Khan", email: "aisha.khan@rnd.local", role: "EMPLOYEE" as const, jobTitle: "Materials Scientist", color: "#d97706" },
  carlos: { name: "Carlos Reyes", email: "carlos.reyes@rnd.local", role: "EMPLOYEE" as const, jobTitle: "Test Engineer", color: "#dc2626" },
  nina: { name: "Nina Patel", email: "nina.patel@rnd.local", role: "EMPLOYEE" as const, jobTitle: "Data Analyst", color: "#7c3aed" },
  tom: { name: "Tom Becker", email: "tom.becker@rnd.local", role: "EMPLOYEE" as const, jobTitle: "Lab Technician", color: "#475569", inactive: true },
};
type PersonKey = keyof typeof people;

const tagDefs = [
  ["Firmware", "#6366f1"],
  ["Hardware", "#0ea5e9"],
  ["Materials", "#10b981"],
  ["Testing", "#f59e0b"],
  ["Documentation", "#64748b"],
  ["Prototype", "#ec4899"],
  ["Research", "#8b5cf6"],
  ["Data Analysis", "#ef4444"],
] as const;
type TagName = (typeof tagDefs)[number][0];

type SeedComment = { by: PersonKey; body: string; daysAgo: number; update?: boolean };
type SeedTask = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: PersonKey | null;
  claimed?: boolean;
  created: number;
  due: number | null;
  start?: number;
  progress: number;
  completed?: number;
  estimateH?: number;
  actualH?: number;
  tags: TagName[];
  comments?: SeedComment[];
};

const tasks: SeedTask[] = [
  {
    title: "Characterize thermal drift of TS-200 sensor",
    description: "Run the TS-200 through the -20°C to 85°C sweep and log drift every 5°C.\n\nAcceptance: drift curve + recommended compensation coefficients.",
    status: "IN_PROGRESS", priority: "HIGH", assignee: "maria", created: 24, due: 6, start: 20, progress: 60, estimateH: 24, actualH: 14,
    tags: ["Hardware", "Testing"],
    comments: [
      { by: "maria", body: "Sweep rig is calibrated. First pass shows ~0.3% drift above 70°C.", daysAgo: 10, update: true },
      { by: "admin", body: "Great start. Can you also capture humidity during the runs?", daysAgo: 9 },
      { by: "maria", body: "Yes — added the humidity logger. Second pass in progress.", daysAgo: 3, update: true },
    ],
  },
  {
    title: "Firmware: low-power sleep mode for controller board",
    description: "Implement deep-sleep mode on the v3 controller. Target < 50 µA idle current.",
    status: "IN_REVIEW", priority: "URGENT", assignee: "james", created: 30, due: 2, start: 28, progress: 100, estimateH: 40, actualH: 38,
    tags: ["Firmware", "Prototype"],
    comments: [
      { by: "james", body: "Measured 42 µA idle. Submitting for review — branch fw/sleep-mode.", daysAgo: 1, update: true },
    ],
  },
  {
    title: "Literature review: biodegradable polymer housings",
    description: "Summarize the last 5 years of research on PLA/PHA blends for electronics housings. Focus on heat resistance.",
    status: "COMPLETED", priority: "NORMAL", assignee: "aisha", created: 45, due: -20, start: 44, progress: 100, completed: 22, estimateH: 16, actualH: 18,
    tags: ["Materials", "Research", "Documentation"],
    comments: [{ by: "aisha", body: "Report uploaded to the shared drive; 3 candidate blends identified.", daysAgo: 22, update: true }],
  },
  {
    title: "Build automated regression rig for sensor boards",
    description: "Python + PLC rig that runs the 40-step functional test on every new board revision.",
    status: "IN_PROGRESS", priority: "HIGH", assignee: "carlos", claimed: true, created: 18, due: -3, start: 15, progress: 45, estimateH: 32, actualH: 20,
    tags: ["Testing", "Hardware"],
    comments: [{ by: "carlos", body: "Blocked for two days waiting on relay modules; they arrived today.", daysAgo: 4, update: true }],
  },
  {
    title: "Analyze field-return failure data (Q3)",
    description: "Cluster the Q3 field returns by failure mode and estimate root-cause distribution.",
    status: "COMPLETED", priority: "HIGH", assignee: "nina", created: 35, due: -12, start: 34, progress: 100, completed: 14, estimateH: 20, actualH: 17,
    tags: ["Data Analysis"],
  },
  {
    title: "Draft test plan for v4 enclosure drop tests",
    description: "Define drop heights, orientations and pass/fail criteria for the v4 enclosure.",
    status: "NOT_STARTED", priority: "NORMAL", assignee: "carlos", created: 5, due: 12, progress: 0, estimateH: 6,
    tags: ["Testing", "Documentation"],
  },
  {
    title: "Evaluate alternative MCU for cost reduction",
    description: "Compare three candidate MCUs on price, peripheral fit and toolchain support. Recommend one.",
    status: "ON_HOLD", priority: "LOW", assignee: "james", created: 40, due: 20, start: 38, progress: 30, estimateH: 12, actualH: 4,
    tags: ["Firmware", "Research"],
    comments: [{ by: "admin", body: "Putting this on hold until procurement confirms 2027 pricing.", daysAgo: 25 }],
  },
  {
    title: "Coating adhesion tests on new substrate",
    description: "Cross-hatch adhesion tests (ASTM D3359) for the two coating candidates on the new substrate.",
    status: "IN_PROGRESS", priority: "NORMAL", assignee: "aisha", claimed: true, created: 12, due: 9, start: 10, progress: 35, estimateH: 10, actualH: 3,
    tags: ["Materials", "Testing"],
  },
  {
    title: "Dashboard for lab equipment utilization",
    description: "Build a small dashboard from the equipment booking export showing utilization per instrument.",
    status: "COMPLETED", priority: "LOW", assignee: "nina", claimed: true, created: 60, due: -40, start: 58, progress: 100, completed: 41, estimateH: 8, actualH: 9,
    tags: ["Data Analysis"],
  },
  {
    title: "Update bring-up guide for controller v3",
    description: "Refresh the bring-up guide with the new programming header pinout and flashing steps.",
    status: "COMPLETED", priority: "NORMAL", assignee: "james", created: 20, due: -5, progress: 100, completed: 6, estimateH: 4, actualH: 3,
    tags: ["Documentation", "Firmware"],
  },
  {
    title: "Prototype: haptic feedback module",
    description: "Hand-wire a proof-of-concept haptic module using the LRA driver eval board.",
    status: "IN_PROGRESS", priority: "NORMAL", assignee: "maria", created: 8, due: 15, start: 7, progress: 20, estimateH: 16, actualH: 3,
    tags: ["Prototype", "Hardware"],
  },
  {
    title: "Statistical analysis of solder joint X-ray data",
    description: "Determine whether void percentage correlates with reflow profile variant.",
    status: "IN_REVIEW", priority: "NORMAL", assignee: "nina", created: 14, due: 1, start: 12, progress: 95, estimateH: 12, actualH: 11,
    tags: ["Data Analysis", "Testing"],
  },
  {
    title: "Investigate intermittent I2C bus lockups",
    description: "Customer units occasionally lock the I2C bus after brown-outs. Reproduce and propose a fix.",
    status: "NOT_STARTED", priority: "URGENT", assignee: "james", created: 2, due: 4, progress: 0, estimateH: 10,
    tags: ["Firmware"],
  },
  {
    title: "Cancelled: evaluate legacy battery chemistry",
    description: "Superseded by the new cell supplier decision.",
    status: "CANCELLED", priority: "LOW", assignee: "aisha", created: 50, due: -30, progress: 10, estimateH: 6,
    tags: ["Materials"],
  },
  {
    title: "Measure EMI emissions of power stage rev B",
    description: "Pre-compliance radiated emissions scan for the rev B power stage.",
    status: "COMPLETED", priority: "HIGH", assignee: "carlos", created: 28, due: -8, start: 26, progress: 100, completed: 9, estimateH: 8, actualH: 10,
    tags: ["Testing", "Hardware"],
  },
  {
    title: "Write materials safety data summary",
    description: "One-page summary of SDS information for the new adhesives used in the lab.",
    status: "COMPLETED", priority: "LOW", assignee: "aisha", created: 9, due: 3, progress: 100, completed: 2, estimateH: 3, actualH: 2,
    tags: ["Documentation", "Materials"],
  },
  // OPEN tasks (unassigned, available to claim)
  {
    title: "Benchmark three thermal interface materials",
    description: "Compare thermal resistance of three TIM candidates on the standard heat-sink fixture.",
    status: "NOT_STARTED", priority: "HIGH", assignee: null, created: 3, due: 14, progress: 0, estimateH: 12,
    tags: ["Materials", "Testing"],
  },
  {
    title: "Port sensor driver to new RTOS",
    description: "Port the TS-200 driver from bare-metal to the RTOS HAL. Include unit tests.",
    status: "NOT_STARTED", priority: "NORMAL", assignee: null, created: 4, due: 21, progress: 0, estimateH: 20,
    tags: ["Firmware"],
  },
  {
    title: "Create onboarding checklist for lab safety",
    description: "Checklist for new hires covering PPE, chemical storage and equipment lock-out.",
    status: "NOT_STARTED", priority: "LOW", assignee: null, created: 6, due: null, progress: 0, estimateH: 4,
    tags: ["Documentation"],
  },
  {
    title: "Analyze accelerated aging results for gaskets",
    description: "Fit Arrhenius model to the 1,000-hour aging data and estimate 10-year compression set.",
    status: "NOT_STARTED", priority: "URGENT", assignee: null, created: 1, due: 5, progress: 0, estimateH: 8,
    tags: ["Data Analysis", "Materials"],
  },
  {
    title: "3D-print fixture for connector pull tests",
    description: "Design and print a fixture that holds the board for 90° connector pull tests.",
    status: "NOT_STARTED", priority: "NORMAL", assignee: null, created: 2, due: 10, progress: 0, estimateH: 5,
    tags: ["Prototype", "Testing"],
  },
];

async function main() {
  console.log("Clearing existing data…");
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sequence.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const ids = {} as Record<PersonKey, string>;
  for (const [key, p] of Object.entries(people) as [PersonKey, (typeof people)[PersonKey]][]) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        role: p.role,
        passwordHash,
        jobTitle: p.jobTitle,
        department: "Research & Development",
        avatarColor: p.color,
        isActive: !("inactive" in p && p.inactive),
        createdAt: daysAgo(90),
      },
    });
    ids[key] = user.id;
  }

  const tagIds = {} as Record<TagName, string>;
  for (const [name, color] of tagDefs) {
    tagIds[name] = (await prisma.tag.create({ data: { name, color } })).id;
  }

  // Oldest first so task keys follow creation order.
  const ordered = [...tasks].sort((a, b) => b.created - a.created);
  let seq = 0;
  for (const t of ordered) {
    seq += 1;
    const createdAt = daysAgo(t.created, 9);
    const claimedAt = t.claimed ? new Date(createdAt.getTime() + DAY / 2) : null;
    const completedAt = t.completed !== undefined ? daysAgo(t.completed, 16) : null;
    const task = await prisma.task.create({
      data: {
        taskKey: `RD-${String(seq).padStart(3, "0")}`,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        assigneeId: t.assignee ? ids[t.assignee] : null,
        createdById: ids.admin,
        startDate: t.start !== undefined ? dateOnly(-t.start) : null,
        dueDate: t.due !== null ? dateOnly(t.due) : null,
        completedAt,
        claimedAt,
        estimatedMinutes: t.estimateH ? t.estimateH * 60 : null,
        actualMinutes: t.actualH ? t.actualH * 60 : null,
        createdAt,
        tags: { connect: t.tags.map((name) => ({ id: tagIds[name] })) },
      },
    });

    const assigneeId = t.assignee ? ids[t.assignee] : null;
    const assigneeRef = t.assignee ? { id: ids[t.assignee], name: people[t.assignee].name } : null;
    const log: Parameters<typeof prisma.activityLog.create>[0]["data"][] = [
      {
        taskId: task.id,
        actorId: ids.admin,
        action: "TASK_CREATED",
        newValue: { title: t.title, assignee: t.claimed ? null : assigneeRef, mode: t.claimed || !t.assignee ? "OPEN" : "ASSIGN" },
        createdAt,
      },
    ];
    if (t.claimed && assigneeId && claimedAt) {
      log.push({ taskId: task.id, actorId: assigneeId, subjectUserId: assigneeId, action: "TASK_CLAIMED", newValue: { assignee: assigneeRef }, createdAt: claimedAt });
    }
    const worker = assigneeId ?? ids.admin;
    if (t.status !== "NOT_STARTED" && t.status !== "CANCELLED") {
      log.push({
        taskId: task.id,
        actorId: worker,
        action: "STATUS_CHANGED",
        oldValue: { status: "NOT_STARTED" },
        newValue: { status: "IN_PROGRESS" },
        createdAt: daysAgo(t.start ?? Math.max(t.created - 1, 0), 11),
      });
    }
    if (t.status === "IN_REVIEW") {
      log.push({ taskId: task.id, actorId: worker, action: "STATUS_CHANGED", oldValue: { status: "IN_PROGRESS" }, newValue: { status: "IN_REVIEW" }, createdAt: daysAgo(1, 15) });
    }
    if (t.status === "ON_HOLD") {
      log.push({ taskId: task.id, actorId: ids.admin, action: "STATUS_CHANGED", oldValue: { status: "IN_PROGRESS" }, newValue: { status: "ON_HOLD" }, createdAt: daysAgo(25, 12) });
    }
    if (t.status === "CANCELLED") {
      log.push({ taskId: task.id, actorId: ids.admin, action: "STATUS_CHANGED", oldValue: { status: "NOT_STARTED" }, newValue: { status: "CANCELLED" }, createdAt: daysAgo(30, 12) });
    }
    if (t.status === "COMPLETED" && completedAt) {
      log.push({ taskId: task.id, actorId: worker, action: "TASK_COMPLETED", oldValue: { status: "IN_PROGRESS" }, newValue: { status: "COMPLETED" }, createdAt: completedAt });
    }

    for (const c of t.comments ?? []) {
      const at = daysAgo(c.daysAgo, 14);
      const comment = await prisma.comment.create({
        data: { taskId: task.id, authorId: ids[c.by], body: c.body, kind: c.update ? "PROGRESS_UPDATE" : "COMMENT", createdAt: at },
      });
      log.push({ taskId: task.id, actorId: ids[c.by], action: "COMMENT_ADDED", newValue: { commentId: comment.id, kind: comment.kind }, createdAt: at });
      if (c.by === "admin" && assigneeId) {
        await prisma.notification.create({
          data: { recipientId: assigneeId, taskId: task.id, type: "COMMENT_ADDED", message: `${people.admin.name} commented on ${task.taskKey}.`, isRead: c.daysAgo > 5, createdAt: at },
        });
      }
    }
    for (const entry of log) await prisma.activityLog.create({ data: entry });

    // Notifications
    if (assigneeId && !t.claimed) {
      await prisma.notification.create({
        data: { recipientId: assigneeId, taskId: task.id, type: "TASK_ASSIGNED", message: `${people.admin.name} assigned you ${task.taskKey}: ${task.title}`, isRead: t.created > 3, createdAt },
      });
    }
    if (t.claimed && t.assignee && claimedAt) {
      await prisma.notification.create({
        data: { recipientId: ids.admin, taskId: task.id, type: "TASK_CLAIMED", message: `${people[t.assignee].name} claimed ${task.taskKey}: ${task.title}`, isRead: true, createdAt: claimedAt },
      });
    }
    if (t.status === "IN_REVIEW" && t.assignee) {
      await prisma.notification.create({
        data: { recipientId: ids.admin, taskId: task.id, type: "TASK_SUBMITTED_FOR_REVIEW", message: `${people[t.assignee].name} submitted ${task.taskKey}: ${task.title} for review.`, createdAt: daysAgo(1, 15) },
      });
    }
    if (t.status === "COMPLETED" && t.assignee && completedAt) {
      await prisma.notification.create({
        data: { recipientId: ids.admin, taskId: task.id, type: "TASK_COMPLETED", message: `${people[t.assignee].name} completed ${task.taskKey}: ${task.title}.`, isRead: (t.completed ?? 0) > 3, createdAt: completedAt },
      });
    }
  }

  await prisma.sequence.create({ data: { name: "task", value: seq } });
  await prisma.activityLog.create({
    data: { actorId: ids.admin, subjectUserId: ids.tom, action: "USER_DEACTIVATED", createdAt: daysAgo(20) },
  });

  console.log(`Seeded ${Object.keys(people).length} users, ${tagDefs.length} tags and ${seq} tasks.`);
  console.log(`Demo password for every account: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
