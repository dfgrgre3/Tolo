# AWS Application Load Balancer Configuration
# This configuration implements secure TLS policies and HTTPS redirection

resource "aws_lb" "thanawy_alb" {
  name               = "thanawy-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name        = "thanawy-alb"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# HTTP Listener - Redirects all HTTP traffic to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.thanawy_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener - Uses secure TLS 1.3 policy
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.thanawy_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.thanawy_tg.arn
  }
}

# Target Group
resource "aws_lb_target_group" "thanawy_tg" {
  name     = "thanawy-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
  }

  tags = {
    Name        = "thanawy-target-group"
    Environment = var.environment
  }
}

# Security Group for ALB
resource "aws_security_group" "alb_sg" {
  name        = "thanawy-alb-sg"
  description = "Security group for Thanawy application load balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "thanawy-alb-sg"
    Environment = var.environment
  }
}
