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

variable "container_image_url" {
  description = "Container image URL for the Cloud Run simulation API"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello:latest"
}
