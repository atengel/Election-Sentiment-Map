__author__ = 'Alex'
from textblob import TextBlob
import sys
import json
tweetText = sys.argv[1]
textBlob = TextBlob(tweetText)
polarity = textBlob.sentiment.polarity
print(json.dumps({"polarity": polarity}))
sys.stdout.flush();