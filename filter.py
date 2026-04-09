import os
import re

def load_banned_words():
    file_path = os.path.join(os.path.dirname(__file__), 'banned.txt')
    
    if not os.path.exists(file_path):
        return [] 
        
    with open(file_path, 'r', encoding='utf-8') as f:
        return [line.strip().lower() for line in f if line.strip()]

BANNED_WORDS = load_banned_words()

def is_clean(text):
    text_lower = text.lower()
    for word in BANNED_WORDS:
        pattern = r'\b' + re.escape(word) + r'\b'
        if re.search(pattern, text_lower):
            return False
    return True