const nock = require('nock');
const sinon = require('sinon');
const camel = require('camel-case');
const {expect} = require('chai')
	.use(require('sinon-chai'))
	.use(require('chai-datetime'))
	.use(require('dirty-chai'));

const busboy = require('./');

const toLineJSON = objects => objects.map(obj => JSON.stringify(obj)).join('\n');

const mock = (response = '') => nock('http://countdown.api.tfl.gov.uk')
	.get('/interfaces/ura/instant_V1')
	.query(true)
	.reply(200, Array.isArray(response) ? toLineJSON(response) : response);

exports['TfL Busboy'] = {
	before() {
		this.stubs = [];
		this.restoreStubs = () => {
			this.stubs.forEach(stub => stub.restore());
			this.stubs = [];
		}
	},

	afterEach() {
		this.stubs.forEach(stub => stub.reset());
	},

	query: {
		meta: {
			async 'should start with meta.loading true' () {
				mock();

				expect(
					await busboy.query({}).firstToPromise()
				).to.have.deep.property('meta.loading', true);
			},

			async 'should end with meta.loading false' () {
				mock();

				expect(
					await busboy.query({}).toPromise()
				).to.have.deep.property('meta.loading', false);
			},

			async 'should set BaseVersion message as meta.baseVersion' () {
				mock([
					[busboy.types.BaseVersion, '1.2.3']
				]);

				expect(
					await busboy.query({}).toPromise()
				).to.have.deep.property('meta.baseVersion', '1.2.3');
			},

			async 'should set URAVersion message as meta.uraVersion/Timestamp' () {
				const timestamp = 1234567890;
				const date = new Date(timestamp);

				mock([
					[busboy.types.URAVersion, '1.2.3', timestamp.toString()]
				]);

				const result = await busboy.query({}).toPromise();

				expect(result).to.have.deep.property('meta.uraVersion', '1.2.3');
				expect(result.meta.uraTimestamp).to.equalDate(date);
			}
		},

		async 'should return stops by id with properties' () {
			mock([
				[
					busboy.types.Stop,
					'point name',
					'stop id',
					'stop code 1',
					'stop code 2',
					'point type',
					'towards',
					'180',
					'point indicator',
					'2',
					'51.1',
					'0.5',
				]
			]);

			const result = await busboy.query({}).toPromise();

			expect(result).to.have.property('stop id');
			expect(
				result['stop id']
			).to.deep.equal({
				stopPointName: 'point name',
				stopId: 'stop id',
				stopCode1: 'stop code 1',
				stopCode2: 'stop code 2',
				stopPointType: 'point type',
				towards: 'towards',
				bearing: 180,
				stopPointIndicator: 'point indicator',
				stopPointState: 2,
				latitude: 51.1,
				longitude: 0.5
			});
		},

		async 'should attach predictions to stops' () {
			const estimatedTime = new Date(1479835491539);
			const expireTime = new Date(1479835495139);

			mock([
				[
					busboy.types.Stop,
					'point name',
					'stop id',
					'stop code 1',
					'stop code 2',
					'point type',
					'towards',
					'180',
					'point indicator',
					'2',
					'51.1',
					'0.5',
				],
				[
					busboy.types.Prediction,
					'point name',
					'stop id',
					'stop code 1',
					'stop code 2',
					'point type',
					'towards',
					'180',
					'point indicator',
					'2',
					'51.1',
					'0.5',
					'123',
					'line id',
					'line name',
					'1',
					'destination text',
					'destination name',
					'1234',
					'12',
					'AB66 CDE',
					estimatedTime.getTime().toString(),
					expireTime.getTime().toString()
				]
			]);

			const result = await busboy.query({}).toPromise();

			expect(result).to.have.property('stop id');

			expect(
				result['stop id']
			).to.have.deep.property('predictions.123_1234');

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.visitNumber',
				123
			);

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.lineID',
				'line id'
			);

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.lineName',
				'line name'
			);

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.directionId',
				1
			);

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.destinationText',
				'destination text'
			);

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.destinationName',
				'destination name'
			);

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.vehicleId',
				1234
			);

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.tripId',
				12
			);

			expect(result).to.have.deep.property(
				'stop id.predictions.123_1234.registrationNumber',
				'AB66 CDE'
			);

			expect(
				result['stop id'].predictions['123_1234'].estimatedTime
			).to.equalDate(estimatedTime);

			expect(
				result['stop id'].predictions['123_1234'].expireTime
			).to.equalDate(expireTime);

		},

		async 'should attach flexible messages to stops' () {
			const startTime = new Date(1479835491539);
			const expireTime = new Date(1479835495139);

			mock([
				[
					busboy.types.Stop,
					'point name',
					'stop id',
					'stop code 1',
					'stop code 2',
					'point type',
					'towards',
					'180',
					'point indicator',
					'2',
					'51.1',
					'0.5',
				],
				[
					busboy.types.FlexibleMessage,
					'point name',
					'stop id',
					'stop code 1',
					'stop code 2',
					'point type',
					'towards',
					'180',
					'point indicator',
					'2',
					'51.1',
					'0.5',
					'0c848424',
					'1',
					'1',
					'message text',
					startTime.getTime().toString(),
					expireTime.getTime().toString()
				]
			]);

			const result = await busboy.query({}).toPromise();

			expect(result).to.have.property('stop id');

			expect(
				result['stop id']
			).to.have.deep.property('messages.0c848424');

			expect(result).to.have.deep.property(
				'stop id.messages.0c848424.messageType',
				1
			);

			expect(result).to.have.deep.property(
				'stop id.messages.0c848424.messagePriority',
				1
			);

			expect(result).to.have.deep.property(
				'stop id.messages.0c848424.messageText',
				'message text'
			);

			expect(
				result['stop id'].messages['0c848424'].startTime
			).to.equalDate(startTime);

			expect(
				result['stop id'].messages['0c848424'].expireTime
			).to.equalDate(expireTime);

		}
	},

	'around': {
		before() {
			this.stubs.push(
				sinon.stub(busboy, 'query')
			);
		},

		after() {
			this.restoreStubs();
		},

		'should query with circle' () {
			busboy.around({lat: 51, lng: 0}, 10);
			expect(busboy.query).to.have.been.called();
			expect(busboy.query.lastCall.args).to.deep.equal([
				{Circle: [51, 0, 10].join()}
			]);
		}
	},

	'shorthand methods': {
		before() {
			this.stubs.push(
				sinon.stub(busboy, 'query')
			);
		},

		after() {
			this.restoreStubs();
		},

		'should be provided for a bunch of tfl things' () {
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
			].forEach(key => {
				busboy[camel(key)]('foo');
				expect(busboy.query).to.have.been.called();
				expect(busboy.query.lastCall.args).to.deep.equal([
					{[key]: 'foo'}
				]);
			});
		}
	}
};
