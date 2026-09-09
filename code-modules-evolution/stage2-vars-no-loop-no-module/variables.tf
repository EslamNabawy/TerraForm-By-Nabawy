variable "region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region"
}

variable "bucket_prefix" {
  type        = string
  default     = "myapp-logs"
  description = "Prefix for bucket names"
}

variable "common_tags" {
  type        = map(string)
  default     = { ManagedBy = "terraform", Project = "myapp" }
  description = "Tags applied to every bucket"
}
