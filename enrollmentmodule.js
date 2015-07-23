var config = require('./config');
var request = require('request');
var Promise = require('promise');

var emitter = require('events').EventEmitter;


module.exports = {
	processShortlist: processShortlist,
	getCourseInfo: getCourseInfo
}

function getCourseInfo(course, fulldoc, callback) {
	var subject_code = course.slice(0,course.indexOf(course.match(/\d/)));
		var catalog = course.slice(course.indexOf(course.match(/\d/)),course.length);

	var url = "https://api.uwaterloo.ca/v2/courses/" +
			subject_code + "/" + catalog +
			"/schedule.json?key=" + config.openapi.key;

			console.log(url);

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
						tempItem.title = body.data[i].title;
						tempItem.enrollment_capacity = body.data[i].enrollment_capacity;
						tempItem.enrollment_total = body.data[i].enrollment_total;
						tempItem.classes = body.data[i].classes;

						classList.push(tempItem);
					};

					callback(classList, fulldoc);
			}
	})
}

// messed up function, but necessary because javascript callback hell
function processShortlist(shortlist, returnCallback) {
    var shortlistJson = [];
    var index = 0;

    var getCourse = function(course, callback) {
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

	var loopArray = function(shortlist) {
	    getCourse(shortlist[index], function(classlist) {


			shortlistJson.push(classlist);
			console.log(index +":  "+ classlist);


	        // set x to next item
	        index++;

	        // any more items in array? continue loop
	        if(index < shortlist.length) {
	            loopArray(shortlist);
	        } else {
	        	// all responses accounted for, return list
	        	returnCallback(shortlistJson);
	        }
	    });
	}




	loopArray(shortlist);
}
