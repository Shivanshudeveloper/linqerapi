const mongoose = require('mongoose');

// Schema
const notificationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    createdOn: {
        type: Date,
        required: true
    },
    userID: {
        type: String,
        required: true
    }
})
const notification = mongoose.model('notification', notificationSchema)
module.exports = notification