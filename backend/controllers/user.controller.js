const UserModel = require("../models/user.model");
const userService = require("../services/user.service");


module.exports.registerUser = async (req, res, next) => {


    const { fullName, email, password } = req.body;

    const hashedPassword = await UserModel.hashPassword(password);

    const user = await userService.createUser({
        firstName: fullName.firstName,
        lastName: fullName.lastName,
        email,
        password: hashedPassword
    });


    const token = user.generateAuthToken();

    res.status(201).json({ token, user: user.toObject() });

}