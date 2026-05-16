variable "project_name" {
  type        = string
  default     = "cases-store-prr"
  description = "Prefix used for Terraform-managed Docker resources."
}

variable "backend_image_name" {
  type        = string
  default     = "cases-store-backend"
  description = "Docker image name used for the backend service."
}

variable "backend_image_tag" {
  type        = string
  default     = "terraform"
  description = "Tag assigned to the Terraform-built backend image."
}

variable "backend_port" {
  type    = number
  default = 3000
}

variable "mongo_port" {
  type    = number
  default = 27017
}

variable "prometheus_port" {
  type    = number
  default = 9090
}

variable "grafana_port" {
  type    = number
  default = 3001
}

variable "alertmanager_port" {
  type    = number
  default = 9093
}

variable "node_exporter_port" {
  type    = number
  default = 9100
}

variable "grafana_admin_user" {
  type    = string
  default = "admin"
}

variable "grafana_admin_password" {
  type      = string
  default   = "admin"
  sensitive = true
}

variable "mongo_image" {
  type    = string
  default = "mongo:6"
}

variable "prometheus_image" {
  type    = string
  default = "prom/prometheus:v2.55.1"
}

variable "grafana_image" {
  type    = string
  default = "grafana/grafana:11.1.0"
}

variable "alertmanager_image" {
  type    = string
  default = "prom/alertmanager:v0.27.0"
}

variable "node_exporter_image" {
  type    = string
  default = "prom/node-exporter:v1.8.2"
}

