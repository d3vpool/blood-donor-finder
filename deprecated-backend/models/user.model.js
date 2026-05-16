const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    fullName: {
        firstName: {
            type: String,
            required: true,
            minlength: [3, 'First name must be at least 3 characters long'],
        },
        lastName: {
            type: String,
            minlength: [3, 'Last name must be at least 3 characters long'],
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: [5, 'Email must be atleast 5 character long']
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    socketId: {
        type: String,
    }
})

//function for generating tokens
UserSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({_id: this._id}, process.env.JWT_SECRET);
    return token;
}

//function for verifying password
UserSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

//function for hashing password
UserSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}


const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;
