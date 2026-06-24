import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from elasticsearch import Elasticsearch, helpers

# --- Configuration ---
DATA_FILE = Path(__file__).resolve().parent / "data.json"


def load_data(path: Path) -> dict:
    """Load index config, statuses, image list, and category data from JSON."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # JSON has no tuple type, so each category's "items" come back as lists.
    # Convert them back to tuples to match the original (name, price_min, price_max) shape.
    for cat_data in data["category_data"].values():
        cat_data["items"] = [tuple(item) for item in cat_data["items"]]

    return data

DATA = load_data(DATA_FILE)

INDEX_NAME = DATA["index_name"]
TOTAL_DOCS = DATA["total_docs"]
STATUSES = DATA["statuses"]
IMAGE_LIST = DATA["image_list"]
CATEGORY_DATA = DATA["category_data"]
CATEGORIES = list(CATEGORY_DATA.keys())

# Connect to Elasticsearch (No password, standard HTTP)
es = Elasticsearch("http://localhost:9200")

def generate_description(category: str, title: str) -> str:
    """Build a realistic, varied description based on the category."""
    data = CATEGORY_DATA[category]
    template = random.choice(data["desc_templates"])

    condition = random.choice(data["conditions"])
    condition_long = random.choice(data["conditions_long"])
    detail = random.choice(data["details"])
    extra = random.choice(data["extras"])

    # Fill in template variables (not all templates use all vars)
    filled = template.format(
        condition=condition,
        condition_long=condition_long,
        detail=detail,
        extra=extra,
        ipva_status=random.choice(data.get("ipva_status", ["pago"])),
    )

    return filled.strip()

def generate_auction_lot(doc_id: int) -> dict:
    category = random.choice(CATEGORIES)
    cat_data = CATEGORY_DATA[category]

    # Pick a specific product for this category
    name, price_min, price_max = random.choice(cat_data["items"])

    # Add occasional lot variation to differentiate repeated items
    lot_suffixes = ["", "", "", f" - Lote #{random.randint(10, 200)}", f" ({random.randint(1, 3)} unidades)"]
    title = name + random.choice(lot_suffixes)

    description = generate_description(category, title)

    now = datetime.now(timezone.utc)
    created_days_ago = random.randint(1, 30)
    created_at = now - timedelta(days=created_days_ago)
    expiration_at = created_at + timedelta(days=random.randint(7, 14))

    return {
        "_index": INDEX_NAME,
        "_id": doc_id,
        "_source": {
            "_class": "org.infnet.listingservice.model.ListingLotDocument",
            "id": doc_id,
            "title": title,
            "description": description,
            "mainImageUrl": f"https://bucket.oleiloeiroonline.top/auction-images/{random.choice(IMAGE_LIST)}",
            "currentBidPrice": round(random.uniform(price_min * 0.3, price_max * 0.85), 2),
            "category": category,
            "status": random.choices(STATUSES, weights=[5, 70, 5, 10, 5, 2, 3], k=1)[0],
            "createdAt": created_at.isoformat(),
            "expirationDate": expiration_at.isoformat(),
        },
    }

# --- Bulk Insert Logic ---
def get_data():
    for i in range(1, TOTAL_DOCS + 1):
        yield generate_auction_lot(i)

print(f"Conectando ao Elasticsearch e preparando {TOTAL_DOCS} registros com dados realistas...")

try:
    success, failed = helpers.bulk(es, get_data())
    print(f"Sucesso! {success} documentos inseridos no índice '{INDEX_NAME}'.")
    if failed:
        print(f"Atenção: {len(failed)} documentos falharam na inserção.")
except Exception as e:
    print(f"Erro durante a inserção: {e}")