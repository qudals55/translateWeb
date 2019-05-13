const mongoose = require('mongoose');

const { Schema } = mongoose;
const userSchema = new Schema({
  user: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  lang: {
      type: String,
      required: true,
  }
});

module.exports = mongoose.model('User', userSchema);
