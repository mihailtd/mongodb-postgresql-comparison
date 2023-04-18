# MongoDB vs PostgreSQL: Which is more suitable for your project in 2023?

This is the source code used in my video [MongoDB vs PostgreSQL: Which is more suitable for your project in 2023?](https://youtu.be/AlYHUNQQVGg)

You can see some examples about how to deploy the two databases in a kubernetes cluster using the following kubernetes operators:
* MongoDB Community Kubernetes Operator: https://github.com/mongodb/mongodb-kubernetes-operator
* Crunchydata PGO: https://www.crunchydata.com/products/crunchy-postgresql-for-kubernetes

You can find more installation instructions in the official docs for each operator.

I then Thest 3 main scenarios: 
1. Dumping large amounts of data, testing import performance
2. Testing non-relational data, embedding JSON documents in Postgres, indexing them and comparing the query performance against MongoDB.
3. Full text search performance
4. Testing relational data and joins in both MongoDB and PostgreSQL

In the video I also take a look at developer tools and ecosystem, I talk about the need to store data in various forms.
I conclude that PostgreSQL is a better option than MongoDB for most use cases because it has more features, better performance even in situations that should favor MongoDB (such as storing non-relational data in JSON format).
