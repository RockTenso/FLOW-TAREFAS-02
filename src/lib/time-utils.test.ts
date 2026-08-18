import { describe, it, expect } from "vitest";
import { entrySeconds, totalSeconds, findActiveEntry } from "./time-utils";

describe("entrySeconds", () => {
  it("usa durationSeconds quando a sessão está encerrada", () => {
    expect(
      entrySeconds({ startedAt: "2026-08-18T09:00:00", endedAt: "2026-08-18T09:45:00", durationSeconds: 2700 }),
    ).toBe(2700);
  });

  it("calcula pela diferença quando encerrada sem durationSeconds", () => {
    expect(
      entrySeconds({ startedAt: "2026-08-18T09:00:00", endedAt: "2026-08-18T09:30:00", durationSeconds: null }),
    ).toBe(1800);
  });

  it("sessão ativa calcula até `now`", () => {
    const started = "2026-08-18T09:00:00";
    const now = new Date("2026-08-18T09:00:10").getTime();
    expect(entrySeconds({ startedAt: started, endedAt: null, durationSeconds: null }, now)).toBe(10);
  });
});

describe("totalSeconds", () => {
  it("soma sessões encerradas e a ativa", () => {
    const now = new Date("2026-08-18T10:00:30").getTime();
    const entries = [
      { startedAt: "2026-08-18T09:00:00", endedAt: "2026-08-18T09:45:00", durationSeconds: 2700 },
      { startedAt: "2026-08-18T10:00:00", endedAt: null, durationSeconds: null },
    ];
    expect(totalSeconds(entries, now)).toBe(2700 + 30);
  });
});

describe("findActiveEntry", () => {
  it("encontra a sessão sem endedAt", () => {
    const active = { id: "b", endedAt: null };
    expect(
      findActiveEntry([{ id: "a", endedAt: "2026-08-18T09:00:00" }, active]),
    ).toBe(active);
  });
  it("retorna undefined quando não há sessão ativa", () => {
    expect(findActiveEntry([{ id: "a", endedAt: "2026-08-18T09:00:00" }])).toBeUndefined();
  });
});
