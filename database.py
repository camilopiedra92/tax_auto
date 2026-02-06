import sqlite3
import os
from typing import Optional, Dict, Any

DB_NAME = "users.db"

def get_db_path():
    # Store db in the users directory for persistence
    users_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users")
    os.makedirs(users_dir, exist_ok=True)
    return os.path.join(users_dir, DB_NAME)

def init_db():
    """Initialize the database with the users table."""
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    conn.commit()
    conn.close()

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieve a user by username."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row  # Return results as dict-like objects
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    
    conn.close()
    
    if user:
        return dict(user)
    return None

def create_user(username: str, hashed_password: str) -> bool:
    """Create a new user. Returns True if successful, False if username exists."""
    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO users (username, hashed_password) VALUES (?, ?)',
            (username, hashed_password)
        )
        
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        # Username already exists
        return False
    except Exception as e:
        print(f"Error creating user: {e}")
        return False

# Initialize DB on module import (or can be called explicitly)
init_db()
