# Provisioners — Doctrine: Last Resort

Day 2 · Execute scripts on resources after creation

Provisioners run a command on the local machine (`local-exec`) or a remote server (`remote-exec`) as part of resource lifecycle. They exist for the gaps providers can't fill — and the doctrine is strict: **if a provider feature, `user_data`, or image baking can do it, the provisioner is the wrong tool.**

## 1. Definition + why it's discouraged

A provisioner is a script hook attached to a resource: run after creation (default) or before destruction. The pain: provisioners break idempotency (re-runs re-execute blindly), hide configuration from state (the script's effects aren't tracked), and fail silently in CI (SSH hiccups become apply failures at 2 AM).

```hcl
# local-exec: runs ON YOUR MACHINE after the resource exists
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  provisioner "local-exec" {
    command = "echo ${self.private_ip} >> inventory.txt"
  }
}
```

```bash
$ terraform apply -auto-approve
aws_instance.web: Creating...
aws_instance.web: Creation complete after 21s [id=i-012345]
aws_instance.web (local-exec): Executing: ["/bin/sh" "-c" "echo 10.0.1.23 >> inventory.txt"]
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

## 2. remote-exec + the connection block

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file("~/.ssh/study.pem")
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update -y",
      "sudo apt-get install -y nginx",
      "echo hello > /var/www/html/index.html",
    ]
  }
}
```

⚠ Creation-only by default: provisioners run when the resource is CREATED, not on every apply. Change the `inline` script later and Terraform does nothing — the instance keeps the old behavior until it's replaced (`taint`/`-replace`). Destroy-time provisioners exist (`when = destroy`) for cleanup hooks, with the same blindness.

## 3. Failure behavior (read before relying on one)

- A failing provisioner fails the whole `apply` — but the resource already exists, so the next run sees it as created and SKIPS the provisioner. Half-configured instance, green plan. The standard recovery is `taint` + re-apply.
- `on_failure = continue` lets apply proceed past script errors — useful for best-effort logging, dangerous for anything load-bearing.

## 4. What to use instead (the ladder)

| Need | Right tool |
|---|---|
| Bootstrap a VM (packages, files) | `user_data` / `cloud-init` |
| Fully configured machine | Packer golden image (Ansible provisioner INSIDE Packer is its legit use — see 05) |
| Post-apply notification/inventory | `local-exec` writing a file, or better: `outputs` + CI step |
| Secret injection | Vault/SSM data source, never a provisioner echoing secrets |

## Remember

- ✓ Provisioners = script hooks (`local-exec` here, `remote-exec` there via `connection`). Last resort only.
- ✓ Creation-only by default; failures leave half-built resources behind green plans.
- ⚠ Gotcha: editing the script after creation changes NOTHING until the resource is replaced. Beginners re-apply, see no diff, and conclude "Terraform is broken" — it worked exactly as designed.
- 🎓 Exam takeaway: "when are provisioners appropriate?" → almost never; prefer provider features, `user_data`, Packer. "Say the doctrine:" → last resort.
