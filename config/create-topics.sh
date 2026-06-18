echo "Criando tópicos..."

while IFS= read -r line || [ -n "$line" ]; do
    clean_line=$(printf "%s" "$line" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

    if [ -z "$clean_line" ] || echo "$clean_line" | grep -q '^#'; then
        continue
    fi

    topic=$(echo "$clean_line" | awk -F':' '{print $1}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    partitions=$(echo "$clean_line" | awk -F':' '{print $2}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    if ! case $partitions in (''|*[!0-9]*) false;; esac; then
        echo "ERRO: Partições inválidas para '$topic': '$partitions'"
        continue
    fi

    echo "Criando tópico: $topic (partições: $partitions)"

    /opt/kafka/bin/kafka-topics.sh \
        --bootstrap-server kafka:29092 \
        --create \
        --if-not-exists \
        --topic "$topic" \
        --partitions "$partitions" \
        --replication-factor 1

    if [ $? -eq 0 ]; then
        echo "Tópico $topic criado com sucesso"
    else
        echo "Erro ao criar tópico $topic"
    fi

done < /config/topics.txt

echo "Todos os tópicos foram processados!"