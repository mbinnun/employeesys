var express = require("express");
const EmployeesController = require("../controllers/EmployeesController");

var router = express.Router();

// Employees folder routings
router.get   ("/"            , EmployeesController.employeeList);     // show employees list
router.post  ("/login"       , EmployeesController.employeeLogin);    // perform a log-in of an employee by email and password
router.post  ("/resend"      , EmployeesController.employeeResend);   // resend an e-mail with verification code to the currently logged-in employee
router.get   ("/:id"         , EmployeesController.employeeDetail);   // get extended details of an employee by employee-id
router.post  ("/"            , EmployeesController.employeeRegister); // register a new employee to the system by name, email, etc.
router.put   ("/verify/:code", EmployeesController.employeeVerify);   // verify the registation email of the currently logged-in employee, using a verification code
router.put   ("/:id"         , EmployeesController.employeeUpdate);   // update and employee details by employee-id and the details to change (possible to be done by myself or an admin)
router.delete("/:id"         , EmployeesController.employeeDelete);   // delete employee from the system by emplyee-id (possible to be done by myself or an admin)

module.exports = router;
