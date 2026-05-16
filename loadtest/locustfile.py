from locust import HttpUser, between, task


class ApiUser(HttpUser):
    wait_time = between(0.2, 1.0)

    @task(4)
    def list_products(self):
        self.client.get("/api/products")

    @task(1)
    def home_page(self):
        self.client.get("/")

    @task(1)
    def metrics_page(self):
        self.client.get("/metrics")

