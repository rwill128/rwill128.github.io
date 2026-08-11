---
layout: post
title: "I let a 1.5B SQL model study its target databases"
date: 2026-08-11
description: "Same-schema training raised execution accuracy from 17.8% to 26.2%. The more revealing result was what the model learned, and what it still could not detect."
---

# I let a 1.5B SQL model study its target databases

General text-to-SQL benchmarks ask a model to work with databases it has never seen. That is a useful test of general capability. It is not how I would build most production systems.

If I were deploying a SQL agent inside one company, I would know the schemas ahead of time. I would probably have query logs, analyst-written SQL, a business glossary, and a growing history of corrected questions. It would be wasteful to make the model rediscover all of that on every request.

So I let a small model cheat in exactly that way.

I trained [Qwen2.5-Coder 1.5B](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct) on questions from the same 11 database schemas used by the BIRD Mini-Dev evaluation, while removing the 500 evaluation questions and every normalized question or SQL duplicate I could identify. Then I reran all 500 questions.

Accuracy rose from **17.8% to 26.2%**. Relative to the best general fine-tune, it rose from **23.2% to 26.2%**.

That was useful, but it was not the most important result. The model became much better at writing SQL that executed. Once a query executed, its chance of actually being correct barely changed.

The experiment ended up measuring the difference between **schema fluency** and **semantic correctness**.

## The production question

This experiment followed an earlier comparison of three local Qwen2.5-Coder models and a hosted model on [BIRD Mini-Dev](https://github.com/bird-bench/mini_dev). The 1.5B model was predictably weak, but its failures suggested several different problems were being compressed into one accuracy score:

- Sometimes it did not produce parseable SQL.
- Sometimes it referenced tables or columns that did not exist.
- Sometimes it produced valid SQL that failed when executed.
- Sometimes the query ran successfully and returned the wrong data.
- Sometimes it was correct.

Those failure modes imply different remedies. Grammar constraints can help parsing. Schema training can help table and column selection. Execution feedback can repair database errors. None of those automatically tells the model that it used the wrong denominator, join path, filter, or aggregation.

The question was therefore not simply:

> Can fine-tuning improve the score?

It was:

> What kind of capability does same-schema training add to a 1.5B model, and which failures remain afterward?

## Three model conditions

I compared three versions of the same [4-bit MLX Qwen2.5-Coder 1.5B checkpoint](https://huggingface.co/mlx-community/Qwen2.5-Coder-1.5B-Instruct-4bit). Every condition used the same model revision, prompt construction, deterministic decoding, evaluation order, databases, and execution evaluator.

1. **Untouched model.** The original 4-bit MLX checkpoint with no adapter.
2. **General fine-tune.** A LoRA adapter trained on BIRD examples from schemas that do not appear in Mini-Dev.
3. **Same-schema adaptation.** The best general adapter followed by 300 additional updates using non-evaluation questions from the 11 Mini-Dev schemas.

My earlier Ollama run scored 16.6%. Fine-tuning required an MLX checkpoint, so I reran the untouched MLX model and used its 17.8% result as the baseline here. Mixing runtimes or quantizations would have made the comparison less meaningful.

## Letting it study without handing it the answers

The [current BIRD development dataset](https://huggingface.co/datasets/birdsql/bird_sql_dev_20251106) contains 1,534 questions across the same 11 schemas as Mini-Dev. Mini-Dev contains 500 of those questions.

I excluded source rows using three independent checks:

- matching question ID;
- matching normalized question text;
- matching normalized reference SQL.

The union removed 501 rows: the 500 evaluation IDs plus one additional duplicate caught by the content checks. That left 1,033 same-schema examples that did not directly duplicate the evaluation set.

I split those within each database into 930 training and 103 validation examples. A 2,560-token safety limit removed three oversized training rows and no validation rows, leaving **927 training examples and 103 validation examples**. Every target schema remained represented in both splits.

This is intentionally not an unseen-schema experiment. Similar join paths, columns, business concepts, and question structures can appear in training and evaluation. That overlap is the point. The condition asks whether a model can become a specialist in a known data environment.

The evaluation questions were not used for training, validation, checkpoint selection, or prompt examples.

## Training method

Each example used the same shape as inference:

- a system instruction requiring one read-only SQLite query;
- the schema DDL;
- the natural-language question;
- BIRD's optional evidence or business-rule text;
- the reference SQL as the assistant response.

Loss was applied only to the assistant SQL, not the prompt.

The adapter used rank-16 LoRA updates on the query, key, value, and output projections in the final 16 transformer layers. Training used a `5e-6` learning rate, batch size 1, four-step gradient accumulation, prompt masking, 5% LoRA dropout, gradient checkpointing, and a 2,560-token maximum sequence length.

I initialized from the best general adapter and trained for 300 additional updates. Full same-schema validation loss moved steadily downward:

| Update | Validation loss |
|---:|---:|
| Initial | 0.379 |
| 100 | 0.350 |
| 200 | 0.336 |
| 300 | 0.327 |

The run peaked at 4.28 GB of MLX memory. The final adapter is 9.5 MB.

I also changed the training wrapper after finding that MLX-LM silently reset the wired-memory limit to the machine's recommended maximum when training began. The wrapper now clamps any later attempt to raise the configured 6 GiB limit. That was not a model-quality change, but it made the continuation run materially safer after an earlier configuration caused a system crash.

## What changed

Every row below describes the same population of 500 questions.

| Condition | Parse failure | Execution failure | Executes, wrong | Correct |
|---|---:|---:|---:|---:|
| Untouched | 13 | 273 | 125 | 89 |
| General fine-tune | 5 | 213 | 166 | 116 |
| Same-schema adaptation | 2 | 189 | 178 | **131** |

Two official reference queries timed out locally, so the scorable accuracy figures were 89/498, 116/498, and 131/498. The table keeps all 500 questions visible instead of silently changing the denominator.

From the untouched model to the same-schema specialist:

- Correct answers increased from 89 to 131: **42 additional answers**, or a **47.2% relative improvement**.
- Executable queries increased from 214 to 309: **95 additional executable queries**, or a **44.4% relative improvement**.
- Parse failures fell from 13 to 2.
- Execution failures fell from 273 to 189.
- SQLite's `no such column` failures fell from 244 to 173.

Compared with the general fine-tune, the same-schema condition produced 36 paired wins and 21 paired losses. The exact McNemar p-value was 0.0627: promising evidence, but not conventionally significant at 0.05 on this sample.

The result was also not monotonic at the question level. Of the general model's invalid queries, 74 became executable after same-schema training. Only 22 of those became correct; 52 became executable but still returned the wrong result. Meanwhile, 47 previously executable queries became invalid.

Fine-tuning shifted the distribution. It did not simply repair one fixed set of mistakes.

## The real result: schema fluency improved more than semantics

The most revealing denominator is the number of queries that actually executed.

| Condition | Executable | Correct | Correct among executable |
|---|---:|---:|---:|
| Untouched | 214 | 89 | 41.6% |
| General fine-tune | 282 | 116 | 41.1% |
| Same-schema adaptation | 309 | 131 | 42.4% |

Training made the model substantially better at producing queries SQLite could run. Conditional on producing an executable query, however, correctness remained near 42% in all three conditions.

That does not make the training useless. In a production pipeline, an invalid query cannot answer anything. Reducing hallucinated columns and malformed SQL is valuable.

But it locates the remaining problem. The model learned more about the schema's vocabulary and common query shapes. It did not become proportionally better at preserving the exact meaning of the user's request.

This distinction matters because invalid SQL is observable. A database can reject it and return a specific error. Executable-but-wrong SQL is silent. It returns rows with all the authority of a successful query.

## What still failed

The specialist missed 369 of the 500 questions. Two were parse failures, 189 failed during execution, and 178 executed successfully but returned a different result from the reference query.

### Execution failures were overwhelmingly schema mistakes

Of the 189 execution failures:

| SQLite failure | Count |
|---|---:|
| Unknown column | 173 |
| Unsupported `YEAR` or `MONTH` function | 7 |
| Ambiguous column | 3 |
| Unknown table | 2 |
| Interrupted or timed out | 2 |
| Aggregate misuse | 1 |
| SQL syntax error | 1 |

Unknown columns accounted for **91.5% of execution failures**. The same mistake appeared in several forms: inventing a column, attaching a real concept to the wrong table, using an incorrect alias, or recalling a plausible name instead of the schema's actual name.

For example, one question asked for the customer with the least consumption in the `LAM` segment. The model joined `customers` to `yearmonth`, then emitted:

```sql
WHERE T2.Country = 'LAM'
```

`LAM` was a customer segment, not a country, and `Country` did not exist on `yearmonth`. The model had several pieces of the query shape right but attached the business concept to an invented location.

This class of failure is well suited to a repair loop. SQLite can say exactly which column does not exist, and the next attempt can receive the original schema, the failed SQL, and the error.

### Executable-but-wrong queries were harder

The 178 executable failures were not malformed. They returned data. Their semantics were wrong.

Of those queries, 141 involved joins, 92 involved aggregation, and 28 involved subqueries. Those categories overlap, but they describe the dominant shape of the remaining problem: the model often knew enough SQL to produce a plausible multi-table query without preserving every relationship and business rule.

One question asked for the ratio of customers paying in EUR to customers paying in CZK. The model divided the EUR count by all customers:

```sql
SELECT
  SUM(CASE WHEN Currency = 'EUR' THEN 1 ELSE 0 END) * 1.0
  / COUNT(Currency)
FROM customers;
```

The query executed perfectly. The correct denominator was the count of CZK customers.

Another question defined average monthly consumption as `AVG(Consumption) / 12`. The model used `SUM(Consumption) / 12`. Again, SQLite had no objection. The result was simply wrong.

No parser, column validator, read-only policy, or execution retry can detect those errors by itself. They require a stronger semantic signal: a trusted example, a semantic layer, an independent critic, a result contract, or escalation to a more capable model.

## The benefit varied by database

Same-schema adaptation improved seven databases, left two unchanged, and regressed two relative to the general fine-tune.

<figure class="article-figure">
  <a href="/assets/images/text-to-sql/schema-accuracy-deltas.png">
    <img src="/assets/images/text-to-sql/schema-accuracy-deltas.png" alt="Schema-level accuracy changes after same-schema adaptation, with seven improvements, two unchanged schemas, and two regressions" width="1400" height="820">
  </a>
  <figcaption>Toxicology gained 10 percentage points, while Formula 1 and Student Club regressed slightly. Training volume alone did not explain the differences.</figcaption>
</figure>

The largest gain was toxicology, from 17.5% to 27.5%. Card games improved from 21.6% to 29.4%, and financial improved from 6.2% to 12.5%. Formula 1 fell three points and Student Club fell two.

More examples did not guarantee more improvement. Card Games and Codebase Community had similar amounts of training data; one gained 7.8 points and the other did not move. Toxicology gained 10 points with fewer examples than either.

That suggests the next dataset should not merely be larger. It should be targeted at observed failure modes: ambiguous join paths, dialect-specific date operations, business-rule filters, aggregation denominators, and the exact concepts each schema represents.

## What I would test next

The next conditions should separate several ways of giving the model domain knowledge.

### Retrieve approved examples at inference time

Fine-tuning compresses the domain into weights. Retrieval can place the most relevant corrected examples directly in context. For each request, I would retrieve a few examples from the same schema based on tables, columns, business concepts, and query shape.

This is closer to literally letting the model look at similar solved problems. It is also easier to update when the schema or business vocabulary changes.

### Add deterministic execution repair

The model should receive its failed SQL and the actual SQLite error, then retry. This directly targets the 189 execution failures and especially the 173 unknown-column failures.

The stopping rule matters: retry only while deterministic validation reveals new information, cap attempts, and preserve the complete history so the model does not repeat rejected queries.

### Combine retrieval, fine-tuning, and repair

These approaches solve different problems. Fine-tuning teaches broad schema familiarity. Retrieval supplies a precise local precedent. Execution feedback repairs observable mistakes. The combined condition is more representative of a production agent than any one of them alone.

### Train on the hard cases, not just more cases

I would oversample the failure families the evaluation exposed and generate contrastive examples:

- same question, different denominator;
- same columns, different join path;
- `SUM` versus `AVG`;
- inclusive versus exclusive date boundaries;
- grouped result versus row-level result;
- real column versus a plausible hallucinated synonym.

The model needs examples where one small semantic change produces a different answer, not thousands of redundant easy selects.

### Emit a constrained semantic representation

For a mature enterprise data platform, raw SQL may be the wrong target. A small model could emit a constrained metric request or semantic-layer DSL: metric, dimensions, filters, time grain, ordering, and limit. Deterministic code could then compile that structure into SQL.

That would make a wrong denominator or unsupported join easier to reject before execution.

## Building an enterprise specialist with a teacher model

The most practical path to a high-volume specialist would use an expensive teacher model offline and the small model online.

### 1. Start from trusted queries

The safest source is not unconstrained synthetic SQL. It is approved analyst SQL, production query logs, dashboard definitions, dbt models, metric definitions, support questions, and a business glossary.

Where possible, I would reverse the generation direction: start from SQL whose meaning is already trusted and ask the teacher to produce realistic natural-language questions and paraphrases. That reduces the chance of treating a teacher's plausible but incorrect SQL as ground truth.

### 2. Generate for coverage, not volume

Build a coverage map over:

- tables and join paths;
- business metrics and dimensions;
- filters and date semantics;
- aggregations, subqueries, CTEs, and windows;
- common user vocabulary and ambiguous terms;
- authorization and row-level access boundaries.

Then ask the teacher to fill specific gaps. A dataset of carefully targeted examples can be more valuable than a much larger pile of near-duplicates.

### 3. Validate every generated artifact

Each candidate should pass deterministic checks:

- parse successfully in the target dialect;
- reference only approved tables and columns;
- be read-only;
- execute under a timeout on a safe snapshot;
- produce a nontrivial result where appropriate;
- survive duplicate and near-duplicate detection;
- record the result fingerprint, referenced objects, and query features.

Execution is necessary but not sufficient. High-value or teacher-generated queries should also be checked by an independent critic, compared with a semantic layer, or sampled by a human analyst.

### 4. Split by intent, not wording

Randomly holding out paraphrases creates an easy and misleading test. Evaluation should hold out business intents, query templates, join paths, or time periods. It should include adversarial boundary cases such as nulls, ties, duplicates, empty groups, and inclusive dates.

### 5. Distill into the small model

Fine-tune a small model on the validated corpus, then evaluate it on the enterprise holdout. Repeat using the real error distribution rather than continuing to generate generic SQL examples.

The adapter in this experiment was only 9.5 MB. That makes per-customer or per-domain adapters plausible, although operational complexity and model-serving design would determine whether separate adapters are actually the best choice.

### 6. Keep the teacher as an escalation path

The small model should handle familiar, validated patterns. Novel schemas, repeated execution failures, low-confidence semantic choices, or high-impact questions can route to the teacher model or a human analyst.

The objective is not to prove that the small model can answer everything. It is to identify the large, repetitive portion of traffic it can answer reliably enough to avoid paying frontier-model inference costs on every request.

## Why the economics can work

A hosted teacher model is expensive when placed in the hot path of every question. It is much easier to justify when it creates and audits training data offline.

The serving equation becomes:

```text
effective cost per request
  = local specialist inference
  + escalation rate * hosted model cost
  + amortized dataset and training cost
```

For a high-volume agentic analysis product operating over a stable set of enterprise schemas, that can be attractive:

- the schema and business concepts repeat;
- many user questions fall into recurring query families;
- generated examples and corrections improve a reusable asset;
- local inference improves privacy and cost predictability;
- the expensive model is reserved for novel or ambiguous work.

Caching, query normalization, semantic-layer compilation, and result reuse can reduce cost further. More importantly, the system can route based on observed failure signals instead of treating every request as equally difficult.

The hard part is not making a 1.5B model emit SQL. This experiment shows that fewer than a thousand same-schema examples already improve that substantially. The hard part is deciding when its executable SQL should be trusted.

## What I learned

Same-schema training worked, but not as a single-number story.

It made the 1.5B model much more fluent in the target schemas. It reduced parse failures, hallucinated columns, and queries that SQLite could not execute. It produced 42 more correct answers than the untouched model.

It did not eliminate the semantic ceiling. Roughly 42% of executable queries were correct before specialization, and roughly 42% were correct afterward. The remaining silent failures involved exactly the details that matter in real analysis: join paths, filters, denominators, aggregation choices, and business definitions.

That points toward a production architecture rather than another isolated fine-tune:

> Use a teacher to build a trusted domain dataset. Distill recurring patterns into a small specialist. Retrieve approved examples. Validate and repair what can be checked deterministically. Route ambiguous semantics to a stronger model or a human.

The model does not need to become a general database expert. It needs to become reliably useful inside one well-defined data environment, and the surrounding system needs to know where that reliability ends.
