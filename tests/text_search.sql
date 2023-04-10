SELECT
  *
FROM
  articles
WHERE
  to_tsvector('english', sections) @@ phraseto_tsquery('english', 'Incredible Fresh Salad')
