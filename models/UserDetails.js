const mongoose = require('mongoose');

// Schema
const userDetailsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    userID: {
        type: String,
        required: true
    }
})
const userDetails = mongoose.model('userDetails', userDetailsSchema)
module.exports = userDetails