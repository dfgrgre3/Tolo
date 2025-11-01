resource "aws_route53_record" "monitoring" {
  zone_id = var.hosted_zone_id
  name    = "monitoring.thanawy.app"
  type    = "A"
  ttl     = 300
  records = [aws_eip.monitoring.public_ip]
}

resource "aws_route53_record" "tracing" {
  zone_id = var.hosted_zone_id
  name    = "tracing.thanawy.app"
  type    = "A"
  ttl     = 300
  records = [aws_eip.monitoring.public_ip]
}
