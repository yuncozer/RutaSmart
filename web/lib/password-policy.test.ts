import { describe, expect, it } from "vitest";
import { isAllowedWhilePasswordPending, mustChangePassword } from "./password-policy";

describe("política de contraseña temporal", () => {
  it("detecta la marca en app_metadata", () => {
    expect(mustChangePassword({ app_metadata: { must_change_password: true } })).toBe(true);
    expect(mustChangePassword({ app_metadata: { must_change_password: false } })).toBe(false);
    expect(mustChangePassword({ app_metadata: {} })).toBe(false);
    expect(mustChangePassword(null)).toBe(false);
  });

  it("solo permite cambiar la clave o cerrar sesión mientras está pendiente", () => {
    expect(isAllowedWhilePasswordPending("/actualizar-clave")).toBe(true);
    expect(isAllowedWhilePasswordPending("/auth/salir")).toBe(true);
    expect(isAllowedWhilePasswordPending("/app")).toBe(false);
    expect(isAllowedWhilePasswordPending("/admin/organizaciones")).toBe(false);
    expect(isAllowedWhilePasswordPending("/")).toBe(false);
  });
});
