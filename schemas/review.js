const mongoose = require('mongoose');

const { Schema } = mongoose;
const reviewSchema = new Schema({
  id:{
    type: String,
    required: true,
  },
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
