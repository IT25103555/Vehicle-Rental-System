/**
 * Demo-data seeder: vehicles collection.
 * Run from inside vehicle-rental-backend/vehicle-rental-backend:
 *
 *   node seedVehicles.js
 *
 * Safe to re-run - it only replaces vehicles it previously added (matched by
 * registrationNo prefix "DEMO-"), so it won't touch real data your team adds later.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

// Small helper so ratings/reviews/mileage look like real accumulated data, not
// suspiciously round numbers.
function rand(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const catalog = [
  // ---- Cars (8) ----
  { name: 'Toyota Axio', brand: 'Toyota', model: 'Axio', category: 'Car', fuelType: 'Hybrid', transmission: 'Automatic', seats: 5, rate: 7500, km: 25, img: 'sedan,car' },
  { name: 'Honda Civic', brand: 'Honda', model: 'Civic', category: 'Car', fuelType: 'Petrol', transmission: 'Automatic', seats: 5, rate: 8500, km: 28, img: 'sedan,car' },
  { name: 'Suzuki Alto', brand: 'Suzuki', model: 'Alto', category: 'Car', fuelType: 'Petrol', transmission: 'Manual', seats: 4, rate: 4500, km: 18, img: 'hatchback,car' },
  { name: 'Toyota Corolla', brand: 'Toyota', model: 'Corolla', category: 'Car', fuelType: 'Petrol', transmission: 'Automatic', seats: 5, rate: 7900, km: 26, img: 'sedan,car' },
  { name: 'Nissan Leaf', brand: 'Nissan', model: 'Leaf', category: 'Car', fuelType: 'Electric', transmission: 'Automatic', seats: 5, rate: 9000, km: 15, img: 'electric,car' },
  { name: 'Perodua Axia', brand: 'Perodua', model: 'Axia', category: 'Car', fuelType: 'Petrol', transmission: 'Manual', seats: 4, rate: 4200, km: 17, img: 'hatchback,car' },
  { name: 'Honda Vezel', brand: 'Honda', model: 'Vezel', category: 'Car', fuelType: 'Hybrid', transmission: 'Automatic', seats: 5, rate: 10500, km: 30, img: 'crossover,car' },
  { name: 'Kia Rio', brand: 'Kia', model: 'Rio', category: 'Car', fuelType: 'Petrol', transmission: 'Manual', seats: 5, rate: 6800, km: 22, img: 'hatchback,car' },

  // ---- SUVs (5) ----
  { name: 'Toyota RAV4', brand: 'Toyota', model: 'RAV4', category: 'SUV', fuelType: 'Petrol', transmission: 'Automatic', seats: 5, rate: 15000, km: 40, img: 'suv' },
  { name: 'Nissan X-Trail', brand: 'Nissan', model: 'X-Trail', category: 'SUV', fuelType: 'Diesel', transmission: 'Automatic', seats: 7, rate: 16000, km: 42, img: 'suv' },
  { name: 'Toyota Prado', brand: 'Toyota', model: 'Prado', category: 'SUV', fuelType: 'Diesel', transmission: 'Automatic', seats: 7, rate: 22000, km: 55, img: 'suv,offroad' },
  { name: 'Mitsubishi Outlander', brand: 'Mitsubishi', model: 'Outlander', category: 'SUV', fuelType: 'Petrol', transmission: 'Automatic', seats: 5, rate: 14500, km: 38, img: 'suv' },
  { name: 'Suzuki Vitara', brand: 'Suzuki', model: 'Vitara', category: 'SUV', fuelType: 'Petrol', transmission: 'Manual', seats: 5, rate: 12000, km: 32, img: 'suv' },

  // ---- Vans (5) ----
  { name: 'Toyota HiAce', brand: 'Toyota', model: 'HiAce', category: 'Van', fuelType: 'Diesel', transmission: 'Manual', seats: 12, rate: 18000, km: 45, img: 'van,minibus' },
  { name: 'Nissan Caravan', brand: 'Nissan', model: 'Caravan', category: 'Van', fuelType: 'Diesel', transmission: 'Manual', seats: 10, rate: 16500, km: 40, img: 'van,minibus' },
  { name: 'Toyota KDH', brand: 'Toyota', model: 'KDH', category: 'Van', fuelType: 'Diesel', transmission: 'Manual', seats: 14, rate: 19500, km: 47, img: 'van,minibus' },
  { name: 'Suzuki Every', brand: 'Suzuki', model: 'Every', category: 'Van', fuelType: 'Petrol', transmission: 'Manual', seats: 6, rate: 9500, km: 22, img: 'van' },
  { name: 'Toyota Noah', brand: 'Toyota', model: 'Noah', category: 'Van', fuelType: 'Hybrid', transmission: 'Automatic', seats: 8, rate: 13500, km: 33, img: 'minivan' },

  // ---- Bikes (5) ----
  { name: 'Honda Dio', brand: 'Honda', model: 'Dio', category: 'Bike', fuelType: 'Petrol', transmission: 'Automatic', seats: 2, rate: 1800, km: 8, img: 'scooter,motorcycle' },
  { name: 'Bajaj Pulsar 150', brand: 'Bajaj', model: 'Pulsar 150', category: 'Bike', fuelType: 'Petrol', transmission: 'Manual', seats: 2, rate: 2200, km: 9, img: 'motorcycle' },
  { name: 'TVS Ntorq', brand: 'TVS', model: 'Ntorq', category: 'Bike', fuelType: 'Petrol', transmission: 'Automatic', seats: 2, rate: 1900, km: 8, img: 'scooter' },
  { name: 'Yamaha FZ', brand: 'Yamaha', model: 'FZ', category: 'Bike', fuelType: 'Petrol', transmission: 'Manual', seats: 2, rate: 2400, km: 10, img: 'motorcycle' },
  { name: 'Honda CB Shine', brand: 'Honda', model: 'CB Shine', category: 'Bike', fuelType: 'Petrol', transmission: 'Manual', seats: 2, rate: 2000, km: 8, img: 'motorcycle' },

  // ---- Lorries (4) ----
  { name: 'Isuzu Elf', brand: 'Isuzu', model: 'Elf', category: 'Lorry', fuelType: 'Diesel', transmission: 'Manual', seats: 3, rate: 22000, km: 55, img: 'truck,lorry' },
  { name: 'Mitsubishi Canter', brand: 'Mitsubishi', model: 'Canter', category: 'Lorry', fuelType: 'Diesel', transmission: 'Manual', seats: 3, rate: 24000, km: 58, img: 'truck' },
  { name: 'Tata 407', brand: 'Tata', model: '407', category: 'Lorry', fuelType: 'Diesel', transmission: 'Manual', seats: 2, rate: 19000, km: 48, img: 'truck' },
  { name: 'Isuzu NPR', brand: 'Isuzu', model: 'NPR', category: 'Lorry', fuelType: 'Diesel', transmission: 'Manual', seats: 3, rate: 26000, km: 60, img: 'truck,lorry' },

  // ---- Buses (3) ----
  { name: 'Toyota Coaster', brand: 'Toyota', model: 'Coaster', category: 'Bus', fuelType: 'Diesel', transmission: 'Manual', seats: 28, rate: 35000, km: 70, img: 'bus' },
  { name: 'Isuzu Journey', brand: 'Isuzu', model: 'Journey', category: 'Bus', fuelType: 'Diesel', transmission: 'Manual', seats: 40, rate: 42000, km: 80, img: 'bus' },
  { name: 'Ashok Leyland Lynx', brand: 'Ashok Leyland', model: 'Lynx', category: 'Bus', fuelType: 'Diesel', transmission: 'Manual', seats: 45, rate: 45000, km: 85, img: 'bus' }
];

const locations = ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Jaffna', 'Matara'];
const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023];

const demoVehicles = catalog.map((v, i) => {
  const regNo = `DEMO-${1000 + i}`;
  return {
    name: v.name,
    registrationNo: regNo,
    category: v.category,
    brand: v.brand,
    model: v.model,
    year: years[randInt(0, years.length - 1)],
    fuelType: v.fuelType,
    transmission: v.transmission,
    seats: v.seats,
    rentalRatePerDay: v.rate,
    ratePerKm: v.km,
    location: locations[randInt(0, locations.length - 1)],
    description: `${v.brand} ${v.model} - ${v.category.toLowerCase()} available for rent.`,
    images: [`https://loremflickr.com/640/480/${v.img}?lock=${1000 + i}`],
    status: 'Available',
    mileage: randInt(5000, 90000),
    averageRating: rand(3.5, 5.0),
    totalReviews: randInt(3, 40)
  };
});

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not found - make sure .env exists in this folder.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);

  const removed = await Vehicle.deleteMany({ registrationNo: { $regex: '^DEMO-' } });
  console.log(`Cleared ${removed.deletedCount} previous demo vehicle(s).`);

  const inserted = await Vehicle.insertMany(demoVehicles);
  console.log(`Inserted ${inserted.length} demo vehicles across ${new Set(demoVehicles.map(v => v.category)).size} categories.`);

  await mongoose.disconnect();
  console.log('Done. Now run: node seedBookings.js');
}

seed().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
