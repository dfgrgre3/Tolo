import codecs
import sys

with codecs.open(r'd:\thanawy\errors.txt', 'r', 'utf-16') as f:
    lines = f.readlines()
    for line in lines[-20:]:
        print(line.strip())
