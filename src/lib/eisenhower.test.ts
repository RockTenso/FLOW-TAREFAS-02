import { describe, it, expect } from "vitest";
import {
  computeUrgency,
  isUrgent,
  isImportant,
  computeQuadrant,
} from "./eisenhower";

const now = new Date("2026-08-18T09:00:00");
const days = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d;
};

describe("computeUrgency", () => {
  it("sem prazo => NONE", () => {
    expect(computeUrgency(null, now)).toBe("NONE");
  });
  it("prazo no passado => OVERDUE", () => {
    expect(computeUrgency(days(-1), now)).toBe("OVERDUE");
  });
  it("vence hoje => TODAY", () => {
    expect(computeUrgency(days(0), now)).toBe("TODAY");
  });
  it("1 a 2 dias => SOON", () => {
    expect(computeUrgency(days(2), now)).toBe("SOON");
  });
  it("3 a 7 dias => MEDIUM", () => {
    expect(computeUrgency(days(5), now)).toBe("MEDIUM");
  });
  it("mais de 7 dias => LOW", () => {
    expect(computeUrgency(days(10), now)).toBe("LOW");
  });
});

describe("isUrgent / isImportant", () => {
  it("urgência crítica/alta é urgente", () => {
    expect(isUrgent("OVERDUE")).toBe(true);
    expect(isUrgent("TODAY")).toBe(true);
    expect(isUrgent("SOON")).toBe(true);
  });
  it("média/baixa/none não é urgente", () => {
    expect(isUrgent("MEDIUM")).toBe(false);
    expect(isUrgent("LOW")).toBe(false);
    expect(isUrgent("NONE")).toBe(false);
  });
  it("HIGH e MEDIUM são importantes; LOW não", () => {
    expect(isImportant("HIGH")).toBe(true);
    expect(isImportant("MEDIUM")).toBe(true);
    expect(isImportant("LOW")).toBe(false);
  });
});

describe("computeQuadrant", () => {
  it("importante + urgente => FAZER AGORA", () => {
    expect(computeQuadrant("HIGH", days(0), now)).toBe("DO_NOW");
  });
  it("importante + não urgente => PLANEJAR", () => {
    expect(computeQuadrant("HIGH", days(10), now)).toBe("PLAN");
  });
  it("não importante + urgente => DELEGAR", () => {
    expect(computeQuadrant("LOW", days(0), now)).toBe("DELEGATE");
  });
  it("não importante + não urgente => ELIMINAR", () => {
    expect(computeQuadrant("LOW", days(30), now)).toBe("ELIMINATE");
  });
  it("importante sem prazo => PLANEJAR (não urgente)", () => {
    expect(computeQuadrant("MEDIUM", null, now)).toBe("PLAN");
  });
});
