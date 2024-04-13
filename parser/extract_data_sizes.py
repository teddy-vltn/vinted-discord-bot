import json

def extract_groups_and_sizes(json_data):
    # Containers for the output data
    groups = {}
    sizes = {}

    # Recursive function to process each filter entry
    def process_entry(entry, parent_id=None):
        if entry.get('type') == 'group':
            # Collect group data
            groups[entry['title']] = entry['id']
            sizes[entry['id']] = {}

            # Process nested size options within the group
            if 'options' in entry:
                for size in entry['options']:
                    
                    if size.get('type') == 'default':
                        sizes[entry['id']][size['title']] = size['id']

        # Process any nested groups/options recursively
        if 'options' in entry:
            for sub_entry in entry['options']:
                process_entry(sub_entry, entry.get('id'))

    # Start processing from the root filter entries
    for filter_entry in json_data:
        process_entry(filter_entry)

    # Write the extracted groups and sizes to JSON files
    with open('groups.json', 'w', encoding='utf-8') as f:
        json.dump(groups, f, indent=4)
    with open('sizes.json', 'w', encoding='utf-8') as f:
        json.dump(sizes, f, indent=4)

    print("Data extraction complete. Files saved.")

# Load the JSON data from the file
with open('size.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Assuming the data under 'filters' is what we want to process
extract_groups_and_sizes(data['filters'])
