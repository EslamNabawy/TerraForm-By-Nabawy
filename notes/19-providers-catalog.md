# Providers — IaaS, PaaS, SaaS Catalog

Day 1 · who Terraform talks to

A provider is responsible for understanding API interactions and exposing resources. Terraform Core never touches a cloud directly — it plans the graph, and provider plugins make the API calls. If it has an API, somebody has written (or can write) a provider for it.

## 1. The catalog (what lives where)

| Layer | Examples | You manage |
|---|---|---|
| IaaS | AWS, Azure, GCP, Alibaba | VPCs, VMs, disks, load balancers |
| PaaS | Heroku, Render | Apps, dynos, managed DBs |
| SaaS | Cloudflare, Datadog, GitHub | DNS zones, monitors, repos |

One `apply` can touch all three layers at once (e.g. AWS VPC + Cloudflare DNS + GitHub repo) — that multi-API run is the point of being platform-agnostic (see 04).

## 2. Declaring a provider (block + version pin)

```hcl
# versions.tf — declare and pin
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"     # 5.x, never 6.0 — review major bumps by hand
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# provider.tf — configure (auth lives here or in env vars, see 07)
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu"              # second instance of the SAME provider
  region = "eu-west-1"
}
```

```bash
$ terraform init
- Installing hashicorp/aws v5.31.0...
- Installing cloudflare/cloudflare v4.12.0...
Terraform has been successfully initialized!
```

## 3. Using two instances of one provider

```hcl
resource "aws_vpc" "primary" {
  cidr_block = "10.0.0.0/16"          # default provider → us-east-1
}

resource "aws_vpc" "dr" {
  provider   = aws.eu                 # aliased provider → eu-west-1
  cidr_block = "10.50.0.0/16"
}
```

Resources default to the un-aliased block; `provider = aws.eu` opts into the second. Forgetting the alias is the classic multi-region bug — both VPCs land in the same region and peering fails on overlap.

## Remember

- ✓ Providers = API plugins (IaaS/PaaS/SaaS); Core plans, providers execute.
- ✓ Pin with `~>` in `required_providers`; configure in `provider` blocks; `alias` for multi-region/account.
- ⚠ Gotcha: static credentials inside a `provider` block end up in git. Use env vars or CLI config (see 07) — the block should carry region and aliases, never secrets.
- 🎓 Exam takeaway: "Core vs provider responsibility?" → Core reads config, manages state, builds the graph; providers do auth + API calls (see 06).
