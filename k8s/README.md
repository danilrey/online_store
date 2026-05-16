# Kubernetes Manifests

Apply MongoDB, backend config, backend, service, and HPA:

```
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/backend-configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/hpa.yaml
```

Check HPA status:

```
kubectl get hpa
```

