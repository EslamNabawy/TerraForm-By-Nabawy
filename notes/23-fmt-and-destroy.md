# terraform fmt & terraform destroy

Day 1 · Format code and clean up infrastructure

Two commands at opposite ends of a resource's life: `fmt` keeps the code readable from day one, `destroy` tears everything down at the end. Run the first before every commit; run the second only when you mean it.

## 1. fmt — canonical style, zero decisions

```hcl
# BEFORE — works, but inconsistent
resource "aws_vpc" "main" {
cidr_block="10.0.0.0/16"
    tags={Name="study-vpc"}
}
```

```bash
$ terraform fmt
main.tf
```

```hcl
# AFTER — aligned =, two-space indent, spacing normalized
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "study-vpc" }
}
```

`fmt` lists every file it rewrote. Check the habit into CI so style arguments never reach code review:

```bash
$ terraform fmt -check
main.tf          # exit 1: this file needs formatting
```

`-check` fails (non-zero exit) when anything is unformatted — the pipeline gate. `-recursive` covers subfolders; `-diff` shows what would change without writing.

## 2. destroy — behavior, transcript, aftermath

```bash
$ terraform destroy
aws_instance.web["web-a"]: Destroying... [id=i-012345]
aws_instance.web["web-a"]: Destruction complete after 12s
aws_vpc.main: Destroying... [id=vpc-0ab123456]
aws_vpc.main: Destruction complete after 4s
Destroy complete! Resources: 2 destroyed.
```

Order is reverse-dependency (instances before their VPC). Confirmation is prompted unless `-auto-approve`. Afterward, `terraform.tfstate` is updated to empty — the ledger matches the now-empty reality. Test-env cleanup is the legitimate daily use; `destroy -target=` removes ONE resource for debugging.

## Remember

- ✓ `fmt` before every commit; `fmt -check` in CI. Formatting is a machine's job.
- ✓ `destroy` prompts, deletes in reverse order, empties state. `-auto-approve` for pipelines only.
- ⚠ PERMANENCE WARNING: `destroy` on prod state deletes real infrastructure with no undo — S3 versioning won't resurrect EC2s. Prod destroys belong behind manual approval gates, never on a laptop command line.
- 🎓 Exam takeaway: "which command normalizes style?" → `fmt`. "What does destroy update?" → the state file (to empty).
