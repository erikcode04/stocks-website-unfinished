const mongoose = require("mongoose");
const { Schema } = mongoose;
// Define the User schema
const userSchema = new Schema({
  userName: {
    type: String,
    required: true,
    unique: true
  },
  hash: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String
  }
},{
  timestamps: true // This will add createdAt and updatedAt fields to the schema
});

// Create the User model
const User = mongoose.model("User", userSchema);

module.exports = User;
