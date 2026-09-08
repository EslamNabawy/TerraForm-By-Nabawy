# State File — What & Why (terraform.tfstate)

Day 1 · terraform.tfstate

`terraform.tfstate` is Terraform's memory: a JSON record of every resource it manages, what the cloud returned for each, and how they depend on each other. Config says what you WANT; state says what EXISTS (as far as Terraform knows); the provider refresh reconciles both against reality.

## 1. The 4 functions (why state exists at all)

1. **Track** — which real-world objects belong to this configuration (by ID).
2. **Compare** — desired (config) vs actual (state + refresh) → the plan diff.
3. **Store metadata** — IDs, IPs, ARNs, dependency edges the config never declared.
4. **Perform** — cache everything so `plan` doesn't re-query every API per resource.

## 2. The mapping (config ↔ state ↔ real resource)

```
main.tf                    terraform.tfstate              AWS reality
resource "aws_vpc"  ──maps──▶  { "type": "aws_vpc",  ──identifies──▶  vpc-0ab123456
  "main" { ... }                "name": "main",
                                "id": "vpc-0ab123456",
                                "cidr": "10.0.0.0/16",
                                "dependencies": [...] }
```

Delete the middle box and Terraform forgets the right box exists — next `apply` creates a duplicate VPC (see 12, risk ①).

## 3. What it stores (real shape, trimmed)

```json
{
  "resources": [
    {
      "type": "aws_vpc",
      "name": "main",
      "instances": [
        {
          "attributes": {
            "id": "vpc-0ab123456",
            "cidr_block": "10.0.0.0/16",
            "arn": "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-0ab123456"
          },
          "dependencies": ["aws_internet_gateway.igw"]
        }
      ]
    }
  ]
}
```

IDs, IPs, ARNs, CIDRs, dependency edges — everything `plan` needs to compute "same or different?" without asking AWS about every attribute.

## Remember

- ✓ State = memory: track, compare, metadata, performance. Config wants, state knows, refresh verifies.
- ✓ Never hand-edit the JSON — use the state commands (see 22) or migrate properly (see 12).
- ⚠ Gotcha: local state + two engineers = whoever applies last wins, silently. Remote backend (see 12) exists precisely because of this file.
- 🎓 Exam takeaway: "what does tfstate store?" → IDs, IPs, ARNs, dependencies, metadata. "What happens if you delete it?" → Terraform forgets everything and re-creates (duplicates).
