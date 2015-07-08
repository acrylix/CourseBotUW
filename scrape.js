var request = require("request");
var cheerio = require("cheerio");

module.exports = {
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


                template["Required Courses"]["Requirements"].push({
                    "Name": getDomText(section),
                    "Required": section.find('li').length,
                    "Requirements": []
                });

                section.find('li').map(function(j, constraint) {
                    constraint = $(constraint);

                    template["Required Courses"]["Requirements"][i]["Requirements"].push({
                        "Name": getDomText(constraint),
                        "Constraints": [],
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

                            var constraintObj = {
                                "Name": getDomText(constraint),
                                "Constraints": [],
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

                                            var constraintObj = {
                                                "Name": getDomText(constraint),
                                                "Constraints": [],
                                                "Selected": null
                                            } 

                                            template["Additional Constraints"]["Requirements"][i]["Requirements"][j]["Requirements"][k]["Requirements"].push(constraintObj);             
                                        });
                                    });
                                    break;
                                case 1:
                                    var object = {
                                        "Name": sectionName,
                                        "Constraints": [],
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
                var itemName = getDomText(constraint);

                    var object = {
                        "Name": itemName,
                        "Constraints": [],
                        "Selected": null
                    }

                    template["Additional Constraints"]["Requirements"].push(object);
            });

            console.log(JSON.stringify(template));
        }
    });
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


