variable "bucket_name" {
  type        = string
  description = "Full bucket name"
  validation {
    condition     = length(var.bucket_name) > 3 && length(var.bucket_name) < 64
    error_message = "bucket_name must be 4-63 chars."
  }
}

variable "environment" {
  type        = string
  description = "Environment tag value"
}

variable "extra_tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags merged into bucket tags"
}
