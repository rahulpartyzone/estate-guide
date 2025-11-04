locals {
  environment = var.environment

  naming_prefix = "estate-${var.environment}"

  enable_cloud_run = var.cloud_run_service_name != "" && var.cloud_run_image != ""
}

resource "google_project_service" "core" {
  for_each = toset([
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "vpcaccess.googleapis.com",
    "run.googleapis.com"
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

resource "google_compute_network" "primary" {
  name                    = "${local.naming_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  depends_on = [google_project_service.core]
}

resource "google_compute_subnetwork" "primary" {
  name          = "${local.naming_prefix}-subnet"
  region        = var.region
  ip_cidr_range = "10.10.0.0/24"
  network       = google_compute_network.primary.id

  private_ip_google_access = true
}

resource "google_compute_global_address" "private_service_range" {
  name          = "${local.naming_prefix}-psa"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.primary.id

  depends_on = [google_project_service.core]
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.primary.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]

  depends_on = [google_project_service.core]
}

resource "google_sql_database_instance" "primary" {
  name             = var.cloud_sql_instance_name
  project          = var.project_id
  region           = var.region
  database_version = var.database_version

  root_password = null

  settings {
    tier = var.database_tier

    availability_type = "REGIONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.primary.id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    maintenance_window {
      day  = 7    # Sunday
      hour = 3
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  deletion_protection = true

  depends_on = [
    google_project_service.core,
    google_service_networking_connection.private_vpc_connection
  ]
}

resource "google_sql_database" "application" {
  name     = "${local.environment}_app"
  instance = google_sql_database_instance.primary.name
  charset  = "UTF8"
  collation = "en_US.UTF8"
}

resource "random_password" "db" {
  length  = 32
  special = true

  override_special = "!#$%&*+-?"
}

resource "google_sql_user" "application" {
  name     = "estate_app"
  instance = google_sql_database_instance.primary.name
  password = random_password.db.result
}

resource "google_secret_manager_secret_version" "database_password" {
  count = var.database_password_secret != "" ? 1 : 0

  secret      = var.database_password_secret
  secret_data = random_password.db.result
}

resource "google_vpc_access_connector" "serverless" {
  count = var.vpc_connector_name == "" ? 0 : 1

  name   = var.vpc_connector_name
  region = var.region

  network = google_compute_network.primary.name

  ip_cidr_range = "10.8.0.0/28"

  depends_on = [google_compute_subnetwork.primary]
}

resource "google_cloud_run_v2_service" "service" {
  count    = local.enable_cloud_run ? 1 : 0
  name     = var.cloud_run_service_name
  location = var.region
  project  = var.project_id
  ingress  = var.cloud_run_ingress

  template {
    service_account = var.cloud_run_service_account == "" ? null : var.cloud_run_service_account
    timeout         = "${var.cloud_run_timeout_seconds}s"

    scaling {
      min_instance_count = var.cloud_run_min_instance_count
      max_instance_count = var.cloud_run_max_instance_count
    }

    containers {
      image = var.cloud_run_image

      dynamic "env" {
        for_each = var.cloud_run_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.cloud_run_secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret
              version = env.value.version
            }
          }
        }
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }
    }

    dynamic "vpc_access" {
      for_each = var.vpc_connector_name == "" ? [] : [1]
      content {
        connector = var.vpc_connector_name
        egress    = var.cloud_run_vpc_egress
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [
    google_project_service.core,
    google_sql_database_instance.primary,
    google_vpc_access_connector.serverless
  ]
}

resource "google_cloud_run_v2_service_iam_binding" "invoker" {
  count    = local.enable_cloud_run && var.cloud_run_allow_unauthenticated ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service[0].name
  role     = "roles/run.invoker"
  members  = ["allUsers"]

  depends_on = [google_cloud_run_v2_service.service]
}

output "cloud_sql_instance_connection_name" {
  description = "Instance connection string for Cloud Run / Cloud SQL Proxy."
  value       = google_sql_database_instance.primary.connection_name
}

output "cloud_sql_database_name" {
  description = "Logical database created for the application."
  value       = google_sql_database.application.name
}

output "cloud_sql_user" {
  description = "Database user provisioned for application connections."
  value       = google_sql_user.application.name
}

output "database_password_secret_version" {
  description = "Secret Manager version containing the generated DB password."
  value       = try(google_secret_manager_secret_version.database_password[0].name, "")
  sensitive   = true
}

output "vpc_connector_name" {
  description = "Created Serverless VPC Access connector (if requested)."
  value       = var.vpc_connector_name == "" ? "" : google_vpc_access_connector.serverless[0].name
}

output "cloud_run_service_uri" {
  description = "URL of the deployed Cloud Run service (if created)."
  value       = local.enable_cloud_run ? google_cloud_run_v2_service.service[0].uri : ""
}
