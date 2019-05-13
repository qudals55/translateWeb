const mongoose = require('mongoose');

const { Schema } = mongoose;
const { Types: { ObjectId } } = Schema;
const userSchema = new Schema({
  room: {
    type: ObjectId,
    ref: 'Room',
  },
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
