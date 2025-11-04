terraform {
  required_version = ">= 1.5.0"

  backend "gcs" {
    bucket = "estate-guide-terraform-state" # TODO: replace with your Terraform state bucket
    prefix = "environments"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0"
    }
  }
}
