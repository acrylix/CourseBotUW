var MongoClient = require('mongodb').MongoClient;
var config = require('./config');

module.exports = {
	fillChecklist: fillChecklist,
	getCourseList: getCourseList,
	getCourseFormat: getCourseFormat
}


function findWildCardConstraint(constraint, course_list){
	var prefix = constraint.replace("XX","");
	for (var i = 0; i < course_list.length; i++) {
		if(course_list[i].substring(0,prefix.length) == prefix){
			return course_list[i];
		}
	};
}

function fillChecklist (student_id, callback) {
	var course_list,plan_template,frontEnd_template;
	getCourseList(student_id, function(courseList){
		course_list = courseList;
		var test = findWildCardConstraint('CS3XX',course_list);
		getCheckList('CSBHC',function(planTemplate){
			plan_template = planTemplate;

			plan_template['Required Courses'].Requirements.forEach(function(unitGroup){
				unitGroup.Requirements.forEach(function(item){
					for (var i = 0; i < item.Constraints.length; i++) {
						var constraint = item.Constraints[i];
						var found = course_list.indexOf(constraint);
						if(found != -1){
							course_list.splice(found,1);
							item.Selected = constraint;
							delete item.Constraints;
							unitGroup.Required--;
							break;
						}
					};
				})
				callback(plan_template);
				console.log(plan_template);
			})
		})
	});
	
	return plan_template;
}

function getFrontEndTemplate(plan, callback){
	MongoClient.connect(config.mongo.connect, function(err, db) {
		if (err) {return console.dir(err);}

		db.collection('template')
		.find({
			plan:'CSBHC'
		})
		.toArray(function(err,doc) {
	    	if(err) {throw err;}	    	
    		callback(doc[0]);
	    }); 
	})
}

function getCheckList(plan, callback){
	MongoClient.connect(config.mongo.connect, function(err, db) {
		if (err) {return console.dir(err);}

		db.collection('plans')
		.find({
			plan:'CSBHC'
		})
		.toArray(function(err,doc) {
	    	if(err) {throw err;}	    	
    		callback(doc[0]);
	    }); 
	})
}

function getCourseList (student_id, callback) {
	var courseList = [];
	MongoClient.connect(config.mongo.connect, function(err, db) {
		if (err) {
			return console.dir(err);
		}

		db.collection('students')
		.find({
			uw_id: parseInt(student_id),
			'details.units_attempted':{$ne: 0}
		},{
			subject_code:1,
			catalog:1,
			_id:0
		})
		.toArray(function(err,doc){
		    	if(err)throw err;
		    	
	    		doc.forEach(function(course) {
					courseList.push(course.subject_code + course.catalog);
				});
	    		console.log("Inside: " + courseList);
		    	callback(courseList);
		    });  
	});
}

function getCourseFormat (constraint){
	MongoClient.connect(config.mongo.connect, function(err, db) {
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