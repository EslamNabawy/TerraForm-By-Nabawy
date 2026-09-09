# Floci — Local AWS Emulator — Complete Guide

One-line: **Floci is a free, open-source LocalStack alternative** — a local AWS emulator in Docker. Point Terraform, the AWS CLI, or any SDK at `http://localhost:4566` and practice real AWS workflows with **zero account, zero cost, zero credentials to leak**.

- Repo: `floci-io/floci` (MIT, ~23k stars) — image `floci/floci:latest`, port `4566`
- Family: `floci-az` (Azure, :4577), `floci-gcp` (GCP, :4588), `floci-oci` (OCI, :4599)
- Console: `floci-ui` (AWS-Console-style UI) · CLI: `floci-cli` (`floci start`, `floci env`, `floci doctor`)
- Docs: `floci.io` · Community: Slack + GitHub Discussions

## 1. Why it exists (the LocalStack story)

In 2026 LocalStack's Community edition was sunset — auth tokens for basic use, frozen security updates. Floci fills that gap: **every emulated service free for everyone, forever, no tokens, no telemetry, no feature gates.** Built with Quarkus Native, ~24ms startup, ~13 MiB idle.

**Why it matters for YOUR study:** every guide so far (`07` provider setup, `09` VPC, `10` subnets) can run against Floci locally — no AWS bill, no leaked keys, `terraform destroy` is instant.

## 2. What it emulates (and how faithfully)

Application, data, eventing, identity, infra, billing services — S3, DynamoDB, SQS, SNS, IAM, STS, KMS, SSM, Secrets Manager, Step Functions, CloudFormation, EC2, ECS, EKS, Lambda, RDS, ElastiCache, MSK, Neptune, OpenSearch, CodeBuild and more. Full list: repo `docs` → services overview.

Fidelity rule: **real Docker where it matters** — Lambda, RDS, Neptune, ElastiCache, MSK, ECS, EC2, EKS, OpenSearch, CodeBuild, Managed Flink run real container-backed execution, not shallow mocks. Validated by `compatibility-tests/` suites: `sdk-test-java/node/python/go/awscli` + `compat-terraform` (Terraform v1.10+), `compat-opentofu`, `compat-cdk`.

## 3. Quick start (2 ways)

### A — CLI (fastest)
```bash
floci start
eval "$(floci env)"

aws s3 mb s3://my-bucket
aws dynamodb create-table --table-name demo --attribute-definitions AttributeName=pk,AttributeType=S --key-schema AttributeName=pk,KeyType=HASH --billing-mode PAY_PER_REQUEST
aws dynamodb list-tables
```
Any region works. Credentials can be any non-empty values.

### B — Docker Compose
```yaml
# compose.yaml
services:
  floci:
    image: floci/floci:latest
    ports: ["4566:4566"]
    volumes: ["./data:/app/data"]
```
```bash
docker compose up -d
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566
```
Migrating from LocalStack? Swap the image name, keep everything else. Old image `hectorvent/floci` no longer updates — use `floci/floci:latest`.

## 4. Terraform + Floci (the important part)

Standard `hashicorp/aws` provider, endpoints overridden per service. From the official `docs/getting-started/terraform.md`:

```hcl
# provider.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    dynamodb     = "http://localhost:4566"
    secretsmanager = "http://localhost:4566"
    s3           = "http://localhost:4566"
    sns          = "http://localhost:4566"
    sqs          = "http://localhost:4566"
    ssm          = "http://localhost:4566"
    # add one line per service your config uses
  }
}
```

```hcl
# main.tf
resource "aws_s3_bucket" "app" { bucket = "floci-terraform-example" }
resource "aws_sqs_queue" "jobs" { name = "floci-terraform-jobs" }
resource "aws_dynamodb_table" "items" {
  name         = "floci-terraform-items"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute { name = "id" type = "S" }
}
resource "aws_ssm_parameter" "environment" {
  name  = "/floci/environment"
  type  = "String"
  value = "local"
}
```
```bash
terraform init && terraform validate && terraform plan && terraform apply
aws --endpoint-url http://localhost:4566 s3api head-bucket --bucket floci-terraform-example
terraform destroy
```

**Key rule:** every AWS service in your config needs its own `endpoints { }` line, or the provider talks to real AWS for that service. Full automated example: `compatibility-tests/compat-terraform` in the repo.

## 5. Emulated S3 backend + DynamoDB locking (full local workflow)

```hcl
terraform {
  backend "s3" {
    bucket                      = "tfstate"
    key                         = "terraform.tfstate"
    region                      = "us-east-1"
    endpoint                    = "http://localhost:4566"
    dynamodb_endpoint           = "http://localhost:4566"
    dynamodb_table              = "tflock"
    access_key                  = "test"
    secret_key                  = "test"
    skip_credentials_validation = true
    skip_region_validation      = true
    use_path_style              = true
  }
}
```
```bash
aws --endpoint-url http://localhost:4566 s3api create-bucket --bucket tfstate
aws --endpoint-url http://localhost:4566 dynamodb create-table --table-name tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
terraform init
```

## 6. Floci vs LocalStack (30 seconds)

|  | Floci | LocalStack (post-2026) |
|---|---|---|
| License/cost | MIT, all services free forever | Community sunset; tokens + paid gates |
| Startup/footprint | ~24ms, ~13 MiB idle | heavier (JVM/Python) |
| Endpoint | `localhost:4566` (same — drop-in) | `localhost:4566` |
| Migration | swap image, keep going | — |
| Heavy services | real Docker-backed | real Docker-backed (paid tiers for some) |
| Multi-cloud | az/gcp/oci siblings, one port each | AWS-focused |

## 7. Floci CLI shortcuts (verified against official README)

The CLI manages lifecycle, not resources — it starts/stops the emulator; `aws`/Terraform do the rest. Bare `floci X` = AWS (default product); others need the prefix.

### Daily 5 (memorize)
```bash
floci start          # launch container (AWS)
eval "$(floci env)"  # export endpoint + dummy creds into shell
floci doctor         # diagnostics when something looks wrong
floci status         # container state + server health
floci stop           # stop (add --remove to delete container)
```

### Full lifecycle + debug
```bash
floci restart        # stop then start
floci wait           # poll until ready (CI-friendly: floci wait --timeout 60s)
floci logs           # stream container logs
floci version        # CLI + server versions
floci services       # list enabled AWS services
floci snapshot save/load/list/delete   # save/restore emulator state (reset labs fast)
```

### Multi-cloud (same verbs, prefixed)
```bash
floci gcp start && eval "$(floci gcp env)"   # :4588
floci az start  && eval "$(floci az env)"    # :4577
floci oci start && floci oci setup && eval "$(floci oci env)"  # :4599, setup = one-time OCI profile
floci config default-product gcp   # make bare `floci start` mean GCP (aws/gcp/az/oci)
```

### Install (pick one) + upkeep
```bash
brew install floci-io/floci/floci            # macOS/Linux
curl -fsSL https://floci.io/install.sh | sh  # Linux/macOS script
iwr https://floci.io/install.ps1 | iex       # Windows PowerShell
scoop bucket add floci https://github.com/floci-io/scoop-floci && scoop install floci
floci update --check   # exit 0 = current, 1 = update available
floci update           # self-update (refuses on brew installs — use brew upgrade)
floci completion bash >> ~/.bashrc   # tab completion (or zsh)
```

### CI pattern (copy-paste)
```bash
floci start --detach
floci wait --timeout 60s
eval "$(floci env)"
pytest   # or terraform plan/apply
floci stop --remove
```

### Global flags (all commands)
`--endpoint` (default `http://localhost:4566`, env `FLOCI_ENDPOINT`), `--container` (default `floci`), `-o text|json|yaml`, `-q`, `-v`, `--no-color`, `--profile` (`~/.floci/profiles/*.yaml`). Port auto-detection: `status/version/wait/env` derive the endpoint from the container's port mapping.

## 8. Gotchas (study-saver list)

1. **Missing endpoint line = real AWS call.** If `plan` hangs on credentials or creates real resources, check `endpoints { }`.
2. **Multi-container setups:** set `FLOCI_HOSTNAME=floci` (service name) so returned URLs (e.g. SQS `QueueUrl`) resolve from your app container instead of `localhost`.
3. **Credentials:** any non-empty values work — unless you enable stricter per-service auth (`FLOCI_SERVICES_S3_ENFORCE_AUTH=true` rejects unknown signed S3 keys).
4. **Persistence:** mount `./data:/app/data` or state vanishes on restart.
5. **Not everything is emulated** — check the services overview before assuming (VPC/EC2 basics yes, exotic features maybe not).

## 9. Interview Q&A

- **What is Floci?** Free MIT local AWS emulator (LocalStack alternative), Docker, port 4566.
- **How does Terraform use it?** Standard AWS provider with per-service `endpoints` overrides + dummy creds + validation skips.
- **Why local emulation for IaC study?** Zero cost, instant destroy, safe credential practice, CI-friendly (`compat-terraform` suite proves it).
- **Daily CLI?** `floci start` → `eval "$(floci env)"` → work → `floci stop`. Debug: `doctor`, `status`, `logs`; CI: `wait --timeout 60s`; reset labs: `snapshot save/load`.
- **Floci vs LocalStack?** Drop-in same-port replacement; Floci fully free/MIT after Community sunset.
- **How does state work locally?** Default local backend, or emulated S3 + DynamoDB lock table.
- **What's the multi-cloud story?** Sibling emulators az/gcp/oci on ports 4577/4588/4599, plus `floci-ui` console and `floci-cli`.

---
Next: EC2 + security groups lab (run it against Floci first, AWS second), or `floci-ui` console tour.
