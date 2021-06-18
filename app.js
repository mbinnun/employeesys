// Retrieve hard-coded app configuration from the ".env" file
require("dotenv").config();

// ===> Dependencies - Express
const express = require("express");
const logger  = require("morgan");
const path    = require("path");
const cors    = require("cors");
// ===> Dependencies - User input
const cookieParser = require("cookie-parser");
// ===> Dependencies - Routers
const indexRouter = require("./routes/index");
const apiRouter   = require("./routes/api");
// ===> Dependencies - Response
const apiResponse = require("./helpers/apiResponse");

// DB connection
const MONGODB_URL = process.env.MONGODB_URL;
const mongoose = require("mongoose");
mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
	// Verbose success
	const port = process.env.PORT || '3000';
	console.log("Connected to mongo uri at %s", MONGODB_URL);
	console.log("EmployeeSys API is running and listening on port "+port+" ... \n");
	console.log("Press CTRL + C to stop the process. \n");
})
	.catch(err => {
		// Verbose DB connection error handling
		console.error("EmployeeSys API starting error:", err.message);
		process.exit(1);
	});
const db = mongoose.connection;

// Start the server
const app = express();

// Middlewares
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));         // allow req.body and req.query
app.use(cookieParser());                                  // allow to use cookies
app.use(express.static(path.join(__dirname, "public")));  // serve static files

// Allow cross-origin requests
app.use(cors());

//Route Prefixes
//app.use("/", indexRouter);  // ==> The "root" router is not needed any more, since it is served as the static file public/index.html
app.use("/api/", apiRouter);  // the actual APIs

// Throw 404 if URL not found
app.all("*", function(req, res) {
	return apiResponse.notFoundResponse(res, "Page not found");
});

// Handle errors
app.use((err, req, res) => {
	if (err) {
		if(err.name == "UnauthorizedError"){
			return apiResponse.unauthorizedResponse(res, err.message);
		} else {
			return apiResponse.ErrorResponse(res, err.message);
		}
	}
});

module.exports = app;
