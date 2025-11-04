project_id              = "estate-guide-main"
region                  = "asia-south1"
environment             = "staging"
cloud_sql_instance_name = "estate-staging"
database_password_secret = "projects/estate-guide-main/secrets/prisma-db-staging"
# --- Cloud Run Settings ---

# This flips the "master switch" to ON
cloud_run_service_name = "estate-guide-staging"

# This is the placeholder "hello world" image your service will run.
# Your CI/CD pipeline will replace this with your real app later.
cloud_run_image = "us-docker.pkg.dev/cloudrun/container/hello"

# This makes your service public (from the iam_binding resource)
cloud_run_allow_unauthenticated = true

# This is needed by the vpc_access block.
# Set to "" to disable, or a name to enable.
vpc_connector_name = ""
