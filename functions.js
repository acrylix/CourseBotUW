var MongoClient = require('mongodb').MongoClient;
var request = require("request");
var cheerio = require("cheerio");
var config = require('./config');

module.exports = {
	fillChecklist: fillChecklist,
	getCourseList: getCourseList,
	getCourseFormat: getCourseFormat,
	scrapeCsChecklist: scrapeCsChecklist
}

function scrapeCsChecklist(year, plan) {
	var url = "https://cs.uwaterloo.ca/current/programs/require/" + year + "-" + (parseInt(year)+1) + "/bcs.html";
	
	request(url, function(error, response, html){
        // First we'll check to make sure no errors occurred when making the request
        if(!error){
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

            var $ = cheerio.load(html);

            // Finally, we'll define the variables we're going to capture

            var requiredCourses, additionalConstraints;
            var template = {
            	"plan" : "CSBHC",
            	"Required Courses" : {},
            	"Additional Constraints" : {}
            };

            // ================
            // REQUIRED COURSES
            // ================

            // loop through each section of required courses
            template["Required Courses"] = {
            	"Required" : $('.require').find('.top-level').length,
            	"Requirements": []
        	};

            $('.require').find('.top-level').map(function(i, section) {
            	section = $(section);

            	var sectionName = section.first().contents().filter(function () {
            		return this.type === 'text';
            	}).text();


            	template["Required Courses"]["Requirements"].push({
            		"Name": sectionName.trim(),
            		"Required": section.find('li').length,
            		"Requirements": []
            	});

            	section.find('li').map(function(j, entry) {
            		entry = $(entry);


            		var courseString = entry.first().contents().filter(function () {
            			return this.type === 'text';
            		}).text();

            		template["Required Courses"]["Requirements"][i]["Requirements"].push({
            			"Name": courseString.trim(),
            			"Constraints": [],
            			"Selected": null
            		});

            		// console.log(courseString);
            	});
            });

            // ======================
            // ADDITIONAL CONSTRAINTS
            // ======================
            template["Additional Constraints"] = {
            	"Required" : $('.constraints').find('.top-level').length,
            	"Requirements": []
        	};


            // $('.constraints').children('ul').map(function(i, elem) {
            // 	elem = $(elem);

            // 	}
            // });
            console.log(JSON.stringify(template));
        }
    })
}


function findElectiveConstraint(constraint, course_list) {
	return 0;
}

function findNonmathConstraint(constraint, course_list) {
	console.log("list length: " + course_list.length);
	var exclude = ["CS", "MATH", "STAT", "CO"];
	var constraint_subject_code = constraint.slice(0,constraint.indexOf(constraint.match(/\d/)));
	var constraint_catalog = constraint.slice(constraint.indexOf(constraint.match(/\d/)),constraint.length);

	for (var i=0; i< course_list.length; i++) {
		if (exclude.indexOf(constraint_subject_code) > -1) {
			// course is a Math course, ignore
			continue;
		}

		return i;
	}

	return -1;
}

function findWildCardConstraint(constraint, course_list) {
	var prefix = constraint.replace("XX","");
	for (var i = 0; i < course_list.length; i++) {
		if(course_list[i].substring(0,prefix.length) == prefix) {
			return i;
		}
	};
	return null;
}

function findRangeConstraint(constraint, course_list) {
	var constraint_subject_code = constraint.slice(0,constraint.indexOf(constraint.match(/\d/)));
  	var constraint_catalog = constraint.slice(constraint.indexOf(constraint.match(/\d/)),constraint.length);
  	var constraint_range = constraint_catalog.split('-').map(Number);

  	for (var i = 0; i < course_list.length; i++) {
  		var course_subject_code = course_list[i].slice(0,course_list[i].indexOf(course_list[i].match(/\d/)));
  		var course_catalog = parseInt(course_list[i].slice(course_list[i].indexOf(course_list[i].match(/\d/)),course_list[i].length));
  		if(course_subject_code == constraint_subject_code && course_catalog >= constraint_range[0] && course_catalog <= constraint_range[1]){
  			return i;
  		}
  	};
  	return null;
}

function findConstraint(constraint, course_list, option){
	var result = -1;
	if(constraint.indexOf("XX")!= -1){
		result = findWildCardConstraint(constraint, course_list);
	}
	else if(constraint.indexOf("-")!=-1){
		result = findRangeConstraint(constraint, course_list); 
	}
	else if(constraint === "MINOR"){
		//
	}
	else if(constraint === "HUMANITIES"){
		result = 0;//TEMP
	}
	else if (constraint === "SOCIALSCIENCE") {
		result = 0;//TEMP
	}
	else if (constraint === "ELECTIVE") {
		result = findElectiveConstraint(constraint, course_list);
	}
	else if (constraint === "NONMATH") {
		result = findNonmathConstraint(constraint, course_list);
	}
	else{
		result = course_list.indexOf(constraint);
	}

	if(result > -1 && result !== null ){

		var course = course_list[result];
		
		if (option != 1) {
			course_list.splice(result,1);
		}
		return course;
	}
	return null;
}


function processConstraints(plan_section, plan_template, course_list, option){
	for (var i = 0; i < plan_section.Requirements.length; i++) {
		var unitGroup = plan_section.Requirements[i];
		if(unitGroup.Requirements == undefined){
			break;
		}
		for (var j = 0; j < unitGroup.Requirements.length; j++) {
			var item = unitGroup.Requirements[j];
			if (item.Name === "Elective breadth and depth requirements"){//item.Constraints === undefined && item.Requirements.length != 0
				processConstraints(item.Requirements[0],plan_template,course_list);
				break;
			};

			for (var k = 0; k < item.Constraints.length; k++) {
				var constraint = item.Constraints[k];
				var courseFindResult = findConstraint(constraint,course_list, option);
				console.log(constraint + ": " + courseFindResult);
				if(courseFindResult != null){
					item.Selected = courseFindResult;
					item.Name += ": " + courseFindResult;
					delete item.Constraints;
					unitGroup.Required--;
					if(unitGroup.Required == 0) break;
					break;
				}
			};
		};
		if(option == 1)return;
	};
}

function fillChecklist (student_id, callback) {
	var course_list,plan_template,frontEnd_template;
	getCourseList(student_id, function(courseList){
		course_list = courseList;
		getCheckList('CSBHC',function(planTemplate){
			plan_template = planTemplate;

			processConstraints(plan_template['Additional Constraints'], plan_template, course_list, 1);
			processConstraints(plan_template['Required Courses'], plan_template, course_list);
			

			callback(plan_template);
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
			subject_code: {$nin: ["PD","COOP","WKRPT"]},
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

function getCourseFormat (constraint){//deprecated
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