# What Is Terraform? — Facts, License, Ecosystem

Day 1 · the tool behind the whole course

Terraform is a tool for building, changing, and versioning infrastructure safely and efficiently. You describe what you want in configuration files, and Terraform talks to cloud APIs to make reality match — then keeps it matched on every later run.

## 1. The facts (memorize these five)

- **Author:** HashiCorp. **First release:** 2014. **Written in:** Go (single binary, no runtime to install).
- **License:** Mozilla Public License 2.0 (open source).
- 📝 Modern note: in 2023 HashiCorp moved new Terraform releases to the BUSL license; the community fork **OpenTofu** continues the MPL-licensed line. Same HCL, same workflow — know both names for interviews.
- **What it manages:** existing popular providers (AWS, Azure, GCP, Cloudflare…) as well as custom in-house solutions (write your own provider against any API).
- **Core promise:** build, change, version — every change goes through `plan` before `apply`, and every state is recorded in `terraform.tfstate`.

## 2. Why it exists (the pain)

Before Terraform, infrastructure lived in click-ops consoles and tribal knowledge. Nobody could answer "what exactly is running in prod?" or "who changed the security group last Tuesday?" Terraform moves infrastructure into versioned files, so `git log` answers both questions.

## 3. How it looks (30-second demo)

```hcl
# main.tf — declare what you want; Terraform figures out the how
provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

```bash
$ terraform init
Initializing the backend...
Initializing provider plugins...
- Installing hashicorp/aws v5.x.x...
Terraform has been successfully initialized!

$ terraform apply -auto-approve
aws_vpc.main: Creating...
aws_vpc.main: Creation complete after 3s [id=vpc-0ab123456]
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

The `id=vpc-0ab123456` is a real AWS-side ID. Terraform stores it in state so the next `plan` knows this VPC already exists.

## 4. Terraform vs the neighbors (one line each)

| Tool | Layer | One-line difference |
|---|---|---|
| Terraform | Infra provisioning | Declarative + plan + state (this course) |
| Ansible | OS config | No state/plan for infra (see 05) |
| CloudFormation | Infra provisioning | AWS-only, no multi-cloud (see 03) |
| Packer | Image baking | Builds AMIs, doesn't manage live infra |

## Remember

- ✓ Terraform = build, change, version — HashiCorp, 2014, Go, MPL 2.0.
- ✓ Manages existing providers AND custom in-house solutions.
- ⚠ "Terraform" the 2023+ releases are BUSL, not MPL — the MPL line continues as OpenTofu. Don't call new Terraform "fully open source" in an interview without the footnote.
- 🎓 Exam takeaway: if a question asks "which tool versions infrastructure across clouds?" the answer is Terraform; if it asks "which is AWS-only?" the answer is CloudFormation.
