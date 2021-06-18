exports.successResponse = function (res, msg) {
	var data = {
		status: 1,
		message: msg
	};
	return res.status(200).json(data);
};

exports.successResponseWithData = function (res, msg, data) {
	var resData = {
		status: 1,
		message: msg,
		data: data
	};
	return res.status(200).json(resData);
};

exports.ErrorResponse = function (res, msg) {
	var data = {
		status: 0,
		message: "500 Server Error",
		data: msg
	};
	return res.status(500).json(data);
};

exports.notFoundResponse = function (res, msg) {
	var data = {
		status: 0,
		message: "404 Not Found",
		//data: msg
	};
	return res.status(404).json(data);
};

exports.validationErrorWithData = function (res, msg, data) {
	var resData = {
		status: 0,
		message: msg,
		data: data
	};
	return res.status(400).json(resData);
};

exports.unauthorizedResponse = function (res, msg) {
	var data = {
		status: 0,
		message: '401 Unauthorized',
		data: msg
	};
	return res.status(401).json(data);
};