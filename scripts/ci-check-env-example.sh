#!/usr/bin/env bash
set -euo pipefail

# CI check to ensure .env example files do not contain likely real secrets.
# It flags any env value that looks like a long token unless it contains explicit placeholders like 'your' or 'example'.

fail=0
# Files to check: tracked env files plus supabase/.env.example
files=$(git ls-files -- "*.env.example" || true)
files="$files supabase/.env.example"

for f in $files; do
  [ -f "$f" ] || continue
  while IFS= read -r line || [ -n "$line" ]; do
    # strip comments
    trimmed="${line%%#*}"
    trimmed="$(echo "$trimmed" | sed -e 's/^\s*//' -e 's/\s*$//')"
    if [ -z "$trimmed" ]; then
      continue
    fi
    if [[ "$trimmed" != *=* ]]; then
      continue
    fi
    key="${trimmed%%=*}"
    val="${trimmed#*=}"
    # remove quotes
    val="$(echo "$val" | sed -e 's/^\s*"//' -e 's/"\s*$//' -e "s/^\s*'//" -e "s/'\s*$//")"
    val="$(echo "$val" | tr -d '\\r')"

    # ignore common placeholders
    lowerVal="$(echo "$val" | tr '[:upper:]' '[:lower:]')"
    if [[ "$lowerVal" == *"your"* || "$lowerVal" == *"example"* || "$lowerVal" == *"replace"* || "$lowerVal" == *"xxx"* || "$lowerVal" == *"<"* ]]; then
      continue
    fi

    # suspicious if very long or matches known secret prefixes
    if [[ ${#val} -ge 20 || "$val" == sk-* || "$val" == *"-----BEGIN"* || "$val" == *"PRIVATE KEY"* ]]; then
      echo "[ERROR] Suspicious value detected in $f -> $key=$val"
      fail=1
    fi
  done < "$f"
done

if [ $fail -ne 0 ]; then
  echo "\nEnv example validation failed. Remove real secrets from example env files and use placeholders."
  exit 1
fi

echo "Env example validation passed. No obvious secrets found."
