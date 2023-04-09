import postgres from "postgres";
import { faker } from "@faker-js/faker";

type Subscription = {
  name: string;
  email: string;
  active: boolean;
  type: "free" | "premium";
  subscribedAt: Date;
};

const generateSubscription = (): Subscription => {
  return {
    name: faker.name.fullName(),
    email: faker.internet.email(),
    active: faker.datatype.boolean(),
    type: faker.helpers.arrayElement(["free", "premium"]),
    subscribedAt: faker.date.past()
  };
};

const sql = postgres("postgresql://hippo:df+hrKlKgQ@=t*eB{](k[fi0@localhost:5432/hippo");

const generateBatches = function* (numberOfBatches: number, batchSize: number) {
  let batch: Subscription[] = [];
  for (let i = 0; i < numberOfBatches; i++) {
    for (let j = 0; j < batchSize; j++) {
      batch.push(generateSubscription());
    }
    yield batch;
    batch = [];
  }
};

const batches = generateBatches(100, 1000);

await sql`CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  active BOOLEAN,
  type VARCHAR(255),
  "subscribedAt" TIMESTAMP
)`;

await sql`TRUNCATE TABLE subscriptions`;

await sql`DROP INDEX IF EXISTS name_index`;
await sql`CREATE INDEX name_index ON subscriptions (name)`;

const seed = async () => {
  try {
    for (const batch of batches) {
      await sql`INSERT INTO subscriptions ${sql(batch, "name", "email", "active", "type", "subscribedAt")}`;
    }
  } catch (error) {
    console.error(error);
  }
};

// get all the subscriptions from users with names that contain Mike
const find = async () => {
  try {
    const subscriptions = await sql`SELECT * FROM subscriptions WHERE name LIKE '%Mike%'`;
    console.log(`${subscriptions.length} subscriptions found`);
  } catch (error) {
    console.error(error);
  }
};

console.time("seed");
await seed();
console.timeEnd("seed");

console.time("find");
await find();
console.timeEnd("find");

sql.end();

process.on("uncaughtException", async (err) => {
  console.log(err);
  sql.end();
});

process.on("SIGINT", async () => {
  console.log("Caught interrupt signal");
  sql.end();
  process.exit();
});
