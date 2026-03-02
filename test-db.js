require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const users = await User.find({});
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}
test();
