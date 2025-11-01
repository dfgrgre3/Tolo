output "monitoring_eip" {
  value = aws_eip.monitoring.public_ip
}

output "kibana_url" {
  value = "http://monitoring.${var.domain_name}:5601"
}

output "jaeger_url" {
  value = "http://tracing.${var.domain_name}:16686"
}
