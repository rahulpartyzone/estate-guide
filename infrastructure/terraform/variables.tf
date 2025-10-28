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
