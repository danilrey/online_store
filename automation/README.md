# Automation Scripts

## Extract Logs

Extract structured JSON logs from a file:

```
python3 automation/extract_logs.py --log-file /path/to/raw.log --output automation/extracted_logs.jsonl
```

Extract logs from docker compose (backend service):

```
python3 automation/extract_logs.py --docker-service backend --since 1h --output automation/extracted_logs.jsonl
```

## Forecast Traffic

Forecast from extracted logs:

```
python3 automation/forecast_traffic.py --log-file automation/extracted_logs.jsonl
```

Forecast directly from Elasticsearch:

```
python3 automation/forecast_traffic.py --es-url http://localhost:9200 --es-index filebeat-* --timestamp-field @timestamp
```

## Demo

Run the demo with sample data:

```
python3 automation/demo_forecast.py
```
