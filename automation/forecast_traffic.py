#!/usr/bin/env python3
import argparse
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone

try:
    from elasticsearch import Elasticsearch
except Exception:
    Elasticsearch = None


DEFAULT_TIMESTAMP_FIELDS = ["@timestamp", "timestamp", "ts"]


def parse_timestamp(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def month_key(dt):
    return dt.year, dt.month


def load_monthly_counts_from_log(log_path, timestamp_fields):
    counts = defaultdict(int)
    with open(log_path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            ts_value = None
            for field in timestamp_fields:
                if field in record:
                    ts_value = record[field]
                    break
            dt = parse_timestamp(ts_value)
            if not dt:
                continue
            counts[month_key(dt)] += 1
    return counts


def load_monthly_counts_from_es(es_url, index, timestamp_field, query=None):
    if Elasticsearch is None:
        raise RuntimeError("elasticsearch client is not installed")
    client = Elasticsearch(es_url)
    body = {
        "size": 0,
        "query": query or {"match_all": {}},
        "aggs": {
            "per_month": {
                "date_histogram": {
                    "field": timestamp_field,
                    "calendar_interval": "month"
                }
            }
        }
    }
    response = client.search(index=index, body=body)
    buckets = response.get("aggregations", {}).get("per_month", {}).get("buckets", [])
    counts = {}
    for bucket in buckets:
        key_as_string = bucket.get("key_as_string")
        dt = parse_timestamp(key_as_string)
        if not dt:
            continue
        counts[month_key(dt)] = int(bucket.get("doc_count", 0))
    return counts


def compute_average_growth(months, counts):
    growth_rates = []
    for i in range(1, len(months)):
        prev = counts[months[i - 1]]
        curr = counts[months[i]]
        if prev <= 0:
            continue
        growth_rates.append((curr - prev) / prev)
    if not growth_rates:
        return 0.0
    return sum(growth_rates) / len(growth_rates)


def forecast_counts(months, counts, avg_growth, horizon=6):
    if not months:
        return []
    last_year, last_month = months[-1]
    last_count = counts[months[-1]]
    forecast = []
    current_year = last_year
    current_month = last_month
    for step in range(1, horizon + 1):
        current_month += 1
        if current_month > 12:
            current_month = 1
            current_year += 1
        projected = last_count * ((1 + avg_growth) ** step)
        forecast.append(((current_year, current_month), int(round(projected))))
    return forecast


def format_month(year, month):
    return f"{year:04d}-{month:02d}"


def render_table(months, counts, forecast):
    lines = []
    lines.append("Month | Requests")
    lines.append("----- | --------")
    for key in months:
        lines.append(f"{format_month(*key)} | {counts[key]}")
    for key, value in forecast:
        lines.append(f"{format_month(*key)} | {value} (forecast)")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Forecast monthly traffic growth from logs or Elasticsearch")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--log-file", help="Path to JSONL log file")
    source.add_argument("--es-url", help="Elasticsearch URL, e.g. http://localhost:9200")
    parser.add_argument("--es-index", help="Elasticsearch index name")
    parser.add_argument("--timestamp-field", default=None, help="Timestamp field name for logs or ES")
    parser.add_argument("--months", type=int, default=6, help="Forecast horizon in months")
    args = parser.parse_args()

    if args.es_url:
        if not args.es_index:
            parser.error("--es-index is required when using --es-url")
        timestamp_field = args.timestamp_field or "@timestamp"
        counts = load_monthly_counts_from_es(args.es_url, args.es_index, timestamp_field)
    else:
        timestamp_fields = [args.timestamp_field] if args.timestamp_field else DEFAULT_TIMESTAMP_FIELDS
        counts = load_monthly_counts_from_log(args.log_file, timestamp_fields)

    if not counts:
        print("No traffic data found. Check your log source.", file=sys.stderr)
        sys.exit(1)

    months = sorted(counts.keys())
    avg_growth = compute_average_growth(months, counts)
    forecast = forecast_counts(months, counts, avg_growth, horizon=args.months)

    print(f"Average monthly growth: {avg_growth * 100:.2f}%")
    print()
    print(render_table(months, counts, forecast))


if __name__ == "__main__":
    main()

