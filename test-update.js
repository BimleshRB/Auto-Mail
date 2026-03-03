const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    apiKeys: {
      gemini: { type: [String], default: [] },
    },
  }, { strict: false });

  const User = mongoose.model('FakeUser', UserSchema, 'users');
  const email = "auto.mail.ai.247@gmail.com";
  
  const updatePayload = { 'apiKeys.gemini': ["test_key_hello_123"] };

  console.log("Applying payload:", updatePayload);

  await User.findOneAndUpdate(
    { email },
    { $set: updatePayload },
    { new: true, upsert: true }
  );

  const updatedUser = await User.findOne({ email });
  console.log("Updated User in DB:", JSON.stringify(updatedUser.toObject(), null, 2));
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
