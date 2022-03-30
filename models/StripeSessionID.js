const mongoose = require('mongoose');

// Schema
const stripeSessionIDSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    sessionID: {
        type: String,
        required: true
    }
})

const stripeSessionID = mongoose.model('stripeSessionID', stripeSessionIDSchema)
module.exports = stripeSessionID