import postgres from "postgres";
import { MongoClient } from "mongodb";
import { faker } from "@faker-js/faker";
import { generateBatches } from "../helpers/batching";

type Location = {
  location_id: string;
  name: string;
  address: string;
  city: string;
  rooms: Room[];
  available_start_time: string;
  available_end_time: string;
};

type Room = {
  room_id: string;
  name: string;
};

type HospitalStaff = {
  location_id: Location["location_id"];
  staff_id: string;
  name: string;
  role: "doctor" | "nurse" | "anesthesiologist";
};

type Patient = {
  patient_id: string;
  name: string;
};

type Surgery = {
  surgery_id: string;
  patient_id: Patient["patient_id"];
  surgery_name: string;
  room_id: Room["room_id"];
  start_time: Date;
  end_time: Date;
  staff: HospitalStaff["staff_id"][];
};

// initialize MongoDB connection

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
const db = client.db("appointments");
db.dropCollection("patients");
db.dropCollection("locations");
db.dropCollection("hospital_staff");
db.dropCollection("surgeries");
const patientsCollection = db.collection("patients");
const locationsCollection = db.collection("locations");
const hospitalStaffCollection = db.collection("hospital_staff");
const surgeriesCollection = db.collection("surgeries");

try {
  // create indexes
  await patientsCollection.createIndex({ patient_id: 1 }, { unique: true });
  await locationsCollection.createIndex({ location_id: 1 }, { unique: true });
  await locationsCollection.createIndex({ "rooms.room_id": 1 }, { unique: true });
  await hospitalStaffCollection.createIndex({ staff_id: 1 }, { unique: true });
  await surgeriesCollection.createIndex({ surgery_id: 1 }, { unique: true });
  await surgeriesCollection.createIndex({ room_id: 1 }, { unique: false });
} catch (error) {
  console.log(error);
}

// create PostgreSQL tables and indexes

const sql = postgres("postgresql://hippo:df+hrKlKgQ@=t*eB{](k[fi0@localhost:5432/hippo");

const createTables = async (sql: postgres.Sql<any>) => {
  console.log("Creating tables...");
  // drop the tables if they already exist
  await sql`DROP TABLE IF EXISTS locations CASCADE`;
  await sql`DROP TABLE IF EXISTS rooms CASCADE`;
  await sql`DROP TABLE IF EXISTS hospital_staff CASCADE`;
  await sql`DROP TABLE IF EXISTS locations_hospital_staff CASCADE`;
  await sql`DROP TABLE IF EXISTS patients CASCADE`;
  await sql`DROP TABLE IF EXISTS surgeries CASCADE`;
  await sql`DROP TABLE IF EXISTS surgeries_hospital_staff CASCADE`;

  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      location_id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      address VARCHAR(255),
      city VARCHAR(255),
      available_start_time TIME,
      available_end_time TIME
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      location_id VARCHAR(255) REFERENCES locations(location_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS hospital_staff (
      staff_id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      role VARCHAR(255),
      available_start_time TIME,
      available_end_time TIME
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS locations_hospital_staff (
      location_id VARCHAR(255) REFERENCES locations(location_id),
      staff_id VARCHAR(255) REFERENCES hospital_staff(staff_id),
      PRIMARY KEY (location_id, staff_id)
      )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS patients (
      patient_id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS surgeries (
      surgery_id VARCHAR(255) PRIMARY KEY,
      patient_id VARCHAR(255) REFERENCES patients(patient_id),
      room_id VARCHAR(255) REFERENCES rooms(room_id),
      date DATE,
      start_time TIME,
      end_time TIME,
      surgery_name VARCHAR(255)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS hospital_staff_surgeries (
      staff_id VARCHAR(255) REFERENCES hospital_staff(staff_id),
      surgery_id VARCHAR(255) REFERENCES surgeries(surgery_id),
      PRIMARY KEY (staff_id, surgery_id)
    )
  `;

  // create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_locations_hospital_staff_location_id ON locations_hospital_staff(location_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_locations_hospital_staff_staff_id ON locations_hospital_staff(staff_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_hospital_staff_surgeries_staff_id ON hospital_staff_surgeries(staff_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_hospital_staff_surgeries_surgery_id ON hospital_staff_surgeries(surgery_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_surgeries_room_id ON surgeries(room_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_surgeries_date ON surgeries("patient_id")`;
  await sql`CREATE INDEX IF NOT EXISTS idx_rooms_location_id ON rooms(location_id)`;
};

await createTables(sql);

const generateLocation = (): Location => {
  return {
    location_id: faker.datatype.uuid(),
    name: faker.company.name(),
    address: faker.address.streetAddress(),
    city: faker.address.city(),
    available_end_time: "17:00:00",
    available_start_time: "08:00:00",
    rooms: Array(5)
      .fill(null)
      .map((el, i) => {
        return {
          room_id: faker.datatype.uuid(),
          name: `Room ${i + 1}`
        };
      })
  };
};

const generateHospitalStaff = (location: Location): HospitalStaff => {
  return {
    staff_id: faker.datatype.uuid(),
    location_id: location.location_id,
    name: faker.name.fullName(),
    role: faker.helpers.arrayElement(["doctor", "nurse", "anesthesiologist"])
  };
};

const generatePatient = (): Patient => {
  return {
    name: faker.name.fullName(),
    patient_id: faker.datatype.uuid()
  };
};

const generateSurgery = (rooms: Room[], staff: HospitalStaff[], patient_ids: Patient["patient_id"][]): Surgery => {
  return {
    surgery_id: faker.datatype.uuid(),
    patient_id: faker.helpers.arrayElement(patient_ids),
    room_id: faker.helpers.arrayElement(rooms).room_id,
    staff: faker.helpers.arrayElements(staff, 4).map((el) => el.staff_id),
    start_time: faker.date.recent(),
    end_time: faker.date.recent(),
    surgery_name: faker.company.bs()
  };
};

const patientBatches = generateBatches<Patient>(1000, 1000, generatePatient);
const patient_ids = [];
for (const patients of patientBatches) {
  await sql`INSERT INTO patients ${sql(patients)}`;
  await patientsCollection.insertMany(patients);
  patient_ids.push(...patients.map((el) => el.patient_id));
}

const locations = Array(15).fill(null).map(generateLocation);

for (const location of locations) {
  await locationsCollection.insertOne(location);

  await sql`INSERT INTO locations ${sql(
    location,
    "location_id",
    "name",
    "address",
    "city",
    "available_start_time",
    "available_end_time"
  )}`;
  const roomsWLocation = location.rooms.map((el) => ({ ...el, location_id: location.location_id }));
  await sql`INSERT INTO rooms ${sql(roomsWLocation, "room_id", "name", "location_id")}`;

  const staffbatches = generateBatches<HospitalStaff>(5, 1000, generateHospitalStaff, location);
  for (const staff of staffbatches) {
    await hospitalStaffCollection.insertMany(staff);

    await sql`INSERT INTO hospital_staff ${sql(staff, "staff_id", "name", "role")}`;
    await sql`INSERT INTO locations_hospital_staff ${sql(staff, "location_id", "staff_id")}`;

    const surgeryBatches = generateBatches<Surgery>(3, 1000, generateSurgery, location.rooms, staff, patient_ids);

    for (const surgeries of surgeryBatches) {
      await surgeriesCollection.insertMany(surgeries);

      await sql`INSERT INTO surgeries ${sql(
        surgeries,
        "surgery_id",
        "patient_id",
        "room_id",
        "start_time",
        "end_time",
        "surgery_name"
      )}`;

      const surgeryStaff = surgeries.reduce((acc, el) => {
        return [...acc, ...el.staff.map((staff_id) => ({ staff_id, surgery_id: el.surgery_id }))];
      }, [] as { staff_id: string; surgery_id: string }[]);

      await sql`INSERT INTO hospital_staff_surgeries ${sql(surgeryStaff, "staff_id", "surgery_id")}`;
    }
  }
}

await client.close();
await sql.end();
