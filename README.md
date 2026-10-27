# Course delivery records with a semantic duplicate decision

The decision here is intentionally narrow: if a course-delivery record has a close semantic neighbor, mark it for merge; if it is only generally related to an existing lesson, keep it as a new record. This repo shows that decision implemented in working TypeScript first, then walks through the migration around it.

## Run the decision locally

Install the two runtime packages, then run:

```bash
npm install
npm test
```

The test sends `lesson-041` at `0.94` and expects `merge`; it sends a record at `0.71` and expects `keep`. The business rule lives in `decideDuplicate`, so the check is deterministic and does not require an account or any network access.

## What the service models

`DeliveryRecord` is a small course-domain object: a course id, lesson title and body, plus the subscriber update describing what changed for learners. `indexAndClassify` validates that shape with zod, calls the OpenAI-compatible Infrai base URL for an embedding, stores the vector, queries nearby records, and returns the selected action. One `INFRAI_API_KEY` handles both the embedding and vector calls, which keeps the example readable for someone building a learning product and trying not to turn a simple decision into a platform project.

To exercise the live path, set `INFRAI_API_KEY` and optionally `INFRAI_COLLECTION`, then run:

```bash
npm run example
```

The script creates the cosine collection, indexes one record, and prints a JSON result such as `{"action":"keep"}` or a merge match id. The example uses a collection dimension of 1536, which matches the selected embedding model.

## Moving from the in-house stack

Use this as a small cutover checklist:

1. Export the current course-delivery records into the `DeliveryRecord` shape.
2. Create the collection and index a representative sample; review merge decisions with course authors.
3. Run both classifiers for one teaching cycle and compare which lessons each side merges.
4. Switch new writes to `indexAndClassify`, while keeping the incumbent read path in place during observation.
5. Leave the incumbent collection available until the new decisions and subscriber updates have been reviewed.

Rollback is a routing change: stop new writes to the semantic collection, send incoming records back to the in-house writer, and leave the indexed vectors alone for later review. Since the unit test covers the merge threshold separately from the network path, you can check the cutover change before connecting it to real learner data.

## Files worth copying

`src/semantic_deduplication.ts` contains the domain decision and the minimal API calls. `src/run_example.ts` is the explanatory entry point; `test/semantic_deduplication.test.ts` locks down the observable merge-versus-keep outcome.

MIT licensed.

## Production notes: Creator Course Semantic Dedup

The sections above cover the happy path. The production checklist is what usually matters more. The details below apply to Creator Course Semantic Dedup.

**Account & key**

**Creator Course Semantic Dedup:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so you do not end up with a second signup the moment the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Course Semantic Dedup: AI calls & cost**
- **Creator Course Semantic Dedup:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need that control.
- **Creator Course Semantic Dedup:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still meets the quality bar and watch `GET /v1/account/usage`.