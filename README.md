## EmployeeSys Rest API

Backend API files of an employee system example.

## To install

- git clone https://github.com/mbinnun/employeesys
- cd employeesys
- cp .env.example .env

1. fill in all the parameters in the .env file. Tune them to your needs
2. on your mongodb server, create a db named EMPLOYEES and a collection name TblEmployees
3. paste the contents of the file "/db_restore/TblEmployees.json" into the TblEmployees collection

- npm install

## Start the API server

npm start

## The APIs collection

<br>**GET:** /api/employees/
<br>**Description** Fetch the employee list
<br>
<br>**GET:** /api/employees/{:id}
<br>**Description** Fetch the details of an employee by his employee-id
<br>
<br>**POST:** /api/employees/
<br>**Params** fname , lname , email , password , social
<br>**Description** Register a new employee
<br>**Rem** For social registration - the password must be passed as the string 'social', and the social parameter should be g/f/a
<br>**Rem** The options for the social parameter are: g = Google / f = Facebook / a = Apple / Empty-String = Regular
<br>
<br>**POST:** /api/employees/login/
<br>**Params** email , password , social
<br>**Description** Login an employee by his e-mail and password
<br>**Rem** If that is a social sign in - the password must be passed as the string 'social', and the social parameter should be g/f/a
<br>**Rem** The options for the social parameter are: g = Google / f = Facebook / a = Apple / Empty-String = Regular
<br>
<br>**PUT:** /api/employees/{:id}
<br>**Params** fname , lname , password , admin
<br>**Description** Update an employee with new data by his employee-id
<br>**Rem** A regular employee can update only himself. An admin can update all the employees.
<br>**Rem** The password optional: if left empty, then the current password will remain unchainged
<br>**Rem** The admin parameter is optional: 1 = make admin / 0 = revoke admin / Empty-String = admin flag will remain unchainged
<br>
<br>**PUT:** /api/employees/verify/{:code}
<br>**Description** Verify the e-mail (of the currently logged-in employee) by verification code
<br>
<br>**POST:** /api/employees/resend/
<br>**Description** Resend an e-mail with the verification code (to the currently logged-in employee)
<br>**
<br>**DELETE:** /api/employees/{:id}
<br>**Description** Delete an employee by his employee-id
<br>**Rem** Any employee is allowed to delete himself
