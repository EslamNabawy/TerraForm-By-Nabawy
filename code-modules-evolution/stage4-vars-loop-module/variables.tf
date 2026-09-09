variable "region" {
  type    = string
  default = "us-east-1"
}

variable "bucket_prefix" {
  type    = string
  default = "myapp-logs"
}

variable "environments" {
  type    = set(string)
  default = ["dev", "staging", "prod"]
}

variable "common_tags" {
  type    = map(string)
  default = { ManagedBy = "terraform", Project = "myapp" }
}
