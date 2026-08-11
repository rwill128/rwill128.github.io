---
layout: post
title: "Ask. Challenge. Verify: The Three Skills That Matter in AI-Native Engineering"
date: 2026-08-11
description: "In an AI-native engineering workflow, code generation is cheap. The scarce skills are asking the right questions, detecting plausible-sounding nonsense, and designing verification loops that force agents to confront reality."
---

# Ask. Challenge. Verify: The Three Skills That Matter in AI-Native Engineering

**AI has made code cheap. It has not made truth cheap.**

A capable coding agent can produce thousands of lines of code, search a large repository, propose an architecture, generate tests, analyze a dataset, tune a model, and explain all of it with unnerving confidence. That is an extraordinary increase in leverage.

It is also an extraordinary increase in the speed at which plausible-looking mistakes can be created.

The central skill in AI-native engineering is therefore not simply “knowing how to prompt.” Prompting is an interface skill. The deeper skill is designing an epistemic process: a way of working that keeps a fast, capable, unreliable reasoning system in contact with reality.

After several years of using coding agents across production systems, data analysis, refactors, prototypes, infrastructure, and machine-learning experiments, I think that process comes down to three durable abilities:

1. **Ask the right questions.**
2. **Challenge the model’s unsupported claims.**
3. **Design verification loops that force the model to confront evidence before it reports success.**

A compact name for the approach is:

> **Ask. Challenge. Verify.**

These skills matter more than fluency with any particular model, editor, framework, or programming language. They are what allow agentic work to remain fast, useful, and production-safe across changing tools and technical contexts.

## 1. Ask the right questions

The quality of an agent’s output is bounded long before it starts writing code. It is bounded by whether the problem has been framed correctly.

A weak request tells the model what activity to perform:

> Refactor this service.

A stronger request asks questions that expose the real engineering problem:

- Which externally observable behaviors must remain unchanged?
- What failure modes are we trying to eliminate?
- Which data sources are authoritative?
- What performance, reliability, and compatibility constraints matter?
- How will we know that the refactor is actually better?
- What evidence would cause us to abandon the proposed approach?

The right question narrows the search space. It converts a vague task into a set of falsifiable claims.

This is more important with agents than with conventional programming because an agent will happily fill in missing context. When the task is underspecified, it does not stop producing. It invents assumptions, chooses a locally coherent interpretation, and proceeds as though the ambiguity has been resolved.

That means the human operator must become unusually good at identifying uncertainty. Before asking the agent to implement anything, ask:

- What do we know?
- What are we assuming?
- What do we need to observe?
- Which unknown has the highest chance of invalidating the whole plan?

A good AI-native engineer does not merely decompose work into subtasks. They decompose uncertainty into questions.

### The highest-value question is often not “How do we build this?”

It may be:

- Does this bug actually occur under the conditions we think it does?
- Is the database query really the bottleneck?
- Are these records malformed, or is our parser wrong?
- Does the model fail because it lacks capability, because the prompt is poor, or because the evaluation is measuring the wrong thing?
- Is this migration behavior-preserving for the cases users actually depend on?

The fastest implementation is useless if it solves an imagined problem.

## 2. Challenge plausible-sounding bullshit

LLMs are optimized to continue coherently. They are not intrinsically optimized to stop when evidence runs out.

That creates a characteristic failure mode: the model produces a technically fluent explanation that is only weakly connected to what it actually observed.

Common examples include:

- claiming a bug is fixed because the code looks reasonable;
- describing an API from memory without checking the installed version;
- inventing a causal explanation after seeing a correlation;
- silently changing the scope of the task to something easier;
- declaring a refactor behavior-preserving without comparing outputs;
- reporting that tests pass while omitting skipped tests, warnings, or untested branches;
- treating a plausible metric improvement as proof that the underlying objective improved;
- summarizing a repository architecture after reading only a few files.

The correct response is not vague skepticism. It is direct epistemic pressure.

Ask:

> Where did you observe that?

> What evidence supports this claim?

> What would falsify your explanation?

> Show me the exact command, output, log line, test result, benchmark, or diff.

> Find a counterexample to your current conclusion.

> Separate what you verified from what you inferred.

This is where a strong human operator matters. The model often does not know that its answer is weak. It experiences no internal discomfort when it moves from observation to speculation. The human must detect the transition.

### Warning signs

A few linguistic patterns are especially useful signals:

- “This should fix…”
- “It appears that…”
- “Most likely…”
- “The issue is probably…”
- “The implementation is complete…”
- “The system now correctly…”

None of those phrases is automatically wrong. But each should trigger the question: **What was actually tested?**

The goal is not to punish uncertainty. Quite the opposite. A useful agent should be encouraged to state uncertainty precisely. The dangerous behavior is unearned certainty disguised as technical fluency.

## 3. Design verification loops that force contact with reality

The most powerful move is not personally checking every claim the model makes. That does not scale.

The powerful move is redesigning the workflow so the model must produce and inspect evidence before it is allowed to report success.

A general verification loop looks like this:

1. **State the claim.** What exactly does the agent believe is true?
2. **Establish a baseline.** Reproduce the current behavior before changing anything.
3. **Create an observable test.** Define the measurement, failing test, benchmark, query, dataset slice, or output comparison that represents success.
4. **Make the smallest useful change.** Avoid combining multiple speculative fixes.
5. **Run the check.** Capture the actual output.
6. **Search for counterexamples.** Test boundary cases and cases likely to break the hypothesis.
7. **Compare against the baseline.** Inspect regressions, not just improvements.
8. **Report evidence and remaining uncertainty.** Do not collapse inference into fact.

The agent becomes much more reliable when it is required to participate in its own falsification.

### Bug fixing

Weak workflow:

> Inspect the code, fix the bug, and tell me when it is done.

Stronger workflow:

> Reproduce the bug first. Write a test that fails for the expected reason. Show me the failure. Make the smallest change that should fix it. Rerun the test and the surrounding suite. Then search for at least one adjacent case where the same assumption could fail.

Now the model cannot substitute a persuasive code diff for proof.

### Data analysis

Weak workflow:

> Analyze this CSV and explain the trend.

Stronger workflow:

> Load the actual file. Profile missingness, distributions, duplicates, and outliers. State the hypothesis you think explains the trend. Then actively search for records that contradict it. Recalculate the result under at least two reasonable filtering choices and explain whether the conclusion survives.

This prevents the model from building a story around the first pattern it notices.

### Large refactors

Weak workflow:

> Rewrite this module using the new architecture without changing behavior.

Stronger workflow:

> First define the observable behavior that must remain stable. Build characterization tests over a representative corpus. Run the old and new implementations against the same inputs, diff every output, and investigate all disagreements before replacing the old path.

“Behavior-preserving” becomes an empirical statement instead of an aesthetic judgment.

### Machine-learning experiments

Weak workflow:

> Fine-tune the model and improve performance.

Stronger workflow:

> Freeze the evaluation set and record the baseline. Define the metric and its known limitations. Run the smallest experiment that isolates the proposed change. Preserve seeds and configuration. Compare against the baseline, inspect error categories, and test whether the gain survives a distribution shift or a second evaluation slice.

Without this discipline, an agent can optimize the experiment until it produces an exciting number while quietly changing the conditions that gave the number meaning.

### Architecture planning

Architecture is harder to verify because many claims concern future behavior. But the same principle applies.

Require the agent to:

- enumerate assumptions;
- identify load, latency, consistency, security, and failure requirements;
- compare at least two plausible designs;
- model likely bottlenecks;
- prototype the riskiest integration;
- define operational signals that would reveal a bad decision after deployment.

A diagram is not evidence. A small prototype, benchmark, failure injection, or traced request often is.

## Prompting is not the scarce skill

The model interface will keep changing. Today it may be a terminal agent, an IDE assistant, a chat interface, or a multi-agent workflow. Tomorrow it will be something else.

The durable skill is not memorizing the perfect incantation for one tool. It is knowing how to construct a process in which the tool cannot easily fool you—or itself.

That process generalizes across:

- data analysis;
- testing;
- large refactors;
- green-field systems;
- machine-learning training experiments;
- rapid prototypes;
- infrastructure changes;
- system architecture;
- production debugging.

The surface details change. The epistemic structure does not.

In every case, the operator must identify the real question, detect unsupported confidence, and define a loop that produces evidence.

## The AI-native engineer as an epistemic systems designer

In conventional software work, much of an engineer’s value came from personally translating intent into code.

In AI-native work, that translation becomes cheaper. The engineer’s value shifts upward:

- deciding what problem is worth solving;
- exposing hidden assumptions;
- choosing the next uncertainty to reduce;
- defining success in observable terms;
- creating feedback loops;
- separating evidence from narrative;
- deciding when the result is safe enough to ship.

The human is no longer merely the author of the implementation. The human is the designer of the environment in which implementation happens.

That does not make technical knowledge less important. It makes deep technical judgment more important. You cannot challenge a model’s claims if you do not understand the system well enough to recognize when they are suspicious. You cannot design a good verification loop if you do not know what the relevant failure modes are.

But raw recall matters less. Epistemic control matters more.

## A reusable operating protocol

For practical use, I reduce the approach to eight questions:

1. **What is the real problem?**
2. **What do we know, and what are we assuming?**
3. **What evidence would change the plan?**
4. **How can we reproduce or measure the current state?**
5. **What is the smallest change that tests the hypothesis?**
6. **What counterexample is most likely to break it?**
7. **What did the evidence actually show?**
8. **What remains uncertain?**

Those questions turn an agent from a fluent code generator into something closer to a disciplined engineering collaborator.

Not perfectly reliable. Not autonomous in the magical sense. But enormously productive inside a process that continuously pushes it back toward reality.

## Conclusion

In an AI-native world, the ability to generate code is abundant. The ability to generate **verified progress** is not.

The engineers who get the most leverage from agents will not simply be the people who type the cleverest prompts. They will be the people who can:

> **Ask the questions that expose the real problem.**
>
> **Challenge claims that outrun the evidence.**
>
> **Verify results through loops that force contact with reality.**

Ask. Challenge. Verify.

That is the core discipline that makes agentic engineering fast without becoming reckless, flexible without becoming shallow, and powerful without becoming detached from the truth.
