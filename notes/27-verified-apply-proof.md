# Verified-Apply Proof — Executed Evidence Appendix

One-line: **this library's projects were actually applied, not just written** — S3 smoke test plus a two-tier ALB stack across three workspaces, all against the Floci emulator, with idempotence re-checks.

## 1. S3 smoke proof (1 resource, full lifecycle)

Terraform v1.16.1 against Floci v2.0.1: `init` → `plan` (1 to add) → `apply` (bucket created, confirmed via `aws s3 ls` against the endpoint) → `terraform show` (resource recorded) → `destroy` (1 destroyed, clean state). Proves endpoints, dummy credentials, and state handling before touching bigger stacks.

## 2. ALB stack across three workspaces (identical code)

| Workspace | VPC | Apply summary |
|---|---|---|
| dev | vpc-5e7eebfd (10.30.0.0/16) | 6 added (full apply after EC2-stub cleanup) |
| staging | vpc-82c9f766 | 22 added (fresh) |
| prod | vpc-64c1ca93 | 22 added (fresh) |

Each workspace keeps its own state file (`terraform.tfstate.d/<name>/terraform.tfstate`, ~52–69 KB). Dev outputs included both ALB DNS names (`onext-dev-pub-alb-….elb.localhost.floci.io`), both target-group ARNs, and the VPC id.

## 3. Idempotence proof

Re-running `terraform plan` in a clean workspace right after apply:

```
No changes. Your infrastructure matches the configuration.
```

Correct IaC, not a one-shot script.

## 4. Floci vs real AWS (honest fidelity table)

| Resource | Floci | Real AWS |
|---|---|---|
| VPC, subnets, routes, IGW | full | full |
| Security groups | full | full |
| ALB, target group, listener | full (elbv2 endpoint) | full |
| Target attachment | full (instance is a stub) | full |
| EC2 instance | returns `terminated` stub — excluded from emulator applies, kept in code for production | full |
| AMI data source | most-recent amzn2 stub | full |

The EC2 stub is a known emulator limit, not a code defect: apply scripts exclude EC2 targets on Floci; the blocks stay in `main.tf` for the production deploy.

## 5. The five-gate pipeline (copy-paste)

```bash
terraform fmt -check -recursive   # gate 1: formatting
terraform init -input=false       # gate 2: provider lock
terraform validate                # gate 3: syntax
./run-alb.sh dev                  # apply (workspace-aware script)
./verify-alb.sh                   # gate 4: live resources exist
terraform plan                    # gate 5: idempotent, no drift
```

If Floci isn't running, the wrapper reports it before the apply so CI fails fast. Same gates run per workspace (`dev`, `staging`, `prod`).

---
Companion: note 14 (the 7-step proof runbook) to reproduce the smoke test yourself; note 09 (ALB walkthrough) for the architecture.
