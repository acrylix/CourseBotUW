var request = require("request");
var cheerio = require("cheerio");

module.exports = {
    scrapeChecklist: scrapeCsChecklist,
}


var nameToConstraintMap = {
    "4.0 Elective units": "ELECTIVE",
    "5.0 Non-math units": "NONMATH",
    "One of CS 343, 349, 442, 444, 445, 446, 447, 450, 452, 454, 456, 457, 458": ["CS343","CS349","CS442","CS444","CS445","CS446","CS447","CS450","CS452","CS454","CS456","CS457","CS458"],
    "One of CS 348, 448, 449, 473, 476, 482, 484, 485, 486, 488": ["CS348","CS448","CS449","CS473","CS476","CS482","CS484","CS485","CS486","CS488"],
    "One of CS 360, 365, 370, 371, 462, 466, 467, 475, 487": ["CS360","CS365","CS370","CS371","CS462","CS466","CS467","CS475","CS487"],
    "1.0 units from the humanities": ["HUMANITIES", "HUMANITIES"],
    "1.0 units from the social sciences": ["SOCIALSCIENCE", "SOCIALSCIENCE"],
    "0.5 units from the pure sciences": ["PURESCIENCE"],
    "0.5 units from the pure and applied sciences": ["APPLIEDSCIENCE"],
    "1.5 units in the same subject area with at least 0.5 units at the  3rd year level or higher": ["DEPTH1"],
    "1.5 units with the same subject forming a prerequisite chain of length three": ["DEPTH2"],
    "Seven (regular) or eight (co-op) terms enrolled in at least three courses totaling 1.5 units": ["TERMSENROLLED"],
    "No more than 2.0 units of failed courses": ["FAILEDCOURSES"],
    "No more than 5.0 units of unusable course attempts (failures, withdrawals, and repeats of passed courses)": ["UNUSABLECOURSES"],
    "CS major average of 60% or higher": ["CSMAJORAVERAGE"],
    "Cumulative average of 60% or higher Co-op requirements met, if applicable, including a minimum of five PD courses.": ["CUMULATIVEAVERAGE_PD"]
}



function mapCsConstraints(constraintName) {
    return nameToConstraintMap[constraintName];
}

function parseCsConstraints(constraintName) {
    var constraintList = [];
    var codeList = [];
    var planList = [];
    var split = constraintName.split(' ');

    for (var i in split) {
        var substr = split[i];
        // ignore nonnumeric substrings like course plan ("CS", "ENG", etc)
        if (isNumeric(substr[0])) {
            
            if (substr.indexOf('[') > -1) {
                var start = substr.indexOf('[');
                var end = substr.indexOf(']');
                if (start < end) {
                    for (var i=start+1; i<end; i++) {
                        var temp = substr.substring(0, start) + substr[i] + substr.substring(end+1);
                        codeList.push(temp);
                    }
                }

            } else if (substr.indexOf('-') > -1) {
                substr = substr.replace(';', '');

                codeList.push(substr);
            } else {
                codeList.push(substr);
            }
        } else {
            if (substr !== "or") {
                planList.push(substr);
            }
        }
    }

    var prevPlan = planList[0];
    for (var i in codeList) {
        if (i >= planList.length) {
            constraintList.push(prevPlan+codeList[i]);
        } else {
           constraintList.push(planList[i]+codeList[i]);
        }
    }

    return constraintList;
}


function scrapeCsChecklist(year, plan, callback) {
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

                var sectionName = getDomText(section);
                template["Required Courses"]["Requirements"].push({
                    "Name": sectionName,
                    "Required": section.find('li').length,
                    "Requirements": []
                });

                section.find('li').map(function(j, constraint) {
                    constraint = $(constraint);
                    var constraintName = getDomText(constraint);
                    template["Required Courses"]["Requirements"][i]["Requirements"].push({
                        "Name": (i === 0 || i === 2) ? constraintName : j+"",
                        "Constraints": (i === 0 || i === 2) ? parseCsConstraints(constraintName) : mapCsConstraints(sectionName),
                        "Selected": null
                    });

                });
            });

            // ======================
            // ADDITIONAL CONSTRAINTS
            // ======================
            template["Additional Constraints"] = {
                "Required" : 8,
                "Requirements": []
            };

            // there are 8 additional requirements, for some reason
            // the checklist decided to split them into 2 <ul>s. 
            // Parse them separately

            // parse first <ul>
            var firstUl = $('.constraints').find('ul').first();

            $(firstUl).children().map(function(i, item) {
                item = $(item);

                var itemName = getDomText(item);
                switch (i) {
                    case 0:
                        var object = {
                            "Name": itemName,
                            "Required": 2,
                            "Requirements": []
                        }

                        template["Additional Constraints"]["Requirements"].push(object);

                        // one level lower
                        item.find('li').map(function(j, constraint) {
                            constraint = $(constraint);
                            var constraintName = getDomText(constraint);
                            var constraintObj = {
                                "Name": constraintName,
                                "Constraints": mapCsConstraints(constraintName),
                                "Selected": null
                            }

                            template["Additional Constraints"]["Requirements"][i]["Requirements"].push(constraintObj);
                        });

                        
                        break;
                    case 1:
                        var object = {
                            "Name": itemName,
                            "Required": 1,
                            "Requirements": []
                        }
                        template["Additional Constraints"]["Requirements"].push(object);

                        // one level lower
                        item.children().first().children().map(function(j, section) {
                            section = $(section);
                            var sectionName = getDomText(section);

                            switch (j) {
                                case 0:
                                    var object = {
                                        "Name": "Elective breadth and depth requirement:",
                                        "Required": section.children().length,
                                        "Requirements": []
                                    };

                                    template["Additional Constraints"]["Requirements"][i]["Requirements"].push(object);

                                    // second level lower
                                    section.children().last().children().map(function(k, subsection) {
                                        subsection = $(subsection);

                                        var subsectionName = getDomText(subsection);
                                        switch(k) {
                                            case 0:
                                                var object = {
                                                    "Name": subsectionName,
                                                    "Required": subsection.find('li').length,
                                                    "Requirements": []
                                                }

                                                template["Additional Constraints"]["Requirements"][i]["Requirements"][j]["Requirements"].push(object);

                                                break;
                                            case 1:
                                                var object = {
                                                    "Name": subsectionName,
                                                    "Required": 1,
                                                    "Requirements": []
                                                }

                                                template["Additional Constraints"]["Requirements"][i]["Requirements"][j]["Requirements"].push(object);
                                                break;
                                            default:
                                                break;
                                        }

                                        subsection.find('li').map(function(l, constraint) {
                                            constraint = $(constraint);
                                            var constraintName = getDomText(constraint);

                                            var constraintObj = {
                                                "Name": constraintName,
                                                "Constraints": mapCsConstraints(constraintName),
                                                "Selected": null
                                            } 

                                            template["Additional Constraints"]["Requirements"][i]["Requirements"][j]["Requirements"][k]["Requirements"].push(constraintObj);             
                                        });
                                    });
                                    break;
                                case 1:
                                    var object = {
                                        "Name": sectionName,
                                        "Constraints": ["ALTERNATE"],
                                        "Selected": null
                                    };
                                    
                                    template["Additional Constraints"]["Requirements"][i]["Requirements"].push(object);
                                    break;
                                default:
                                    break;
                            }
                        });
                        break;
                    default:
                        break;
                }
            });

            // parse second <ul>
            var secondUl = $('.constraints').find('ul').last();

            $(secondUl).children().map(function(i, constraint) {
                constraint = $(constraint);
                var constraintName = getDomText(constraint);
                    console.log(constraintName);
                    var object = {
                        "Name": constraintName,
                        "Constraints": mapCsConstraints(constraintName),
                        "Selected": null
                    }

                    template["Additional Constraints"]["Requirements"].push(object);
            });

            callback(template);
            return template;
        }
    });
}

// checks if a string is a number
function isNumeric(obj) {
    return obj - parseFloat(obj) >= 0;
}

// grabs the text between the immediate HTML tags, regardless of any children
// eg. <div>test<div> ... </div></div> will only return "test", not what's in the
// child div
function getDomText(elem) {
    var text = elem.first().contents().filter(function() {
        return this.type === 'text';
    }).text().trim();

    while (text.indexOf('\t') > -1) {
        text = text.replace('\t', '');
    }

    while (text.indexOf('\n') > -1) {
         text = text.replace('\n', '');
    }

    return text;
}


