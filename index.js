var split    = require('split');
var http     = require('http');
var events   = require('events');
var defaults = require('merge-defaults');
var url      = require('url');
var Bacon    = require('bacon.model');
var adt      = require('adt');
var camel    = require('camel-case');

var defaultOptions = {
  host: 'countdown.api.tfl.gov.uk',
  pathname: 'interfaces/ura/instant_V1',
  protocol: 'http',
  query: {
    ReturnList: 'StopPointName,StopID,StopCode1,StopCode2,StopPointState,StopPointType,StopPointIndicator,Towards,Bearing,Latitude,Longitude,VisitNumber,TripID,VehicleID,RegistrationNumber,LineID,LineName,DirectionID,DestinationText,DestinationName,EstimatedTime,MessageUUID,MessageText,MessageType,MessagePriority,StartTime,ExpireTime,BaseVersion',
    StopAlso: true
  }
};

function onlyCoerce(coerce, e) {
  return function(s) {
    var n = coerce(s, 10);
    if(isNaN(n)) {
      throw new TypeError('"' + s + '" cannot be converted to ' + e);
    }

    return n;
  };
}

var onlyInt   = onlyCoerce(parseInt,   'an integer');
var onlyFloat = onlyCoerce(parseFloat, 'a float');

function onlyDate(t) {
  return new Date(onlyInt(t));
}

var Stop = adt.newtype('Stop', {
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

var Prediction = adt.newtype('Prediction', {
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

var FlexibleMessage = adt.newtype('FlexibleMessage', {
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

var BaseVersion = adt.newtype('BaseVersion', {
  version: adt.only(String)
});

var URAVersion = adt.newtype('URAVersion', {
  version: adt.only(String),
  timeStamp: onlyDate
});

var types = {
  0: Stop,
  1: Prediction,
  2: FlexibleMessage,
  3: BaseVersion,
  4: URAVersion
};

function is(klass) {
  return klass.hasInstance.bind(klass);
}

function get(addr) {
  var data = new Bacon.Bus();

  http.get(addr, function(res) {

    data.plug(Bacon.fromEventTarget(
      res.pipe(split()),
      'data'
    ).flatMap(function(data) {
      try {
        var parsed = JSON.parse(data);
        return types[parsed[0]].apply(null, parsed.slice(1));
      } catch(e) {
        return new Bacon.Error(e);
      }
    }));

    res.on('end', function() {
      data.end();
    });
  });

  return data;
}

function busboy(options) {
  var addr = url.format(defaults(defaultOptions, options));
  var out = new Bacon.Model({
    meta: {loading: true}
  });

  var data = get(addr);

  data.filter(is(Stop)).onValue(function(stop) {
    var model = new Bacon.Model(stop.toJSON());
    out.lens(stop.stopId).bind(model);
  });

  data.filter(is(Prediction)).onValue(function(prediction) {
    var model = new Bacon.Model(prediction.toJSON());
    out.lens([
      prediction.stopId,
      'predictions',
      prediction.visitNumber + '_' + prediction.vehicleId
    ].join('.')).bind(model);
  });

  data.filter(is(FlexibleMessage)).onValue(function(message) {
    var model = new Bacon.Model(message.toJSON());
    out.lens([
      message.stopId,
      'messages',
      message.messageUUID
    ].join('.')).bind(model);
  });

  data.filter(is(BaseVersion)).onValue(function(version) {
    out.lens('meta.baseVersion').set(version.version);
  });

  data.filter(is(URAVersion)).onValue(function(version) {
    out.lens('meta.uraVersion').set(version.version);
    out.lens('meta.uraTimestamp').set(version.timeStamp);
  });

  data.onEnd(function() {
    out.lens('meta.loading').set(false);
  });

  return out;
}

exports.withOptions = busboy;

exports.query = function(q) {
  return busboy({query: q});
};

function busFilter(key) {
  return function(value) {
    var query = {};
    query[key] = value;
    return exports.query(query);
  };
}

exports.around = function around(latlng, radius) {
  return busFilter('Circle')([
    latlng.lat,
    latlng.lng,
    radius.toString()
  ].join(','));
};

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
].forEach(function(k) {
  exports[camel(k)] = busFilter(k);
});
