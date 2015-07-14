var config = {};
config.web={};
config.mongo={};
config.openapi={};

config.web.port = process.env.PORT || 8081;
config.mongo.connect = 'mongodb://app:app@ds041432.mongolab.com:41432/cs446';
config.openapi.key = '4349f9583724c4d138cb4e0e25c5900f';

module.exports = config;

