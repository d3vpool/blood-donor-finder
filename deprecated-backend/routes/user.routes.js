const express = require('express');
const validateInput = require('../middlewares/inputValidation');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.post('/register', validateInput, userController.registerUser);

module.exports = router;