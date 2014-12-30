<h1 align="center"><img src="https://raw.githubusercontent.com/quarterto/node-busboy/master/logo.png?1" alt="BUSBOY" width="257"></h1>

Nice event stream wrapper for the byzantine TfL Bus Departures API.

## The what

A bunch of methods that call the API and return nested event stream objects, such as:

```javascript
busboy.around({lat: 51.371422, lng: -0.227344}, 10);
// eventually: {'2232': { stopPointName: 'North Cheam / Queen Victoria', ... }}
```

The objects in the stream are a map of Stop IDs to `Stop` objects, which represent a bus stop:

```javascript
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
  longitude: onlyFloat,
  // predictions: Map<PredictionID, Prediction>
  // messages: Map<MessageID, FlexibleMessage>
});
```

A `Prediction` is an object representing a bus on the way. Yes, there are keys duplicated from `Stop`. Deal with it.

```javascript
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
```

A `FlexibleMessage` is a generic service message pertaining to a `Stop`.

```javascript
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
```

For more details of the keys, have a gander at the [TfL documentation](http://www.tfl.gov.uk/cdn/static/cms/documents/tfl-live-bus-and-river-bus-arrivals-api-documentation.pdf) (inb4 wtf pdf: i know, right?)

## The why

The TfL Live Bus API is awful. There is a single call that returns newline-separated JSON arrays. The arrays represent one of 5 different data types, each with different keys. The keys aren't in the returned data, you have to match up the keys you asked for, the keys in each type and the order in the documentation. There's a one-to-many relationship between `Stop` and `Prediction` and `Stop` and `FlexibleMessage`, but `Prediciton` and `FlexibleMessage` come back joined with their `Stop`. If you don't ask for any of the keys that a type uniquely has, that type gets filtered out, apart from `Stop`, which only comes back if you send `StopAlso=true`, even if you ask for `StopID`.

Argh.

## The API

### busboy.around(latlng, radius)()

Queries for stops within `radius` (in metres) of `latlng` (object containing `lat` and `lng`).

### Filter methods `busboy[key](value)`

`StopPointName, StopID, StopCode1, StopCode2, StopPointType, Towards, Bearing, StopPointState, VisitNumber, LineID, LineName, DirectionID, DestinationText, DestinationName, VehicleID, TripID, RegistrationNumber, StopPointIndicator, MessageType, MessagePriority`

Filters the response to stops, predictions or messages with a `key` of `value`. See Section 4.1.1 of the [TfL documentation](http://www.tfl.gov.uk/cdn/static/cms/documents/tfl-live-bus-and-river-bus-arrivals-api-documentation.pdf).

### busboy.query(queryObject)

Send an API request with the given query. Use one of the higher-level methods.

### busboy.withOptions(options)

Lets you override everything. `options` is passed to [`url.format`](http://nodejs.org/api/url.html#url_url_format_urlobj).

## Licence

MIT. Data provided by Transport for London. You must register at the [TfL Developer Portal](http://www.tfl.gov.uk/developers) if you want to use the official API.
