resource "aws_launch_template" "backend" {
  name_prefix   = "${var.project_name}-backend-"
  image_id      = var.ami_id
  instance_type = var.backend_instance_type
  key_name      = var.key_pair_name

  vpc_security_group_ids = [aws_security_group.backend_sg.id]

  user_data = base64encode(templatefile("${path.module}/user_data_backend.sh", {
    db_host         = aws_db_instance.mysql.address
    db_name         = var.db_name
    db_user         = var.db_user
    db_pass         = var.db_pass
    discogs_token   = var.discogs_token
    jwt_secret      = var.jwt_secret
    github_username = var.github_username
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-backend"
    }
  }
}

resource "aws_autoscaling_group" "backend" {
  name                = "${var.project_name}-asg"
  min_size            = 2
  max_size            = 4
  desired_capacity    = 2
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.backend.arn]

  launch_template {
    id      = aws_launch_template.backend.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }
}

resource "aws_autoscaling_policy" "cpu_scaling" {
  name                   = "${var.project_name}-cpu-policy"
  autoscaling_group_name = aws_autoscaling_group.backend.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
