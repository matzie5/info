terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Enable Required Cloud APIs
resource "google_project_service" "enabled_apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudtasks.googleapis.com",
    "pubsub.googleapis.com",
    "firestore.googleapis.com",
    "aiplatform.googleapis.com",
    "storage.googleapis.com",
    "identitytoolkit.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# 2. Service Accounts & IAM
resource "google_service_account" "api_sa" {
  account_id   = "infosphere-engine-sa"
  display_name = "Infosphere Lab Simulation Engine Service Account"
  depends_on   = [google_project_service.enabled_apis]
}

resource "google_project_iam_member" "api_roles" {
  for_each = toset([
    "roles/datastore.user",
    "roles/cloudtasks.enqueuer",
    "roles/pubsub.publisher",
    "roles/aiplatform.user",
    "roles/storage.objectViewer",
    "roles/run.invoker"
  ])
  project    = var.project_id
  role       = each.key
  member     = "serviceAccount:${google_service_account.api_sa.email}"
  depends_on = [google_service_account.api_sa]
}

# 3. Cloud Tasks Queue for Simulation Ticks
resource "google_cloud_tasks_queue" "simulation_ticks" {
  name     = "simulation-ticks-queue"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 50
    max_concurrent_dispatches = 100
  }

  retry_config {
    max_attempts = 3
    min_backoff  = "1s"
    max_backoff  = "5s"
  }

  depends_on = [google_project_service.enabled_apis]
}

# 4. Cloud Pub/Sub for Asynchronous AI Generation
resource "google_pubsub_topic" "ai_tasks" {
  name       = "session-ai-tasks"
  depends_on = [google_project_service.enabled_apis]
}

# 5. Cloud Storage for Lab Media Assets
resource "google_storage_bucket" "assets" {
  name          = "${var.project_id}-infosphere-assets"
  location      = "EU"
  force_destroy = false

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.enabled_apis]
}

# 6. Artifact Registry for Backend Container Images
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "infosphere"
  description   = "Docker repository for Infosphere Simulation Engine containers"
  format        = "DOCKER"

  depends_on = [google_project_service.enabled_apis]
}

# 7. Firestore Native Mode Database
resource "google_firestore_database" "database" {
  name                              = "(default)"
  location_id                       = var.region
  type                              = "FIRESTORE_NATIVE"
  delete_protection_state           = "DELETE_PROTECTION_DISABLED"
  deletion_policy                   = "DELETE"

  depends_on = [google_project_service.enabled_apis]
}

# 8. Cloud Run Simulation Service
resource "google_cloud_run_v2_service" "simulation_api" {
  name     = "infosphere-simulation-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    containers {
      image = var.container_image_url

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "REGION"
        value = var.region
      }
      env {
        name  = "ASSETS_BUCKET"
        value = google_storage_bucket.assets.name
      }
      env {
        name  = "CLOUD_TASKS_QUEUE"
        value = google_cloud_tasks_queue.simulation_ticks.id
      }
    }
  }

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.api_sa,
    google_cloud_tasks_queue.simulation_ticks,
    google_storage_bucket.assets
  ]
}

# 9. Invocations on Cloud Run restricted to permitted domain per Org Policy
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.simulation_api.name
  role     = "roles/run.invoker"
  member   = "domain:ziener.altostrat.com"
}
