terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "logs_dev" {
  bucket        = "myapp-logs-dev"
  force_destroy = true
  tags = {
    Name        = "myapp-logs-dev"
    Environment = "dev"
    ManagedBy   = "terraform"
    Project     = "myapp"
  }
}

resource "aws_s3_bucket" "logs_staging" {
  bucket        = "myapp-logs-staging"
  force_destroy = true
  tags = {
    Name        = "myapp-logs-staging"
    Environment = "staging"
    ManagedBy   = "terraform"
    Project     = "myapp"
  }
}

resource "aws_s3_bucket" "logs_prod" {
  bucket        = "myapp-logs-prod"
  force_destroy = true
  tags = {
    Name        = "myapp-logs-prod"
    Environment = "prod"
    ManagedBy   = "terraform"
    Project     = "myapp"
  }
}
