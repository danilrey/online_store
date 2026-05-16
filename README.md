# SRE Capstone — Production Readiness Review

**Project:** Online Cases Store

**Authors:** Bussygin Danila SE-2414, Yessen Zhumagali SE-2419

This repository contains a complete PRR-oriented SRE setup with:

- Infrastructure as Code with Terraform
- CI/CD with GitHub Actions
- Docker/Kubernetes deployment manifests
- Prometheus, Grafana, and Alertmanager observability
- SLOs, HPA-based autoscaling, and Locust load testing

---

## 1. Service Overview

Online Cases Store is an e-commerce web application for phone, laptop, and tablet cases. The service exposes a REST API, server-rendered pages, MongoDB persistence, and Prometheus metrics at `/metrics`.

### Main capabilities
- Product catalog with filtering, sorting, and search
- Authentication and role-based access control
- Cart, orders, and order status updates
- Reviews and ratings
- Analytics endpoints for operational reporting

---

## 2. PRR Deliverables Mapping

### Step 1 — Infrastructure as Code
`terraform/`

- Reproducible local infrastructure from scratch
- Docker provider-based provisioning
- Variables and outputs for ports, image tags, and admin credentials
- Separate state file managed by Terraform

### Step 2 — CI/CD
`.github/workflows/cicd.yml`

- Builds the Docker image
- Runs a basic validation step on pull requests
- Pushes the image to GitHub Container Registry
- Deploys the new image to Kubernetes

### Step 3 — Observability & Alerting
`monitoring/`

- Prometheus scraping for backend and node exporter
- Grafana datasource and dashboard provisioning
- Alertmanager configuration
- SLO-oriented alert rules

### Step 4 — SRE Operations
`k8s/`, `loadtest/`, `monitoring/promQL.txt`

- Defined SLIs and SLOs
- Kubernetes Horizontal Pod Autoscaler
- Locust load test сценарий for traffic spikes
- PromQL queries for dashboarding and review

---

## 3. Architecture

### Runtime components
- **Backend:** Node.js + Express + MongoDB + Prometheus metrics
- **Database:** MongoDB 6
- **Metrics:** Prometheus
- **Dashboards:** Grafana
- **Alerts:** Alertmanager
- **Scaling:** Kubernetes HPA

### Repository layout
```text
final/
├── .github/workflows/cicd.yml
├── Dockerfile
├── README.md
├── docker-compose.yml
├── k8s/
├── loadtest/
├── monitoring/
├── public/
├── server.js
├── src/
├── terraform/
└── views/
```

---

## 4. SLI / SLO Definitions

| SLI | Target SLO | Measurement |
|---|---:|---|
| Product catalog availability | 99.5% | Success rate for `GET /api/products` |
| Order creation success | 99.0% | Success rate for `POST /api/orders` |
| Latency | p95 < 750 ms | `http_request_duration_seconds` |
| Error rate | < 5% | 4xx/5xx fraction from request counter |

These SLOs are used in Grafana dashboards and Prometheus alert rules.

---

## 5. How to Run Locally

### A. Docker Compose stack
```bash
docker compose up --build
```

Useful endpoints:
- App: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Alertmanager: `http://localhost:9093`

### B. Terraform infrastructure
```bash
cd terraform
terraform init
terraform plan -var-file=terraform.tfvars.example
terraform apply -var-file=terraform.tfvars.example
```

### C. Kubernetes manifests
```bash
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/backend-configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/hpa.yaml
```

### D. Load testing with Locust
```bash
pip install -r loadtest/requirements.txt
locust -f loadtest/locustfile.py --host http://localhost:3000
```

---

## 6. CI/CD Pipeline

The workflow in `.github/workflows/cicd.yml` performs:

1. Dependency installation
2. Basic syntax validation
3. Docker image build
4. Push to GitHub Container Registry
5. Deployment to Kubernetes using `kubectl`

### Required GitHub secrets
- `GITHUB_TOKEN` is provided automatically by GitHub Actions
- `KUBE_CONFIG_DATA` — base64-encoded kubeconfig

---

## 7. Observability

### Prometheus
Configured in `monitoring/prometheus.yml` to scrape:
- Backend application metrics
- Node exporter
- Prometheus itself

### Grafana
Provisioned datasource and dashboard files are located in:
- `monitoring/grafana/provisioning/datasources/`
- `monitoring/grafana/provisioning/dashboards/`
- `monitoring/grafana/dashboards/`

### Alerting
`monitoring/alert_rules.yml` contains alert rules for:
- SLO violation warnings
- High latency
- Elevated error rate

`monitoring/alertmanager.yml` defines the notification receiver.

---

## 8. SRE Operations and Scaling

### Kubernetes autoscaling
`k8s/hpa.yaml` scales the backend deployment based on CPU utilization.

### Load testing
`loadtest/locustfile.py` generates traffic spikes to observe:
- CPU growth
- Pod scaling
- Latency changes
- Error-rate behavior under load

### PromQL snippets
`monitoring/promQL.txt` includes the queries used for SLI panels and validation.

---

## 9. Security and Configuration Notes

- Terraform and Kubernetes manifests avoid hardcoding real secrets.
- Registry image names and cluster access are meant to be supplied through CI/CD variables or local overrides.
- The local Docker Compose stack is suitable for demos and screenshots.

---

## 10. Useful Test Accounts

If you seed the database, the example credentials from the project remain:

- **Admin:** `admin@casesstore.com` / `admin1`
- **Users:** `alex1@casesstore.com`, `sam2@casesstore.com`, `jamie3@casesstore.com`, `taylor4@casesstore.com`, `riley5@casesstore.com` / `1234`

---

## 11. Screenshots to Capture for Submission

- Terraform plan/apply output
- GitHub Actions successful build and push
- Grafana dashboard panels for latency, traffic, and errors
- Alertmanager or Prometheus firing alert page
- Kubernetes HPA scaling during Locust traffic spike

---

## 12. Notes on Existing Application

The Node.js application already includes:
- `prom-client` instrumentation
- JSON access logs for automation scripts
- REST endpoints for products, orders, users, reviews, and analytics

This PRR folder packages the app with production-readiness artifacts around it.
