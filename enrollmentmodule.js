var config = require('./config');
var request = require('request');
var Promise = require('promise');

module.exports = {
	getCourse: getCourse,
	processShortlist: processShortlist
}

function processShortlist(shortlist, callback){
	console.log(shortlist);
    var shortlistJson = [];

    for (var i = 0; i < shortlist.length; i++) {
    	getCourse(shortlist[i],function(classlist){
    		console.log(classlist.catalog_number);
    		shortlistJson.push(classlist);
    	})
    };
}

function getCourse(course, callback) {
	var subject_code = course.slice(0,course.indexOf(course.match(/\d/)));
  	var catalog = course.slice(course.indexOf(course.match(/\d/)),course.length);

	var url = "https://api.uwaterloo.ca/v2/courses/" +
	    subject_code + "/" + catalog +
	    "/schedule.json?key=" + config.openapi.key;

	request({
	    url: url,
	    json: true
	}, function (error, response, body) {

	    if (!error && response.statusCode === 200) {
	        //console.log(body) // Print the json response

	        var classList = [];

	        for (var i = 0; i < body.data.length; i++) {
	        	var tempItem = new Object();
	        	tempItem.subject = body.data[i].subject;
	        	tempItem.catalog_number = body.data[i].catalog_number;
	        	tempItem.class_number = body.data[i].class_number;
	        	tempItem.section = body.data[i].section;
	        	tempItem.enrollment_capacity = body.data[i].enrollment_capacity;
	        	tempItem.enrollment_total = body.data[i].enrollment_total;
	        	tempItem.classes = body.data[i].classes;

	        	classList.push(tempItem);
	        };

	        callback(classList);
	    }
	})
}