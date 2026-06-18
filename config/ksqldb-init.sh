set -e

until (echo > /dev/tcp/ksqldb-server/8088) >/dev/null 2>&1; do
  echo "Waiting ksqlDB..."
  sleep 2
done

echo "ksqlDB ready"

echo "Running scripts..."

for f in /scripts/*.sql; do
  echo "Executing $f"
  cat "$f" | ksql http://ksqldb-server:8088
done