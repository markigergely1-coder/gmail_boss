import numpy as np
import nltk
from nltk.stem.snowball import SnowballStemmer

stemmer = SnowballStemmer("hungarian")

def tokenize(sentence):
    """
    Kettévágja a mondatot szavakra (tokenekre)
    """
    return nltk.word_tokenize(sentence, language='hungarian')

def stem(word):
    """
    Megkeresi a szó tövét (stemming). Segít, hogy a ragozott szavakat egyformának lássa a gép.
    pl. szavakat -> szó (vagy hasonló közös tő)
    """
    return stemmer.stem(word.lower())

def bag_of_words(tokenized_sentence, words):
    """
    Visszaad egy bag of words tömböt:
    1-est minden szóra, ami létezik a tokenizált mondatban, 0-t egyébként.
    """
    # Szótövesítjük az adott mondat minden szavát
    sentence_words = [stem(word) for word in tokenized_sentence]
    
    # Kezdetben egy csupa nulla tömb, akkora mint az összes ismert szó száma (vocab)
    bag = np.zeros(len(words), dtype=np.float32)
    
    for idx, w in enumerate(words):
        if w in sentence_words: 
            bag[idx] = 1

    return bag
