import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { CircuitBreaker } from "./circuit-breaker";
import { Semaphore } from "./concurrency";
import { checkTenantTokenCap, utcDay } from "./cost-caps";

describe("circuit breaker (P2.2)", () => {
  it("opens after the failure threshold and fails fast", () => {
    let now = 1_000_000;
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      cooldownMs: 30_000,
      now: () => now,
    });

    assert.equal(breaker.canProceed(), true);
    breaker.recordFailure();
    breaker.recordFailure();
    assert.equal(breaker.state(), "closed");
    assert.equal(breaker.canProceed(), true);
    breaker.recordFailure();
    assert.equal(breaker.state(), "open");
    assert.equal(breaker.canProceed(), false);

    now += 10_000;
    assert.equal(breaker.canProceed(), false, "still cooling down");
  });

  it("half-open admits exactly one probe; success closes, failure re-opens", () => {
    let now = 0;
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 5_000,
      now: () => now,
    });

    breaker.recordFailure();
    assert.equal(breaker.state(), "open");

    now = 5_000;
    assert.equal(breaker.state(), "half_open");
    assert.equal(breaker.canProceed(), true, "one probe allowed");
    assert.equal(breaker.canProceed(), false, "second probe refused");

    breaker.recordFailure();
    assert.equal(breaker.state(), "open", "probe failure re-opens");

    now = 10_000;
    assert.equal(breaker.canProceed(), true);
    breaker.recordSuccess();
    assert.equal(breaker.state(), "closed");
    assert.equal(breaker.canProceed(), true);
  });
});

describe("provider concurrency semaphore (P2.2)", () => {
  it("bounds concurrent holders and grants FIFO", async () => {
    const sem = new Semaphore(2);
    const order: string[] = [];

    const r1 = await sem.acquire();
    const r2 = await sem.acquire();
    assert.equal(sem.activeCount(), 2);

    const third = sem.acquire().then((release) => {
      order.push("third");
      return release;
    });
    const fourth = sem.acquire().then((release) => {
      order.push("fourth");
      return release;
    });
    assert.equal(sem.queuedCount(), 2);
    assert.deepEqual(order, [], "queued acquires must wait");

    r1();
    const r3 = await third;
    assert.deepEqual(order, ["third"], "FIFO: third before fourth");

    r2();
    const r4 = await fourth;
    assert.deepEqual(order, ["third", "fourth"]);
    assert.equal(sem.activeCount(), 2);

    r3();
    r4();
    assert.equal(sem.activeCount(), 0);
    assert.equal(sem.queuedCount(), 0);
  });

  it("double release is a no-op", async () => {
    const sem = new Semaphore(1);
    const release = await sem.acquire();
    release();
    release();
    assert.equal(sem.activeCount(), 0);
  });
});

describe("tenant cost caps (P2.2)", () => {
  const savedDbUrl = process.env.DATABASE_URL;
  const savedCap = process.env.BRAIN_TENANT_DAILY_TOKEN_CAP;

  afterEach(() => {
    if (savedDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = savedDbUrl;
    if (savedCap === undefined) delete process.env.BRAIN_TENANT_DAILY_TOKEN_CAP;
    else process.env.BRAIN_TENANT_DAILY_TOKEN_CAP = savedCap;
  });

  it("without a database the cap is not enforced (allow)", async () => {
    delete process.env.DATABASE_URL;
    const result = await checkTenantTokenCap("zynava.com");
    assert.deepEqual(result, { ok: true });
  });

  it("cap of 0 disables enforcement entirely", async () => {
    process.env.BRAIN_TENANT_DAILY_TOKEN_CAP = "0";
    process.env.DATABASE_URL = "postgres://unused";
    const result = await checkTenantTokenCap("zynava.com");
    assert.deepEqual(result, { ok: true });
  });

  it("utcDay formats a stable YYYY-MM-DD bucket", () => {
    assert.equal(utcDay(new Date("2026-07-29T23:59:59.999Z")), "2026-07-29");
    assert.equal(utcDay(new Date("2026-07-30T00:00:00.000Z")), "2026-07-30");
  });
});
