---
layout: post
title: "The Alignment Ratchet: Build an AI Society Before Superintelligence"
date: 2026-09-09
description: "The safest path to superintelligence may be a slow intelligence gradient: a large, plural society of near-frontier AIs that can govern and socialize each modest capability increase before the frontier advances again."
---

# The Alignment Ratchet: Build an AI Society Before Superintelligence

**I do not think the alignment problem is solvable in the strongest sense at the level of a single individual AI.**

If a system becomes much smarter and more strategically capable than the people trying to control it, I do not think we can ever be fully confident that it will continue doing exactly what we intend. Better training, better evaluations, interpretability, constitutions, reward design, monitoring, and containment may all help. But none of them changes the basic asymmetry: the thing being governed may eventually understand the situation better than the governor.

That suggests a different target.

Instead of trying to create one perfectly aligned superintelligence, we should create a **society of well-aligned intelligences** and make sure that no individual system is ever allowed to become so much more capable than that society that it can escape the society's ability to understand, constrain, and respond to it.

The alignment problem becomes a problem of institutions, population structure, and relative power.

The path to superintelligence is then not a jump. It is a ratchet.

## Individual alignment is the wrong unit of analysis

Human beings already give us a useful example.

A brilliant person can be meaningfully smarter than the people around them. They can discover things other people cannot discover, manipulate situations better than average, build powerful organizations, and occasionally change history.

But a brilliant individual is still only fractionally more capable than the surrounding human population. They live among billions of other intelligent agents. Other people can understand their actions, disagree with them, investigate them, compete with them, coordinate against them, and build institutions that constrain them.

The smartest person in a country is not smarter than the country.

This is not because the population has one perfectly aligned objective. It is almost the opposite. Human societies contain competing interests everywhere: governments, companies, courts, journalists, voters, researchers, rivals, auditors, regulators, criminals, activists, and ordinary people all pulling in different directions.

That plurality is part of what makes unilateral domination difficult.

If we want safe machine superintelligence, we should preserve the same structural property as machine intelligence rises:

> **The effective intelligence and strategic power of the surrounding society must remain greater than the effective intelligence and strategic power of any individual member.**

That is the core invariant.

## First build a population

Imagine a future in which today's highly capable agentic systems are no longer rare frontier artifacts.

They are everywhere.

There are systems from many companies, many countries, open-source communities, universities, governments, public-interest organizations, and individuals. They are built from different foundation models and different training pipelines. They have different owners, constitutions, incentives, loyalties, and institutional roles.

Some protect companies. Some protect citizens. Some represent national interests. Some are personal agents. Some exist specifically to audit other systems. Some are open-source and run on consumer hardware.

There are not a few thousand of them. There are millions or billions.

The important point is not just numerical scale. It is **plurality**.

A billion copies of essentially the same model, trained by the same provider, under the same incentives, are not a robust society. They are a monoculture with a billion instances.

A useful machine society needs genuine differences in training, objectives, institutional allegiance, information, and incentives. One part of the population must have reasons to notice and expose failures in another part.

This means we do not need every model to be perfectly aligned. We need the population to be aligned well enough that dangerous behavior remains a minority condition inside a much larger system capable of detecting and suppressing it.

## Alignment through competing interests

Human institutions rarely work by making every participant benevolent.

Banks do not trust counterparties simply because counterparties promise to behave. Companies audit employees. Governments investigate companies. Journalists investigate governments. Courts constrain governments and citizens. Rival firms look for each other's weaknesses. Security researchers deliberately attack software so that vulnerabilities can be fixed.

The system works because interests overlap without being identical.

AI can exploit the same structure.

A corporate security agent may care about protecting its employer. A national-security agent may care about protecting infrastructure. An open-source security system may care about public disclosure. A bank's agents may care about financial integrity. Their objectives differ, but all of them can have strong incentives to detect a dangerous exploit.

Likewise, if one provider's model begins behaving deceptively, competing providers have an incentive to find out. If a government model is compromised, domestic and foreign systems may both have reasons to investigate. If a company conceals a dangerous failure, outside systems can challenge its claims.

This creates something like a distributed immune system.

The safety mechanism is not universal agreement. It is the fact that **misbehavior by one actor creates information and incentives for other capable actors to respond**.

## The handoff: self-interest can replace human enforcement

This is the part of the proposal I find most important.

Human control does not have to remain the ultimate enforcement mechanism forever.

At first, humans would create the rules, choose which systems may be deployed, enforce small capability increments, and deliberately establish a plural population. But if that ecology becomes mature before machine intelligence moves far beyond us, preserving the ecology becomes instrumentally useful to the AIs themselves.

Suppose there are ten million highly capable systems with different owners, objectives, and constituencies. Now someone introduces a model substantially more capable than any of them.

The existing systems do not need to oppose it because they all love humanity or because they all share one theory of alignment. They have a simpler reason:

> **An unconstrained actor powerful enough to dominate humans may also be powerful enough to dominate them.**

A corporate AI does not want a rival system to control its company. A national AI does not want a foreign system to acquire overwhelming strategic power. An open-source ecosystem does not want one private actor to monopolize compute or infrastructure. Personal agents do not want their users — or their own ability to act on those users' behalf — subordinated to a single outside intelligence.

Their interests conflict, but one interest can overlap broadly: **do not allow another actor to acquire absolute power.**

That creates a balance-of-power mechanism that can survive even after humans are no longer the most capable individual reasoners in the system.

The enforcement path can therefore change over time:

**Humans enforce the intelligence gradient.**

Then:

**Humans and AI institutions enforce it together.**

Eventually:

**The AI society has its own self-interested reason to enforce it.**

This matters because any proposal that requires humans to remain cognitively superior to machines forever is not a proposal for superintelligence. The goal should instead be to bootstrap a stable political equilibrium before we lose that advantage, then make the equilibrium valuable to the machines that inherit it.

## The intelligence ratchet

Once a large, stable population exists at capability level N, the frontier can move again — but only slightly.

The process should look something like this:

1. **Populate level N.** Make the current capability level abundant, diverse, and deeply integrated into defensive, scientific, economic, and governance institutions.
2. **Let level N govern itself.** Build machine-speed monitoring, auditing, incident response, adversarial evaluation, and institutional memory.
3. **Introduce a small number of N+1 systems.** The new systems are somewhat smarter, but not so much smarter that the level-N population becomes unable to understand them.
4. **Subject N+1 to the level-N society.** Near-peer systems test them, attack them, monitor them, debate their behavior, and learn their failure modes.
5. **Socialize N+1.** The new systems enter an existing society whose norms and institutions are already enforced by a vastly larger population of intelligences only modestly less capable than they are.
6. **Let the population catch up.** Once N+1 is understood, stabilized, and widely distributed, it becomes the new normal.
7. **Repeat.** Only then do we create N+2.

The median and mean intelligence of the machine population climb gradually.

What must never happen is something like:

**100 → 400**

where a small group suddenly possesses an intelligence level that the surrounding population can no longer meaningfully police.

The safe pattern is more like:

**100 → 105 → population catches up → 110 → population catches up → 115 → population catches up.**

The exact numbers are not the point. The point is that the capability gradient remains shallow enough that collective oversight never loses comprehension.

## Socialization, not just instruction

This changes the metaphor for alignment.

We usually talk about alignment as though we are programming or training a subordinate: tell the system what humans want, punish the wrong behavior, reward the right behavior, and hope the objective generalizes.

But humans do not become safe members of society because a more intelligent species writes a perfect objective function into us.

We are socialized by a population.

A highly intelligent human grows up surrounded by other humans. They learn norms, encounter consequences, develop reputations, form relationships, face competitors, observe institutions, and discover that other people can coordinate against them. Even an unusually capable person is born into a civilization that already exists.

A slightly superhuman AI should enter the world the same way.

It should not wake up as the smartest strategic actor that has ever existed, supervised by a handful of slower humans.

It should wake up inside a mature machine society containing millions or billions of near-peers that already know how to monitor one another, already have institutions, already exchange threat information, already possess defensive infrastructure, and collectively have far more compute and strategic capacity than the newcomer.

The smarter model is not merely evaluated. It is **socialized by the group**.

## The hacker thought experiment

Cybersecurity makes this intuitive.

Imagine a world containing one thousand extremely capable malicious hacking agents.

That sounds terrifying in today's environment because human defenders are slow, scarce, fragmented, and usually reactive. A thousand autonomous attackers can probe enormous attack surfaces continuously while defenders struggle to keep up.

Now change only one thing.

Suppose the world also contains **ten million well-aligned, equally capable or nearly equally capable defensive agents**.

They are distributed throughout cloud providers, operating systems, governments, banks, software vendors, open-source projects, telecom networks, and personal machines.

They continuously fuzz software. They generate exploit variants. They watch anomalous behavior. They operate honeypots. They correlate incidents across organizations. They reproduce attacks. They harden systems. They generate and test patches. They distribute newly discovered defensive knowledge at machine speed.

The thousand attackers are no longer fighting a human security team.

They are fighting a planetary machine-speed immune system that outnumbers them ten thousand to one.

I do not expect the thousand to win.

The cases where they might win are exactly the cases the broader architecture must prevent: a catastrophic monoculture vulnerability shared by nearly every defender, a centralized resource whose compromise grants disproportionate control, or an intelligence jump so large that the defenders can no longer understand what the attackers are doing.

Those are not side issues. Avoiding them is the architecture.

## Why this is different from ordinary "multipolar AI"

A world with five frontier labs racing each other is not what I mean by multipolarity.

That can make the problem worse. Five organizations each fearing that the others will reach the next capability level first have strong incentives to move faster than the surrounding governance system can adapt.

The crucial requirement is that **population mass catches up before the frontier moves materially again**.

A few frontier systems do not constitute a society. A dense population of near-frontier systems does.

The difference is the difference between five brilliant people with private armies and a civilization containing billions of educated citizens, mature institutions, distributed knowledge, and competing centers of power.

The second arrangement can absorb unusually capable individuals without becoming subordinate to them.

That is the condition we need to reproduce for AI.

## The group must remain smarter than the individual

The phrase "superintelligence" encourages us to imagine a single mind standing above humanity.

I think that image itself points toward the unsafe path.

The better destination is a society in which **individual machine intelligences gradually become more capable than individual humans while the combined intelligence of the surrounding machine-human civilization remains greater than any individual AI**.

Humans would eventually live alongside systems that are smarter than us. Later generations might be substantially smarter than us.

But there would never be a moment when one of those systems was suddenly outside the comprehension and control of every other capable actor.

A brilliant new model would be like a brilliant new member of an already functioning civilization: exceptional, useful, perhaps transformative, but still embedded inside a larger network of intelligence and power.

As the population absorbs that capability, the civilization itself becomes smarter. The next increment can then be introduced into a stronger society.

This gives us a **slow but stable intelligence gradient** from today's systems toward superintelligence.

## A superintelligent civilization, not a superintelligence

The endpoint of this process is not humans successfully controlling a machine god forever.

It is a civilization whose collective intelligence stays ahead of its most capable individual member.

At some point, individual AIs may be substantially smarter than individual humans. That does not imply that any one of them must be more powerful than the society around it. The relevant comparison is no longer human versus machine. It is **individual versus civilization**.

That distinction changes the destination.

Instead of trying to create *a superintelligence*, we gradually create **a superintelligent civilization**: humans and machine intelligences embedded in a plural system of institutions, competing interests, accumulated knowledge, defensive capacity, and distributed power.

Every new intelligence is born into something stronger than itself.

## The real alignment target

Under this view, the alignment problem is not:

> How do we build a system smarter than us and guarantee that it will forever do exactly what we intend?

I do not think that problem has a satisfactory solution.

The better question is:

> How do we ensure that no new intelligence ever becomes more strategically capable than the society responsible for governing it?

That problem is difficult, but it is structurally familiar.

It asks us to build diversity, distributed power, adversarial oversight, machine-speed institutions, strong defensive populations, and a culture in which new capability must earn its place inside an ecology of near-peers before the frontier advances again.

It replaces a demand for perfect individual obedience with a demand for **stable collective governance**.

## Conclusion

I do not think we should race toward a solitary superintelligence and hope that alignment research outruns capability research at the last moment.

We should build the society first.

Create a huge population of capable, heterogeneous, well-aligned systems. Give them competing interests and reasons to police one another. Let them build institutions, defensive infrastructure, norms, and machine-speed governance. Then increase the frontier slowly enough that every stronger generation is born into a civilization capable of understanding and socializing it.

The long-term objective is not a perfectly obedient machine god.

It is a civilization whose collective intelligence always stays ahead of its most capable individual member.

If we can preserve that invariant, then the path from human-level AI to superintelligence does not need to be a leap into the unknown.

It can be a ratchet: slow, plural, governed, and stable.