const expect = require('@quarterto/chai');
const nock = require('nock');
const busboy = require('./');

exports['TfL Busboy'] = {
	query: {
		beforeEach() {
			this.scope = nock('http://countdown.api.tfl.gov.uk')
				.get('/interfaces/ura/instant_V1')
				.query(true)
				.reply(200, '');
		},

		async 'should start with meta.loading true' () {
			expect(
				await busboy.query({}).firstToPromise()
			).to.have.deep.property('meta.loading', true);
		},

		async 'should end with meta.loading false' () {
			expect(
				await busboy.query({}).toPromise()
			).to.have.deep.property('meta.loading', false);
		}
	},
};
