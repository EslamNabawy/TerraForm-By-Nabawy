# terraform init — What It Creates

Day 1 · Initializing a working directory

`terraform init` turns an ordinary folder into a working directory: it downloads provider binaries, installs modules, configures the backend, and writes the lock file. It is always the first command in any new project, and it is safe to run multiple times.

## 1. The `.terraform/` tree (what appears on disk)

```
.terraform/
├── providers/
│   └── registry.terraform.io/
│       └── hashicorp/aws/
│           └── 5.x.x/
│               └── aws_plugin_binary
├── modules/
│   └── vpc/                  # one dir per module "source"
└── terraform.tfstate         # local backend metadata (NOT your real state)
```

- **providers/** — the actual plugin binaries Terraform calls over RPC (see 06). One per `required_providers` entry, pinned by version.
- **modules/** — downloaded copies of every `module "x" { source = ... }` block.
- **backend metadata** — connection info for the S3/DynamoDB backend (see 12 §7b). The backend's buckets and tables must exist BEFORE this runs.

## 2. The lock file (commit this)

```bash
$ terraform init
Initializing provider plugins...
- Installing hashicorp/aws v5.31.0...
Terraform has been successfully initialized!
```

```hcl
# .terraform.lock.hcl (auto-generated — COMMIT it)
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.31.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abc123...",
  ]
}
```

The lock file pins the EXACT provider build so your teammate's `init` downloads identical bits. Without it, two engineers can run the "same" code against different provider versions.

## 3. The `.gitignore` canon

```
.terraform/
terraform.tfstate
terraform.tfstate.backup
*.tfvars          # real values stay local; commit only *.tfvars.example
```

Exclude `.terraform/` (binaries, re-downloadable), `terraform.tfstate` (+ `.backup`) for local-state projects, and real `.tfvars` files. The course's rule of thumb: if Terraform can regenerate it (`init`) or it holds secrets, it does not belong in git.

## 4. Flags you'll actually use

```bash
$ terraform init -upgrade
# re-resolve to the newest allowed provider versions, rewrite the lock file

$ terraform init -migrate-state
# move local state into the newly configured S3 backend (keeps a local backup)

$ terraform init -backend-config="env/dev.hcl"
# backend block args from a file — backend blocks can't use var.* (see 12)
```

## Remember

- ✓ `init` = providers + modules + backend metadata + lock file. First command, safe to repeat.
- ✓ Commit `.terraform.lock.hcl`; ignore `.terraform/`, local state, real `.tfvars`.
- ⚠ Gotcha: bumping a version constraint in `versions.tf` does nothing until you run `init -upgrade` — `plan` will keep using the locked binary and you'll debug a "fix" that isn't applied.
- 🎓 Exam takeaway: "which command downloads providers?" → `init`. "Which file guarantees identical providers across machines?" → `.terraform.lock.hcl`.
