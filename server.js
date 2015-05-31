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

var port = process.env.PORT || 8080;        // set our port

var mongoConnectionString='mongodb://app:app@ds041432.mongolab.com:41432/cs446';

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              

router.use(function(req,res,next){
	console.log("API Call");
	next();
});

router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
});


router.route('/students/:student_id')
	.get(function(req,res){
		console.log("in");
		MongoClient.connect(mongoConnectionString, function(err, db) {
		  if(err) { return console.dir(err); }

		  console.log("fetching for "+req.params.student_id);
		  console.log("visiting from "+req.connection.remoteAddress);

		  db.collection('students').find({'uw_id':parseInt(req.params.student_id)}).toArray(function(err,doc){
		    	if(err)throw err;
		    	res.json(doc);
		    });
		    
		      
		});
	});


app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);


///some mongo import commands

//mongoimport -h ds041432.mongolab.com:41432 -d cs446 -c students -u michael -p admin --file <input file> --jsonArray
