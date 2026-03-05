CI/CD notes

This repository includes a GitHub Actions workflow at `.github/workflows/ci-cd-deploy.yml` which:

- Builds backend and frontend Docker images using multi-platform buildx
- Pushes images to GitHub Container Registry (`ghcr.io/<owner>/...`)
- Connects via SSH to a configured production server and runs `docker compose pull` + `docker compose up -d`

Required repository secrets (set in Settings → Secrets → Actions):
- `DEPLOY_HOST` — production host (IP or DNS)
- `DEPLOY_USER` — SSH username for deploy
- `DEPLOY_SSH_KEY` — private key for SSH (PEM format)
- `DEPLOY_PORT` — SSH port (default `22`)
- `DEPLOY_PATH` — path on the remote server containing `docker-compose.yml` and `deploy.sh` (e.g. `/opt/zammad-sla-reporter`)

Notes:
- The workflow uses the default `GITHUB_TOKEN` to authenticate to GHCR for pushes. Ensure `Read and write permissions` for `Packages` are allowed.
- The remote user must have permission to run `docker` and `docker compose` (or be able to `sudo` without password). If `sudo` is required, update the SSH action script accordingly.
- For more secure deployments consider using an artifact-based deployment, registry with ephemeral tags, or a deployment service (ECS, EKS, etc.).
