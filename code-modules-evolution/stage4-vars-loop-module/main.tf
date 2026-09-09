terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

module "logs" {
  source   = "./modules/s3-bucket"
  for_each = var.environments

  bucket_name = "${var.bucket_prefix}-${each.key}"
  environment = each.key
  extra_tags  = var.common_tags
}
