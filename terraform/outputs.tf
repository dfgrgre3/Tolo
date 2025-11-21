# Outputs for AWS Load Balancer Configuration

output "alb_dns_name" {
  description = "DNS name of the application load balancer"
  value       = aws_lb.thanawy_alb.dns_name
}

output "alb_arn" {
  description = "ARN of the application load balancer"
  value       = aws_lb.thanawy_alb.arn
}

output "alb_zone_id" {
  description = "Zone ID of the application load balancer"
  value       = aws_lb.thanawy_alb.zone_id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.thanawy_tg.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener (redirects to HTTPS)"
  value       = aws_lb_listener.http.arn
}
