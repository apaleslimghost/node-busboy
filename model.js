const adt = require('adt');
const adtCoerce = require('@quarterto/adt-coerce');
const dateIsValid = require('@quarterto/date-is-valid');

const onlyInt = adtCoerce(parseInt, isNaN, 'an integer', 10);
const onlyFloat = adtCoerce(parseFloat, isNaN, 'a float', 10);

const toDate = input => new Date(onlyInt(input));
const onlyDate = adtCoerce(toDate, dateIsValid, 'a date');

exports.Stop = adt.newtype('Stop', {
	stopPointName: adt.only(String, undefined),
	stopId: adt.only(String, undefined),
	stopCode1: adt.only(String, undefined),
	stopCode2: adt.only(String, undefined),
	stopPointType: adt.only(String, undefined),
	towards: adt.only(String, undefined),
	bearing: onlyInt,
	stopPointIndicator: adt.only(String, undefined),
	stopPointState: onlyInt,
	latitude: onlyFloat,
	longitude: onlyFloat
});

exports.Prediction = adt.newtype('Prediction', {
	stopPointName: adt.only(String, undefined),
	stopId: adt.only(String, undefined),
	stopCode1: adt.only(String, undefined),
	stopCode2: adt.only(String, undefined),
	stopPointType: adt.only(String, undefined),
	towards: adt.only(String, undefined),
	bearing: onlyInt,
	stopPointIndicator: adt.only(String, undefined),
	stopPointState: onlyInt,
	latitude: onlyFloat,
	longitude: onlyFloat,
	visitNumber: onlyInt,
	lineID: adt.only(String),
	lineName: adt.only(String),
	directionId: onlyInt,
	destinationText: adt.only(String),
	destinationName: adt.only(String),
	vehicleId: onlyInt,
	tripId: onlyInt,
	registrationNumber: adt.only(String),
	estimatedTime: onlyDate,
	expireTime: onlyDate
});

exports.FlexibleMessage = adt.newtype('FlexibleMessage', {
	stopPointName: adt.only(String, undefined),
	stopId: adt.only(String, undefined),
	stopCode1: adt.only(String, undefined),
	stopCode2: adt.only(String, undefined),
	stopPointType: adt.only(String, undefined),
	towards: adt.only(String, undefined),
	bearing: onlyInt,
	stopPointIndicator: adt.only(String, undefined),
	stopPointState: onlyInt,
	latitude: onlyFloat,
	longitude: onlyFloat,
	messageUUID: adt.only(String),
	messageType: onlyInt,
	messagePriority: onlyInt,
	messageText: adt.only(String),
	startTime: onlyDate,
	expireTime: onlyDate
});

exports.BaseVersion = adt.newtype('BaseVersion', {
	version: adt.only(String)
});

exports.URAVersion = adt.newtype('URAVersion', {
	version: adt.only(String),
	timeStamp: onlyDate
});

exports.responseTypes = {
	0: exports.Stop,
	1: exports.Prediction,
	2: exports.FlexibleMessage,
	3: exports.BaseVersion,
	4: exports.URAVersion,

	Stop: 0,
	Prediction: 1,
	FlexibleMessage: 2,
	BaseVersion: 3,
	URAVersion: 4
};
