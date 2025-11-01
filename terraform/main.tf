terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "eu-west-1"
}

resource "aws_ecs_cluster" "thanawy_cluster" {
  name = "thanawy-cluster"
}

resource "aws_ecs_task_definition" "thanawy_task" {
  family                   = "thanawy-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  
  container_definitions = jsonencode([{
    name      = "thanawy-app",
    image     = "thanawy/thanawy-app:latest",
    essential = true,
    portMappings = [{
      containerPort = 3000,
      hostPort      = 3000
    }]
  }])
}

resource "aws_ecs_service" "thanawy_service" {
  name            = "thanawy-service"
  cluster         = aws_ecs_cluster.thanawy_cluster.id
  task_definition = aws_ecs_task_definition.thanawy_task.arn
  launch_type     = "FARGATE"
  desired_count   = 3
}
