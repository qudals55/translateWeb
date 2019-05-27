const mongoose = require('mongoose');

const { Schema } = mongoose;
const reviewSchema = new Schema({
  comments: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
});

module.exports = mongoose.model('Review', reviewSchema);
