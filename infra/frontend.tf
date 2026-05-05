resource "aws_instance" "frontend" {
  ami                         = var.ami_id
  instance_type               = var.frontend_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.frontend_sg.id]
  key_name                    = var.key_pair_name
  associate_public_ip_address = true

  user_data = base64encode(templatefile("${path.module}/user_data_frontend.sh", {
  alb_dns_name    = aws_lb.backend.dns_name
  github_username = var.github_username
}))

  tags = {
    Name = "${var.project_name}-frontend"
  }
}
