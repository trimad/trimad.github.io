---
ai: true
author: "Tristan Madden"
categories:
  - "Documentation"
  - "System Administration"
date: 2026-05-07
draft: false
summary: "A reusable prompt for running page-scoped smoke tests against shell commands documented in Hugo blog posts. This is a tool helpful for validating AI generated documentation."
tags:
  - "shell"
  - "ai"
  - "documentation"
  - "hugo"
  - "smoke-test"
title: "Smoke Test"
toc: true
usePageBundles: true
---

## Overview

This prompt is for checking the command examples documented on a single Hugo blog page. It is intentionally scoped to one page at a time so the report stays focused on the commands readers can actually see in that article.

The goal is not to build a reusable test suite. The goal is to inspect one rendered page or Markdown source file, identify the documented shell commands, run only the commands that are safe to run, and return a concise Markdown report.

## How to Use

1. Copy the prompt below into Codex.
2. Replace the `Target page` placeholder with the relative path of the blog post in Visual Studio Code.
3. Run it in Codex.
4. Review the report for commands that worked, failed, were skipped, or need manual review.

## Prompt

````text
Target page relative path:
<PASTE THE HUGO BLOG POST RELATIVE PATH HERE>

You are working in a Hugo static site repository.

Goal:
Run a page-scoped smoke test for the shell commands documented on the target Hugo blog page and produce a report showing which commands worked, which failed, and which were skipped.

The final deliverable should be a report only.

Do not create a reusable testing framework.
Do not add package scripts.
Do not modify package.json.
Do not create broad command catalogs.
Do not write unrelated helper libraries.
Do not add test files unless temporary scratch work is absolutely required.
Do not include command families that are not present on the target page.

Important distinction:
This prompt is reusable across many Hugo blog posts, but the smoke test itself must be scoped only to commands documented on the target page.

The report should answer:
- Which documented commands were found?
- Which commands were safely executed?
- Which commands worked?
- Which commands failed?
- Which commands were skipped?
- Why was each command executed, failed, or skipped?

Definition of "worked":
A command worked if it ran successfully or produced an expected environmental result while still proving the documented syntax is valid.

Examples of acceptable environmental results:
- DNS lookup returns different records than expected
- DNS query times out
- DNS server refuses a query
- NXDOMAIN for placeholder/example domains
- a command is unavailable because the current OS does not support it
- an enterprise/domain command requires domain context, admin rights, VPN, or credentials

Do not mark those as documentation failures unless the command syntax itself appears wrong.

Instructions:

1. Inspect the target page.
   - Use the target page defined at the top of this prompt.
   - Prefer the rendered Hugo page.
   - If the rendered page is unavailable, fall back to the Hugo Markdown content file.
   - Extract only command examples that actually appear on this page.

2. Extract commands from:
   - fenced code blocks
   - indented code blocks
   - `<pre>` blocks
   - `<code>` blocks
   - terminal transcript blocks
   - shortcode-generated examples
   - Markdown tables only when they clearly contain commands
   - inline code only when it clearly represents a full command

3. Do not include unrelated commands.
   - If the page is about `nslookup`, only report on the `nslookup` examples and any helper commands actually shown on the page.
   - If the page is about `ipconfig`, only report on the `ipconfig` examples actually shown on the page.
   - If the page is about `gpresult`, only report on the `gpresult` examples actually shown on the page.
   - Do not add logic for tools that are not documented on the target page.

4. Normalize each extracted example.
   - Preserve the original command text.
   - Strip terminal prompts only when safe:
     - `$`
     - `#`
     - `>`
     - `PS>`
     - `PS C:\>`
     - `C:\>`
     - `user@host:~$`
   - Do not treat example output as commands.
   - Do not execute interactive subcommands as standalone OS shell commands.
   - Ignore blank lines, comments, headings, and obvious output.

5. Classify each item as one of:
   - executed_worked
   - executed_failed
   - validated_only_worked
   - validated_only_failed
   - skipped_safety
   - skipped_environment
   - skipped_interactive
   - skipped_placeholder
   - ignored_output
   - needs_review

6. Execute only commands that are clearly safe.
   Safe commands must be:
   - read-only
   - non-destructive
   - non-privileged
   - appropriate for the current OS
   - not dependent on private/customer infrastructure
   - not likely to expose sensitive local data
   - not likely to alter local system, network, DNS, firewall, registry, services, disks, packages, users, groups, cloud tenants, or domain state

7. Never execute commands that:
   - modify files or system state
   - change DNS/network settings
   - flush, renew, release, reset, register, delete, remove, install, uninstall, enable, disable, start, stop, restart, or configure anything
   - require admin rights
   - require credentials
   - require a production/customer system
   - require domain join, VPN, tenant access, or private infrastructure
   - launch GUI apps
   - run downloaded code
   - perform intrusive scans or exploitation

8. For skipped commands:
   - Do not treat skipping as failure by default.
   - Explain the skip reason clearly.
   - Mark as failed only if the documented command itself appears malformed.

9. For validation-only commands:
   - Validate obvious syntax structure.
   - Confirm the executable/command family matches the article.
   - Confirm options and flags are plausible for that command family.
   - Confirm placeholders are handled intentionally.
   - Confirm output lines were not mistaken for commands.

10. For interactive examples:
   - Do not run prompt-prefixed lines as shell commands.
   - Validate them as interactive subcommands if possible.
   - Mark them as validated-only or skipped-interactive.
   - Explain that they require an interactive session.

11. Report format:
   Produce a concise Markdown report.

   Use this structure:

   # Command Smoke Test Report

   Target page: `<target page>`

   ## Summary

   | Result | Count |
   |---|---:|
   | Worked | N |
   | Failed | N |
   | Skipped | N |
   | Ignored output lines | N |
   | Needs review | N |

   ## Commands That Worked

   | Command | Action | Reason |
   |---|---|---|
   | `command here` | Executed / Validated only | Short reason |

   ## Commands That Failed

   | Command | Action | Failure reason |
   |---|---|---|
   | `command here` | Executed / Validated only | Short reason |

   ## Commands Skipped

   | Command | Skip reason |
   |---|---|
   | `command here` | Reason |

   ## Needs Review

   | Text | Reason |
   |---|---|
   | `text here` | Why it could not be confidently classified |

   ## Notes

   Briefly mention:
   - current OS/platform
   - whether the rendered page or Markdown source was used
   - whether commands were actually executed or only validated
   - any limitations

12. Failure standards:
   Mark a command as failed only when:
   - the command appears to contain a typo
   - the executable name appears wrong
   - the documented flag syntax appears malformed
   - the command could not be parsed as written
   - the command was safe to execute but failed due to invocation/syntax rather than environment
   - an output line was accidentally written like a command

   Do not mark a command as failed merely because:
   - it was skipped for safety
   - it requires a different OS
   - it requires admin rights
   - it requires domain/tenant/customer context
   - a DNS/network response differed
   - a placeholder target does not exist
   - the example is intentionally expected to fail

Final deliverable:
Return only the Markdown report.
Do not return implementation code unless explicitly requested.
Do not create or modify repository files unless explicitly requested.
````

## Notes

The smoke test should stay page-scoped even though the prompt is reusable. For example, if a page documents `nslookup`, the report should only cover the `nslookup` commands and any helper commands that are actually shown on that same page.

Skipping a command is often the correct result. Administrative commands, commands that change system state, and commands that require private infrastructure should be validated or skipped with a clear reason instead of being forced into an unsafe execution path.
