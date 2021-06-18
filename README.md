## === EmployeeSys Rest API ===

Backend API files of employee system.

## To install

git clone https://.../employeesys
cd employeesys
cp .env.example .env
# ==> fill in all the parameters in the .env file. Tune them to your needs
# ==> on your mongodb server, create a db named EMPLOYEES and a collection name TblEmployees
# ==> paste the contents of the file "/db_restore/TblEmployees.json" into the TblEmployees collection
npm install

## Start the API server

npm start

## === The APIs collection ===

[GET]: /api/employees/
<Description> Fetch the employee list

[GET]: /api/employees/{:id}
<Description> Fetch the details of an employee by his employee-id

[POST]: /api/employees/
<Params> fname , lname , email , password , social
<Description> Register a new employee
<Rem> For social registration - the password must be passed as the string 'social', and the social parameter should be g/f/a
<Rem> The options for the social parameter are: g = Google / f = Facebook / a = Apple / Empty-String = Regular

[POST]: /api/employees/login/
<Params> email , password , social
<Description> Login an employee by his e-mail and password
<Rem> If that is a social sign in - the password must be passed as the string 'social', and the social parameter should be g/f/a
<Rem> The options for the social parameter are: g = Google / f = Facebook / a = Apple / Empty-String = Regular

[PUT]: /api/employees/{:id}
<Params> fname , lname , password , admin
<Description> Update an employee with new data by his employee-id
<Rem> A regular employee can update only himself. An admin can update all the employees.
<Rem> The password optional: if left empty, then the current password will remain unchainged
<Rem> The admin parameter is optional: 1 = make admin / 0 = revoke admin / Empty-String = admin flag will remain unchainged

[PUT]: /api/employees/verify/{:code}
<Description> Verify the e-mail (of the currently logged-in employee) by verification code

[POST]: /api/employees/resend/
<Description> Resend an e-mail with the verification code (to the currently logged-in employee)

[DELETE]: /api/employees/{:id}
<Description> Delete an employee by his employee-id
<Rem> Any employee is allowed to delete himself
