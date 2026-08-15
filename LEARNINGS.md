#### QUIZ QUESTIONS

1. **Why does catalog-service get its own MongoDB database instead of sharing one with order-service?**

**Answer**: A database has no concept of "this table belongs to service A". Anyone with a connection string can read or write any collection. If `order-service` and `catalog-service` shared one MongoDB, the only thing enforcing "catalog owns products" would be a comment or a slack message telling people not to touch it - a social convention, not a technical one. Giving each service its own database makes the boundary something network topology enforces.

2. **What would actually go wrong later if order-service just queried catalog's MongoDB collection directly instead of going through catalog's API?**

**Answer**: If order-service queries the catalog's MongoDB collection directly, the business rules defined in catalog's service can't be enforced to the order-service, because they resides in the function calls of catalog's service. What that means is order-service can turn the stock quantity to negative, which is not possible.