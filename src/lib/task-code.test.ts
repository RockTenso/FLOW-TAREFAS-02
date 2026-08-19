import { describe, it, expect } from "vitest";
import { formatTaskCode } from "./task-code";

describe("formatTaskCode", () => {
  it("formata com zero-padding de 6 dígitos", () => {
    expect(formatTaskCode(1)).toBe("TF-000001");
    expect(formatTaskCode(247)).toBe("TF-000247");
    expect(formatTaskCode(123456)).toBe("TF-123456");
  });

  it("mantém o prefixo TF- e cresce além de 6 dígitos", () => {
    expect(formatTaskCode(1000000)).toBe("TF-1000000");
  });
});
