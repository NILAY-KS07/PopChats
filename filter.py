import os
from better_profanity import profanity

# Initialize profanity filter with default words
profanity.load_censor_words()

# Load custom words from banned.txt if it exists to supplement the library
file_path = os.path.join(os.path.dirname(__file__), 'banned.txt')
if os.path.exists(file_path):
    # This library is smart: it handles variations (like b.a.d) and 
    # respects word boundaries to avoid the Scunthorpe problem.
    profanity.add_censor_words_from_file(file_path)

def is_clean(text):
    """
    Checks if the text contains any profanity using the better-profanity library.
    Returns True if the text is clean, False if it contains banned words.
    """
    if not text:
        return True
        
    # contains_profanity() is much more robust than our previous regex;
    # it catches leetspeak (e.g. "p0rn") and character repetition.
    return not profanity.contains_profanity(text)
