import os
import json

def inject_students(html_file, names_file):
    """
    Reads names from a text file and updates the students array in the HTML file.
    """
    # 1. Read the names from the text file
    if not os.path.exists(names_file):
        print(f"Error: {names_file} not found! Please create it first.")
        return

    with open(names_file, 'r') as f:
        # Strip removes extra spaces or newlines from each name
        raw_names = [line.strip() for line in f.readlines() if line.strip()]

    # 2. Create the list of student objects for the JavaScript code
    # This matches the format: { id: 1, name: "Name", isPresent: false, remarks: "" }
    student_list = []
    for i, name in enumerate(raw_names):
        student_list.append({
            "id": i + 1,
            "name": name,
            "isPresent": False,
            "remarks": ""
        })

    # 3. Read the HTML file
    if not os.path.exists(html_file):
        print(f"Error: {html_file} not found!")
        return

    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # 4. Find the 'let students = ...' line and replace it
    # We look for the specific starting and ending markers of the array
    start_marker = "let students = ["
    end_marker = "];"
    
    start_index = html_content.find(start_marker)
    end_index = html_content.find(end_marker, start_index)

    if start_index == -1 or end_index == -1:
        print("Could not find the 'students' array in your HTML file.")
        return

    # Convert our Python list to a JSON string that JavaScript understands
    new_json_data = json.dumps(student_list, indent=8)
    
    # Reconstruct the HTML with the new data
    new_html = (
        html_content[:start_index] + 
        "let students = " + new_json_data + 
        html_content[end_index:]
    )

    # 5. Save the updated HTML
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(new_html)

    print(f"Successfully injected {len(student_list)} students into {html_file}!")

if __name__ == "__main__":
    # Ensure these filenames match exactly what you have on your computer
    inject_students("main.html", "names.txt")