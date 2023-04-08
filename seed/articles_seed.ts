import postgres from "postgres";
import { MongoClient } from "mongodb";
import { faker } from "@faker-js/faker";

type Author = {
  authorId: string;
  email: string;
  firstName: string;
  lastName: string;
};

type Section = {
  title: string;
  content: string;
};

type Article = {
  title: string;
  author: Author;
  type: "blog" | "news";
  publishedAt: Date;
  status: "draft" | "published";
  sections: Section[];
};

const getNumberOfSections = (): number => {
  return Math.floor(Math.random() * 5) + 1;
};

const generateArticle = (): Article => {
  return {
    title: faker.lorem.sentence(),
    author: {
      authorId: faker.datatype.uuid(),
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    type: faker.helpers.arrayElement(["blog", "news"]),
    publishedAt: faker.date.past(),
    status: faker.helpers.arrayElement(["draft", "published"]),
    sections: Array(getNumberOfSections())
      .fill(null)
      .map(() => {
        return {
          title: faker.lorem.sentence(),
          content: faker.lorem.paragraphs()
        };
      })
  };
};

const generateBatches = function* (numberOfBatches: number, batchSize: number) {
  let batch: Article[] = [];
  for (let i = 0; i < numberOfBatches; i++) {
    for (let j = 0; j < batchSize; j++) {
      batch.push(generateArticle());
    }
    yield batch;
    batch = [];
  }
};

const batches = generateBatches(10, 1000);

const username = "admin";
const password = "pass1234";

const client = new MongoClient("mongodb://localhost:27017", {
  auth: {
    username,
    password
  },
  directConnection: true
});

await client.connect();
const db = client.db("articles");
const articles = db.collection("articles");
await articles.deleteMany({});

try {
  await articles.createIndex({ "author.firstName": 1 }, { name: "author_first_name_1" });
  await articles.createIndex({ status: 1 }, { name: "status_1" });
  await articles.createIndex([{ "sections.title": "text" }, { "sections.content": "text" }], {
    name: "text_index",
    default_language: "english",
    weights: { "sections.title": 10, "sections.content": 1 }
  });
} catch (error) {
  console.log(error);
}

const sql = postgres("postgresql://hippo:zJkZvu+%2FAw4%5BhjV8pJ=I=W=f@localhost:5432/hippo");

await sql`CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  author JSONB,
  type VARCHAR(255),
  "publishedAt" TIMESTAMP,
  status VARCHAR(255),
  sections JSONB
)`;

await sql`TRUNCATE TABLE articles`;

// add indexes
await sql`DROP INDEX IF EXISTS author_first_name_1`;
await sql`CREATE INDEX author_first_name_1 ON articles ((author->>'firstName'))`;
await sql`DROP INDEX IF EXISTS status_1`;
await sql`CREATE INDEX status_1 ON articles (status)`;
await sql`DROP INDEX IF EXISTS text_index`;
await sql`CREATE INDEX text_index ON articles USING GIN (sections)`;

for (const batch of batches) {
  await articles.insertMany(batch);
  await sql`INSERT INTO articles ${sql(batch, "title", "author", "type", "publishedAt", "status", "sections")}`;
}

await client.close();
await sql.end();
