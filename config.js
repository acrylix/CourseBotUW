var config = {};
config.web={};
config.mongo={};

config.web.port = process.env.PORT || 8081;
config.mongo.connect = 'mongodb://app:app@ds041432.mongolab.com:41432/cs446';

module.exports = config;

