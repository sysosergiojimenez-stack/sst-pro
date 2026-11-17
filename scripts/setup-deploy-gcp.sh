#!/usr/bin/env bash
# Configuracion UNICA de Google Cloud para el deploy automatico de sst-pro
# desde GitHub Actions (.github/workflows/deploy.yml) y para que las imagenes
# viejas se borren solas (se conservan las ultimas 5).
# Se ejecuta en Cloud Shell. Se puede volver a ejecutar sin problema.
set -euo pipefail

PROJECT_ID=sg-sst-501720
PROJECT_NUMBER=516136641116
REGION=us-central1
SERVICE=sst-pro
GH_REPO=sysosergiojimenez-stack/sst-pro
POOL=github-actions
PROVIDER=sst-pro
SA=github-deployer
SA_EMAIL="$SA@$PROJECT_ID.iam.gserviceaccount.com"
AR_REPO=sst-pro
KEEP=5

gcloud config set project "$PROJECT_ID" >/dev/null

echo "== 1/6 Habilitando APIs"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com

echo "== 2/6 Repositorio de imagenes (se conservan las ultimas $KEEP)"
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" --repository-format=docker \
    --location="$REGION" --description="Imagenes de sst-pro"
fi
POLICY_FILE="$(mktemp)"
cat > "$POLICY_FILE" <<POLICY
[
  {"name": "borrar-viejas", "action": {"type": "Delete"}, "condition": {"tagState": "any"}},
  {"name": "conservar-ultimas-$KEEP", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": $KEEP}}
]
POLICY
# Aplica la misma politica al repositorio nuevo y a los de deploys anteriores con --source.
for LOC in "$REGION" europe-west1; do
  for REPO in "$AR_REPO" cloud-run-source-deploy; do
    if gcloud artifacts repositories describe "$REPO" --location="$LOC" >/dev/null 2>&1; then
      gcloud artifacts repositories set-cleanup-policies "$REPO" --location="$LOC" \
        --policy="$POLICY_FILE" --no-dry-run
      echo "   politica aplicada en $REPO ($LOC)"
    fi
  done
done

echo "== 3/6 Cuenta de servicio del deploy"
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA" --display-name="Deploy desde GitHub Actions"
fi
RUNTIME_SA="$(gcloud run services describe "$SERVICE" --region="$REGION" \
  --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || true)"
RUNTIME_SA="${RUNTIME_SA:-$PROJECT_NUMBER-compute@developer.gserviceaccount.com}"
gcloud artifacts repositories add-iam-policy-binding "$AR_REPO" --location="$REGION" \
  --member="serviceAccount:$SA_EMAIL" --role="roles/artifactregistry.writer" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" --role="roles/run.admin" >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:$SA_EMAIL" --role="roles/iam.serviceAccountUser" >/dev/null

echo "== 4/6 Acceso de GitHub (solo el repo $GH_REPO)"
if ! gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" --location=global \
    --display-name="GitHub Actions"
fi
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" \
     --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" --display-name="sst-pro" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$GH_REPO'"
fi
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$GH_REPO" >/dev/null

echo "== 5/6 Archivos fuente viejos de deploys con --source (se borran a los 30 dias)"
LIFECYCLE_FILE="$(mktemp)"
echo '{"rule":[{"action":{"type":"Delete"},"condition":{"age":30}}]}' > "$LIFECYCLE_FILE"
for BUCKET in "run-sources-$PROJECT_ID-$REGION" "run-sources-$PROJECT_ID-europe-west1"; do
  if gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then
    gcloud storage buckets update "gs://$BUCKET" --lifecycle-file="$LIFECYCLE_FILE"
    echo "   regla aplicada en gs://$BUCKET"
  fi
done

echo "== 6/6 Limpieza: cuenta de lectura temporal que ya no se usa"
gcloud iam service-accounts delete "claude-lectura@$PROJECT_ID.iam.gserviceaccount.com" --quiet 2>/dev/null \
  && echo "   claude-lectura eliminada" || echo "   (claude-lectura ya no existia)"

echo
echo "LISTO. Desde ahora, cada merge a main despliega sst-pro solo."
echo "Para probarlo ahora: GitHub > Actions > 'Deploy a Cloud Run' > Run workflow."
