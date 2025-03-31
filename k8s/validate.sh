#!/bin/bash
# Script to validate Kubernetes manifests

set -e

echo "Validating Kubernetes manifests..."

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "kubectl is not installed. Please install it first."
    exit 1
fi

# Check if kustomize is installed
if ! command -v kustomize &> /dev/null; then
    echo "kustomize is not installed. Using kubectl kustomize instead."
    KUSTOMIZE="kubectl kustomize"
else
    KUSTOMIZE="kustomize"
fi

# Validate individual YAML files
echo "Validating individual YAML files..."
for file in configmap.yaml secrets.yaml deployment.yaml service.yaml; do
    echo "Validating $file..."
    kubectl apply --dry-run=client -f $file
done

# Validate kustomization
echo "Validating kustomization..."
$KUSTOMIZE build . | kubectl apply --dry-run=client -f -

echo "All Kubernetes manifests are valid!"
echo "To deploy to your cluster, run: kubectl apply -k ."