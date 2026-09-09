terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "logs" {
  for_each      = var.environments
  bucket        = "${var.bucket_prefix}-${each.key}"
  force_destroy = true
  tags = merge(var.common_tags, {
    Name        = "${var.bucket_prefix}-${each.key}"
    Environment = each.key
  })
}

output "bucket_arns" {
  value = { for k, b in aws_s3_bucket.logs : k => b.arn }
}

output "bucket_names" {
  value = [for b in aws_s3_bucket.logs : b.bucket]
}
