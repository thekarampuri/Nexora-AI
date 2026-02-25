This Python program demonstrates various file handling operations.  It includes error handling to gracefully manage potential issues like files not being found.

```python
import os  # Import the os module for interacting with the operating system

def create_file(filepath, content):
    """Creates a new file and writes content to it.

    Args:
        filepath: The path to the file to be created.
        content: The text content to be written to the file.
    """
    try:
        with open(filepath, 'w') as file:  # Opens the file in write mode ('w').  The 'with' statement ensures the file is automatically closed.
            file.write(content)
        print(f"File '{filepath}' created successfully.")
    except OSError as e:  # Catches operating system errors (e.g., permission errors)
        print(f"Error creating file '{filepath}': {e}")


def read_file(filepath):
    """Reads and prints the content of a file.

    Args:
        filepath: The path to the file to be read.
    """
    try:
        with open(filepath, 'r') as file:  # Opens the file in read mode ('r')
            content = file.read()
            print(f"Content of '{filepath}':\n{content}")
    except FileNotFoundError:  # Catches the specific error if the file doesn't exist
        print(f"Error: File '{filepath}' not found.")
    except OSError as e: #Catches other OS errors during file reading.
        print(f"Error reading file '{filepath}': {e}")


def append_to_file(filepath, content):
    """Appends content to an existing file.

    Args:
        filepath: The path to the file to append to.
        content: The text content to be appended.
    """
    try:
        with open(filepath, 'a') as file: #Opens in append mode ('a')
            file.write(content)
        print(f"Content appended to '{filepath}' successfully.")
    except FileNotFoundError:
        print(f"Error: File '{filepath}' not found.")
    except OSError as e:
        print(f"Error appending to file '{filepath}': {e}")


def delete_file(filepath):
    """Deletes a file.

    Args:
        filepath: The path to the file to be deleted.
    """
    try:
        os.remove(filepath) #Uses os.remove for deleting the file.
        print(f"File '{filepath}' deleted successfully.")
    except FileNotFoundError:
        print(f"Error: File '{filepath}' not found.")
    except OSError as e:
        print(f"Error deleting file '{filepath}': {e}")



# Example usage:
file_path = "my_file.txt"  # Define the file path

# Create a file and write some content
create_file(file_path, "This is the initial content.\n")

# Read the file content
read_file(file_path)

# Append more content
append_to_file(file_path, "This is appended content.\n")

# Read the file content again to verify the append operation.
read_file(file_path)

#Delete the file.
delete_file(file_path)

# Attempt to read the deleted file (should result in a "File not found" error).
read_file(file_path)

```


Remember to run this code in a suitable Python environment.  The program creates, writes to, reads from, appends to, and deletes a file named "my_file.txt" in the same directory where the script is executed.  The error handling makes the program more robust.
