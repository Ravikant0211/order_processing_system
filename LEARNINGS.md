#### QUIZ QUESTIONS

1. **Why does catalog-service get its own MongoDB database instead of sharing one with order-service?**

**Answer**: A database has no concept of "this table belongs to service A". Anyone with a connection string can read or write any collection. If `order-service` and `catalog-service` shared one MongoDB, the only thing enforcing "catalog owns products" would be a comment or a slack message telling people not to touch it - a social convention, not a technical one. Giving each service its own database makes the boundary something network topology enforces.


2. **What would actually go wrong later if order-service just queried catalog's MongoDB collection directly instead of going through catalog's API?**

**Answer**: If order-service queries the catalog's MongoDB collection directly, the business rules defined in catalog's service can't be enforced to the order-service, because they resides in the function calls of catalog's service. What that means is order-service can turn the stock quantity to negative, which is not possible.


3. **Why doesn't a timeout alone solve the "catalog-service is down" problem?**

**Answer**: **a timeout only bounds how long you wait — it does nothing to change the outcome**. As long as catalog-service is actually down, every single request through order-service still ends in failure; the timeout just makes that failure arrive in 3 seconds instead of never. It's a resource-protection mechanism (frees the socket/memory faster), not an availability mechanism — it can't make an order succeed when the dependency it needs is dead. That's the gap retry and breaker are each trying to close in different ways.


4. **What's the actual difference between what retry fixes and what a circuit breaker fixes?**

**Answer**:  **retry assumes the failure is transient** — a blip worth re-trying, decided fresh on every single request with no memory of what happened last time. **A circuit breaker assumes the failure might be sustained** — it accumulates evidence across requests and, once convinced, stops anyone from calling at all for a while. Put differently: retry answers "should this request try again?" per request; breaker answers "should anyone be calling this dependency right now?" as a shared, standing answer. That's why breaker needs state and retry doesn't — they're solving different-shaped problems, not the same problem at different intensities.


5. **Trace it through**: if `catalog-service` died and `order-service` had a timeout and retry, but no circuit breaker, what happens as order volume increases? Walk me through the mechanism, not just the outcome.

**Answer**: each order request now makes up to 3 calls to catalog-service (1 + 2 retries), so N concurrent orders becomes up to 3N calls hammering a dependency that's already dead — while each of those N customer-facing requests is also now taking up to ~9.7s to fail instead of the ~3s a bare timeout would've given them. So retry, without a breaker, actually partially undid what the timeout alone had already fixed: it reintroduced a version of the original resource-exhaustion problem (sockets/memory held open longer, per request), just capped at ~10s instead of forever. That's exactly the case a breaker was built for.


6. **Why is order.created published fire-and-forget, instead of order-service waiting for confirmation that notification-service actually received and processed it?**

**Answer**: Because `order.created` is a fact that notification service can react to. The order service must not halt the creation of order in the wait of notification-service processing, the order creation must go ahead even if the notification-service is down. Since it doesn't make sense to disregard the order creation if notification-service is not able to process the message.
The order service pushes the order.created events to the queue and the notification-service react on them at it's own pace. This also decouples the order service and notification-services.


7. **Trace it through**: _what happens to the message — and to notification-service — if the process crashed right after the console.log line but before channel.ack(msg) ran?_

**Answer**: The message will stay in the queue as `Unacked` in case of `noAck: false`. And it will be redelivered to another free worker after a delay. The notification-service, when live again, will connect to the queue and consume that message again. Since redeliveries comes with duplicacy the notification-service must be idempotent.


8. **We named a real gap earlier**: if RabbitMQ is unreachable at the exact moment order-service tries to publish, the order still gets created successfully, but the event is lost forever with nothing recording that it happened. Why did we choose to let the order succeed anyway instead of failing the whole checkout when the publish fails — and what are we accepting by making that choice?

**Answer**: The tradeoff is between two bad options — occasionally losing a notification silently, versus making every checkout's success depend on RabbitMQ being reachable at that exact instant, which would reintroduce the same tight-coupling/cascading-failure risk. We're choosing the lesser evil on purpose, not pretending it's fixed — The outbox pattern is specifically designed to get both properties at once: the order write and the "event happened" record land in the same database transaction, so they can never disagree, and a separate relay process retries publishing to RabbitMQ independently, with retries, until it succeeds.

9. **Claiming the idempotency key before doing the work fixed the exact bug we reproduced, but you just showed it doesn't eliminate duplicate-delivery risk — it relocates it. In your own words: what's the actual tradeoff being made by choosing "claim-then-work" over "work-then-claim", and why can't either ordering fully close the gap?**

**Answer**: **Whichever operation you do first, a crash between the two leaves the second one undone with no record of that**. Claim-first trades duplicates for silent drops; work-first trades silent drops for duplicates. Neither ordering wins, because the real problem isn't the ordering — it's that *"do the side effect"* and *"record that you did it"* live in two separate systems that can't be updated as one atomic step. Reordering two non-atomic operations doesn't make them atomic; it just picks which one is unprotected.

10. **Our fix relies on a unique database index on orderId, not a "check if a record exists, then insert if it doesn't" written as two separate steps. Why does that distinction actually matter here — what could go wrong with the two-step version that the unique index prevents?**

**Answer**: **concurrency**: two things trying to process the same message at the same time, with nobody crashing at all. Picture this: two redeliveries (or two consumer instances, if we ever scaled notification-service to run more than one copy) both call findOne({ orderId }) at nearly the same instant. Neither has inserted anything yet, so both see "doesn't exist" and both proceed to do the work — the exact duplicate-processing bug we set out to fix, produced by a race instead of a crash. A unique index sidesteps this entirely because the insert itself is the check — the database, not our application code, is the one arbitrating who wins, and it can guarantee only one of two simultaneous inserts for the same orderId ever succeeds. This is the same shape of bug as the stock-check-then-decrement race we named back in Milestone 2 (two requests reading "available" before either writes) — "check, then separately act" is never safe under concurrency, no matter how fast the gap between the two steps looks.

11. **Suppose in Milestone 5, the saga's payment step calls a real payment provider. Why would relying on "check our own database before calling the payment API" be a weaker guarantee than "pass an idempotency key to the payment provider itself" — even though both are trying to prevent the same double-charge?**

**Answer**: It's not just about avoiding a race between two local writes. Even a perfectly race-free local claim doesn't solve Q1's problem — if we crash after claiming locally but before the payment call actually goes out, our own database confidently says "handled," and the customer is never charged at all. A provider-side idempotency key is structurally different because the provider can make "did I charge this" and "record that I charged this" atomic within its own system, since both happen in the same transaction on their end. Our local database can never be atomic with a phone call to someone else's API, no matter how we order or index things — that's the same non-atomicity problem as Q1, just relocated one level up the stack.


#### Timeout

- Timeout protects the calling service's resources from eventually getting exhausted. It does nothing to make the request actually succeeded, That's the different problem, which is why retry exist.

#### Retries

- Most real distributed systems failures are transient - a momentary network blip, once instance behind a load balancer being slow, GC pause, in those cases, the exact same request sent after half a second later just... works. Retry is a bet that the failure was temporary.

- **Why a naive retry makes things worse**: If a `catalog-service` is genuinely down (not transient) and every failing request retries immediately, You have not fixed anything - you've just multiplied your outbound request rate for no benefit, and made the client wait even longer (each retry pays the full timeout again). Worse: imagine `catalog-service` isn't dead, just struggling — restarting, or overloaded — and dozens of `order-service` requests are all retrying at the same fixed interval. They all hit it again at the same synchronized moment, right as it's trying to recover, and that pile-on can be enough to knock it back down before it stabilizes. That's a retry storm — the retries themselves become the load that prevents recovery.

Two mitigations for that:

- **Backoff** — wait longer between each successive attempt (e.g. 200ms, then 400ms, then 800ms), so a struggling dependency gets breathing room instead of instant re-hammering.

- **Jitter** — randomize that wait slightly, so many concurrent callers don't end up retrying in lockstep.

One more thing worth deciding deliberately: **not every failure should be retried**. If `catalog-service` returns a 404 because the product genuinely doesn't exist, retrying is pointless — that answer won't change, and retrying it is pure wasted load. Retries only make sense for failures that might plausibly be different next time: timeouts, connection errors, or 5xx server errors. A 4xx like "not found" should fail immediately.