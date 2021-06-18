// ==> Data model dependencies
const Employee = require("../models/EmployeeModel");
// ==> Validator dependencies
const { body,validationResult } = require("express-validator");
const { sanitizeBody }          = require("express-validator");
// ==> Response dependencies
const apiResponse = require("../helpers/apiResponse");
// ==> Authentication dependencies
const auth = require("../middlewares/jwt");
// ==> Token generation dependencies
const utility = require("../helpers/utility");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
// ==> Mail sending dependencies
const { constants } = require("../helpers/constants");
const mailer        = require("../helpers/mailer");
// ==> DB connection dependencies
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

// Employee structure for response objects
class EmployeeData {
	constructor(data) {
		this.id               = data._id;
		this.dtInsert         = data.dtInsert;
		this.dtUpdate         = data.dtUpdate;
		this.strFirstName     = data.strFirstName;
		this.strLastName      = data.strLastName;
		this.strEmail         = data.strEmail;
		this.md5Password      = data.md5Password;
		this.flgEmailVerified = data.flgEmailVerified;
		this.flgAdmin         = data.flgAdmin;
		this.chrSocialSymbol  = data.chrSocialSymbol;
	}
}

// === Middleware: authorization check ===
const CheckAuthorization = (req, res, next) => {
	if (req.headers.authorization) {
		// The header was sent ==> verify the token
		auth(req, res, (err) => {
			if (err) {
				// Not authorized ==> return error
				if (err.name === 'UnauthorizedError') {
					// Check the error type
					if (err.inner.name === 'TokenExpiredError') {
						return apiResponse.unauthorizedResponse(res, "Current authorization token has expired");
					} else {
						return apiResponse.unauthorizedResponse(res, "Bad authorization token");
					}
				}
			} else {
				// Authorized ==> continue
				next();
			}
		});
	} else {
		// No "authorization: Bearer" header
		return apiResponse.unauthorizedResponse(res, "Authorization token is required");
	}
};

// === Middleware: email-verification check ===
const CheckEmailVerified = (req, res, next) => {
	if (req.user && req.user._id) {
		// Find the employee
		try {
			Employee.findOne({_id: req.user._id}, "flgEmailVerified").then((objEmployee) => {
				if (objEmployee !== null) {
					// Check the admin flag
					if (objEmployee.flgEmailVerified) {
						// Raise a flag for email verified
						req.user.flgEmailVerified = objEmployee.flgEmailVerified;
						// Verified ==> continue
						next();
					} else {
						// Not verified ==> unauthorized
						return apiResponse.unauthorizedResponse(res, "You should verify your email before performing this action");
					}
				} else {
					// Employee not found ==> expired
					return apiResponse.unauthorizedResponse(res, "Current authorization token has expired");
				}
			});
		}
		catch (err) {
			// Error handling
			return apiResponse.unauthorizedResponse(res, "You should verify your email before performing this action");
		}
	} else {
		// No token ==> unauthorized
		return apiResponse.unauthorizedResponse(res, "Authorization token is required");
	}
};

// === Middleware: admin or is-myself check ===
const CheckAdmin = (req, res, next) => {
	if (req.user && req.user._id) {
		// Find the employee
		try {
			Employee.findOne({_id: req.user._id}, "flgAdmin").then((objEmployee) => {
				if (objEmployee !== null) {
					// Check whether the admin flag is true OR the action is done on myself
					if (objEmployee.flgAdmin || (req.params && req.params.id && req.params.id === req.user._id)) {
						// prevent changing myself to an admin
						if (!objEmployee.flgAdmin && req.body.admin) {
							req.body.admin = "";
						}
						// raise a flag for admin
						req.user.flgAdmin = objEmployee.flgAdmin;
						// admin/myself ==> continue
						next();
					} else {
						// Not admin ==> unauthorized
						return apiResponse.unauthorizedResponse(res, "Only admin is authorized to do this action");
					}
				} else {
					// Employee not found ==> expired
					return apiResponse.unauthorizedResponse(res, "Current authorization token has expired");
				}
			});
		}
		catch (err) { 
			// Error handling
			return apiResponse.unauthorizedResponse(res, "Only admin is authorized to do this action");
		}
	} else {
		// No token ==> unauthorized
		return apiResponse.unauthorizedResponse(res, "Authorization token is required");
	}
};

/**
 * Employees list << [GET]: /api/employees/ >>
 * 
 * @returns {Object}
 */
exports.employeeList = [

	// Validate auth token
	CheckAuthorization,
	// Check email verification
	CheckEmailVerified,

	// Fetch the employee list
	(req, res) => {
		try {
			Employee.find({}, "_id strFirstName strLastName strEmail").then((arrEmployees) => {
				if (arrEmployees.length > 0) {
					return apiResponse.successResponseWithData(res, "Operation success", arrEmployees);
				} else {
					return apiResponse.successResponseWithData(res, "Operation success", []);
				}
			});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}

];

/**
 * Employee details by id << [GET]: /api/employees/{:id} >>
 * 
 * GET @param {string}      id
 * 
 * @returns {Object}
 */
exports.employeeDetail = [

	// Validate auth token
	CheckAuthorization,
	// Check email verification
	CheckEmailVerified,

	// Fetch the employee details
	(req, res) => {
		if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
			// ID is not valid ==> error 404
			return apiResponse.notFoundResponse(res, "Page not found");
		}
		try {
			// Find the employee
			Employee.findOne({_id: req.params.id}, "_id dtInsert dtUpdate strFirstName strLastName strEmail flgEmailVerified flgAdmin").then((objEmployee) => {
				if (objEmployee !== null) {
					// Return the employee data
					const objEmployeeData = new EmployeeData(objEmployee);
					return apiResponse.successResponseWithData(res, "Operation success", objEmployeeData);
				} else {
					// Not found ==> error 404
					return apiResponse.notFoundResponse(res, "Page not found");
				}
			});
		} catch (err) {
			// Error ==> throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}

];

/**
 * Employee registration with an e-mail address << [POST]: /api/employees/ >>
 *
 * POST @param {string}      fname
 * POST @param {string}      lname
 * POST @param {string}      email
 * POST @param {string}      password (for social registration - the password must be passed as the string 'social', and the social parameter should be g/f/a)
 * POST @param {string}      social   (g = Google /f = Facebook / a = Apple / Empty-String = Regular)
 *
 * @returns {Object}
*/
exports.employeeRegister = [

	// Validate first name
	body("fname")
	  .isLength({ min: 1 }).trim().withMessage("First name is required")
		.matches(/^[a-zA-z ]+$/i).trim().withMessage("First name should contain english letters only"),
	// Validate last name
	body("lname")
	  .isLength({ min: 1 }).trim().withMessage("Last name is required")
		.matches(/^[a-zA-z ]+$/i).trim().withMessage("Last name should contain english letters only"),
	// Validate e-mail
	body("email")
	  .isLength({ min: 1 }).trim().withMessage("E-mail is required")
		.isEmail().trim().withMessage("E-mail should have a legal account@domain address")
		.custom((strInpEmail) => {
			return Employee.findOne({strEmail : strInpEmail}).then((EmployeeRecords) => {
				if (EmployeeRecords) {
					return Promise.reject("E-mail already in use");
				}
			});
		}),
	// Validate password
	body("password")
	  .isLength({ min: 1 }).trim().withMessage("Password is required")
	  .isLength({ min: 6 }).trim().withMessage("Password must be 6 characters or more"),
	// Sanitize data from input
	sanitizeBody("fname").trim().escape(),
	sanitizeBody("lname").trim().escape(),
	sanitizeBody("email").trim().escape(),
	sanitizeBody("password").trim().escape(),
	sanitizeBody("social").trim().escape(),

	// === Process request after validation and sanitization ===
	(req, res) => {
		try {
			// Extract the validation errors from a request
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				// Display errors if exist
				return apiResponse.validationErrorWithData(res, "Validation Error", errors.array());
			} else {
				// Password hash
				bcrypt.hash(req.body.password, 10, (err, hashPassword) => {
					// Allow only known social registration symbols
					const strSocialSymbol = (req.body.social && (req.body.social === "g" || req.body.social === "f" || req.body.social === "a") && req.body.password === "social") ? req.body.social : "";
					// Generate email confirmation code (empty for social registration)
					const strConfirmationCode = (strSocialSymbol === "") ? utility.randomNumber(4) : "" ;
					// Create User object with escaped and trimmed data
					const employee = new Employee({
						dtInsert:            new Date().toISOString(),  // set to now
						dtUpdate:            new Date().toISOString(),  // set to now
						strFirstName:        req.body.fname,
						strLastName:         req.body.lname,
						strEmail:            req.body.email,
						md5Password:         hashPassword,
						flgEmailVerified:    (strSocialSymbol === "") ? 0 : 1,  // auto verify for a social registration
						strVerificationCode: strConfirmationCode,
						flgAdmin:            0,                                 // registered user is non-admin by default
						chrSocialSymbol:     strSocialSymbol
					});
					const saveEmployee = () => {
						// Save employee
						employee.save((err) => {
							if (err) { 
								// handle save errors
								return apiResponse.ErrorResponse(res, err);
							}
							const employeeData = {
								_id:              employee._id,
								strFirstName:     employee.strFirstName,
								strLastName:      employee.strLastName,
								strEmail:         employee.strEmail,
								flgEmailVerified: employee.flgEmailVerified,
								flgAdmin:         employee.flgAdmin
							};
							return apiResponse.successResponseWithData(res,"Registration Success", employeeData);
						});
					};
					if (strSocialSymbol !== "") {
						// For social registation ==> save the emplyee ==> success
						saveEmployee();
					} else {
						// For regular registration ==> Send a confirmation e-mail
						mailer.send(
							constants.confirmEmails.from, 
							req.body.email,
							"Confirm E-Mail on EmployeeSys",
							"<p>Please confirm your e-mail on EmployeeSys.</p><p>Confirmation code: "+strConfirmationCode+"</p>"
						)
						// Save the employee ==> success
						.then(saveEmployee)
						// Handler for failure e-mail sending
						.catch(err => {
							return apiResponse.ErrorResponse(res, err);
						});
					}
				});
			}
		} 
		catch (err) {
			// if error has occured, show error 500
			return apiResponse.ErrorResponse(res, err);
		}
	}

];

/**
 * Employee login by e-mail and password << [POST]: /api/employees/login/ >>
 *
 * POST @param {string}      email
 * POST @param {string}      password (for social login, password would be 'social')
 * POST @param {string}      social   (g = Google /f = Facebook / a = Apple / Empty-String = Regular)
 *
 * @returns {Object}
 */
exports.employeeLogin = [

	// Validate e-mail
	body("email")
	  .isLength({ min: 1 }).trim().withMessage("E-mail is required")
		.isEmail().withMessage("E-mail should have a legal account@domain address"),
	// Validate password
	body("password")
	  .isLength({ min: 1 }).trim().withMessage("Password is required")
		.isLength({ min: 6 }).trim().withMessage("Password must be 6 characters or greater"),
	// Sanitize data from input
	sanitizeBody("email").trim().escape(),
	sanitizeBody("password").trim().escape(),
	sanitizeBody("social").trim().escape(),

	// === Process request after validation and sanitization ===
	(req, res) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return apiResponse.validationErrorWithData(res, "Validation Error", errors.array());
			} else {
				// Find the employee row
				Employee.findOne({strEmail: req.body.email}).then(employee => {
					if (employee) {
						// Check if password is correct
						bcrypt.compare(req.body.password, employee.md5Password, (err, same) => {
							if (same && ( (req.body.social || "") === "" || (req.body.password === "social" && (req.body.social || "") !== "" && (req.body.social || "") === employee.chrSocialSymbol) )) {
								let employeeData = {
									_id             : employee._id,
									strFirstName    : employee.strFirstName,
									strLastName     : employee.strLastName,
								};
								// Prepare JWT token for authentication
								const jwtPayload = employeeData;
								const jwtData    = { expiresIn: process.env.JWT_TIMEOUT_DURATION };
								const secret     = process.env.JWT_SECRET;
								// Generate JWT token with Payload and secret
								employeeData.token = jwt.sign(jwtPayload, secret, jwtData);
								return apiResponse.successResponseWithData(res,"Login Success", employeeData);
							} else {
								return apiResponse.validationErrorWithData(res, "Password is incorrect");
							}
						});
					} else {
						return apiResponse.validationErrorWithData(res, "Email not exists");
					}
				});
			}
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}

];

/**
 * Employee update with new data by id << [PUT]: /api/employees/{:id} >>
 * 
 * GET @param {string}      id 
 * PUT @param {string}      fname
 * PUT @param {string}      lname
 * PUT @param {string}      password  (optional: if left empty, then password will remain unchainged)
 * PUT @param {string}      admin     (0/1, optional: if left empty, then admin flag will remain unchainged)
 * 
 * @returns {Object}
 */
exports.employeeUpdate = [

	// Validate auth token
	CheckAuthorization,
	// Validate is admin or self
	CheckAdmin,
	// Check email verification
	CheckEmailVerified,

	// Validate first name
	body("fname")
		.isLength({ min: 1 }).trim().withMessage("First name is required")
	  .matches(/^[a-zA-z ]+$/i).trim().withMessage("First name should contain english letters and spaces only"),
	// Validate last name
	body("lname")
		.isLength({ min: 1 }).trim().withMessage("First name is required")
		.matches(/^[a-zA-z ]+$/i).trim().withMessage("Last name should contain english letters and spaces only"),
	body("password"),
	body("admin"),
	// Sanitize data from input
	sanitizeBody("fname").trim().escape(),
	sanitizeBody("lname").trim().escape(),
	sanitizeBody("password").trim().escape(),
	sanitizeBody("admin").trim().escape(),

	// == Perform update ==
	(req, res) => {
		try {
			// Extract the validation errors from a request
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				// Return errors if exist
				return apiResponse.validationErrorWithData(res, "Validation Error", errors.array());
			} else {
				// Validate that updated employee id is correct
				if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
					// Employee ID is invalid ==> return error
					return apiResponse.validationErrorWithData(res, "Validation Error", "Invalid Employee ID");
				} else {
					// Find the record
					Employee.findById(req.params.id, (err, foundEmployee) => {
						if (foundEmployee === null) {
							// Not found employee ==> return error
							return apiResponse.validationErrorWithData(res, "Validation Error", "Employee does not exist");
						} else {
							// Create employee object with the updated data
							const newFirstName = ((req.body.fname || "") !== "") ? req.body.fname : foundEmployee.strFirstName;  // if a new fname was sent then take it, otherwise leave unchanged
							const newLastName  = ((req.body.lname || "") !== "") ? req.body.lname : foundEmployee.strLastName;   // if a new lname was sent then take it, otherwise leave unchanged
							// If admin is 0/1, change accordingly. Otherwise, remain unchanged
							let newFlgAdmin = foundEmployee.flgAdmin;
							if (typeof(req.body.admin) !== "undefined" && req.body.admin !== null && req.body.admin !== "") {
								if (req.body.admin.toString() === "0") {
									newFlgAdmin = false;
								}
								else if (req.body.admin.toString() === "1") {
									newFlgAdmin = true;
								}
							}
							let   newPassword  = foundEmployee.md5Password;
							// Declare update method
							const ApplyUpdate = () => {
								const changesForUpdate = {
									dtUpdate:     new Date().toISOString(),  // set to now
									strFirstName: newFirstName,
									strLastName:  newLastName,
									md5Password:  newPassword,
									flgAdmin:     newFlgAdmin
								};
								// Update the employee
								Employee.findByIdAndUpdate(req.params.id, changesForUpdate, {}, (err, employee) => {
									if (err) {
										// If update failed ==> show error
										return apiResponse.ErrorResponse(res, err); 
									} else {
										// Success ==> return the data
										const employeeData = {
											_id:              employee._id,
											strFirstName:     newFirstName,
											strLastName:      newLastName,
											strEmail:         employee.strEmail,
											flgEmailVerified: employee.flgEmailVerified,
											flgAdmin:         newFlgAdmin
										}
										return apiResponse.successResponseWithData(res, "Employee update Success", employeeData);
									}
								});
							};
							// Check if there is a password on the input
							if ((req.body.password || "") === "") {
								// No password chage ==> continue
								ApplyUpdate();
							} else {
								// Validate new password length
								if (req.body.password.length < 6) {
									// invalid length ==> show error
									return apiResponse.validationErrorWithData(res, "Validation Error", "Password must be 6 characters or more");
								} else {
									// Password ok ==> calulate the new password hase
									bcrypt.hash(req.body.password, 10, (err, hashPassword) => {
										newPassword = hashPassword;
										ApplyUpdate();
									});
								}
							}
						}
					});
				}
			}
		} catch (err) {
			// Error ==> throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}

];

/** 
 * 
 * Verify the e-mail (of the logged in employee) by verification code << [PUT]: /api/employees/verify/{:code} >>
 * 
 * GET @param {string}      code
 * 
 * @returns {Object}
 */
exports.employeeVerify = [
	
	// Validate auth token
	CheckAuthorization,

	// Perform employee deleting
	(req, res) => {
		const strVerification = (req.params.code || "");
		if (strVerification === "") {
			return apiResponse.validationErrorWithData(res, "Validation Error", "Verification code is required");
		}
		else if (strVerification.length != 4) {
			return apiResponse.validationErrorWithData(res, "Validation Error", "Invalid verification code");
		} else {
			try {
				Employee.findById(req.user._id, (err, foundEmployee) => {
					if (foundEmployee === null){
						return apiResponse.validationErrorWithData(res, "Validation Error", "Employee does not exist");
					} else {
						// check if not already verified
						if (foundEmployee.flgEmailVerified) {
							return apiResponse.validationErrorWithData(res, "Validation Error", "Employee is already verified");
						} else if (foundEmployee.strVerificationCode != strVerification) {
							return apiResponse.validationErrorWithData(res, "Validation Error", "Invalid verification code");
						} else {
							// verify employee email
							const changesForUpdate = {
								dtUpdate:            new Date().toISOString(),  // set to now
								flgEmailVerified:    1,                         // set to verified
								strVerificationCode: ""                         // clear verification code
							};
							// Update the employee
							Employee.findByIdAndUpdate(req.user._id, changesForUpdate, {}, (err, employee) => {
								if (err) {
									// If update failed ==> show error
									return apiResponse.ErrorResponse(res, err); 
								} else {
									// Success ==> return the data
									const employeeData = {
										_id:              employee._id,
										strFirstName:     employee.strFirstName,
										strLastName:      employee.strLastName,
										strEmail:         employee.strEmail,
										flgEmailVerified: true,
										flgAdmin:         employee.flgAdmin
									}
									return apiResponse.successResponseWithData(res, "Employee e-mail verification Success", employeeData);
								}
							});							
						}
					}
				});
			} catch (err) {
				// Error: throw error in json response with status 500. 
				return apiResponse.ErrorResponse(res, err);
			}
		}
	}

];

/** 
 * 
 * Resend an e-mail with verification code (of the logged in employee) << [POST]: /api/employees/resend/ >>
 * 
 * @returns {Object}
 */
exports.employeeResend = [
	
	// Validate auth token
	CheckAuthorization,

	// Perform employee deleting
	(req, res) => {
		try {
			Employee.findById(req.user._id, (err, foundEmployee) => {
				if (foundEmployee === null){
					return apiResponse.validationErrorWithData(res, "Validation Error", "Employee does not exist");
				} else {
					// check if not already verified
					if (foundEmployee.flgEmailVerified) {
						return apiResponse.validationErrorWithData(res, "Validation Error", "Employee is already verified");
					} else {
						// resend verification code
						const strEmail            = foundEmployee.strEmail;
						const strConfirmationCode = foundEmployee.strVerificationCode;
						// For regular registration ==> Send a confirmation e-mail
						mailer.send(
							constants.confirmEmails.from, 
							strEmail,
							"Reminder: Confirm E-Mail on EmployeeSys",
							"<p>Please confirm your e-mail on EmployeeSys.</p><p>Confirmation code: "+strConfirmationCode+"</p>"
						)
						// success
						.then(() => {
							const employeeData = {
								strEmail: foundEmployee.strEmail,
							};
							return apiResponse.successResponseWithData(res,"Cofirmation code sending success", employeeData);
						})
						// Handler for failure e-mail sending
						.catch(err => {
							return apiResponse.ErrorResponse(res, err);
						});
													
					}
				}
			});
		} catch (err) {
			// Error: throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}

];

/** 
 * 
 * Employee delete by id << [DELETE]: /api/employees/{:id} >>
 * 
 * GET @param {string}      id
 * 
 * @returns {Object}
 */
exports.employeeDelete = [
	
	// Validate auth token
	CheckAuthorization,

	// Check not-myself
	// ==> Uncomment this to prevent self deleting ...
	/*
  (req, res, next) => {
		let isMyself = false
		if (req.user && req.user._id && req.params && req.params.id && req.params.id === req.user._id) {
			isMyself = true;
		}
		if (isMyself) {
			// is-myself ==> unauthorized for deletion
			return apiResponse.unauthorizedResponse(res, "You cannot delete yourself");
		} else {
			// not-myself ==> continue
			next();
		}
	},
	*/
	
	// Validate is admin
	CheckAdmin,
	// Check email verification
	CheckEmailVerified,
	
	// Perform employee deleting
	(req, res) => {
		if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
			return apiResponse.validationErrorWithData(res, "Validation Error", "Invalid employee ID");
		}
		try {
			Employee.findById(req.params.id, (err, foundEmployee) => {
				if (foundEmployee === null){
					return apiResponse.validationErrorWithData(res, "Validation Error", "Employee does not exist");
				} else {
					// delete employee
					Employee.findByIdAndRemove(req.params.id, (err) => {
							if (err) { 
								return apiResponse.ErrorResponse(res, err); 
							} else {
								return apiResponse.successResponse(res, "Employee delete Success");
							}
					});
				}
			});
		} catch (err) {
			// Error: throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}

];
