import json

# Read JSON data from file
with open('readings.json', 'r') as file:
    data = file.read()

# Parse JSON
rows = json.loads(data)

# Order rows by timestamp
ordered_rows = sorted(rows, key=lambda x: int(x['TIMESTAMP']))

# Write ordered data to a new file
with open('readings.og.json', 'w') as file:
    json.dump(rows, file, indent=4)
    
# Write ordered data to a new file
with open('readings.json', 'w') as file:
    json.dump(ordered_rows, file, indent=4)

print("Data ordered and saved to 'readings.og.json'")
