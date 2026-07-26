import os
import sys

from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError

REPLICATION_FACTOR = 1

def load_topics(path: str) -> dict[str, int]:
    topics = {}
    with open(path, encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            if ":" in line:
                name, partitions_str = line.split(":", 1)
                name = name.strip()
                partitions_str = partitions_str.strip()
                try:
                    partitions = int(partitions_str)
                except ValueError:
                    print(f"AVISO: partições inválidas para '{name}': '{partitions_str}', usando 1")
                    partitions = 1
            else:
                name = line
                partitions = 1

            if name:
                topics[name] = partitions

    return topics


def main() -> int:
    bootstrap_servers = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    topics_file = os.environ.get("TOPICS_FILE", "/config/topics.txt")

    if not os.path.isfile(topics_file):
        print(f"ERRO: Arquivo de tópicos não encontrado: {topics_file}", file=sys.stderr)
        return 1

    topics = load_topics(topics_file)
    print(f"Conectando no broker Kafka em {bootstrap_servers} para criar {len(topics)} tópicos...")

    admin = KafkaAdminClient(
        bootstrap_servers=bootstrap_servers,
        client_id="topic-init",
        request_timeout_ms=30000,
    )

    new_topics = [
        NewTopic(name=name, num_partitions=partitions, replication_factor=REPLICATION_FACTOR)
        for name, partitions in topics.items()
    ]

    try:
        admin.create_topics(new_topics=new_topics, validate_only=False)
        print("TODOS OS TÓPICOS FORAM CRIADOS COM SUCESSO.")
    except TopicAlreadyExistsError:
        print("TÓPICOS JÁ EXISTEM, NADA A FAZER.")
    except Exception as exc:
        print(f"FALHA AO CRIAR TÓPICOS: {exc}", file=sys.stderr)
        return 1
    finally:
        admin.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())