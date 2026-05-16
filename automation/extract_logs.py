#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys


def extract_json_from_line(line):
    line = line.strip()
    if not line:
        return None
    if " | " in line:
        line = line.split(" | ", 1)[1].strip()
    if not line.startswith("{"):
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return None


def read_from_log_file(log_file):
    with open(log_file, "r", encoding="utf-8") as handle:
        for line in handle:
            record = extract_json_from_line(line)
            if record is not None:
                yield record


def read_from_docker_compose(service, since=None):
    command = ["docker", "compose", "logs", "--no-color", "--timestamps", service]
    if since:
        command.extend(["--since", since])
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Failed to read docker compose logs")
    for line in result.stdout.splitlines():
        record = extract_json_from_line(line)
        if record is not None:
            yield record


def main():
    parser = argparse.ArgumentParser(description="Extract structured JSON logs from file or docker compose")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--log-file", help="Path to raw log file")
    source.add_argument("--docker-service", help="Docker compose service name to read logs from")
    parser.add_argument("--since", help="Docker compose --since value, e.g. 1h")
    parser.add_argument("--output", required=True, help="Output JSONL file")
    args = parser.parse_args()

    if args.log_file:
        records = read_from_log_file(args.log_file)
    else:
        records = read_from_docker_compose(args.docker_service, args.since)

    count = 0
    with open(args.output, "w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record) + "\n")
            count += 1

    print(f"Extracted {count} JSON log lines to {args.output}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

