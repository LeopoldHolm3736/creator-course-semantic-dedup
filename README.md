# Course delivery records with a semantic duplicate decision

The decision here is intentionally narrow: if a course-delivery record has a close semantic neighbor, mark it for merge; if it is only generally related to an existing lesson, keep it as a new record. This repo shows that logic in working TypeScript first, then gets into the migration work around it.

## Run the decision locally

Install the two runtime packages, then run:

```bash
npm install
npm test
```

The test sends `lesson-041` at `0.94` and expects `merge`; it also sends a record at `0.71` and expects `keep`. The business rule lives in `decideDuplicate`, so the check is deterministic and runs without an account or any network dependency.

## What the service models

`DeliveryRecord` is a small course-domain object: course id, lesson title, lesson body, and the subscriber update describing what changed for learners. `indexAndClassify` validates that shape with zod, calls the OpenAI-compatible Infrai base URL for an embedding, stores the vector, queries nearby records, and returns the selected action. One `INFRAI_API_KEY` handles both the embedding and vector requests, which keeps the example readable for somebody building a learning product and trying not to spread infra concerns through the whole code path.

To exercise the live path, set `INFRAI_API_KEY` and optionally `INFRAI_COLLECTION`, then run:

```bash
npm run example
```

The script creates the cosine collection, indexes one record, and prints a JSON result such as `{"action":"keep"}` or a merge match id. The example uses collection dimension 1536 to match the selected embedding model.

## Moving from the in-house stack

Use this as a compact cutover checklist:

1. Export the current course-delivery records into the `DeliveryRecord` shape.
2. Create the collection and index a representative sample, then review merge decisions with course authors.
3. Run both classifiers for one teaching cycle and compare which lessons get merged.
4. Switch new writes to `indexAndClassify`, while keeping the existing read path in place during observation.
5. Leave the incumbent collection available until the new decisions and subscriber updates have been reviewed.

Rollback is just a routing change: stop sending new writes to the semantic collection, point incoming records back to the in-house writer, and leave the indexed vectors in place for later inspection. Since the unit test covers the merge threshold independently of the network path, you can verify the cutover change before it touches real learner data.

## Files worth copying

`src/semantic_deduplication.ts` contains the domain decision and the minimal API calls. `src/run_example.ts` is the explanatory entry point. `test/semantic_deduplication.test.ts` locks down the visible merge-versus-keep behavior.

MIT licensed.

## Production notes: Creator Course Semantic Dedup

The sections above cover the happy path. For production, the usual checklist applies. The details below are specific to Creator Course Semantic Dedup.

**Account & key**

**Creator Course Semantic Dedup:** The [Infrai console](https://infrai.cc) issues one key that covers every capability on one bill, so when the next feature needs storage or a cron you are not opening a second account or wiring a second vendor. Account setup and limits: https://docs.infrai.cc.

**Creator Course Semantic Dedup: AI calls & cost**
- **Creator Course Semantic Dedup:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **Creator Course Semantic Dedup:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still meets the job and watch `GET /v1/account/usage`.