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
    
    # Create users table with profile fields
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        email TEXT,
        display_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create user_preferences table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        theme TEXT DEFAULT 'dark',
        language TEXT DEFAULT 'en',
        default_currency TEXT DEFAULT 'USD',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
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
        
        user_id = cursor.lastrowid
        
        # Create default preferences for new user
        cursor.execute(
            'INSERT INTO user_preferences (user_id) VALUES (?)',
            (user_id,)
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

def update_user_profile(username: str, email: Optional[str] = None, display_name: Optional[str] = None) -> bool:
    """Update user profile information."""
    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if email is not None:
            updates.append("email = ?")
            params.append(email)
        
        if display_name is not None:
            updates.append("display_name = ?")
            params.append(display_name)
        
        if not updates:
            return True
        
        params.append(username)
        query = f"UPDATE users SET {', '.join(updates)} WHERE username = ?"
        
        cursor.execute(query, params)
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error updating user profile: {e}")
        return False

def update_user_password(username: str, new_hashed_password: str) -> bool:
    """Update user password."""
    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE users SET hashed_password = ? WHERE username = ?',
            (new_hashed_password, username)
        )
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error updating password: {e}")
        return False

def get_user_preferences(username: str) -> Optional[Dict[str, Any]]:
    """Get user preferences."""
    try:
        conn = sqlite3.connect(get_db_path())
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT p.* FROM user_preferences p
            JOIN users u ON p.user_id = u.id
            WHERE u.username = ?
        ''', (username,))
        
        prefs = cursor.fetchone()
        conn.close()
        
        if prefs:
            return dict(prefs)
        return None
    except Exception as e:
        print(f"Error getting preferences: {e}")
        return None

def update_user_preferences(username: str, theme: Optional[str] = None, 
                           language: Optional[str] = None, 
                           default_currency: Optional[str] = None) -> bool:
    """Update user preferences."""
    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        
        # Get user_id
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return False
        
        user_id = user[0]
        
        updates = []
        params = []
        
        if theme is not None:
            updates.append("theme = ?")
            params.append(theme)
        
        if language is not None:
            updates.append("language = ?")
            params.append(language)
        
        if default_currency is not None:
            updates.append("default_currency = ?")
            params.append(default_currency)
        
        if not updates:
            conn.close()
            return True
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(user_id)
        
        query = f"UPDATE user_preferences SET {', '.join(updates)} WHERE user_id = ?"
        
        cursor.execute(query, params)
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error updating preferences: {e}")
        return False

# Initialize DB on module import (or can be called explicitly)
init_db()
