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
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudkms.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# 2. Service Accounts & IAM Least-Privilege Roles
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

# 3. Secret Manager for JWT Secrets and External DeepSeek API Keys
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "infosphere-jwt-secret"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "deepseek_api_key" {
  secret_id = "infosphere-deepseek-api-key"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret_iam_member" "jwt_secret_access" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "deepseek_secret_access" {
  secret_id = google_secret_manager_secret.deepseek_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_sa.email}"
}

# 4. Cloud KMS CMEK for Storage Encryption with 90-Day Rotation
resource "google_kms_key_ring" "keyring" {
  name       = "infosphere-keyring-${var.environment}"
  location   = var.region
  depends_on = [google_project_service.enabled_apis]
}

resource "google_kms_crypto_key" "storage_key" {
  name            = "infosphere-storage-key"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s" # 90 days

  lifecycle {
    prevent_destroy = false
  }
}

data "google_storage_project_service_account" "gcs_account" {
  project    = var.project_id
  depends_on = [google_project_service.enabled_apis]
}

resource "google_kms_crypto_key_iam_member" "gcs_cmek_binding" {
  crypto_key_id = google_kms_crypto_key.storage_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
}

# 5. Serverless VPC Access Connector
resource "google_vpc_access_connector" "connector" {
  name           = "infosphere-cx-${var.environment}"
  region         = var.region
  ip_cidr_range  = var.vpc_connector_cidr
  network        = "default"
  min_throughput = 200
  max_throughput = 300
  depends_on     = [google_project_service.enabled_apis]
}

# 6. Cloud Armor Security Policy with SQLi, XSS, and Rate Limiting
resource "google_compute_security_policy" "cloud_armor_policy" {
  name        = "infosphere-waf-policy-${var.environment}"
  description = "Cloud Armor security policy with OWASP SQLi, XSS, and rate-limiting rules"

  # Rate limiting rule: 100 requests per minute per IP
  rule {
    action   = "rate_based_ban"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 300
    }
    description = "Rate limit to 100 requests per minute per IP"
  }

  # OWASP SQLi preconfigured rule
  rule {
    action   = "deny(403)"
    priority = 2000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
    description = "Mitigate OWASP SQL injection attacks"
  }

  # OWASP XSS preconfigured rule
  rule {
    action   = "deny(403)"
    priority = 3000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-stable')"
      }
    }
    description = "Mitigate OWASP Cross-Site Scripting attacks"
  }

  # Default allow rule
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow"
  }

  depends_on = [google_project_service.enabled_apis]
}

# 7. IAM Audit Config for Sensitive Operations
resource "google_project_iam_audit_config" "all_services_audit" {
  project = var.project_id
  service = "allServices"

  audit_log_config {
    log_type = "DATA_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }

  audit_log_config {
    log_type = "ADMIN_READ"
  }
}

# 8. Cloud Tasks Queue for Simulation Ticks
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

# 9. Cloud Pub/Sub for Asynchronous AI Generation
resource "google_pubsub_topic" "ai_tasks" {
  name       = "session-ai-tasks"
  depends_on = [google_project_service.enabled_apis]
}

# 10. Cloud Storage for Lab Media Assets with Lifecycle & Uniform Access
resource "google_storage_bucket" "assets" {
  name                        = "${var.project_id}-infosphere-assets"
  location                    = "EU"
  force_destroy               = false
  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = var.allowed_cors_origins
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [
    google_project_service.enabled_apis,
    google_kms_crypto_key_iam_member.gcs_cmek_binding
  ]
}

# 11. Artifact Registry for Backend Container Images
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "infosphere"
  description   = "Docker repository for Infosphere Simulation Engine containers"
  format        = "DOCKER"

  depends_on = [google_project_service.enabled_apis]
}

# 12. Firestore Native Mode Database
resource "google_firestore_database" "database" {
  name                    = "(default)"
  location_id             = var.region
  type                    = "FIRESTORE_NATIVE"
  delete_protection_state = "DELETE_PROTECTION_DISABLED"
  deletion_policy         = "DELETE"

  depends_on = [google_project_service.enabled_apis]
}

# 13. Cloud Run Simulation Service with Keyless Vertex AI ADC and Secret Injections
resource "google_cloud_run_v2_service" "simulation_api" {
  name     = "infosphere-simulation-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api_sa.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
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
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "ASSETS_BUCKET"
        value = google_storage_bucket.assets.name
      }
      env {
        name  = "CLOUD_TASKS_QUEUE"
        value = google_cloud_tasks_queue.simulation_ticks.id
      }
      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.ai_tasks.id
      }
      env {
        name  = "GOOGLE_GENAI_USE_VERTEXAI"
        value = "TRUE"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DEEPSEEK_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.deepseek_api_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.api_sa,
    google_cloud_tasks_queue.simulation_ticks,
    google_storage_bucket.assets,
    google_secret_manager_secret.jwt_secret,
    google_secret_manager_secret.deepseek_api_key,
    google_secret_manager_secret_iam_member.jwt_secret_access,
    google_secret_manager_secret_iam_member.deepseek_secret_access
  ]
}

# 14. Invocations on Cloud Run restricted to permitted domain per Org Policy
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.simulation_api.name
  role     = "roles/run.invoker"
  member   = "domain:ziener.altostrat.com"
}
