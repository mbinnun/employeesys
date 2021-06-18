const express         = require("express");
const employeesRouter = require("./employees");

const app = express();

// API folder routings
app.use("/employees/", employeesRouter);

module.exports = app;
