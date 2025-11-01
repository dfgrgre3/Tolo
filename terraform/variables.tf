variable "hosted_zone_id" {
  description = "Route53 Hosted Zone ID"
  type        = string
}

variable "domain_name" {
  description = "Base domain name for services"
  type        = string
  default     = "thanawy.app"
}
