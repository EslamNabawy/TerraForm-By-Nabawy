terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "logs_dev" {
  bucket        = "${var.bucket_prefix}-dev"
  force_destroy = true
  tags = merge(var.common_tags, {
    Name        = "${var.bucket_prefix}-dev"
    Environment = "dev"
  })
}

resource "aws_s3_bucket" "logs_staging" {
  bucket        = "${var.bucket_prefix}-staging"
  force_destroy = true
  tags = merge(var.common_tags, {
    Name        = "${var.bucket_prefix}-staging"
    Environment = "staging"
  })
}

resource "aws_s3_bucket" "logs_prod" {
  bucket        = "${var.bucket_prefix}-prod"
  force_destroy = true
  tags = merge(var.common_tags, {
    Name        = "${var.bucket_prefix}-prod"
    Environment = "prod"
  })
}
