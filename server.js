// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var scrapeTools = require('./scrape.js')
var checklistmodule = require('./checklistmodule.js');
var enrollmentmodule = require('./enrollmentmodule.js');
var config = require('./config');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

router.use(function(req,res,next){
	console.log("API Call");
	//some debug shit can go here
	next();
});


// ================================================
// CHECKLIST ROUTES
// ================================================



router.route('/checklist/:student_id')
	.get(function(req,res){
		checklistmodule.fillChecklist(req.params.student_id,function(filledChecklist){
			res.json(filledChecklist);
		});
		//console.log("outside: " + tools.getCourseList(req.params.student_id));
		//var studentPlan;
	});

// ================================================
// ENROLLMENT ROUTES
// ================================================

// has no arguments, courses passed in through POST body
router.route('/enroll/shortlistGet/:student_id')///////////////////NOT DOIN RIGHT SHIT
    .get(function(req, res) {
        MongoClient.connect(config.mongo.connect, function(err, db) {
		  if(err) {
		  	return console.dir(err);
		  }
		  console.log("------------------")
		  console.log("Fetching for uw_id:"+req.params.student_id);
		  console.log("Visiting from IP:"+req.connection.remoteAddress);
		  console.log("------------------")

		  db.collection('mockdata')
		  //mongodb query
		  .find(
		  	{'uw_id':parseInt(req.params.student_id)},
		  	{_id:0}
		  ).toArray(function(err,doc){
		    	if(err)throw err;

		    	res.json(doc);
		    });
		});

        // var shortlist = req.body.course;

        // enrollmentmodule.processShortlist(shortlist, function(result){
	       // res.json(result);
        // });
    });

router.route('/enroll/shortlistAdd/:student_id/:course')
	.get(function(req, res) {
		MongoClient.connect(config.mongo.connect, function(err, db) {
			if (err) {
				return console.dir(err);
			}
			var course = req.params.course;
			var student_id = req.params.student_id;

			db.collection('mockdata').find({'uw_id':parseInt(student_id)})
			.toArray(function(err,doc){
		    	if(err)throw err;

					for (var i = 0; i < doc[0].Shortlist.length; i++) {
						if(doc[0].Shortlist[i].Course == course){

							res.json("duplicate");
							return;
						}
					}

		    	var courseList = doc[0].courses;
		    	courseList.push(course);

		    	db.collection('studentshortlist').update({'uw_id':parseInt(student_id)}, {$set:{courses:courseList}},
		    		function(err, result) {
				    if (err)throw err;

						var obj = enrollmentmodule.getCourseInfo(course, doc[0], function(classes, fulldoc){

							if(classes.length == 0){
								res.json("not offered");
								return;
							}

							var classObj = new Object();
							classObj.Course = course;
							classObj.title = classes[0].title;
							classObj.Sections = [];

							var totalCap=0;
							var curCap=0;
							for (var i = 0; i < classes.length; i++) {

								var lecObj = new Object();
								lecObj.name = classes[i].section;
								lecObj.capacity = classes[i].enrollment_total+"/"+classes[i].enrollment_capacity;
								totalCap+=classes[i].enrollment_capacity;
								curCap+=classes[i].enrollment_total;

								classObj.Sections.push(lecObj);
							}

							classObj.Capacity = curCap+"/"+totalCap;

							fulldoc.Shortlist.push(classObj);

							db.collection('mockdata').update({'uw_id':parseInt(student_id)}, {$set:{Shortlist:fulldoc.Shortlist}},
					    		function(err, result) {
							    if (err)throw err;

				    			res.json(fulldoc);

							});
						})


	    			res.json("Success");

				});
		    });
		})
	})

router.route('/enroll/mockdata')
	.get(function(req, res) {
		MongoClient.connect(config.mongo.connect, function(err, db) {
		  if(err) {
		  	return console.dir(err);
		  }


		  db.collection('mockdata')
		  //mongodb query
		  .find(
		  	{'uw_id':1009},
		  	{_id:0}
		  ).toArray(function(err,doc){
		    	if(err)throw err;

		    	res.json(doc[0]);
		    });
		});
	})

router.route('/enroll/shortlistDelete/:student_id/:course')
	.get(function(req, res) {
		MongoClient.connect(config.mongo.connect, function(err, db) {
			if (err) {
				return console.dir(err);
			}
			var course = req.params.course;
			var student_id = req.params.student_id;

			db.collection('studentshortlist').find({'uw_id':parseInt(student_id)})
			.toArray(function(err,doc){
		    	if(err)throw err;

		    	var courseList = doc[0].courses;

		    	for (var i = 0; i < courseList.length; i++) {
		    		if(courseList[i] == course){
		    			courseList.splice(i,1);
		    		}
		    	};

		    	db.collection('studentshortlist').update({'uw_id':parseInt(student_id)}, {$set:{courses:courseList}},
		    		function(err, result) {
					    if (err)throw err;

		    			res.json("Success");

					});
		    });
		})
	})
// ================================================
// SCRAPE ROUTES
// ================================================

router.route('/scrapeCs/:year/:plan')
	.get(function(req,res) {
		scrapeTools.scrapeCsChecklist(req.params.year, req.params.plan, function(template) {
			res.json(template);
		});
	});

router.route('/scrapeEng/:plan')
	.get(function(req,res) {
		scrapeTools.scrapeEngChecklist(req.params.plan, function(template) {
			res.json(template);
		})
	})

// ================================================
// TEST ROUTES
// ================================================

router.route('/test/:student_id')
	.get(function(req, res) {
		MongoClient.connect(config.mongo.connect, function(err, db) {
		  if(err) {
		  	return console.dir(err);
		  }


		  db.collection('studentsmock')
		  //mongodb query
		  .find(
		  	{'uw_id':parseInt(req.params.student_id)},
		  	{_id:0}
		  ).toArray(function(err,doc){
		    	if(err)throw err;

		    	res.json(doc[0]);
		    });
		});
	});


// router.route('/findcourse/:course')
// 	.get(function(req,res){
// 		console.log(checklistmodule.getCourseFormat(""+req.params.course));
// 		//tools.getCourseList();
// 	});

// router.route('/students/:student_id')
// 	.get(function(req,res){

// 		MongoClient.connect(config.mongo.connect, function(err, db) {
// 		  if(err) {
// 		  	return console.dir(err);
// 		  }
// 		  console.log("------------------")
// 		  console.log("Fetching for uw_id:"+req.params.student_id);
// 		  console.log("Visiting from IP:"+req.connection.remoteAddress);
// 		  console.log("------------------")

// 		  db.collection('students')
// 		  //mongodb query
// 		  .find(
// 		  	{'uw_id':parseInt(req.params.student_id)},
// 		  	{
// 		  		_id:0,
// 		  		uw_id:1,
// 		  		term_id:1,
// 		  		subject_code:1,
// 		  		catalog:1,
// 		  		attempt_class:1,
// 		  		'details.units_earned':1,
// 		  		'details.course_title':1,
// 		  		'details.earn_credit':1,
// 		  		'group_code':1
// 		  	}).toArray(function(err,doc){
// 		    	if(err)throw err;

// 		    	res.json(doc);
// 		    });
// 		});
// 	});
//
// router.route('/template/')
// 	.get(function(req,res) {
// 		console.log("getting template");

// 		MongoClient.connect(config.mongo.connect, function(err, db) {
// 		if (err) {
// 			return console.dir(err);
// 		}

// 		db.collection('template')
// 		.find({
// 			"plan": 'CSBHC'
// 		})
// 		.toArray(function(err,doc) {
// 			if (err) {
// 				throw err;
// 			}

// 			res.json(doc[0]);
// 		});
// 	});
// 		console.log("template returned");
// 	});
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(config.web.port);
console.log('happens on ' + config.web.port);

//db.students.findOne({uw_id:1009,subject_code:'CS',catalog: /^3.*/,'details.units_attempted':{$ne: 0}})

//some mongo import commands
//mongoimport -h ds041432.mongolab.com:41432 -d cs446 -c students -u michael -p admin --file <input file> --jsonArray
