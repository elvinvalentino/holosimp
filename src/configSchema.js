const { Schema, model } = require('mongoose');

const ConfigSchema = new Schema({
  _id: {
    type: String,
    required: true
  },
  prefix: {
    type: String
  },
  streamChannelId: {
    type: String
  },
  tweetChannelId: {
    type: String
  }
})

module.exports = model('Config', ConfigSchema);