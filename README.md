# Vinylmania - Cloud Native Vinyl Store

Vinylmania is a full-stack, cloud-native web application designed for browsing and managing a vinyl record collection. It is built with a highly available, scalable architecture on AWS using Terraform.

## 🏗️ Architecture Overview

The application follows a standard 3-tier architecture:

-   **Frontend Tier**: Plain HTML/CSS/JS served by **Nginx** on a public EC2 instance.
-   **Application Tier**: **Node.js/Express** backend running on EC2 instances within an **Auto Scaling Group (ASG)** for high availability.
-   **Data Tier**: A managed **Amazon RDS MySQL 8.0** database located in private subnets for security.
-   **Traffic Management**: An **Application Load Balancer (ALB)** distributes traffic to the backend instances on port 3000.
-   **Networking**: A custom **VPC** with public and private subnets across multiple Availability Zones, managed via NAT Gateways for secure outbound traffic.

## 🛠️ Technology Stack

-   **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+), Nginx.
-   **Backend**: Node.js, Express.js.
-   **Database**: MySQL 8.0 (Amazon RDS).
-   **Infrastructure**: Terraform (IaC), AWS (VPC, EC2, ASG, ALB, RDS).
-   **APIs**: Discogs API for music metadata.
-   **Security**: JWT for authentication, Security Groups for network isolation.

## 📂 Project Structure

```text
.
├── backend/            # Express.js server and logic
├── frontend/           # Static web files (HTML, CSS, JS)
├── infra/              # Terraform configuration files
│   ├── alb.tf          # Load Balancer setup
│   ├── asg.tf          # Auto Scaling Group & Launch Templates
│   ├── rds.tf          # Database configuration
│   ├── vpc.tf          # Networking (VPC, Subnets, etc.)
│   └── user_data_*.sh  # Cloud-init scripts for deployment
└── README.md
```

## 🚀 Deployment Guide

### Prerequisites

1.  **AWS Account**: IAM user with appropriate permissions.
2.  **Terraform**: Installed on your local machine.
3.  **GitHub Repo**: The code must be pushed to a GitHub repository for the EC2 instances to clone during startup.
4.  **Discogs API Token**: For fetching track information.

### Steps to Deploy

1.  **Navigate to the infrastructure directory**:
    ```bash
    cd infra
    ```

2.  **Initialize Terraform**:
    ```bash
    terraform init
    ```

3.  **Configure Variables**:
    Create a `terraform.tfvars` file and fill in the required values:
    ```hcl
    aws_region             = "us-east-1"
    project_name           = "vinylmania"
    db_name                = "vinylstore"
    db_user                = "admin"
    db_pass                = "your_secure_password"
    discogs_token          = "your_discogs_api_token"
    jwt_secret             = "your_jwt_secret_key"
    ami_id                 = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS
    key_pair_name          = "your-aws-key-pair"
    github_username        = "your-github-username"
    ```

4.  **Deploy the Infrastructure**:
    ```bash
    terraform apply
    ```

5.  **Access the Application**:
    Once the deployment is complete, Terraform will output the **Frontend Public IP**. Open this IP in your browser to access the store.

## 🔐 Security Note

-   The database and backend instances are located in **private subnets** and are not directly accessible from the internet.
-   Traffic is only allowed via the **ALB** (for backend) and port 80/22 (for frontend).
-   Sensitive credentials (DB password, API tokens) are managed via Terraform variables and injected into the instances securely via `user_data`.

## 📜 License

This project was developed as part of the ISIMM Cloud Computing course.
