variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "infosphere-511"
}

variable "region" {
  description = "Primary GCP region for compute and serverless services"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "container_image_url" {
  description = "Container image URL for the Cloud Run simulation API"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello:latest"
}

variable "min_instances" {
  description = "Minimum number of Cloud Run container instances (0 for scale-to-zero in dev/staging, >=1 in prod)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run container instances"
  type        = number
  default     = 10
}

variable "vpc_connector_cidr" {
  description = "Dedicated /28 CIDR range for Serverless VPC Access Connector"
  type        = string
  default     = "10.8.0.0/28"
}

variable "allowed_cors_origins" {
  description = "List of permitted origins for GCS assets and API CORS policy"
  type        = list(string)
  default = [
    "http://localhost:4200",
    "https://infosphere-511.web.app",
    "https://infosphere-511.firebaseapp.com"
  ]
}
