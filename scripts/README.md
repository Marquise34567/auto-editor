delete-sa-keys.ps1

Purpose
- List and optionally delete USER_MANAGED GCP service account keys for rotation.

Quick usage
- Run interactively:
  powershell -ExecutionPolicy Bypass -File scripts\delete-sa-keys.ps1

- Provide the service account:
  powershell -ExecutionPolicy Bypass -File scripts\delete-sa-keys.ps1 -SA "my-sa@project.iam.gserviceaccount.com"

- Preview deletes (safe dry-run):
  powershell -ExecutionPolicy Bypass -File scripts\delete-sa-keys.ps1 -SA "my-sa@project.iam.gserviceaccount.com" -WhatIf

Notes
- The script uses `gcloud` and expects you to be authenticated and have permission to manage keys.
- It only lists and deletes USER_MANAGED keys (system-managed keys are not deletable).
- The script confirms destructive actions; use `-WhatIf` to preview.
