---
id: ordering-sql-clauses
title: Cláusulas de uma consulta SQL
indentation: lenient
---

Sort the clauses below into a query that lists the most populous
municipalities of Goiás first.

[ordering]
```sql
SELECT nome, populacao
  FROM municipios
 WHERE uf = 'GO'
 ORDER BY populacao DESC
```
