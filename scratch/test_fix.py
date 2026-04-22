
def fix_mojibake(text):
    try:
        # Try to encode as cp1252 (which represents the bytes the characters "should" have been)
        # then decode as utf-8.
        return text.encode('cp1252').decode('utf-8')
    except Exception as e:
        return text

test_str = "ظ…ظ†طµط© طھط¹ظ„ظٹظ…ظٹط© طھظپط§ط¹ظ„ظٹط©"
print(f"Original: {test_str}")
print(f"Fixed: {fix_mojibake(test_str)}")
