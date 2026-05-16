#!/usr/bin/env python3
import os
import subprocess
import sys


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    log_path = os.path.join(root, "sample_access.log")
    forecast_script = os.path.join(root, "forecast_traffic.py")
    command = [sys.executable, forecast_script, "--log-file", log_path]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr.strip())
        raise SystemExit(result.returncode)
    print(result.stdout.strip())


if __name__ == "__main__":
    main()

