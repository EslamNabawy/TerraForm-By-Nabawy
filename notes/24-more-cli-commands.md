# More CLI — fmt / graph / import / state and Friends

Day 1 · the inspection and maintenance drawer

Beyond the big four (see 20), a second tier of commands inspects, visualizes, and repairs. None of them create infrastructure — they explain it, draw it, or fix the ledger.

## 1. The roster (one line each, then the two that need demos)

| Command | Job | When |
|---|---|---|
| `terraform fmt [options] [DIR]` | Canonical style | Before commit; `-check` in CI (see 23) |
| `terraform validate` | Config syntax + consistency, no cloud | After every edit, before `plan` |
| `terraform graph` | DOT-format dependency graph | Visualizing order, debugging cycles |
| `terraform import ADDR ID` | Bind existing object to config | Adopting click-ops (see 22) |
| `terraform state <sub>` | Ledger surgery | Rename/forget/inspect (see 22) |
| `terraform output [NAME]` | Read exports | CI, scripts, humans (Day 2 · see L2/07) |
| `terraform show [PATH]` | Human/JSON view of state or plan | `show -json tfplan \| jq` in CI |
| `terraform refresh` | Reconcile state with reality (legacy) | Prefer `plan -refresh-only` today |
| `terraform taint ADDR` | Mark for re-creation next apply | Replacing a sick instance (legacy: `-replace` flag preferred) |

## 2. graph — see the order Terraform sees

```bash
$ terraform graph | dot -Tpng > graph.png
# needs GraphViz installed (dot). Opens the dependency DAG as an image:
# aws_vpc.main → aws_subnet.public → aws_instance.web (edges = references)
```

```bash
$ terraform graph -type=plan | dot -Tpng > plan-graph.png
# graph of the PENDING changes only — smaller, review-friendly
```

You never write ordering (see 06 §3b) — the graph derives it from `resource.A.x` references. When `apply` seems to do things in a surprising sequence, draw the graph before blaming the provider.

## 3. The repair kit (with outputs)

```bash
$ terraform validate
Success! The configuration is valid.

$ terraform show -json tfplan | jq '.output_changes'
{ "vpc_id": { "actions": ["no-op"] } }

$ terraform output -raw vpc_id
vpc-0ab123456
```

📝 Modern note: `terraform refresh` as a standalone command is legacy — current Terraform folds refresh into `plan`/`apply` automatically, and `terraform plan -refresh-only` previews drift explicitly. Old tutorials still show bare `refresh`; prefer the `-refresh-only` form.

## Remember

- ✓ Inspect: `validate` (syntax), `show` (state/plan), `output` (exports), `graph` (order).
- ✓ Repair: `import` (adopt), `state mv/rm` (reshape), `-replace` (re-create sick resource).
- ⚠ Gotcha: `taint`/`-replace` schedules DESTRUCTION + re-creation — on a stateful resource (database) that's data loss. Snapshot first, replace second.
- 🎓 Exam takeaway: "visualize dependencies?" → `graph | dot`. "Check config without cloud?" → `validate`. "Adopt existing?" → `import`.
