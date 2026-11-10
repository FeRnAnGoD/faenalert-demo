import assert from "node:assert/strict";
import { afterEach, beforeEach, it } from "node:test";
import { Injector, runInInjectionContext } from "@angular/core";
import { ApiFailure, ApiService } from "../src/app/platform/api.service";
import { SessionService } from "../src/app/platform/session.service";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

const originalFetch = globalThis.fetch;
let session: SessionService;
let api: ApiService;
let injector: ReturnType<typeof Injector.create>;

beforeEach(() => {
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
  session = new SessionService();
  injector = Injector.create({
    providers: [{ provide: SessionService, useValue: session }],
  });
  api = runInInjectionContext(injector, () => new ApiService());
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  injector.destroy();
});

it("returns to an unauthenticated state when the active token receives 401", async () => {
  session.establish("expired-token", "user-1");
  sessionStorage.setItem("faenalert.site", "site-1");
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Sesión vencida" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(api.request("sites/site-1/search"), (error: unknown) => {
    assert.ok(error instanceof ApiFailure);
    assert.equal(error.status, 401);
    return true;
  });

  assert.equal(session.token(), "");
  assert.equal(session.userId(), "");
  assert.equal(sessionStorage.getItem("faenalert.site"), null);
  assert.equal(session.expired(), true);
});

it("does not treat an unauthenticated login failure as an expired session", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Credenciales inválidas" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(api.request("auth/login", "POST", {}));

  assert.equal(session.expired(), false);
});

it("ignores late responses from a session that has already changed", async () => {
  session.establish("old-token", "old-user");
  let resolveFetch!: (response: Response) => void;
  globalThis.fetch = () =>
    new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
  const pending = api.request("sites/site-1/records/meetings");
  session.establish("new-token", "new-user");
  resolveFetch(new Response(JSON.stringify({ items: [] }), { status: 200 }));

  await assert.rejects(pending, (error: unknown) => {
    assert.ok(error instanceof ApiFailure);
    assert.match(error.message, /La sesión cambió/);
    return true;
  });

  assert.equal(session.token(), "new-token");
  assert.equal(session.userId(), "new-user");
  assert.equal(session.expired(), false);
});
