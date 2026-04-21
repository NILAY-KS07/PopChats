import os
import re

def load_and_prep_banned():
    file_path = os.path.join(os.path.dirname(__file__), 'banned.txt')
    if not os.path.exists(file_path):
        return []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return [re.sub(r'[^a-z0-9]', '', line.strip().lower()) for line in f if line.strip()]
        
BANNED_WORDS_CACHE = load_and_prep_banned()

def is_clean(text):
    if not text: return True
        
    clean_msg = re.sub(r'[^a-z0-9]', '', text.lower())
    squashed_msg = re.sub(r'(.)\1+', r'\1', clean_msg)
    for word in BANNED_WORDS_CACHE:
        if len(word) < 3: continue
        
        if word in clean_msg or word in squashed_msg:
            return False
    return True
