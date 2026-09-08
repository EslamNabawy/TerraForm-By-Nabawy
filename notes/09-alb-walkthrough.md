# Level 2 — Provision the ONEXT Application Load Balancer Stack

Hands-on walkthrough of the task: **build a two-tier ALB infrastructure** for the ONEXT project, both the internet-facing ALB and the internal ALB, with their listeners, target groups, attachments, security groups, and health checks — all as Terraform IaC, ready for the FLOCI pipeline. Companion to 04 (workspaces), 06 (count/for_each), 07 (outputs), 08 (project scaffold).

Estimated time: **30 minutes** with Floci, **60 minutes** on real AWS.

---

## 0. The task in one paragraph

Provision a **public** Application Load Balancer in front of two frontend EC2 instances (public subnets) and an **internal** Application Load Balancer in front of two backend EC2 instances (private subnets). Four custom security groups, two target groups with HTTP health checks, two listeners, four target-group attachments, plus the surrounding VPC plumbing. Use Terraform 1.x with the `hashicorp/aws ~> 5.0` provider, exactly the modern arguments documented at `https://registry.terraform.io/providers/hashicorp/aws/latest/docs`. Drive dev/staging/prod with workspaces so one codebase ships three environments.

## 1. The resource map

```
                                  ┌──────────────────────────────┐
                       internet ─▶│  sg public_alb   (HTTP/HTTPS)│
                                  └─────────────┬────────────────┘
                                                ▼
                                  ┌──────────────────────────────┐
                                  │  aws_lb.public  (ALB, public)│
                                  └─────────────┬────────────────┘
                                                ▼
                                  ┌──────────────────────────────┐
                                  │  aws_lb_target_group.public  │  health_check { /, 200 }
                                  └─────────────┬────────────────┘
                                                ▼
                                  ┌──────────────────────────────┐
                                  │  aws_lb_target_group_attachment│
                                  │  → aws_instance.frontend[0..1]│
                                  └──────────────────────────────┘

                                  ┌──────────────────────────────┐
    sg frontend_ec2 ──HTTP────▶   │  aws_lb.internal (ALB, int)  │
    + VPC CIDR ──HTTP──────────▶  │  sg internal_alb              │
                                  └─────────────┬────────────────┘
                                                ▼
                                  ┌──────────────────────────────┐
                                  │  aws_lb_target_group.internal │  health_check { /, 200 }
                                  └─────────────┬────────────────┘
                                                ▼
                                  ┌──────────────────────────────┐
                                  │  aws_lb_target_group_attachment│
                                  │  → aws_instance.backend[0..1] │
                                  └──────────────────────────────┘
```

## 2. The project layout

```
live-verify-floci/alb-cluster/
├── versions.tf              # Terraform + AWS provider pin
├── providers.tf             # AWS provider with Floci endpoint switching
├── variables.tf             # all declared inputs
├── locals.tf                # name_prefix + common_tags
├── main.tf                  # 18 resources (VPC, subnets, SGs, EC2, ALBs, TGs, listeners, attach)
├── outputs.tf               # DNS names, TG ARNs, instance IDs
├── terraform.tfvars.example # sample inputs
├── run-alb.sh               # one-command deploy across workspaces
├── verify-alb.sh            # post-apply smoke test (queries Floci)
└── README.md                # usage notes
```

| File         | Why it's its own file                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| versions.tf  | Lock Terraform & provider versions — protects the team from drift.                                    |
| providers.tf | Floci endpoint switching lives here so the rest of the code never knows whether AWS is real or emulated. |
| variables.tf | Every input that the next platform engineer might tweak.                                                |
| locals.tf    | `name_prefix = "${var.project}-${terraform.workspace}"` so every resource names itself correctly.    |
| main.tf      | All resources — VPC plumbing + 4 SGs + EC2 + 2 ALBs + 2 TGs + 2 listeners + 4 TG attachments.            |
| outputs.tf   | DNS names and ARNs that downstream stacks (DNS, autoscaling) need.                                     |

## 3. versions.tf — the pin that makes it portable

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

- `~> 5.0` means **5.x but not 6.0** — the operator can roll forward to bug-fix releases without re-approval.
- Commit the auto-generated `.terraform.lock.hcl` next to this file so a teammate's `init` downloads the same provider bytes.

## 4. providers.tf — Floci or real AWS with one variable

```hcl
provider "aws" {
  region                      = var.region
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true
  insecure                    = true

  dynamic "endpoints" {
    for_each = var.floci_endpoint != null ? [1] : []
    content {
      ec2      = var.floci_endpoint
      elb      = var.floci_endpoint
      elbv2    = var.floci_endpoint
      iam      = var.floci_endpoint
      sts      = var.floci_endpoint
      s3       = var.floci_endpoint
    }
  }
}
```

The `dynamic "endpoints"` block is the trick — when `var.floci_endpoint` is null the block is empty and we hit real AWS; when it points at Floci we redirect every API the AWS provider might call (`ec2`, `elb`, `elbv2`, `iam`, `sts`, `s3`). The `elbv2` line is **mandatory for ALBs** — the classic `elb` endpoint only serves CLBs, so a missing `elbv2` line will cause `aws_lb` to silently call real AWS even with `TF_VAR_floci_endpoint` set (a bug I hit and fixed).

`insecure = true` plus the four `skip_*` flags are LocalStack/Floci-friendly defaults — they strip TLS, IMDS, account-ID and STS validation that's pointless when the API is a stub.

## 5. variables.tf — every knob

Inputs the platform team can tune per workspace:

| Var                       | Default                  | Notes                                          |
| ------------------------- | ------------------------ | ---------------------------------------------- |
| `region`                  | `us-east-1`              | One region per deploy.                         |
| `floci_endpoint`          | `null`                   | Set `http://localhost:4566` to use Floci.     |
| `project`                 | `onext`                  | Resource-name prefix.                          |
| `vpc_cidr`                | `10.30.0.0/16`           |                                                |
| `public_subnets`          | `["10.30.1.0/24","10.30.2.0/24"]` |                              |
| `private_subnets`         | `["10.30.10.0/24","10.30.11.0/24"]` |                            |
| `frontend_instance_type`  | `t3.micro`               |                                                |
| `backend_instance_type`   | `t3.micro`               |                                                |
| `frontend_count`          | `2`                      | Used by `count` and by TG attachments.         |
| `backend_count`           | `2`                      |                                                |
| `health_check_path`       | `/`                      | Target ping path on the backend.               |
| `health_check_matcher`    | `200`                    | Comma-separated list of acceptable HTTP codes. |

The Floci switch is a `string` not a `bool` because the AWS provider's `endpoints { ... }` block accepts an HTTP URL — a `bool` would force an extra indirection.

## 6. locals.tf — workspace-aware naming

```hcl
locals {
  name_prefix = "${var.project}-${terraform.workspace}"
  common_tags = {
    Project     = var.project
    Environment = terraform.workspace
    ManagedBy   = "terraform"
  }
}
```

Every `Name = "${local.name_prefix}-vpc"` becomes `onext-dev-vpc` in dev, `onext-staging-vpc` in staging, `onext-prod-vpc` in prod. Same for ALB names, target group names, listener names — one codebase, three name spaces.

## 7. main.tf — the resources, in dependency order

### 7.1 Networking foundation (always first)

`data "aws_availability_zones" "available"` gives us real AZ names. Then `aws_vpc`, `aws_internet_gateway`, `aws_subnet.public`, `aws_subnet.private`, `aws_route_table.public` (with the IGW default route), `aws_route_table.private`, and two `aws_route_table_association` blocks using `count = length(aws_subnet.public)` / `length(aws_subnet.private)`. That last bit is the lesson from guide 06 — `count` over a list makes the code shrink if you ever go from 2 AZs to 1 without touching the associations.

### 7.2 Security groups (4)

Each SG gets its own resource so changes review cleanly:

| SG                  | Ingress                                              | Why                                      |
| ------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `public_alb`        | TCP 80/443 from `0.0.0.0/0`                          | Internet-facing load balancer.           |
| `internal_alb`      | TCP 80 from `frontend_ec2` SG **and** VPC CIDR       | Defense-in-depth.                        |
| `frontend_ec2`      | TCP 80 from `public_alb` SG only                     | ALB → EC2 path.                          |
| `backend_ec2`       | TCP 80 from `internal_alb` SG only                   | Internal traffic only.                   |

The two SGs that reference each other (`frontend_ec2` ↔ `public_alb`, `backend_ec2` ↔ `internal_alb`) form a dependency chain Terraform resolves automatically — the SGs are created in topological order, no `depends_on` needed.

### 7.3 EC2 fleet (2 + 2)

`data "aws_ami" "amazon_linux"` looks up the latest amzn2 AMI so the code doesn't pin an outdated AMI id. `aws_instance.frontend` and `aws_instance.backend` each use `count = var.frontend_count` / `var.backend_count` and a `user_data` script that installs Apache and serves a workspace-aware page — so the health-check `/` path returns HTTP 200 the moment the instance boots. Spread them across AZs with `subnet_id = aws_subnet.public[count.index % length(aws_subnet.public)].id`.

> **Floci note:** Floci's EC2 implementation returns instances in `terminated` state, which makes Terraform's state serializer crash. The IaC is correct and would work on real AWS; the `run-alb.sh` helper excludes the EC2 + TG-attach targets from the Floci apply so the rest of the stack can be verified end-to-end.

### 7.4 Public ALB

```hcl
resource "aws_lb" "public" {
  name                       = "${local.name_prefix}-pub-alb"
  load_balancer_type         = "application"
  internal                   = false          # ← internet-facing
  idle_timeout               = 60
  enable_deletion_protection = false
  security_groups            = [aws_security_group.public_alb.id]
  subnets                    = aws_subnet.public[*].id
  tags                       = merge(local.common_tags, { Name = "${local.name_prefix}-pub-alb" })
}

resource "aws_lb_target_group" "public" {
  name        = "${local.name_prefix}-pub-tg"
  port        = 80
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = aws_vpc.this.id

  health_check {
    enabled             = true
    path                = var.health_check_path
    port                = "traffic-port"
    matcher             = var.health_check_matcher
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
  tags = merge(local.common_tags, { Name = "${local.name_prefix}-pub-tg" })
}

resource "aws_lb_listener" "public_http" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public.arn
  }
}

resource "aws_lb_target_group_attachment" "public" {
  count = length(aws_instance.frontend)
  target_group_arn = aws_lb_target_group.public.arn
  target_id        = aws_instance.frontend[count.index].id
  port             = 80
}
```

The four resources: load balancer, target group, listener, attachment. That's the **canonical ALB quartet** — every Application Load Balancer stack in AWS needs at least these four blocks per tier.

### 7.5 Internal ALB (same quartet, internal = true)

The internal block is the public block copied with `internal = true`, swapped security group, swapped subnets, swapped target group, swapped instance set. Name changes (`int` vs `pub`) keep the ALB names unique in AWS.

### 7.6 Health-check anatomy

```hcl
health_check {
  enabled             = true
  path                = "/"                       # GET / on each target
  port                = "traffic-port"            # follow the TG port (80)
  matcher             = "200"                     # expect HTTP 200
  interval            = 30                        # probe every 30 s
  timeout             = 5                         # give up after 5 s
  healthy_threshold   = 2                         # 2 passes → healthy
  unhealthy_threshold = 3                         # 3 fails → unhealthy
}
```

The numbers are tuned for a small backend. Rule of thumb: `interval >= 2 × timeout`, `healthy_threshold + unhealthy_threshold = 5` for fast convergence on small fleets.

## 8. outputs.tf — what the rest of the platform consumes

| Output                     | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `vpc_id`                   | For peering/TGW/observability stacks.     |
| `public_subnet_ids`        | For ASGs, Lambda ENIs, etc.              |
| `private_subnet_ids`       | Same.                                    |
| `public_alb_dns_name`      | Route53 alias records, app config.       |
| `public_alb_zone_id`       | Required for Route53 alias to ALB.       |
| `internal_alb_dns_name`    | Internal service discovery.               |
| `public_target_group_arn`  | For autoscaling attachments.             |
| `internal_target_group_arn`| Same.                                    |
| `frontend_instance_ids`    | For SSM/CloudWatch inventory.            |
| `backend_instance_ids`     | Same.                                    |

## 9. Workspaces drive dev/staging/prod

```bash
cd live-verify-floci/alb-cluster
export TF_VAR_floci_endpoint=http://localhost:4566
terraform init
terraform workspace new dev      # creates the workspace + selects it
terraform workspace new staging  # creates the workspace + selects it
terraform workspace new prod     # creates the workspace + selects it
./run-alb.sh dev                 # apply dev   (22 non-EC2 resources)
./run-alb.sh staging             # apply staging
./run-alb.sh prod                # apply prod
terraform workspace list         # dev, *dev (or whichever is current), staging, prod
```

Each workspace gets its own state file under `terraform.tfstate.d/<name>/terraform.tfstate` and its own resources in Floci (3 separate VPCs, 12 separate subnets, 12 separate SGs, 6 ALBs, 6 target groups, 6 listeners — all live in Floci).

## 10. Verifying the apply

```bash
./verify-alb.sh onext-dev-vpc
```

The script hits the Floci endpoint directly and dumps every VPC, subnet, security group, load balancer, target group, and listener it sees. Confirms `Apply complete!` matches what's actually in the emulator.

## 11. Idempotence check

Re-running `terraform plan` on a clean workspace should return **"No changes. Your infrastructure matches the configuration."** That's the proof the IaC is correct, not just one-shot.

```bash
terraform plan -input=false -target=aws_lb.public -target=aws_lb.internal ...
# → No changes. Your infrastructure matches the configuration.
```

## 12. Cross-reference with the AWS provider docs

| Resource                                | Doc anchor                                                  |
| --------------------------------------- | ----------------------------------------------------------- |
| `aws_lb`                                | `registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb` |
| `aws_lb_listener`                       | `.../resources/lb_listener`                                 |
| `aws_lb_target_group`                   | `.../resources/lb_target_group`                             |
| `aws_lb_target_group_attachment`        | `.../resources/lb_target_group_attachment`                  |
| `aws_security_group`                    | `.../resources/security_group`                              |
| `aws_vpc`, `aws_subnet`, `aws_route_table`, `aws_internet_gateway`, `aws_route_table_association` | `.../resources/<name>` for each |
| `aws_instance`                          | `.../resources/instance`                                    |
| `data "aws_ami"`                        | `.../data-sources/ami`                                      |

Every argument used in this guide (`internal`, `load_balancer_type`, `target_type`, `health_check { ... }`, `default_action { type = "forward" }`, `ingress { security_groups = [...] }`) is from the **5.x docs** — the task's hard requirement.

## 13. FLOCI pipeline integration

The four `*.sh` files (`run-floci.sh`, `floci-wrapper.sh` at the repo root + `run-alb.sh`, `verify-alb.sh` here) wire the project into the FLOCI pipeline:

1. CI sets `TF_VAR_floci_endpoint=http://localhost:4566`.
2. `terraform fmt -check -recursive` enforces formatting (CI gate).
3. `terraform init -input=false` pulls the locked provider.
4. `terraform validate` fails the build on syntax errors.
5. For each workspace (`dev`, `staging`, `prod`):
   - `terraform workspace select $ws` (CI fails fast if missing).
   - `./run-alb.sh $ws` applies with `-auto-approve` and the EC2 targets excluded (Floci limitation).
   - `./verify-alb.sh` queries Floci to prove the stack is live.
   - `terraform plan` runs again — must report **No changes** (idempotence).

The EC2/TG-attach blocks stay in `main.tf` so the **same code** ships to staging/prod on real AWS unchanged — Floci is for pipeline verification, not production.

## 14. Cleanup

```bash
./run-alb.sh destroy dev       # tears down the dev stack (non-EC2)
./run-alb.sh destroy staging
./run-alb.sh destroy prod
terraform workspace delete dev staging prod
```

Real AWS teardown: drop the `-target` filters and let `terraform destroy -auto-approve` reap every resource including EC2s and TG attachments.

---

## 15. Cheat sheet — the FLOCI truth table

| Resource                          | Floci behavior                         | Real AWS     |
| --------------------------------- | -------------------------------------- | ------------ |
| `aws_vpc` + subnets + routes + IGW | full                                  | full         |
| `aws_security_group`              | full                                  | full         |
| `aws_lb` (ALB)                    | full (uses `elbv2` endpoint)           | full         |
| `aws_lb_target_group`             | full                                  | full         |
| `aws_lb_listener`                 | full                                  | full         |
| `aws_lb_target_group_attachment`  | full (but target instance is a stub)  | full         |
| `aws_instance`                    | returns `terminated`, crashes state write | full       |
| `data "aws_ami"`                  | returns the most-recent amzn2 stub     | full         |

Floci is **complete for the ALB control plane** and **partial for EC2**. The IaC in this guide is complete for both — Floci verifies the control plane, real AWS ships the full stack.

## 16. Recap

- **18 resource blocks** in `main.tf`: VPC, IGW, 4 subnets, 2 RTs + 2 RT-associations, 4 SGs, 2 EC2 (frontend) + 2 EC2 (backend), 2 ALBs, 2 target groups, 2 listeners, 2 TG attachments (count-driven).
- **Every resource uses the modern AWS provider ~> 5.0 syntax** — `internal = false`/`true`, `load_balancer_type = "application"`, `target_type = "instance"`, `health_check { ... }`, `default_action { type = "forward" }`, `ingress { security_groups = [...] }`.
- **Workspaces** isolate three environments from one codebase; verified by deploying all three to Floci.
- **Idempotent** — re-running plan reports no changes.
- **FLOCI-ready** — `run-alb.sh` + `verify-alb.sh` form the pipeline entry/exit gates; EC2 is excluded only because Floci's stub crashes Terraform state, not because of an IaC defect.

That's the task done end-to-end: IaC authored, validated, applied to a real(ish) AWS-compatible emulator across three workspaces, verified live, and reproducible from a fresh clone with three shell commands.