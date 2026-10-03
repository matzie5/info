output "project_id" {
  description = "Target Google Cloud Project ID"
  value       = var.project_id
}

output "region" {
  description = "Deployment Region"
  value       = var.region
}

output "environment" {
  description = "Active Deployment Environment profile"
  value       = var.environment
}

output "service_account_email" {
  description = "Simulation engine service account email"
  value       = google_service_account.api_sa.email
}

output "cloud_tasks_queue_id" {
  description = "Cloud Tasks queue ID for simulation ticks"
  value       = google_cloud_tasks_queue.simulation_ticks.id
}

output "pubsub_topic_name" {
  description = "Pub/Sub topic for asynchronous AI generation tasks"
  value       = google_pubsub_topic.ai_tasks.name
}

output "assets_bucket_name" {
  description = "Cloud Storage bucket name for lab media assets"
  value       = google_storage_bucket.assets.name
}

output "cloud_run_url" {
  description = "URL of the deployed Cloud Run simulation API"
  value       = google_cloud_run_v2_service.simulation_api.uri
}

output "artifact_registry_repo" {
  description = "Artifact Registry Docker repository"
  value       = google_artifact_registry_repository.repo.name
}

output "jwt_secret_id" {
  description = "Secret Manager secret ID for JWT authentication"
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

output "deepseek_api_key_id" {
  description = "Secret Manager secret ID for Module 2 DeepSeek LiteLlm integration"
  value       = google_secret_manager_secret.deepseek_api_key.secret_id
}

output "kms_key_ring_name" {
  description = "Cloud KMS KeyRing name"
  value       = google_kms_key_ring.keyring.name
}

output "kms_crypto_key_name" {
  description = "Cloud KMS CMEK CryptoKey for asset encryption"
  value       = google_kms_crypto_key.storage_key.name
}

output "vpc_connector_id" {
  description = "Serverless VPC Access Connector ID"
  value       = google_vpc_access_connector.connector.id
}

output "cloud_armor_policy_id" {
  description = "Cloud Armor Security Policy ID protecting Cloud Run"
  value       = google_compute_security_policy.cloud_armor_policy.id
}
