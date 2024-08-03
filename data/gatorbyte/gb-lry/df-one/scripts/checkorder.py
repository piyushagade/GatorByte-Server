import json

# Read JSON data from file
with open('readings.json', 'r') as file:
    data = file.read()

# Parse JSON
rows = json.loads(data)

# Check for timestamps not in ascending order
out_of_order_rows = []
prev_timestamp = None
for row in rows:
    timestamp = int(row['TIMESTAMP'])
    if prev_timestamp is not None and timestamp < prev_timestamp:
        out_of_order_rows.append(row)
    prev_timestamp = timestamp

# Print out-of-order rows
for row in out_of_order_rows:
    print(row)