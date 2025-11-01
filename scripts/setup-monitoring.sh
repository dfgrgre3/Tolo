#!/bin/bash

# Get EIP from Terraform
EIP=$(terraform output -raw monitoring_eip)

# Update Kubernetes manifests
sed -i "s/\${EIP_IP}/$EIP/g" k8s/monitoring/*.yml

# Apply Kubernetes configurations
kubectl apply -f k8s/monitoring/

# Wait for services to be ready
kubectl wait --for=condition=available deployment/kibana -n monitoring --timeout=300s

# Print access URLs
echo "Kibana: http://monitoring.thanawy.app:5601"
echo "Jaeger: http://tracing.thanawy.app:16686"
