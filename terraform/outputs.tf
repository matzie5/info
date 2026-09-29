output "project_id" {
  description = "Target Google Cloud Project ID"
  value       = var.project_id
}

output "region" {
  description = "Deployment Region"
  value       = var.region
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
