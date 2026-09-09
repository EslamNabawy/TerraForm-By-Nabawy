region        = "us-east-1"
bucket_prefix = "myapp-logs"
environments  = ["dev", "staging", "prod"]
common_tags = {
  ManagedBy = "terraform"
  Project   = "myapp"
}
