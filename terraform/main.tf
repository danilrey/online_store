locals {
  app_root = abspath("${path.module}/..")
}

resource "docker_network" "sre" {
  name = "${var.project_name}-net"
}

resource "docker_volume" "mongo_data" {
  name = "${var.project_name}-mongo-data"
}

resource "docker_volume" "prometheus_data" {
  name = "${var.project_name}-prometheus-data"
}

resource "docker_volume" "grafana_data" {
  name = "${var.project_name}-grafana-data"
}

resource "docker_volume" "alertmanager_data" {
  name = "${var.project_name}-alertmanager-data"
}

resource "docker_image" "backend" {
  name = "${var.backend_image_name}:${var.backend_image_tag}"

  build {
    context    = local.app_root
    dockerfile = "Dockerfile"
  }

  keep_locally = true
}

resource "docker_image" "mongo" {
  name = var.mongo_image
}

resource "docker_image" "prometheus" {
  name = var.prometheus_image
}

resource "docker_image" "grafana" {
  name = var.grafana_image
}

resource "docker_image" "alertmanager" {
  name = var.alertmanager_image
}

resource "docker_image" "node_exporter" {
  name = var.node_exporter_image
}

resource "docker_container" "mongo" {
  name  = "${var.project_name}-mongo"
  image = docker_image.mongo.image_id

  networks_advanced {
    name = docker_network.sre.name
  }

  ports {
    internal = 27017
    external = var.mongo_port
  }

  volumes {
    volume_name    = docker_volume.mongo_data.name
    container_path = "/data/db"
  }

  restart = "unless-stopped"
}

resource "docker_container" "backend" {
  name  = "${var.project_name}-backend"
  image = docker_image.backend.image_id

  networks_advanced {
    name = docker_network.sre.name
  }

  ports {
    internal = 3000
    external = var.backend_port
  }

  env = [
    "PORT=${var.backend_port}",
    "MONGODB_URI=mongodb://mongo:27017/cases_store",
    "NODE_ENV=production"
  ]

  restart = "unless-stopped"

  depends_on = [
    docker_container.mongo
  ]
}

resource "docker_container" "alertmanager" {
  name  = "${var.project_name}-alertmanager"
  image = docker_image.alertmanager.image_id

  networks_advanced {
    name = docker_network.sre.name
  }

  ports {
    internal = 9093
    external = var.alertmanager_port
  }

  command = [
    "--config.file=/etc/alertmanager/alertmanager.yml",
    "--storage.path=/alertmanager"
  ]

  volumes {
    host_path      = "${local.app_root}/monitoring/alertmanager.yml"
    container_path = "/etc/alertmanager/alertmanager.yml"
    read_only      = true
  }

  volumes {
    volume_name    = docker_volume.alertmanager_data.name
    container_path = "/alertmanager"
  }

  restart = "unless-stopped"
}

resource "docker_container" "prometheus" {
  name  = "${var.project_name}-prometheus"
  image = docker_image.prometheus.image_id

  networks_advanced {
    name = docker_network.sre.name
  }

  ports {
    internal = 9090
    external = var.prometheus_port
  }

  command = [
    "--config.file=/etc/prometheus/prometheus.yml",
    "--storage.tsdb.path=/prometheus",
    "--web.enable-lifecycle"
  ]

  volumes {
    host_path      = "${local.app_root}/monitoring/prometheus.yml"
    container_path = "/etc/prometheus/prometheus.yml"
    read_only      = true
  }

  volumes {
    host_path      = "${local.app_root}/monitoring/alert_rules.yml"
    container_path = "/etc/prometheus/alert_rules.yml"
    read_only      = true
  }

  volumes {
    volume_name    = docker_volume.prometheus_data.name
    container_path = "/prometheus"
  }

  depends_on = [
    docker_container.alertmanager,
    docker_container.backend
  ]

  restart = "unless-stopped"
}

resource "docker_container" "grafana" {
  name  = "${var.project_name}-grafana"
  image = docker_image.grafana.image_id

  networks_advanced {
    name = docker_network.sre.name
  }

  ports {
    internal = 3000
    external = var.grafana_port
  }

  env = [
    "GF_SECURITY_ADMIN_USER=${var.grafana_admin_user}",
    "GF_SECURITY_ADMIN_PASSWORD=${var.grafana_admin_password}",
    "GF_USERS_ALLOW_SIGN_UP=false"
  ]

  volumes {
    volume_name    = docker_volume.grafana_data.name
    container_path = "/var/lib/grafana"
  }

  volumes {
    host_path      = "${local.app_root}/monitoring/grafana/provisioning"
    container_path = "/etc/grafana/provisioning"
    read_only      = true
  }

  volumes {
    host_path      = "${local.app_root}/monitoring/grafana/dashboards"
    container_path = "/var/lib/grafana/dashboards"
    read_only      = true
  }

  depends_on = [
    docker_container.prometheus
  ]

  restart = "unless-stopped"
}

resource "docker_container" "node_exporter" {
  name  = "${var.project_name}-node-exporter"
  image = docker_image.node_exporter.image_id

  networks_advanced {
    name = docker_network.sre.name
  }

  ports {
    internal = 9100
    external = var.node_exporter_port
  }

  command = [
    "--path.rootfs=/host"
  ]

  volumes {
    host_path      = "/"
    container_path = "/host"
    read_only      = true
  }

  restart = "unless-stopped"
}

