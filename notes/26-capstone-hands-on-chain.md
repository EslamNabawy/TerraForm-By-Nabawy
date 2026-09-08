# Capstone Lab — Full Build Chain, Step by Step

Day 2 · Hands-on lab (emulator-ready, AWS-identical minus endpoints)

Everything in this course, in one file, in order: Provider → VPC → 2 Subnets → 2 Instances per Subnet → Security Group (HTTPS) → Outputs (private IPs) → Provisioner → Destroy. Run it on the emulator free; the AWS swap is deleting 4 lines.

## 1. The full `main.tf` (8 resources, one file)

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region     = "us-east-1"
  access_key = "test"
  secret_key = "test"   # emulator dummy creds; AWS: delete these two lines
  skip_credentials_validation  = true   # emulator only — delete for AWS
  skip_requesting_account_id   = true   # emulator only — delete for AWS
  endpoints {
    ec2 = "http://localhost:4566"      # emulator only — delete for AWS
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "capstone" }
}

resource "aws_subnet" "a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_subnet" "b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  for_each = toset(["a1", "a2", "b1", "b2"])   # 2 per subnet (see file 06 §5)
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  subnet_id              = startswith(each.key, "a") ? aws_subnet.a.id : aws_subnet.b.id
  vpc_security_group_ids = [aws_security_group.web.id]
  tags                   = { Name = "web-${each.key}" }

  provisioner "local-exec" {   # last resort, used here on purpose (see file 25)
    command = "echo ${each.key}=${self.private_ip} >> ips.txt"
  }
}

output "ips" {
  value = { for k, inst in aws_instance.web : k => inst.private_ip }
}
```

## 2. Run it (two tabs)

```bash
# TAB 1 — observe
$ floci start
$ eval "$(floci env)"

# TAB 2 — build
$ terraform init
Terraform has been successfully initialized!

$ terraform plan -out=tfplan
Plan: 8 to add, 0 to change, 0 to destroy.

$ terraform apply tfplan
aws_vpc.main: Creation complete [id=vpc-0ab123456]
aws_subnet.a: Creation complete [id=subnet-0111]
aws_subnet.b: Creation complete [id=subnet-0222]
aws_security_group.web: Creation complete [id=sg-0cd456]
aws_instance.web["a1"]: Creation complete [id=i-0001]
aws_instance.web["a1"] (local-exec): Executing: echo a1=10.0.1.11 >> ips.txt
...
Apply complete! Resources: 8 added, 0 changed, 0 destroyed.

$ terraform output -json | jq .ips.value
{ "a1": "10.0.1.11", "a2": "10.0.1.12", "b1": "10.0.2.11", "b2": "10.0.2.12" }

$ cat ips.txt
a1=10.0.1.11
a2=10.0.1.12
b1=10.0.2.11
b2=10.0.2.12
```

## 3. Tear it down (the chain in reverse)

```bash
$ terraform destroy
aws_instance.web["b2"]: Destroying...
aws_security_group.web: Destroying...
aws_subnet.b: Destroying...
aws_vpc.main: Destroying...
Destroy complete! Resources: 8 destroyed.
```

Reverse-dependency order, confirmation prompted, state emptied. The lab is only finished when `destroy` is clean — leftover emulator state is how "works on my machine" starts.

## Remember

- ✓ Chain: provider → VPC → subnets → SG → instances → outputs → provisioner → destroy.
- ✓ `for_each` keys (`a1/a2/b1/b2`) give per-instance identity; `startswith` routes to the right subnet.
- ⚠ Gotcha: the `local-exec` writes `ips.txt` on YOUR machine — re-running `apply` without changes does NOT re-run it (creation-only). Delete the file + `taint` to regenerate honestly.
- 🎓 Exam takeaway: narrate this chain cold — "provider auth, VPC, two subnets across AZs, SG with 443 in and all out, four instances via for_each, map output of private IPs, local-exec inventory, destroy in reverse." That paragraph passes any "walk me through a project" question.

Resources — registry.terraform.io · developer.hashicorp.com/terraform · github.com/hashicorp/terraform
