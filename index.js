const http = require('http');
const qs = require('querystring');
const camel = require('camel-case');
const merge = require('deepmerge');
const split = require('split');
const Bacon = require('bacon.model');
const httpError = require('http-errors');

const {Stop, Prediction, FlexibleMessage, BaseVersion, URAVersion, responseTypes} = require('./model');

const defaultOptions = {
	host: 'countdown.api.tfl.gov.uk',
	path: '/interfaces/ura/instant_V1',
	query: {
		ReturnList: [
			'StopPointName',
			'StopID',
			'StopCode1',
			'StopCode2',
			'StopPointState',
			'StopPointType',
			'StopPointIndicator',
			'Towards',
			'Bearing',
			'Latitude',
			'Longitude',
			'VisitNumber',
			'TripID',
			'VehicleID',
			'RegistrationNumber',
			'LineID',
			'LineName',
			'DirectionID',
			'DestinationText',
			'DestinationName',
			'EstimatedTime',
			'MessageUUID',
			'MessageText',
			'MessageType',
			'MessagePriority',
			'StartTime',
			'ExpireTime',
			'BaseVersion'
		].join(),
		StopAlso: true
	},
	withCredentials: false
};

const is = klass => klass.hasInstance.bind(klass);

function parseErrorMessage(html) {
	const [matches, message] = html.match(/<h1>HTTP Status \d+ - (.+)\.<\/h1>/) || [false];

	if (matches) {
		return message;
	}

	throw new Error(html);
}

function get(options) {
	const data = new Bacon.Bus();

	options.path = options.path + '?' + qs.stringify(options.query);

	const req = http.request(options, res => {
		data.plug(Bacon.fromEventTarget(
			res.pipe(split()),
			'data'
		).flatMap(data => {
			try {
				if (res.statusCode !== 200) {
					return new Bacon.Error(
						httpError(res.statusCode, parseErrorMessage(data))
					);
				}

				const parsed = JSON.parse(data);
				return responseTypes[parsed[0]].apply(null, parsed.slice(1));
			} catch (err) {
				return new Bacon.Error(err);
			}
		}));

		res.on('end', () => data.end());
	});

	req.end();

	return data;
}

function busboy(options) {
	const baseModel = new Bacon.Model({
		meta: {loading: true}
	});

	const out = new Bacon.Bus();
	out.plug(baseModel);

	const data = get(merge(defaultOptions, options));

	data.filter(is(Stop)).onValue(stop => {
		const model = new Bacon.Model(Stop.unapplyObject(stop));
		baseModel.lens(stop.stopId).bind(model);
	});

	data.filter(is(Prediction)).onValue(prediction => {
		const model = new Bacon.Model(Prediction.unapplyObject(prediction));
		baseModel.lens([
			prediction.stopId,
			'predictions',
			prediction.visitNumber + '_' + prediction.vehicleId
		].join('.')).bind(model);
	});

	data.filter(is(FlexibleMessage)).onValue(message => {
		const model = new Bacon.Model(FlexibleMessage.unapplyObject(message));
		baseModel.lens([
			message.stopId,
			'messages',
			message.messageUUID
		].join('.')).bind(model);
	});

	data.filter(is(BaseVersion)).onValue(version => {
		baseModel.lens('meta.baseVersion').set(version.version);
	});

	data.filter(is(URAVersion)).onValue(version => {
		baseModel.lens('meta.uraVersion').set(version.version);
		baseModel.lens('meta.uraTimestamp').set(version.timeStamp);
	});

	data.onError(err => {
		out.error(err);
	});

	data.onEnd(() => {
		baseModel.lens('meta.loading').set(false);
		out.end();
	});

	return out;
}

exports.withOptions = busboy;
exports.query = query => busboy({query});
const busFilter = key => value => exports.query({[key]: value});

exports.around = (latlng, radius) => busFilter('Circle')([
	latlng.lat,
	latlng.lng,
	radius.toString()
].join(','));

[
	'StopPointName',
	'StopID',
	'StopCode1',
	'StopCode2',
	'StopPointType',
	'Towards',
	'Bearing',
	'StopPointState',
	'VisitNumber',
	'LineID',
	'LineName',
	'DirectionID',
	'DestinationText',
	'DestinationName',
	'VehicleID',
	'TripID',
	'RegistrationNumber',
	'StopPointIndicator',
	'MessageType',
	'MessagePriority'
].forEach(k => {
	exports[camel(k)] = busFilter(k);
});
