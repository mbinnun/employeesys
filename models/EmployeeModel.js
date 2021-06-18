const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const EmployeeSchema = new Schema({
	dtInsert:            { type: Date   , default: new Date().toISOString() }, // employee's document creation date
	dtUpdate:            { type: Date   , default: new Date().toISOString() }, // employee's document last update date
	strFirstName:        { type: String , required: true},                     // employee's first name
	strLastName:         { type: String , required: true},                     // employee's last name
	strEmail:            { type: String , required: true},                     // the e-mail that the employee has been registered with
	md5Password:         { type: String , required: true},                     // hash of the employee's password
	flgEmailVerified:    { type: Boolean, required: true, default: 0},         // true if verified the email
	strVerificationCode: { type: String , default: ''},                        // 4 digits, empty if already verified the email
	flgAdmin:            { type: Boolean, required: true, default: 0},         // true if change or delete other employees
	chrSocialSymbol:     { type: String , default: ''}                         // g/f/a (g = Google, f = Facebook, a = Apple)
});

module.exports = mongoose.model("TblEmployees", EmployeeSchema, "TblEmployees");
