# Core CLI Commands — init / plan / apply / destroy

Day 1 · the four commands that run everything

Four commands, one order, zero exceptions: `init` once, then `plan` → `apply` forever, `destroy` when you're done. Everything else in the CLI is a variation or an inspection tool (see 24).

## 1. The loop (with real transcripts)

```bash
$ terraform init
Terraform has been successfully initialized!

$ terraform plan -out=tfplan
Terraform will perform the following actions:
  + aws_vpc.main
      id         = (known after apply)
      cidr_block = "10.0.0.0/16"
Plan: 1 to add, 0 to change, 0 to destroy.
```

`plan` previews and changes nothing — safe to run anytime, including in CI on every pull request.

```bash
$ terraform apply tfplan
aws_vpc.main: Creating...
aws_vpc.main: Creation complete after 3s [id=vpc-0ab123456]
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

`apply tfplan` executes EXACTLY the saved plan — no drift between review and execution. Bare `terraform apply` (no file) plans interactively and asks for confirmation.

```bash
$ terraform destroy
aws_vpc.main: Destroying... [id=vpc-0ab123456]
aws_vpc.main: Destruction complete after 4s
Destroy complete! Resources: 1 destroyed.
```

`destroy` asks for confirmation, deletes everything in state, and updates `terraform.tfstate` to empty. In test envs this is your cleanup; in prod it should be behind an approval gate.

## 2. The `[options]` you'll actually pass

```bash
terraform init [options] [DIR]        # -upgrade, -migrate-state, -backend-config=
terraform plan -out=tfplan            # save the plan; -var / -var-file for inputs
terraform apply tfplan                # the file form — reviewed == executed
terraform apply -auto-approve         # skip confirmation (CI only, never prod-by-hand)
terraform destroy -auto-approve       # same warning, louder
terraform destroy -target=aws_vpc.main  # destroy ONE resource (debugging only)
```

## Remember

- ✓ Order: `init` → `plan` → `apply` → (`destroy`). `plan` is read-only; `apply tfplan` is the safe form.
- ✓ `+` add, `~` change, `-` destroy — read every plan diff before confirming.
- ⚠ Gotcha: `-auto-approve` on a laptop pointed at prod state is how outages happen. Hands type confirmation; pipelines use `-auto-approve` behind approval gates.
- 🎓 Exam takeaway: "which command is safe to run anytime for review?" → `plan`. "Which executes a reviewed plan exactly?" → `apply tfplan`.
