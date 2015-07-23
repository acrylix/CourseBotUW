var MongoClient = require('mongodb').MongoClient;
var config = require('./config');

module.exports = {
	fillChecklist: fillChecklist,
	getCourseList: getCourseList,
	getCourseFormat: getCourseFormat
}


function findElectiveConstraint(constraint, course_list) {
	return 0;
}

function findNonmathConstraint(constraint, course_list) {
	// console.log("list length: " + course_list.length);
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

function findRangeConstraint(constraint, course_list){
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
	console.log('contraint! ' + constraint)
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

function processConstraints(plan_section, plan_template, course_list, option) {
	for (var i = 0; i < plan_section.Requirements.length; i++) {
		var unitGroup = plan_section.Requirements[i];
		if(unitGroup.Requirements == undefined){
			break;
		}
		for (var j = 0; j < unitGroup.Requirements.length; j++) {
			var item = unitGroup.Requirements[j];
			if (item.Name === "Elective breadth and depth requirements"){//item.Constraints === undefined && item.Requirements.length != 0
				processConstraints(item.Requirements[0],plan_template,course_list);
			};

			console.log("Constraint: " + item.Constraints[0]);
			if (item.Constraint === "TERMSENROLLED") {
				return "passed";
			}
			else if (item.Constraint === "FAILEDCOURSES") {
				return "passed";
			}
			else if (item.Constraint === "UNUSABLECOURSES") {
				return "passed";
			}
			else if (item.Constraint === "CSMAJORAVERAGE") {
				return "passed";
			}
			else if (item.Constraint === "CSCUMULATIVEAVERAGE") {
				return "passed";
			}
			else if (item.Constraint === "ENGLISHWRITING") {
				return "passed";
			}
			else if (item.Constraint === "COOPREQUIREMENTS") {
				return "passed";
			}

			for (var k = 0; k < item.Constraints.length; k++) {
				var constraint = item.Constraints[k];
				var courseFindResult = findConstraint(constraint,course_list, option);
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

function isQualifiedCourse(course, constraints)
{
	var course_subject_code = course.slice(0, course.indexOf(course.match(/\d/)))
  	var course_catalog = parseInt(course.slice(course.indexOf(course.match(/\d/)), course.length));
	for(var i = 0; i < constraints.length; i++)
	{
		var constraint = constraints[i]
		if(constraint === 'ELECTIVE') return true
		if(constraint === 'NONMATH') {
			if(["CS", "MATH", "STAT", "CO"].indexOf(course_subject_code) == -1) return true
		}
		if(constraint.indexOf("XX") != -1) {
			var prefix = constraint.replace("XX","")
			// if(course.substring(0,prefix.length) == prefix) return true;
			if(course.indexOf(prefix) == 0) return true
		}
		if(constraint.indexOf("-") != -1) {
			var constraint_subject_code = constraint.slice(0, constraint.indexOf(constraint.match(/\d/)))
			var constraint_catalog = constraint.slice(constraint.indexOf(constraint.match(/\d/)), constraint.length)
  			var constraint_range = constraint_catalog.split('-').map(Number) 			
  			if(course_subject_code == constraint_subject_code 
  				&& course_catalog >= constraint_range[0] 
  				&& course_catalog <= constraint_range[1]) return true
		} 
		if(constraint === course) return true
	}

	return false
}

function findQualifyingCourses(constraints, course_list)
{
	var qualify = []
	for(var i = 0; i < course_list.length; i++)
	{
		if(isQualifiedCourse(course_list[i], constraints)) 
			if(qualify.indexOf(course_list[i]) == -1)
				qualify.push(course_list[i])
	}
    return qualify
}

function eliminateQualifiers(qualifyToReq) 
{
	qualifyToReq.sort(function(a, b) {
		if(a.qualify.length > b.qualify.length) return 1
		if(a.qualify.length < b.qualify.length) return -1
		return 0
	})

	var p = qualifyToReq[0]
	if(p.qualify.length == 1) {
		var course = p.qualify[0]
		// console.log(course + ' ' + p)
		p.req['Selected'] = course
		qualifyToReq.splice(0, 1)
		for(var i = 0; i < qualifyToReq.length; i++) 
		{
			var q = qualifyToReq[i]
			// console.log(q)
			var index = q.qualify.indexOf(course)
			if(index >= 0) q.qualify.splice(index, 1)
		}
	} else {
		console.log(qualifyToReq)
		return
	}

	eliminateQualifiers(qualifyToReq)

}

function solved(qualifyToReq)
{
	var ret = true
	var count = 0
	for(var i = 0; i < qualifyToReq.length; i++)
	{
		if(typeof qualifyToReq[i].qualify !== 'string') {
			count++
			ret = false
		}
	}
	if(count < 6) return true
	return ret
}

function newData(data, index, v)
{
	var qualifyToReq = data.qualifyToReq
	var newQ = []
	// console.log(v)

	for(var i = 0; i < qualifyToReq.length; i++)
	{
		var q = qualifyToReq[i]
		var n
		if(i == index) {
			n = {'qualify': v, 'req': q.req}
		}
		else if(typeof q.qualify === 'string') {
			n = {'qualify': q.qualify, 'req': q.req}
		} else {
			n = {'qualify': q.qualify.slice(), 'req': q.req}
			if(n.qualify.length > 0) 
			{
				var ind = n.qualify.indexOf(v)
				if(ind >= 0) n.qualify.splice(ind, 1)
				if(n.qualify.length < 1 && data.courses.length != 1) return null
			}
		}
		newQ.push(n)
	}
	var newCourses = data.courses.slice()
	newCourses.splice(newCourses.indexOf(v), 1)
	return {'qualifyToReq': newQ, 'courses': newCourses}
}

function leastConstraining(qualifyToReq, domain)
{
	var max = 100 // should be a good max, student can't take more than 100 courses
	var best = null
	for(var i = 0; i < domain.length; i++)
	{
		var v = domain[i]
		var count = 0
		for(var j = 0; j < qualifyToReq.length; j++)
		{
			if(qualifyToReq[j].qualify.indexOf(v) != -1) count++
		}

		if(count < max) {
			best = v
			max = count
		}
	}

	return best
}

function bts(data)
{	
	if(data.courses.length == 0) return data
	var qualifyToReq = data.qualifyToReq

	// find MRV
	var index
	var max = 100 // should be a good max, student can't take more than 100 courses
	for(var i = 0; i < qualifyToReq.length; i++)
	{
		if(typeof qualifyToReq[i].qualify !== 'string') {
			if(qualifyToReq[i].qualify.length < max) {
				index = i
				max = qualifyToReq[i].qualify.length
			}
		}
	}

	var p = qualifyToReq[index]
	var domain = p.qualify.slice() // clones array
	while(domain.length > 0)
	{
		var v = leastConstraining(qualifyToReq, domain)
		var newD = newData(data, index, v)
		if(newD != null) 
		{
			newD = bts(newD)
			if(newD != null) return newD
		}

		domain.splice(domain.indexOf(v), 1)
	}
	return null
}

function processRequiredCourses(template, course_list) 
{
	var required = template['Required']
	var requirements = template['Requirements']
	var qualifyToReq = []
	for(var i = 0; i < requirements.length; i++) 
	{
		var requirement = requirements[i]
		var reqs = requirement['Requirements']
		for(var j = 0; j < reqs.length; j++) 
		{
			qualifiedCourses = findQualifyingCourses(reqs[j]['Constraints'], course_list)
			qualifyToReq.push({'qualify': (qualifiedCourses.length == 0 ? '' : qualifiedCourses), 'req': reqs[j], 'course_list': course_list})
		}
	}

	// get rid of duplicates
	var courses = []
	for(var i = 0; i < course_list.length; i++)
	{
		if(courses.indexOf(course_list[i]) == -1) courses.push(course_list[i])
	}

	var data = {'qualifyToReq': qualifyToReq, 'courses': courses}
	ans = bts(data)	
	
	for(var i = 0; i < ans.qualifyToReq.length; i++)
	{	
		var p = ans.qualifyToReq[i];
		if(typeof p.qualify === 'string') p.req['Selected'] = p.qualify
	}
}

function fillChecklist (student_id, callback) {
	var course_list,plan_template,frontEnd_template;
	getCourseList(student_id, function(courseList){
		course_list = courseList;
		
		getCheckList('CSBHC',function(planTemplate){
			plan_template = planTemplate;

			processRequiredCourses(plan_template['Required Courses'], course_list)
			// processConstraints(plan_template['Additional Constraints'], plan_template, course_list, 1);
			// processConstraints(plan_template['Required Courses'], plan_template, course_list);
			

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
			course_grade:1,
			_id:0
		})
		.toArray(function(err,doc){
		    	if(err)throw err;
		    	
	    		doc.forEach(function(course) {
					// courseList.push({'course_code': course.subject_code + course.catalog, 'course_grade': course.course_grade});
					courseList.push(course.subject_code + course.catalog);
				});
	    		
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