# Guardrails: never-delete windows, honest refreshes, cannibalization, the decay log

- Never delete a page during or immediately after a core update
  rollout; wait until the rollout completes plus at least a full
  week, per Google's guidance, before judging the page.
- Never refresh a page by changing its last-updated date without
  changing its content.
- Cannibalization is fixed by choosing one owner page per query:
  refresh the owner, and redirect or re-target the others.
- Record every decision with its reason and date in the decay log;
  a decision without a recorded reason cannot be reviewed later.
