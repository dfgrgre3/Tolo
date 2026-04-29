import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:Khaled%402008@127.0.0.1:5432/thanawy")
    cur = conn.cursor()
    cur.execute('SELECT "userId", "theme" FROM "UserSettings" LIMIT 5;')
    rows = cur.fetchall()
    for row in rows:
        print(row)
    cur.close()
    conn.close()
except Exception as e:
    print(e)
