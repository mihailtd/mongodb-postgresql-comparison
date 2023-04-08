import { MongoClient } from "mongodb";
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

const username = "admin";
const password = "pass1234";

const client = new MongoClient("mongodb://localhost:27017", {
  auth: {
    username,
    password
  },
  directConnection: true
});

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

const batches = generateBatches(10000, 1000);

await client.connect();
const db = client.db("subscriptions");
const subscriptions = db.collection("subscriptions");

try {
  await subscriptions.createIndex({ name: 1 }, { name: "name_1" });
} catch (error) {
  console.log(error);
}

console.time("remove");
await subscriptions.deleteMany({});
console.timeEnd("remove");

// Seed the database with subscriptions
const seed = async () => {
  try {
    for (const batch of batches) {
      await subscriptions.insertMany(batch);
    }
  } catch (error) {
    console.error(error);
  }
};

// get all the subscriptions from users with names that contain Mike
const find = async () => {
  try {
    const cursor = subscriptions.find({ name: /Mike/ });
    const results = await cursor.toArray();
    console.log(`${results.length} subscriptions found`);
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

await client.close();

// catch any error
process.on("uncaughtException", async (err) => {
  console.log(err);
  await client.close();
});

process.on("SIGINT", async () => {
  console.log("Caught interrupt signal");
  await client.close();
  process.exit();
});

// catch mongodb client error
client.addListener("error", async (err) => {
  console.log(err);
  await client.close();
  process.exit();
});
// catch mongodb crash
client.addListener("close", async () => {
  console.log("MongoDB connection closed");
  await client.close();
  process.exit();
});
