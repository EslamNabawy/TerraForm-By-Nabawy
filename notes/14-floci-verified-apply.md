# Verified `terraform apply` against Floci — Proof Runbook

One-line: **prove your Terraform + Floci wiring end-to-end** — init → plan → apply → cross-check from the CLI → confirm state → destroy. If all seven steps pass, your endpoints, credentials, and backend are correct and nothing touched real AWS.

## 1. Start Floci (guide 11)

```bash
floci start --detach
floci wait --timeout 60s
eval "$(floci env)"
```

Or with Docker Compose: `docker compose up -d`, then export `AWS_ACCESS_KEY_ID=test`, `AWS_SECRET_ACCESS_KEY=test`, `AWS_REGION=us-east-1`.

## 2. The 7-step proof

```bash
# 1. Init — must succeed only when Floci responds
terraform init
# Expected: "Terraform has been successfully initialized!"

# 2. Plan — the proof of correct endpoint setup
terraform plan
# Expected: 1 to add, 0 to change, 0 to destroy
# If the endpoint is wrong or missing: hangs, times out, or tries real AWS

# 3. Apply — real resource creation inside the emulator
terraform apply -auto-approve
# Expected: Creating... → Apply complete!

# 4. Verify from the CLI — the cross-check that the resource is real
aws --endpoint-url http://localhost:4566 s3 ls
# Expected: your new bucket in the list

# 5. Confirm state was written
terraform show
# Expected: resource block with id and bucket set

# 6. Clean up (always)
terraform destroy -auto-approve
# Expected: Destroy complete! 1 destroyed.

floci stop --remove
```

## 3. WSL + Docker-network setup (when CLI and Docker live apart)

If you run Terraform in WSL while Docker serves Floci, put both containers on one network and proxy the UI to the core:

```bash
docker network create floci-network 2>/dev/null; echo "network ok"

docker run -d --name floci-aws --restart unless-stopped --network floci-network \
  -p 4566:4566 -v /var/run/docker.sock:/var/run/docker.sock \
  -v floci-data:/app/data floci/floci:latest

docker run -d --name floci-ui --restart unless-stopped -p 4500:4500 floci/floci-ui:latest
docker network connect floci-network floci-ui

# Proxy so the UI (localhost:4566 inside its container) reaches the Floci core
docker exec floci-ui apk add --no-cache socat
docker exec -d floci-ui sh -c "socat TCP-LISTEN:4566,fork,reuseaddr TCP:floci-aws:4566"
```

## 4. Health checks (is it actually connected?)

```bash
curl -s http://localhost:4566/_localstack/health | head -c 300; echo
curl -s http://localhost:4566/_floci/health | head -c 300; echo
curl -s http://localhost:4500/api/clouds/aws/status | head -c 400; echo
```

Expected: `{"runtime":"reachable","error":null}`, UI at `http://localhost:4500`. If the UI shows "Runtime unavailable": hard-refresh (Ctrl+F5), try incognito, or re-run the `socat` proxy line. Never open plain `:4566` in a browser — use the health URL.

Windows PowerShell equivalents: `Invoke-WebRequest http://localhost:4566/_localstack/health -UseBasicParsing`, `netstat -ano | findstr 4566`.

## 5. Workspace + variable pattern (one codebase, three envs)

```bash
export TF_VAR_floci_endpoint=http://localhost:4566

terraform init
terraform workspace select dev   # or staging / prod
terraform plan
./run-alb.sh dev     # project script: plan + apply + checks
./verify-alb.sh      # project script: health + endpoint verification
terraform output
```

Switching to real AWS later = point the endpoint variable at real config and use real credentials — the Terraform code doesn't change.

## 6. Error table (shapes you'll recognize)

| Command fails with... | Cause | Fix |
|---|---|---|
| `init` → `AccessDenied` / hangs | Floci not running / endpoint wrong | `floci start`; verify `provider.tf` endpoints |
| `plan` hangs forever | Endpoint points at a dead port / missing endpoint line | Check `provider.tf`; `floci status` |
| `apply` touches real AWS (bill!) | Endpoint line missing / real profile active | Confirm endpoints + dummy creds; never mix a real profile |
| `apply` ok but `aws s3 ls` empty | List command hits the wrong endpoint / region | Match the URL in `provider.tf`; same `test` creds |
| `destroy` → `No changes`, bucket exists | State lost / two backend configs | `terraform import` it back; fix the backend block |

## 7. Reference commands (one per line)

```bash
floci start --detach
floci wait --timeout 60s
eval "$(floci env)"
terraform init
terraform plan
terraform apply -auto-approve
aws --endpoint-url http://localhost:4566 s3 ls
terraform show
terraform destroy -auto-approve
floci stop --remove
```

---
Next: run the EC2 + security-groups lab (13) against Floci first, AWS second — or take the `floci-ui` console tour.
