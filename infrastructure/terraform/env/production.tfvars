# The GCP project ID (same as staging)
project_id               = "estate-guide-main"

# The GCP region (same as staging)
region                   = "asia-south1"

# The environment name
environment              = "production"

# --- Database Settings ---
# These point to the *production* resources you created in Step 4
cloud_sql_instance_name  = "estate-guide-prod"
database_password_secret = "projects/estate-guide-main/secrets/prisma-db-prod"

# These should match what you created for your prod SQL instance
database_version         = "POSTGRES_15"
database_tier            = "db-g1-small"

# --- Cloud Run Settings ---
# These are the "master switches" to enable the service
cloud_run_service_name      = "estate-guide-prod"
cloud_run_image             = "us-docker.pkg.dev/cloudrun/container/hello"
cloud_run_allow_unauthenticated = true

# --- VPC Settings ---
# Set to "" to disable, just like staging.
# Or set a name like "estate-guide-prod-vpc" if you want one.
vpc_connector_name = ""