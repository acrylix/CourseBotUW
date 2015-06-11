// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8081;        // set our port

var mongoConnectionString='mongodb://app:app@ds041432.mongolab.com:41432/cs446';


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

		MongoClient.connect(mongoConnectionString, function(err, db) {
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
		console.log(getCourseFormat(""+req.params.course));
		res.json(getCourseFormat(""+req.params.course));
		getCourseList();
	});


app.use('/api', router);

function getCourseList() {
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
	})
}

function getCourseFormat(constraint){
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


// START THE SERVER
// =============================================================================
app.listen(port);
console.log('happens on ' + port);

//db.students.findOne({uw_id:1009,subject_code:'CS',catalog: /^3.*/,'details.units_attempted':{$ne: 0}})

//some mongo import commands
//mongoimport -h ds041432.mongolab.com:41432 -d cs446 -c students -u michael -p admin --file <input file> --jsonArray
