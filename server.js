// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var tools = require('./functions.js');
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

router.route('/students/:student_id')
	.get(function(req,res){

		MongoClient.connect(config.mongo.connect, function(err, db) {
		  if(err) { 
		  	return console.dir(err); 
		  }
		  console.log("------------------")
		  console.log("Fetching for uw_id:"+req.params.student_id);
		  console.log("Visiting from IP:"+req.connection.remoteAddress);
		  console.log("------------------")

		  db.collection('students')
		  //mongodb query
		  .find(
		  	{'uw_id':parseInt(req.params.student_id)},
		  	{
		  		_id:0,
		  		uw_id:1,
		  		term_id:1,
		  		subject_code:1,
		  		catalog:1,
		  		attempt_class:1,
		  		'details.units_earned':1,
		  		'details.course_title':1,
		  		'details.earn_credit':1,
		  		'group_code':1
		  	}).toArray(function(err,doc){
		    	if(err)throw err;

		    	res.json(doc);
		    });  
		});
	});

router.route('/findcourse/:course')
	.get(function(req,res){
		console.log(tools.getCourseFormat(""+req.params.course));
		//tools.getCourseList();
	});

router.route('/test/:student_id')
	.get(function(req,res){
		tools.fillChecklist(req.params.student_id,function(filledChecklist){
			console.log('done');
		});
		//console.log("outside: " + tools.getCourseList(req.params.student_id));
		//var studentPlan;
	});

router.route('/template/')
	.get(function(req,res) {
		console.log("getting template");

		MongoClient.connect(config.mongo.connect, function(err, db) {
		if (err) {
			return console.dir(err);
		}

		db.collection('template')
		.find({
			"plan": 'CSBHC'
		})
		.toArray(function(err,doc) {
			if (err) {
				throw err;
			}

			res.json(doc[0]);
		});
	});
		console.log("template returned");
	});

app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(config.web.port);
console.log('happens on ' + config.web.port);

//db.students.findOne({uw_id:1009,subject_code:'CS',catalog: /^3.*/,'details.units_attempted':{$ne: 0}})

//some mongo import commands
//mongoimport -h ds041432.mongolab.com:41432 -d cs446 -c students -u michael -p admin --file <input file> --jsonArray
