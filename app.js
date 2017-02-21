var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoStore = require('connect-mongo')(session);
var crypto = require('crypto');
var app = express();

//var databaseUrl = "147.110.192.71,147.110.192.100,147.110.186.221/sebentiledb?slaveOk=true";
var databaseUrl = "127.0.0.1/sebentiledb";
var collections = ["Objectives","EvalPeriods","ObjPeriods", "financialYears", "strategy", "Division", 
    "Transaction", "Document", "Employees", "Scorecard", "structure", "perspective", "sessions", "tracking", "empcloseperiods"];
var db = require("mongojs").connect(databaseUrl, collections);

var ObjectId = db.ObjectId;
var PORT = process.env.PORT || 3008;
// encrypt user password function
function hash(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());

app.use(session({
    secret: 'pmsfinalsecrete',
    key: 'session',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 100,
    resave: false,
    saveUninitialized: false,
    store: new mongoStore({
        url: 'mongodb://127.0.0.1/sebentiledb'
    })
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/changePasswd', function(req, res) {
    var msg = {
        error: false
    };
    res.render('changePasswd', msg);
})

function validatePasswd(pass) {
    if (pass.length >= 8) {
        var regex = new RegExp("[A-Z]+"); // Check for uppercase first   
        if(regex.test(pass) == true) {
            regex = new RegExp("[0-9]+"); // Now we check for numbers   
            if(regex.test(pass) == true) {
                regex = new RegExp("[a-z]+"); // checking now for lowercase
                if(regex.test(pass) == true) {
                    return true;   
                } else return false;
            } else return false;
        } else return false;
    } else return false;
}

app.post('/changePasswd', function(req, res) {
    var oldPass = req.body.oldpassword;
    var newPass = req.body.newpassword;
    var newPassR = req.body.newpasswordr;
    var username = req.session.loggdUser.userName;
    var oldPassDb = req.session.loggdUser.userPass;

    if ((oldPass == '') || (newPass == '') || (newPassR = '')) {
        res.render('changePasswd', {
            error: 'Please fill in all fields'
        });
    } else if (oldPass == oldPassDb) {
        res.render('changePasswd', {
            error: 'Incorrect Old Password'
        });
    } else if (newPass == newPassR) {
        res.render('changePasswd', {
            error: 'Entered new passwords do not match'
        });
    } else if (validatePasswd(newPass) == false) {
        res.render('changePasswd', {
            error: 'Invalid Password'
        });
    } else {
        db.Employees.update({userName:username},{$set:{password:newPass, passwdstate:"ok"}}, function(err, data) {
            if (err) {
                console.log("There is an error");
            } else {
                var msg = {
                    error: false
                };
                res.render('login', msg);
            }
        })
    }
})

app.post('/changePasswdInside', function(req, res) {
    var oldPass = req.body.current;
    var newPass = req.body.newp;
    var newPassR = req.body.newpr;
    var empId = req.session.loggdUser.objId;
})

app.get('/login', function(req, res) {
    var msg = {
        error: false
    };

    if (req.session.loggdUser) {
        res.render('index');
    } else {
        res.render('login', msg);
    }
})

app.get('/', function(req, res) {
    if (!req.session.loggdUser) {
        res.redirect('/login');
    } else {
        res.render('index');
    }
})

app.post('/login', function(req, res) {
    var user = {
        userName: req.body.username,
        password: req.body.password,
    };

    if (req.body.username == '' || req.body.password == '') {
        var msg = {
            error: 'Please fill in all fields'
        };
        res.render('login', msg);
    } else {
        var formRoles = [];
        var currRoles = [];

        db.Employees.findOne(user, function(err, data) {
            if (data) {
                if (data.passwdstate == "createNew") {
                    req.session.loggdUser = {
                        userName: data.userName,
                        userPass: data.userPass,
                        empName: data.empName,
                        PFNum: data.PFNum,
                        dbRoles: data.roles,
                        currentRoles: currRoles,
                        empSub: data.empSub,
                        objId:data._id
                    };
                    res.redirect('/changePasswd');
                } else {

                    if (req.body.empRole == 'on') {
                        formRoles.push('employee');
                    }
                    if (req.body.supervisorRole == 'on') {
                        formRoles.push('supervisor');
                    }
                    if (req.body.HRRole == 'on') {
                        formRoles.push('HR');
                    }

                    if (formRoles.length == 0) {
                        res.render('login', {
                            error: 'Choose atleast one role!'
                        });
                    } else if ((formRoles.indexOf('employee') !== -1) && (data.roles.indexOf('employee') == -1)) {
                        res.render('login', {
                            error: 'You do not have access to emp role'
                        });
                    } else if ((formRoles.indexOf('supervisor') !== -1) && (data.roles.indexOf('supervisor') == -1)) {
                        res.render('login', {
                            error: 'You do not have access to sup role'
                        });
                    } else if ((formRoles.indexOf('HR') !== -1) && (data.roles.indexOf('HR') == -1)) {
                        res.render('login', {
                            error: 'You do not have access to HR role'
                        });
                    } else {
                        // create an array of roles that the user has choosen
                        if ((formRoles.indexOf('employee') !== -1) && (data.roles.indexOf('employee') !== -1)) {
                            currRoles.push('employee');
                        }
                        if ((formRoles.indexOf('supervisor') !== -1) && (data.roles.indexOf('supervisor') !== -1)) {
                            currRoles.push('supervisor');
                        }
                        if ((formRoles.indexOf('HR') !== -1) && (data.roles.indexOf('HR') !== -1)) {
                            currRoles.push('HR');
                        }

                        req.session.loggdUser = {
                            userName: data.userName,
                            empName: data.empName,
                            PFNum: data.PFNum,
                            dbRoles: data.roles,
                            currentRoles: currRoles,
                            empSub: data.empSub,
                            objId:data._id
                        };

                        res.redirect('/');
                    }
                }
            } else if (err) {
                console.log(err);
            } else {
                var msg = {
                    error: 'Incorrect credentials, login again'
                };
                res.render('login', msg);
            }
        })
    }
})

app.get('*', function(req, res) {
    if (!req.session.loggdUser) {
        res.redirect('/login');
    } else {
        res.redirect('/');
    }
})

app.post('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/login');
})

/*Employee Module Routes*/

app.post("/getToApproveObjs", function(req, res) {
    var id = req.body.empId;
    db.Objectives.find({status: "sent_for_approval", owner:id}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getAllObjectives", function(req, res) {
    db.Objectives.find({
        status: "unactioned"
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getInitCompany", function(req, res) {
    db.structure.findOne({
        parentObjid: "0"
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/modifyInitCompany", function(req, res) {
    var obj = req.body;
    obj['_id'] = ObjectId(obj._id);

    db.structure.save(obj, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.send("Success!");
        }
    });
})

app.post("/getAllPerspectives", function(req, res) {
    db.perspective.find({}, {
        perspName: 1,
        _id: 0
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getAllObjPeriods", function(req, res) {
    db.ObjPeriods.find({"status": "open"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllObjPeriods", function(req, res) {
    db.ObjPeriods.find(function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCGoals", function(req, res) {
    db.strategy.find({type:"goal"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCVisions", function(req, res) {
    db.strategy.find({type:"vision"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCMissions", function(req, res) {
    db.strategy.find({type:"mission"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCValues", function(req, res) {
    db.strategy.find({type:"value"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCObjectives", function(req, res) {
    db.strategy.find({type:"objective"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCVisions", function(req, res) {
    db.strategy.find({type:"vision"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCMissions", function(req, res) {
    db.strategy.find({type:"mission"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCValues", function(req, res) {
    db.strategy.find({type:"value"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/fetchAllCObjectives", function(req, res) {
    db.strategy.find({type:"objective"}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getAllUnactionedObjs", function(req, res) {
    var ID = req.session.loggdUser.objId;
    var period = req.body.period;
    db.Objectives.find({status: "unactioned",owner:ID, objPeriod:period}, function(err, docs) {
        if (err) {
            res.send("Error : "+err);
        } else {
            res.json(docs);
        }
    });
})

app.post("/closeObjPeriod", function(req, res) {

    var ID = req.session.loggdUser.objId;
    var period = req.body.period;
    var closeitem = {"period":period, "employee":ID, "type":"closeobjperiod"};

    db.empcloseperiods.insert(closeitem, function(err, docs) {
        if (err) {
            res.send("Error : "+err);
        } else {
            res.json("Objective period closed");
        }
    });
})

app.post("/getAllUnapprovedObjectives", function(req, res) {
    var ID = req.session.loggdUser.objId;
    db.Objectives.find({
        status: "rejected",owner:ID
    }, function(err, docs) {
        if (err) {
            res.send("Error : "+err);
        } else {
            res.json(docs);
        }
    });
})

app.post("/getEditObjective", function(req, res) {
    var id = req.body.objectiveId;
    db.Objectives.findOne({
        _id: ObjectId(id)
    }, function(err, doc) {
        if (err) {
            res.send("Error : "+err);
        } else {
            res.json(doc);
        }
    });
})

app.post("/getAllStateObjectives", function(req, res) {
    var ID = req.session.loggdUser.objId;
    db.Objectives.find({owner:ID, status:"sent_for_approval"}, function(err, doc) {
        if (err) {
            res.send("Error : "+err);
        } else {
            res.json(doc);
        }
    });
})

app.post("/editObjective", function(req, res) {
    var obj = req.body;
    obj['status'] = 'sent_for_approval';
    obj['_id'] = ObjectId(obj._id);
    db.Objectives.save(obj, function(err, doc) {
        if (err) {
            res.send("Error : "+err);
        } else {
            res.send("Objective Successfuly Modified");
        }
    });
})

app.post("/removeRejectedObj", function(req, res) {
    var id = req.body.id;
    db.Objectives.remove({
        _id: ObjectId(id)
    }, function(err, doc) {
        if (err) {
            console.log("There is an error");
        } else {
            res.send('Done');
        }
    });
})

app.post("/getAllApprovedObjectives", function(req, res) {
    var ID = req.session.loggdUser.objId;
    db.Objectives.find({
        status: "approved", owner:ID
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getAllSupApprObj", function(req, res) {
    var ID = req.session.loggdUser.empSub;
    db.Objectives.find({
        status: "approved", owner:ID
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getSpecificApprovedObjs", function(req, res) {
    var ID = req.session.loggdUser.objId;
    var period = req.body.period;

    db.Objectives.find({
        status: "approved", owner:ID, objPeriod:period
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getAllEvalObjectives", function(req, res) {
    var ID = req.session.loggdUser.objId;
    db.Objectives.find({status:"approved",owner:ID,ratingStatus:{$exists:false}}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getPeriodicEvalObjs", function(req, res) {
    var ID = req.session.loggdUser.objId;
    var period = req.body.period;
    
    db.Objectives.find({status:"approved",owner:ID, objPeriod:period, ratingStatus:{$exists:false}}, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getSentForSupEval", function(req, res) {

    db.Objectives.find({
        ratingStatus: "sentForSupRating"
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/supervisorEvaluation", function (req, res) {
    var objectives = req.body;
    var length = objectives.length;

    // loop through objectives from controller and change their status to sent for approval
    for (var i = 0; i < length; i++) {
        var obj = objectives[i];
        obj['ratingStatus'] = 'evaluated';
        obj['score'] = (Number(obj['detailedWeighting'])/100)*Number(obj['supRating']);

        obj['_id'] = ObjectId(obj._id);

        db.Objectives.save(obj, function (err, doc) {
            if (err) {
                res.json(err);
            }
        });
    };

    res.json("Employee successfully evaluated");
})

app.post("/getAllEmpBsc", function(req, res) {
    var ID = req.session.loggdUser.objId;
    db.Objectives.find({
        $and: [{
            status: "approved",owner:ID
        }, {
            ratingStatus: {
                $exists: true
            }
        }, {
            ratingStatus: "evaluated"
        }]
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getPeriodicBscObjs", function(req, res) {
    var ID = req.session.loggdUser.objId;
    var period = req.body.period;
    db.Objectives.find({
        $and: [{
            status: "approved",owner:ID, objPeriod:period
        }, {
            ratingStatus: {
                $exists: true
            }
        }, {
            ratingStatus: "evaluated"
        }]
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getAllSupBsc", function(req, res) {
    var ID = req.body.empId;
    db.Objectives.find({
        $and: [{
            status: "approved",owner:ID
        }, {
            ratingStatus: {
                $exists: true
            }
        }, {
            ratingStatus: "evaluated"
        }]
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getPendingObjectives", function(req, res) {
    var ID = req.session.loggdUser.objId;
    db.Objectives.find({
        status: "sent_for_approval",owner:ID
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getApprovedObjectives", function(req, res) {
    var ID = req.session.loggdUser.objId;
    db.Objectives.find({
        status: "approved",owner:ID
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/getKPAs", function(req, res) {
    db.Objectives.find({
        status: "approved"
    }, function(err, data) {
        if (err || !data) {
        } else {
            res.send(data);

        }
    });
})

app.post("/getEvalKPAs", function(req, res) {
    db.Objectives.find({
        status: "evaluatedByEmp"
    }, function(err, data) {
        if (err || !data) {
            res.send("No Evaluated KPAs found");
        } else {
            res.send(data);
        }
    });
})

app.put('/completeSelfEval/', function(req, res) {
    var kpa = req.body;
    var id = String(kpa.id);
    var rating = Number(kpa.rating);
    db.Objectives.findAndModify({
        query: {
            _id: ObjectId(id)
        },
        update: {
            $set: {
                status: kpa.status,
                empComment: kpa.empComment,
                rating: rating,
                weightedRating: kpa.weightedRating,
                score: kpa.score
            }
        },
        new: true
    }, function(err, data) {
        res.send("Evaluationn completed for current KPA");
    });

})

app.post('/file-upload/', function(req, res, next) {

    var filename = req.files.file.name;
    var tmpFilepath = "./upload/" + guid();
    fs.rename(req.files.file.path, tmpFilepath);
    fs.createReadStream(tmpFilepath)
        .on('end', function() {
            console.log("file Saved");
        })
        .on('error', function() {
            console.log("error encountered");
            // res.send('ERR');
        })
        // and pipe it to gfs
        .pipe(writestream);
    writestream.on('close', function(file) {
        fs.unlink(tmpFilepath);

    });
})

app.post("/getUnapprovedObjectives", function(req, res) {
    db.Objectives.find({
        status: "approved"
    }, function(err, docs) {
        if (err) {
            console.log("There is an error");
        } else {
            res.json(docs);
        }
    });
})

app.post("/showAllDivisions", function(req, res) {
    db.Division.find(function(err, doc) {
        if (err || !doc) {
            res.send("No divisions found");
        } else {
            res.json(doc);
        }
    });
})

app.post("/getSecEmployees", function(req, res) {
    var div = req.body.divName;
    db.Division.find({
        DivName: div
    }, function(err, doc) {
        if (err || !doc) {
            res.send("No Employees found");
        } else {
            res.send(doc);
        }
    });
})

app.post("/getLoggedInEmp", function(req, res) {
    res.send(req.session.loggdUser);
})

app.post("/getEmpObjectives", function(req, res) {
    var pfnum = Number(req.body.pfno);
    db.Objectives.find({
        PFNum: pfnum
    }, function(err, doc) {
        if (err || !doc) {
            res.send("No objectives found");
        } else {
            res.send(doc);
        }
    });
})

app.post("/createEmpObjective", function(req, res) {

    var empObjective = req.body;
    var matrixType = req.body.metrixType;

    empObjective['owner'] = req.session.loggdUser.objId;
    empObjective['status'] = 'unactioned';
    empObjective['empComment'] = '';
    empObjective['supComment'] = '';
    empObjective['supRating'] = 0;
    empObjective['empRating'] = 0;
    empObjective['score'] = 0;
    empObjective['creationDate'] = Date();

    if (matrixType == "time") {
        empObjective['metricOneDef'] = {
            value: 1,
            from: empObjective.metricOneFrom,
            To: empObjective.metricOneTo
        };
        empObjective['metricTwoDef'] = {
            value: 2,
            from: empObjective.metricTwoFrom,
            To: empObjective.metricTwoTo
        };
        empObjective['metricThreeDef'] = {
            value: 3,
            from: empObjective.metricThreeFrom,
            To: empObjective.metricThreeTo
        };
        empObjective['metricFourDef'] = {
            value: 4,
            from: empObjective.metricFourFrom,
            To: empObjective.metricFourTo
        };
        empObjective['metricFiveDef'] = {
            value: 5,
            from: empObjective.metricFiveFrom,
            To: empObjective.metricFiveTo
        };

        delete empObjective.metricOneFrom;
        delete empObjective.metricOneTo;
        delete empObjective.metricTwoFrom;
        delete empObjective.metricTwoTo;
        delete empObjective.metricThreeFrom;
        delete empObjective.metricThreeTo;
        delete empObjective.metricFourFrom;
        delete empObjective.metricFourTo;
        delete empObjective.metricFiveFrom;
        delete empObjective.metricFiveTo;

    } else {
        empObjective['metricOneDef'] = {
            label: empObjective.metricOneDef,
            value: 1
        };
        empObjective['metricTwoDef'] = {
            label: empObjective.metricTwoDef,
            value: 2
        };
        empObjective['metricThreeDef'] = {
            label: empObjective.metricThreeDef,
            value: 3
        };
        empObjective['metricFourDef'] = {
            label: empObjective.metricFourDef,
            value: 4
        };
        empObjective['metricFiveDef'] = {
            label: empObjective.metricFiveDef,
            value: 5
        };
    }

    db.Objectives.insert(empObjective, function(err, doc) {
        if (err){
            res.send("Error : "+err);
        } else {
            res.send("Objective Successfuly created");
        }
    })
})

app.post("/deleteObjective", function(req, res) {
    var id = req.body.objectiveId;
    db.Objectives.remove({_id:ObjectId(id)}, function(err, docs) {
        if (err) {
            res.send("Error : "+err);
        } else {
            res.json(docs);
        }
    });
})

app.post("/submitEmpObjectives", function(req, res) {
    var objectives = req.body;
    var length = objectives.length;
    var objId = '';

    // loop through objectives from controller and change their status to sent for approval
    for (var i = 0; i < length; i++) {
        objId = objectives[i]._id;

        db.Objectives.update({_id:ObjectId(objId)}, {$set: {status: "sent_for_approval"}}, {multi: false}, function(err, doc) {
            if (err) {
                res.send("Error : "+err);
            }
        });
    };
    res.json("Objectives Successfuly submitted");
})

app.post("/empSelfEvaluate", function(req, res) {
    var objectives = req.body;
    var length = objectives.length;

    // loop through objectives from controller and change their status to sent for approval
    for (var i = 0; i < length; i++) {
        var obj = objectives[i];
        obj['ratingStatus'] = 'sentForSupRating';
        obj['score'] = Number(obj['empRating']) * Number(obj['detailedWeighting']) / 100;
        obj['_id'] = ObjectId(obj._id);

        db.Objectives.save(obj, function(err, doc) {
            if (err) {
                res.send("Error : "+err);
            }
        });
    };

    res.json("Employing self evaluation successfully sent");
})

app.post('/getKPA/:id', function(req, res) {
    var id = String(req.params.id);
    db.Objectives.findOne({
        _id: db.ObjectId(req.params.id)
    }, function(err, data) {
        if (err || !data) {
            res.send("Error : "+err);
        } else {
            res.send(data);
        }
    });
})


/*HR Module Routes*/

app.post('/initializeComp', function(req, res) {
    query = req.body;

    db.structure.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send('Structure successfully added');
        }
    });

})

app.post('/getAllStructComps', function(req, res) {
    query = req.body;

    db.structure.find(function(err, data) {
        if (err) res.send('Error!');
        else {
            res.send(data);
        }
    });
})

app.post('/addStructElement', function(req, res) {
    query = req.body;

    db.structure.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send('Structure successfully added');
        }
    });
})

app.post('/saveNewPerspective', function(req, res) {
    query = req.body;

    db.perspective.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            db.perspective.find(function(err1, resp) {
                if (err1) res.send('Error!');
                res.send(resp);
            });

        }
    });
})

app.post('/createCompanyVision', function(req, res) {
    query = req.body;
    query['type'] = 'vision';

    db.strategy.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send("Company Vision successfully created")
        }
    });
})

app.post('/createCompanyMission', function(req, res) {
    query = req.body;
    query['type'] = 'mission';

    db.strategy.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send("Company Mission successfully created")
        }
    });
})

app.post('/createCompanyValue', function(req, res) {
    query = req.body;
    query['type'] = 'value';

    db.strategy.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send("Company Value successfully created")
        }
    });
})

app.post('/createCompanyGoal', function(req, res) {
    query = req.body;
    query['type'] = 'goal';

    db.strategy.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send("Company Goal successfully created")
        }
    });
})

app.post('/createCompanyObjective', function(req, res) {
    query = req.body;
    query['type'] = 'objective';

    db.strategy.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send("Company Objective successfully created")
        }
    });
})

app.post('/createEvalPeriod', function(req, res) {
    query = req.body;

    query['status'] = 'open';

    db.EvalPeriods.insert(query, function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send("Evaluation period successfully saved")
        }
    });
})

app.post('/createObjPeriod', function(req, res) {
    query = req.body;
    query['status'] = 'open';

    db.ObjPeriods.insert(query, function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send("Objectives period successfully saved")
        }
    });
})

app.post('/createFinYear', function(req, res) {
    query = req.body;
    query['status'] = 'open';

    db.financialYears.insert(query, function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send("Financial Year successfully saved")
        }
    });
})

app.post('/saveNewEmployee', function(req, res) {
    query = req.body;
    var today = Date();
    query['password'] = query.password;
    query['passwdcreatedon'] = today;
    query['passwdstate'] = "createNew";

    db.Employees.insert(query, function(err, saved) {
        if (err) res.send('Error!');
        else {
            db.Employees.find(function(err1, resp) {
                if (err1) res.send('Error!');
                res.send(resp);
            });

        }
    });

})

app.post('/getPerspectives', function(req, res) {
    db.perspective.find(function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp);
        }
    });
});

app.post('/getAllEvalPeriods', function(req, res) {
    db.EvalPeriods.find(function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp);
        }
    });
});

app.post('/getAllFinYears', function(req, res) {
    db.financialYears.find(function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp);
        }
    });
});

app.post('/getAllCEvalPeriods', function(req, res) {
    db.EvalPeriods.find({status:"open"},function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp);
        }
    });
});

app.post('/getAllCObjPeriods', function(req, res) {
    db.ObjPeriods.find({status:"open"},function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp);
        }
    });
});

app.post('/getPositions', function(req, res) {
    db.structure.find({
        "structType": "position"
    }, function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp);
        }
    });
});

app.post('/getCompPrefix', function(req, res) {
    db.structure.find({
        "structType": "company"
    }, function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp[0]);
        }
    });
});

app.post('/getEmployees', function(req, res) {
    db.Employees.find(function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp);
        }
    });
});

app.post('/getAllPersps', function(req, res) {
    db.perspective.find(function(err, resp) {
        if (err) res.send('Error!');
        else {
            res.send(resp);
        }
    });
});

app.post('/getStructure', function(req, res) {
    
    var depth = 0;
    var allStructure = [];

    db.structure.find({},function(err, data) {
        if (err) {
            res.send('Error!');
        } else {
            allStructure = toTree(data);
            res.send(allStructure);
        }
    });

    function toTree(data) {
       var childrenById = {}; 
       var allNodes = {};
       var i, row;

       // first pass: build child arrays and initial node array
       for (i=0; i<data.length; i++) {
           row = data[i];
           allNodes[row._id] = {text: row.name, icon: row.icon, nodes: []};
           if (row.parentObjid == "0") {
              root = row._id; 
           } else if (childrenById[row.parentObjid] === undefined) {
              childrenById[row.parentObjid] = [row._id];
           } else {
              childrenById[row.parentObjid].push(row._id);
           }
       }
       
       // second pass: build tree, using the awesome power of recursion!
       function expand(id) {
           if (childrenById[id] !== undefined) {
               for (var i=0; i < childrenById[id].length; i ++) {
                   var childId = childrenById[id][i];
                   allNodes[id].nodes.push(expand(childId));
               }
           }
           return allNodes[id];
       }
       return expand(root);
    }

});

app.post('/dtEditStruct', function(req, res) {
    myVals = req.body;
    myVals._id = ObjectId(myVals._id);

    db.structure.save(myVals, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send(saved);
        }
    });
});

app.post('/dtEditEmp', function(req, res) {
    myVals = req.body;
    myVals._id = ObjectId(myVals._id);

    db.Employees.save(myVals, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send(saved);
        }

    });
});

app.post('/dtEditPersp', function(req, res) {
    myVals = req.body;
    myVals._id = ObjectId(myVals._id);
    db.perspective.save(myVals, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send(saved);
        }
    });
});

app.post('/dtEditCGoal', function(req, res) {
    myVals = req.body;
    myVals._id = ObjectId(myVals._id);
    db.strategy.save(myVals, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send(saved);
        }
    });
});

app.post('/dtEditCVision', function(req, res) {
    myVals = req.body;
    myVals._id = ObjectId(myVals._id);
    db.strategy.save(myVals, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send(saved);
        }
    });
});

app.post('/dtEditCMission', function(req, res) {
    myVals = req.body;
    myVals._id = ObjectId(myVals._id);
    db.strategy.save(myVals, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send(saved);
        }
    });
});

app.post('/dtEditCValue', function(req, res) {
    myVals = req.body;
    myVals._id = ObjectId(myVals._id);
    db.strategy.save(myVals, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send(saved);
        }
    });
});

app.post('/dtEditCObjective', function(req, res) {
    myVals = req.body;
    myVals._id = ObjectId(myVals._id);
    db.strategy.save(myVals, function(err, saved) {
        if (err) res.send('Error!');
        else {
            res.send(saved);
        }
    });
});

app.delete('/dtRemoveStruct/:id', function(req, res) {
    myVals = req.params.id;
    myValsId = ObjectId(myVals.substring(1));

    db.structure.remove({
        "_id": myValsId
    }, function(err, removed) {
        if (err) res.send('Error!');
        else {
            res.send(removed);
        }
    });
});

app.delete('/dtRemoveEmp/:id', function(req, res) {
    myVals = req.params.id;
    myValsId = ObjectId(myVals.substring(1));

    db.Employees.remove({
        "_id": myValsId
    }, function(err, removed) {
        if (err) res.send('Error!');
        else {
            res.send(removed);
        }
    });
});

app.delete('/dtRemoveCGoal/:id', function(req, res) {
    myVals = req.params.id;
    myValsId = ObjectId(myVals.substring(1));
    db.strategy.remove({
        "_id": myValsId
    }, function(err, removed) {
        if (err) res.send('Error!');
        else {
            res.send(removed);
        }
    });
});

app.delete('/dtRemoveCVision/:id', function(req, res) {
    myVals = req.params.id;
    myValsId = ObjectId(myVals.substring(1));
    db.strategy.remove({
        "_id": myValsId
    }, function(err, removed) {
        if (err) res.send('Error!');
        else {
            res.send(removed);
        }
    });
});

app.delete('/dtRemoveCMission/:id', function(req, res) {
    myVals = req.params.id;
    myValsId = ObjectId(myVals.substring(1));
    db.strategy.remove({
        "_id": myValsId
    }, function(err, removed) {
        if (err) res.send('Error!');
        else {
            res.send(removed);
        }
    });
});

app.delete('/dtRemoveCValue/:id', function(req, res) {
    myVals = req.params.id;
    myValsId = ObjectId(myVals.substring(1));
    db.strategy.remove({
        "_id": myValsId
    }, function(err, removed) {
        if (err) res.send('Error!');
        else {
            res.send(removed);
        }
    });
});

app.delete('/dtRemoveCObjective/:id', function(req, res) {
    myVals = req.params.id;
    myValsId = ObjectId(myVals.substring(1));
    db.strategy.remove({
        "_id": myValsId
    }, function(err, removed) {
        if (err) res.send('Error!');
        else {
            res.send(removed);
        }
    });
});

app.delete('/dtRemovePersp/:id', function(req, res) {
    myVals = req.params.id;
    myValsId = ObjectId(myVals.substring(1));
    db.perspective.remove({
        "_id": myValsId
    }, function(err, removed) {
        if (err) res.send('Error!');
        else {
            res.send(removed);
        }
    });
});

app.post('/route560d000d14d04f84393069551', function(req, res) {
    query = req.body;

    db.perspective.find(function(err, data) {
        if (err) res.send('Error!');
        else {
            res.send(data)
        }
    });
})

app.post('/route560d4856d00d941c304c7254', function(req, res) {
    query = req.body;

    db.structure.find({
        "structType": "position"
    }, function(err, data) {
        if (err) res.send('Error!');
        else {
            res.send(data)
        }
    });
});

/*Supervisor Module Routes*/

app.post('/getEmpsPendingObjs', function(req, res) {
    var sup = req.session.loggdUser.objId;
    db.Employees.find({empSup:sup},function(err, cur) {
        if (err) {
            res.send("An Error Occured" + err);
        } else {
            res.json(cur);
        }
    })
});

app.post('/approveCurrObj/:id', function(req, res) {
    var ID = req.params.id;

    db.Objectives.update({
        _id:ObjectId(ID)
    }, {
        $set: {
            status: "approved",
            approvedBy: req.session.loggdUser.userName,
            timeApproved: Date()
        }
    }, {
        multi: false
    }, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    })
});

app.post('/rejectCurrentObj/:id', function(req, res) {
    var ID = req.params.id;
    var comment = req.body.comm;
    
    db.Objectives.update({
        _id:ObjectId(ID)
    }, {
        $set: {
            status: "rejected",
            approvalComment: comment,
            rejectedBy: req.session.loggdUser.userName,
            timeRejected: Date()
        }
    }, {
        multi: false
    }, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    })
});

app.post('/rejCustObj', function(req, res) {
    var ID = req.body.id;
    var comment = req.body.comm;

    db.Objectives.update({
        _id: ObjectId(ID)
    }, {
        $set: {
            status: "rejected",
            approvalComment: comment,
            rejectedBy: req.session.loggdUser.userName,
            timeRejected: Date()
        }
    }, {
        multi: false
    }, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    })
});

app.post('/rejIntObj', function(req, res) {
    var ID = req.body.id;
    var comment = req.body.comm;

    db.Objectives.update({
        _id: ObjectId(ID)
    }, {
        $set: {
            status: "rejected",
            approvalComment: comment,
            rejectedBy: req.session.loggdUser.userName,
            timeRejected: Date()
        }
    }, {
        multi: false
    }, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    })
});

app.post('/rejLearnObj', function(req, res) {
    var ID = req.body.id;
    var comment = req.body.comm;

    db.Objectives.update({
        _id: ObjectId(ID)
    }, {
        $set: {
            status: "rejected",
            approvalComment: comment,
            rejectedBy: req.session.loggdUser.userName,
            timeRejected: Date()
        }
    }, {
        multi: false
    }, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    })
});

//End Routes

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found'); 
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.listen(PORT);
console.log('server started on port %s', PORT);