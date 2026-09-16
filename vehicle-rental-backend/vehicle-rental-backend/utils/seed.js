require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

const vehicles = [
  { name: 'Suzuki Wagon R', registrationNo: 'CAR-1001', category: 'Car', brand: 'Suzuki', model: 'Wagon R', year: 2021, fuelType: 'Petrol', transmission: 'Automatic', seats: 4, rentalRatePerDay: 6500, images: ['https://loremflickr.com/640/420/wagonr,car?lock=11'] },
  { name: 'Suzuki Alto', registrationNo: 'CAR-1002', category: 'Car', brand: 'Suzuki', model: 'Alto', year: 2020, fuelType: 'Petrol', transmission: 'Manual', seats: 4, rentalRatePerDay: 5800, images: ['https://loremflickr.com/640/420/alto,car?lock=12'] },
  { name: 'Toyota Axio', registrationNo: 'CAR-1003', category: 'Car', brand: 'Toyota', model: 'Axio', year: 2019, fuelType: 'Hybrid', transmission: 'Automatic', seats: 4, rentalRatePerDay: 8500, images: ['https://loremflickr.com/640/420/toyota,sedan?lock=13'] },
  { name: 'Toyota Prius', registrationNo: 'CAR-1004', category: 'Car', brand: 'Toyota', model: 'Prius', year: 2020, fuelType: 'Hybrid', transmission: 'Automatic', seats: 4, rentalRatePerDay: 9000, images: ['https://loremflickr.com/640/420/prius,hybrid,car?lock=14'] },
  { name: 'Suzuki Every', registrationNo: 'VAN-2001', category: 'Van', brand: 'Suzuki', model: 'Every', year: 2019, fuelType: 'Petrol', transmission: 'Manual', seats: 6, rentalRatePerDay: 9500, images: ['https://loremflickr.com/640/420/minivan?lock=21'] },
  { name: 'Toyota KDH', registrationNo: 'VAN-2002', category: 'Van', brand: 'Toyota', model: 'HiAce (KDH)', year: 2018, fuelType: 'Diesel', transmission: 'Manual', seats: 10, rentalRatePerDay: 13500, images: ['https://loremflickr.com/640/420/van,passenger?lock=22'] },
  { name: 'Toyota Land Cruiser Prado', registrationNo: 'SUV-3001', category: 'SUV', brand: 'Toyota', model: 'Prado', year: 2021, fuelType: 'Diesel', transmission: 'Automatic', seats: 7, rentalRatePerDay: 22000, images: ['https://loremflickr.com/640/420/suv,offroad?lock=31'] },
  { name: 'Isuzu Elf', registrationNo: 'LRY-4001', category: 'Lorry', brand: 'Isuzu', model: 'Elf', year: 2017, fuelType: 'Diesel', transmission: 'Manual', seats: 3, rentalRatePerDay: 15000, images: ['https://loremflickr.com/640/420/lorry,truck?lock=41'] },
  { name: 'Coaster Bus', registrationNo: 'BUS-5001', category: 'Bus', brand: 'Toyota', model: 'Coaster', year: 2016, fuelType: 'Diesel', transmission: 'Manual', seats: 27, rentalRatePerDay: 26000, images: ['https://loremflickr.com/640/420/coaster,bus?lock=51'] }
];

const seed = async () => {
  await connectDB();

  await User.deleteMany({ email: 'admin@rental.lk' });
  await Vehicle.deleteMany({});

  await User.create({
    name: 'System Administrator',
    email: 'admin@rental.lk',
    password: 'Admin@123',
    phone: '0766221422',
    nic: 'ADMIN0001',
    role: 'admin'
  });

  await Vehicle.insertMany(vehicles);

  console.log('Seed complete: 1 admin user + demo vehicle fleet created.');
  console.log('Admin login -> email: admin@rental.lk | password: Admin@123');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
