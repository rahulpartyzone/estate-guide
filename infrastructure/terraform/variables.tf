variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "Primary region for regional resources"
  type        = string
  default     = "asia-south1"
}

variable "cloud_sql_instance_name" {
  description = "Name of the primary Cloud SQL instance"
  type        = string
}

variable "environment" {
  description = "Deployment environment label (e.g. staging, production)"
  type        = string
}

variable "database_tier" {
  description = "Machine tier for Cloud SQL instance"
  type        = string
  default     = "db-custom-1-3840"
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "database_password_secret" {
  description = "Secret Manager resource ID that stores the DB password"
  type        = string
}

variable "vpc_connector_name" {
  description = "Name of the Serverless VPC connector"
  type        = string
  default     = ""
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name to manage (leave blank to skip Cloud Run provisioning)"
  type        = string
  default     = ""
}

variable "cloud_run_image" {
  description = "Container image URI for the Cloud Run service"
  type        = string
  default     = ""
}

variable "cloud_run_service_account" {
  description = "Service account email Cloud Run should use"
  type        = string
  default     = ""
}

variable "cloud_run_cpu" {
  description = "CPU limit for the Cloud Run container (e.g. 1)"
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Memory limit for the Cloud Run container (e.g. 512Mi)"
  type        = string
  default     = "512Mi"
}

variable "cloud_run_timeout_seconds" {
  description = "Request timeout for Cloud Run"
  type        = number
  default     = 300
}

variable "cloud_run_min_instance_count" {
  description = "Minimum instances to keep warm"
  type        = number
  default     = 0
}

variable "cloud_run_max_instance_count" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 4
}

variable "cloud_run_ingress" {
  description = "Ingress setting for Cloud Run (e.g. INGRESS_TRAFFIC_ALL)"
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
}

variable "cloud_run_env_vars" {
  description = "Plain environment variables for Cloud Run"
  type        = map(string)
  default     = {}
}

variable "cloud_run_secret_env" {
  description = "Secret-backed environment variables for Cloud Run"
  type = map(object({
    secret  = string
    version = string
  }))
  default = {}
}

variable "cloud_run_vpc_egress" {
  description = "VPC connector egress setting"
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
}

variable "cloud_run_allow_unauthenticated" {
  description = "Grant public invoke permission to the Cloud Run service"
  type        = bool
  default     = true
}
