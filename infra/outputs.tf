output "alb_dns_name" {
  description = "The DNS name of the backend load balancer"
  value       = aws_lb.backend.dns_name
}

output "frontend_public_ip" {
  description = "The public IP of the frontend instance"
  value       = aws_instance.frontend.public_ip
}

output "rds_endpoint" {
  description = "The endpoint of the RDS instance"
  value       = aws_db_instance.mysql.endpoint
}
