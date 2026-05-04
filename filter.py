import os
import re

def load_and_prep_banned():
    file_path = os.path.join(os.path.dirname(__file__), 'banned.txt')
    if not os.path.exists(file_path):
        return []
    
    banned = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            
            # We now keep space characters in the banned words instead of stripping everything.
            # This allows us to properly check for phrases (like "bad word") and prevents 
            # the filter from merging everything into one giant string.
            cleaned = re.sub(r'[^a-z0-9\s]', '', line.lower())
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            if cleaned:
                banned.append(cleaned)
    return banned
        
BANNED_WORDS_CACHE = load_and_prep_banned()

def is_clean(text):
    if not text: return True
        
    # To fix the "Scunthorpe problem" (where innocent words like "glass" trigger a ban because 
    # they contain a banned substring like "ass"), we pad the cleaned message with spaces.
    # Then we pad the banned word with spaces. This effectively creates an exact-word match 
    # system, so " ass " won't match inside " glass ".
    clean_msg = re.sub(r'[^a-z0-9\s]', '', text.lower())
    clean_msg = re.sub(r'\s+', ' ', clean_msg).strip()
    padded_clean = f" {clean_msg} "
    
    squashed_msg = re.sub(r'(.)\1+', r'\1', clean_msg)
    padded_squashed = f" {squashed_msg} "
    
    for word in BANNED_WORDS_CACHE:
        if len(word) < 3: continue
        
        padded_word = f" {word} "
        if padded_word in padded_clean or padded_word in padded_squashed:
            return False
    return True
