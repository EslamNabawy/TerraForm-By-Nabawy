resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  force_destroy = true
  tags = merge(var.extra_tags, {
    Name        = var.bucket_name
    Environment = var.environment
  })
}
