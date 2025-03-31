# Kubernetes Deployment for Telegram Bot

This directory contains Kubernetes manifests for deploying the Telegram Bot application to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (e.g., Minikube, GKE, EKS, AKS)
- kubectl installed and configured
- Docker image of the application (built from the Dockerfile in the root directory)

## Configuration

### Building the Docker Image

Before deploying to Kubernetes, you need to build and push the Docker image:

```bash
# Build the image
docker build -t your-registry/telegram-bot:latest .

# Push the image to your registry
docker push your-registry/telegram-bot:latest
```

### Updating the Image Reference

Update the image reference in `deployment.yaml` to point to your Docker registry:

```yaml
image: your-registry/telegram-bot:latest
```

### Secrets

Update the secrets in `secrets.yaml` with your actual Telegram Bot token and LLM API key:

```yaml
stringData:
  telegram-bot-token: "YOUR_ACTUAL_TELEGRAM_BOT_TOKEN"
  llm-api-key: "YOUR_ACTUAL_API_KEY"
```

For production environments, consider using a secret management solution like HashiCorp Vault or Sealed Secrets.

### ConfigMap

Review and update the configuration in `configmap.yaml` as needed. Pay special attention to:

- Webhook URL (if using webhooks)
- Channel IDs
- LLM provider and model

## Deployment

### Using kubectl

```bash
# Apply all resources
kubectl apply -k .

# Or apply individual resources
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

### Using Kustomize

```bash
# Apply all resources using kustomize
kustomize build . | kubectl apply -f -
```

## Accessing the Application

The application is exposed within the cluster as a ClusterIP service. To access it externally, you can:

1. Use port forwarding:
   ```bash
   kubectl port-forward svc/telegram-bot 8080:80
   ```

2. Configure an Ingress (uncomment and configure the Ingress resource in `service.yaml`)

3. Change the service type to LoadBalancer (if your cluster supports it):
   ```yaml
   spec:
     type: LoadBalancer
   ```

## Monitoring and Logs

```bash
# Get pods
kubectl get pods -l app=telegram-bot

# View logs
kubectl logs -l app=telegram-bot

# Describe deployment
kubectl describe deployment telegram-bot
```

## Scaling

To scale the deployment:

```bash
kubectl scale deployment telegram-bot --replicas=3
```

Note: Since this is a Telegram bot, you might want to keep it as a single replica to avoid duplicate message processing.

## Cleanup

To remove all resources:

```bash
kubectl delete -k .
```