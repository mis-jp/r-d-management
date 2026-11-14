import { describe, expect, it } from "vitest";
import { canClaim, canUpdateWork, canViewTask, isOpenTask } from "./permissions";

const admin = { id: "a", role: "ADMIN" as const };
const emp = { id: "e1", role: "EMPLOYEE" as const };
const other = { id: "e2", role: "EMPLOYEE" as const };

const open = { assigneeId: null, status: "NOT_STARTED" as const, isArchived: false };
const mine = { assigneeId: "e1", status: "IN_PROGRESS" as const, isArchived: false };

describe("permissions", () => {
  it("OPEN means unassigned, active and not archived", () => {
    expect(isOpenTask(open)).toBe(true);
    expect(isOpenTask({ ...open, status: "COMPLETED" })).toBe(false);
    expect(isOpenTask({ ...open, status: "CANCELLED" })).toBe(false);
    expect(isOpenTask({ ...open, isArchived: true })).toBe(false);
    expect(isOpenTask(mine)).toBe(false);
  });

  it("employees only see their own tasks and OPEN tasks", () => {
    expect(canViewTask(emp, mine)).toBe(true);
    expect(canViewTask(other, mine)).toBe(false);
    expect(canViewTask(other, open)).toBe(true);
    expect(canViewTask(emp, { ...mine, isArchived: true })).toBe(false);
    expect(canViewTask(admin, { ...mine, isArchived: true })).toBe(true);
  });

  it("only the assignee or an admin can update work", () => {
    expect(canUpdateWork(emp, mine)).toBe(true);
    expect(canUpdateWork(other, mine)).toBe(false);
    expect(canUpdateWork(emp, open)).toBe(false);
    expect(canUpdateWork(admin, open)).toBe(true);
  });

  it("only employees can claim, and only OPEN tasks", () => {
    expect(canClaim(emp, open)).toBe(true);
    expect(canClaim(admin, open)).toBe(false);
    expect(canClaim(other, mine)).toBe(false);
  });
});
