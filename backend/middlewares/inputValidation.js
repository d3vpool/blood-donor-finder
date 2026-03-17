const { z } = require("zod");

const userZodSchema = z.object({
    fullName : z.object({
        firstName: z.string().min(3),
        lastName: z.string().min(3).optional()
    }),
    email: z.email(),
    password: z.string().min(6),
})

function validateInput(req, res, next) {
    const body = req.body;
    const response = userZodSchema.safeParse(body);

    if(!response.success) {
        return res.status(400).json({
            error: response.error
        });
    }

    req.body = response.data; //See below why this is done
    next();
}

module.exports = validateInput;


// Example flow:

// Incoming request
// {
//   email: "abc@example.com",
//   password: "123456",
//   hackerField: "malicious"
// }

// After Zod validation:

// result.data
// {
//   email: "abc@example.com",
//   password: "123456"
// }