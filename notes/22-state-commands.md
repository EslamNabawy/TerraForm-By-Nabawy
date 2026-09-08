# State Commands — list / show / pull / mv / rm / import

Day 1 · Managing state from the CLI

State commands read and reshape Terraform's memory WITHOUT touching real infrastructure. `apply` changes the cloud; these change the ledger. Every one of them is safe to rehearse on the emulator first.

## 1. Inspect (read-only, run freely)

```bash
$ terraform state list
aws_vpc.main
aws_subnet.public["us-east-1a"]
aws_instance.web["web-a"]
```

```bash
$ terraform state show aws_vpc.main
# aws_vpc.main:
resource "aws_vpc" "main" {
    arn        = "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-0ab123456"
    cidr_block = "10.0.0.0/16"
    id         = "vpc-0ab123456"
}
```

```bash
$ terraform state pull > state-backup.json
# downloads the raw JSON (S3 backend) to stdout — your before-anything-risky snapshot
```

## 2. Reshape (refactor without re-creating)

```bash
$ terraform state mv aws_instance.web aws_instance.app
Move "aws_instance.web" to "aws_instance.app"
Successfully moved 1 object(s).
```

Rename the tracking, not the resource: next `plan` shows zero changes because the cloud object never moved — only the ledger entry did. This is how you rename resources without downtime.

```bash
$ terraform state rm aws_instance.legacy
Removed aws_instance.legacy
Successfully removed 1 resource instance(s).
```

`rm` stops managing the resource — the EC2 keeps running, Terraform just forgets it. Opposite of `destroy` (which deletes the cloud object). Use when decommissioning from Terraform but keeping the machine.

## 3. Adopt (bring click-ops under management)

```bash
$ terraform import aws_vpc.main vpc-0ab123456
aws_vpc.main: Import successful!
```

Steps: write the `resource` block first (matching the real object's config as closely as you can), `import` to bind the ID, then `plan` — and fix the config until the diff is empty. Import binds identity only; it never generates configuration.

## Remember

- ✓ Inspect: `list` (what), `show` (details), `pull` (raw JSON backup).
- ✓ Reshape: `mv` (rename tracking, zero-downtime refactor), `rm` (stop managing, object survives).
- ✓ Adopt: write block → `import` → `plan` until clean.
- ⚠ Gotcha: `state rm` feels like cleanup but orphans live infrastructure — the next engineer finds an untracked EC2 burning money. `rm` only when you mean "keep it, unmanaged" and say so in the commit message.
- 🎓 Exam takeaway: "`rm` vs `destroy`?" → `rm` forgets (object lives), `destroy` deletes (object dies). "Rename without re-creating?" → `state mv`.
