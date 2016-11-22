const nock = require('nock');
const {expect} = require('chai')
	.use(require('chai-datetime'))
	.use(require('dirty-chai'));

const busboy = require('./');

const toLineJSON = objects => objects.map(obj => JSON.stringify(obj)).join('\n');

const mock = (response = '') => nock('http://countdown.api.tfl.gov.uk')
	.get('/interfaces/ura/instant_V1')
	.query(true)
	.reply(200, Array.isArray(response) ? toLineJSON(response) : response);

exports['TfL Busboy'] = {
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
		}
	}
};
