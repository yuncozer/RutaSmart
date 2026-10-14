import { describe, expect, it } from "vitest";
import { dbErrorMessage, emptyToNull } from "./errors";

describe("dbErrorMessage", () => {
  it("traduce el límite de buses", () => {
    expect(
      dbErrorMessage({
        code: "P0001",
        message: "bus_limit_exceeded",
        details: "La suscripción cubre 3 buses.",
      }),
    ).toContain("límite de buses");
  });
  it("traduce duplicados", () => {
    expect(dbErrorMessage({ code: "23505", message: "duplicate key" })).toContain("duplicado");
  });
});

describe("emptyToNull", () => {
  it("convierte vacío en null", () => {
    expect(emptyToNull("  ")).toBeNull();
    expect(emptyToNull(" x ")).toBe("x");
    expect(emptyToNull(null)).toBeNull();
  });
});
