var MongoClient = require('mongodb').MongoClient;
var mongoConnectionString='mongodb://app:app@ds041432.mongolab.com:41432/cs446';

module.exports = {
	fillChecklist: function (){
		MongoClient.connect(mongoConnectionString, function(err, db) {
			if (err) {
				return console.dir(err);
			}

			db.collection('plans')
			.find({
				plan:'CSBHC'
			})
			.toArray(function(err,doc){
			    	if(err)throw err;
			    	
		    		var test = doc;
			    	return doc;
			    });  
		})
	},
	getCourseList: function () {
		var courseMap = {};
		MongoClient.connect(mongoConnectionString, function(err, db) {
			if (err) {
				return console.dir(err);
			}

			db.collection('students')
			.find({
				uw_id:1009,
				'details.units_attempted':{$ne: 0}
			},{
				subject_code:1, 
				catalog:1, 
				_id:0})
			.toArray(function(err,doc){
			    	if(err)throw err;
			    	
		    		doc.forEach(function(course) {
						courseMap[course.subject_code+course.catalog] = 1;
					});
			    	return doc;
			    });  
		});
	},
	getCourseFormat: function (constraint){
		MongoClient.connect(mongoConnectionString, function(err, db) {
			  if(err) { 
			  	return console.dir(err); 
			  }
			  var subject_code = constraint.slice(0,constraint.indexOf(constraint.match(/\d/)));
			  var catalog = constraint.slice(constraint.indexOf(constraint.match(/\d/)),constraint.length)
			  
			  if(catalog.indexOf('X') != -1){
			  	var catalog = new RegExp('^' + catalog.slice(0,catalog.indexOf('X')) + '.*');
			  }
			  db.collection('students')
			  .find(
			  	{
			  		uw_id:1009,
			  		subject_code: subject_code,
			  		catalog: catalog,
			  		'details.units_attempted':{$ne: 0}
			  	}).toArray(function(err,doc){
			    	if(err)throw err;
			    	console.log(doc);
			    	return doc;
			    });  
			});

	}
}