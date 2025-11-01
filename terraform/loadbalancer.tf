resource "aws_eip" "monitoring" {
  vpc = true
  tags = {
    Name = "thanawy-monitoring"
  }
}

resource "aws_lb" "thanawy_alb" {
  name               = "thanawy-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Environment = "production"
  }
}

resource "aws_lb_listener" "thanawy_http" {
  load_balancer_arn = aws_lb.thanawy_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.thanawy_tg.arn
  }
}
