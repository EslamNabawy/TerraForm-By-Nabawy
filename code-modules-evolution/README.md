# Modules Evolution Lab — 4 Stages

Same task (3 S3 log buckets) evolved step by step.

| Stage | Path | Vars | Loop | Module | Lines (main.tf) |
|-------|------|------|------|--------|-----------------|
| 1 | stage1-no-vars-no-loop-no-module | ❌ | ❌ | ❌ | 38 |
| 2 | stage2-vars-no-loop-no-module | ✅ | ❌ | ❌ | 27 |
| 3 | stage3-vars-loop-no-module | ✅ | ✅ `for_each` | ❌ | 15 |
| 4 | stage4-vars-loop-module | ✅ | ✅ `for_each` on module | ✅ | 12 + module/9 |

Run each:
```
cd stageX && terraform init && terraform plan
# or with Floci localstack:
# terraform plan -var="region=us-east-1"   (provider already points to 4566 if you add endpoints)
```

Stage 4 module lives at `stage4-vars-loop-module/modules/s3-bucket/` — copy it to any project.
