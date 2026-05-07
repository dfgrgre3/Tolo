SELECT tableoid::regclass AS partition_name, count(*) AS row_count FROM "ExamResult" GROUP BY tableoid ORDER BY partition_name;
