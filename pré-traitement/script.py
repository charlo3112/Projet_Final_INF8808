import csv
import random

with open("dataset.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    fieldnames = reader.fieldnames

random.shuffle(rows)
sample = rows[:1000]

with open("dataset_1000.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(sample)

print(f"{len(sample)} lignes écrites dans dataset_1000.csv")