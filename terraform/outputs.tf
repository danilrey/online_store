output "backend_url" {
  value       = "http://localhost:${var.backend_port}"
  description = "Backend application URL."
}

output "prometheus_url" {
  value       = "http://localhost:${var.prometheus_port}"
  description = "Prometheus URL."
}

output "grafana_url" {
  value       = "http://localhost:${var.grafana_port}"
  description = "Grafana URL."
}

output "alertmanager_url" {
  value       = "http://localhost:${var.alertmanager_port}"
  description = "Alertmanager URL."
}

