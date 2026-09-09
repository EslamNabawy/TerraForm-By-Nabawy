output "all_bucket_arns" {
  value = { for k, m in module.logs : k => m.arn }
}

output "all_bucket_names" {
  value = { for k, m in module.logs : k => m.name }
}
