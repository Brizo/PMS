var bsc = angular.module('BSCIMS', ["chart.js", "ultimateDataTableServices", "720kb.datepicker"]);

bsc.service('allObjectives', ['$http', function($http) {
    this.getObjectives = function() {
        return $http.post("/getAllObjectives");
    }
}])

.service('pendingObjectives', ['$http', function($http) {
    this.getPending = function() {
        return $http.post('/getPendingObjectives');
    }
}])

.service('approvedObjectives', ['$http', function($http) {
    this.getApproved = function() {
        return $http.post('/getApprovedObjectives');
    }
}])

.service('unApprovedObjectives', ['$http', function($http) {
    this.getApproved = function() {
        return $http.post('/getUnapprovedObjectives');
    }
}])

.service('manageEmployeeData', ['$http', '$q', function($http, $q) {
    this.insertEmp = function(emp) {
        return $http.post('/addEmp', emp);
    }

    this.authenticate = function(loginEmp) {
        return $http.post('empAuthenticate', loginEmp);
    }

    this.getEmps = function() {
        var deferred = $q.defer();
        $http.post('/showAllEmps').success(function(res) {
            deferred.resolve(res);
        }).error(function(res) {
            deferred.reject(res);
        });

        return deferred.promise;
    }

    this.getEmpsWithPending = function() {
        var deferred = $q.defer();
        $http.post('/showEmpsWithPending').success(function(res) {
            deferred.resolve(res);
        }).error(function(res) {
            deferred.reject(res);
        });

        return deferred.promise;
    }

    this.getDivs = function() {
        var deferred = $q.defer();
        $http.post('/showAllDivisions').success(function(res) {
            deferred.resolve(res);
        }).error(function(res) {
            deferred.reject(res);
        });

        return deferred.promise;
    }

    this.getLoggedInEmp = function() {
        this.lastLogIn = null;
        return $http.post('/getLoggedInEmp');
    }
}])

//Filters
.filter('trustHtml', function($sce) {
    function trustThis(htm) {
        return $sce.trustAsHtml(String(htm));
    }

    return trustThis;
})

//  : Loggin in
.controller('manageEmployees', ['$q', '$scope', '$http', function($q, $scope,$http) {

    $scope.loginStatus = true,
    $scope.isSup = false,
    $scope.isEmp = false,
    $scope.isHR = false,
    $scope.isAdmin = false,

    // gets logged in information from stored session
    $scope.getLoggedUser = function() {
        $http.post("/getLoggedInEmp").success(function(resp) {
            $scope.loggedUserName = resp.empName;

            if (resp.currentRoles.indexOf('employee') !== -1) {
                $scope.isEmp = true;
            }
            if (resp.currentRoles.indexOf('supervisor') !== -1) {
                $scope.isSup = true;
            }
            if (resp.currentRoles.indexOf('HR') !== -1) {
                $scope.isHR = true;
            }
        }).error(function(resp) {
            console.log("Problem getting logged in user");
        });
    }

    $scope.getLoggedUser();

    $scope.changePassword = function () {

        var newSetPassword = {current:$scope.curPassword,newp:$scope.newPassword,newpr:$scope.newPasswordR};

        $http.post("/changePasswdInside",newSetPassword).success(function(resp) {
            console.log("Password changed");
        }).error(function(resp) {
            console.log("Problem getting logged in user");
        });
    }

    $scope.logout = function() {
        $http.post('/logout').success(function(resp) {
            console.log("logged out");
        }).error(function(resp) {
            console.log("Problem loggin user out");
        });
    }
}])

.controller('empRoleController', ['allObjectives', 'approvedObjectives', 'unApprovedObjectives', '$rootScope', '$http', '$scope', 'datatable' ,function (approvedObjectives, unApprovedObjectives, $rootScope, allObjectives, $http, $scope, datatable) {
    $scope.empObjective = {};
    $scope.gotFinBCW = false;
    $scope.BCWStat = "Lock";
    $scope.showBCT = false;
    $scope.showOtherMatrixTypes = false;
    $scope.showTimeMatrix = false;
    $scope.approvedKPAs = [];
    $scope.unapprovedKPAs = [];
    $scope.capturedRatings = [];
    $scope.allGroupedPerspectives = [];

    $scope.evalMsgNot = true;
    $scope.evalMsg = "There are no Approved Objectives to Evaluate for now, Create Objectives and submit them tro your supervisor. If this problem persists contact your Supervisor.";

    $scope.empObjective.metrixType = '--Select matrix--';
    $scope.objPerspDropdownMenu = '--Select a Perspective--';
    $scope.finObjWeightSum = 0;

    //by Mlandvo
    $scope.tester = "";
    $scope.showSubErr = true;
    $scope.showSubMsg = "There are no created Objectives to submit for now, Create Objectives. If this problem persists contact your IT Administrator.";
    $scope.showSCardErr = true;
    $scope.showSCardMsg = "Your Perfomance contract is not ready yet. There are no Approved Objectives to work on for now ...";
    $scope.showConErr = true;
    $scope.showConMsg = "Your Scorecard is not ready yet. Complete employee self-evaluation and wait for your supervisor to evaluate you.";
    $scope.showEvalErr = true;
    $scope.showEvalMsg = "There are no Approved Objectives to evaluate for now ... Please try again later.";
    //end

    $scope.act = 0;
    $scope.finRowSpan = 0;
    $scope.custRowSpan = 0;
    $scope.intRowSpan = 0;
    $scope.learnRowSpan = 0;

    $scope.unactionedKPAs = [];
    $scope.rejectedKPAs = [];
    $scope.toSubmitObjs = [];
    $scope.master = false;
    $scope.sumDetailedWeighting = 0;
    $scope.empObjective.metrixType = '--Select--';
    $scope.empObjective.perspective = '--Select--';
    $scope.empObjective.objPeriod = '--Select--';

    // switch kpa template after pespective is created : 
    $scope.changeShowBCT = function() {
        if ($scope.empObjective.objPeriod == '--Select--') {
            $scope.showBCT = false;
            $scope.empObjective.metrixType = '--Select--';
        } else {
            $scope.showBCT = true;
            $scope.empObjective.metrixType = '--Select--';
            $scope.showOtherMatrixTypes = false;
            $scope.showTimeMatrix = false;
        }
    };

    $scope.showContract = false;
    $scope.showBalanceScore = false;

    $scope.getSpecificBSC = function () {
        var period = $scope.bscPeriod;
        $scope.showBalanceScore = true;

        //$http.post("/getEmpSpecificBsc", period).success(function (res) {
            //$scope.showBalanceScore = true;
        //});
    }

    // switch matrix templates based on matrix type selected : 
    $scope.changeShowMatrix = function(type) {

        if (type == "time") {
            $scope.showOtherMatrixTypes = false;
            $scope.showTimeMatrix = !$scope.showTimeMatrix;
        } else if (type == "--Select--") {
            $scope.showOtherMatrixTypes = false;
            $scope.showTimeMatrix = false;
        } else {
            $scope.showTimeMatrix = false;
            $scope.showOtherMatrixTypes = !$scope.showOtherMatrixTypes;
        }
    };

    // switch matrix templates based on matrix type selected for editing : 
    $scope.changeEditShowMatrix = function(type) {

        if (type == "time") {
            $scope.showEditOtherMatrixTypes = false;
            $scope.showEditTimeMatrix = !$scope.showEditTimeMatrix;
        } else if (type == "--Select--") {
            $scope.showEditOtherMatrixTypes = false;
            $scope.showEditTimeMatrix = false;
        } else {
            $scope.showEditTimeMatrix = false;
            $scope.showEditOtherMatrixTypes = !$scope.showEditOtherMatrixTypes;
        }
    };

    // retrieve approved objectives : 
    $scope.getAprdObjectives = function() {

        $http.post("/getAllApprovedObjectives").success(function(res) {
            if (res.length > 0) {
                $scope.approvedKPAs = res;
            } else if (res.length <= 0) {
                $scope.approvedKPAs = [];
                $scope.hasApprovedObjsErrors = true;
                $scope.approvdObjError = "There are no approved objectives";
            }

        }).error(function() {
            console.log('There is an error');
        });
    };

    // retrieve eval obj objectives : 
    $scope.getEvalObjectives = function() {
        $http.post("/getAllEvalObjectives").success(function (res) {
            if (res.length > 0) {
                $scope.evalMsgNot = false;
                $scope.approvedEvalKPAs = res;
                for (var i = 0; i < $scope.approvedEvalKPAs.length; i++) {
                    if ($scope.approvedEvalKPAs[i].metrixType == 'time') {
                        $scope.approvedEvalKPAs[i].metricOneDef['label'] = $scope.approvedEvalKPAs[i].metricOneDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricOneDef.To;
                        $scope.approvedEvalKPAs[i].metricTwoDef['label'] = $scope.approvedEvalKPAs[i].metricTwoDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricTwoDef.To;
                        $scope.approvedEvalKPAs[i].metricThreeDef['label'] = $scope.approvedEvalKPAs[i].metricThreeDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricThreeDef.To;
                        $scope.approvedEvalKPAs[i].metricFourDef['label'] = $scope.approvedEvalKPAs[i].metricFourDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricFourDef.To;
                        $scope.approvedEvalKPAs[i].metricFiveDef['label'] = $scope.approvedEvalKPAs[i].metricFiveDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricFiveDef.To;
                    }
                }

            } else if (res.length <= 0) {
                $scope.approvedEvalKPAs = [];
            }
        }).error(function() {
            console.log('There is an error');
        });
    };

    $scope.showEmpEval = false;

    // retrieve eval obj objectives : 
    $scope.getPeriodicEvalObjs = function() {

        $scope.submitEvalSuccess = false;
        $scope.submitEvalSuccessMsg = null;
        $scope.evalMsgNot = false;
        $scope.evalMsg = null;

        var item = {period : $scope.evalPeriod};
        $http.post("/getPeriodicEvalObjs",item).success(function (res) {
            if (res.length > 0) {
                $scope.approvedEvalKPAs = res;
                for (var i = 0; i < $scope.approvedEvalKPAs.length; i++) {
                    if ($scope.approvedEvalKPAs[i].metrixType == 'time') {
                        $scope.approvedEvalKPAs[i].metricOneDef['label'] = $scope.approvedEvalKPAs[i].metricOneDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricOneDef.To;
                        $scope.approvedEvalKPAs[i].metricTwoDef['label'] = $scope.approvedEvalKPAs[i].metricTwoDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricTwoDef.To;
                        $scope.approvedEvalKPAs[i].metricThreeDef['label'] = $scope.approvedEvalKPAs[i].metricThreeDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricThreeDef.To;
                        $scope.approvedEvalKPAs[i].metricFourDef['label'] = $scope.approvedEvalKPAs[i].metricFourDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricFourDef.To;
                        $scope.approvedEvalKPAs[i].metricFiveDef['label'] = $scope.approvedEvalKPAs[i].metricFiveDef.from + ' to ' + $scope.approvedEvalKPAs[i].metricFiveDef.To;
                    }
                }
                $scope.showEmpEval = true;
            } else if (res.length <= 0) {
                $scope.approvedEvalKPAs = [];
                $scope.showEmpEval = true;
                $scope.evalMsgNot = true;
                $scope.evalMsg = "There are no objectives to evaluate on";
            }
        }).error(function() {
            console.log('There is an error');
        });
    };

    // get pespectives : 
    $scope.getPerspectives = function() {
        $http.post("/getAllPerspectives").success(function(res) {
            if (res.length > 0) {
                $scope.allPerspectives = res;
            } else if (res.length <= 0) {
                $scope.allPerspectives = [];
            }

            for (var i = 0; i < $scope.allPerspectives.length; i++) {
                $scope[$scope.allPerspectives[i].perspName] = [];
            }

        }).error(function() {
            console.log('There is an error');
        });
    };

    $scope.getPerspectives();

    $scope.allObjPeriods = [];

    // get ObjPeriods : 
    $scope.getObjPeriods = function() {
        $http.post("/getAllObjPeriods").success(function(res) {

            if (res.length > 0) {
                $scope.allObjPeriods = res;
            } else if (res.length <= 0) {
                $scope.allObjPeriods = [];
            }

        }).error(function() {
            console.log('There is an error');
        });
    };

    $scope.getObjPeriods();

    // retrieve getUnactndObjectives : 
    $scope.getUnactndObjectives = function() {

        $scope.hasSubmitObjErrors = false;
        $scope.submitObjError = null;
        $scope.hasSubmitObjInfo = false;
        $scope.submitObjInfo = null;

        var period = {period:$scope.submitObjPeriod};

        if ($scope.submitObjPeriod == null || $scope.submitObjPeriod == "") {
            $scope.hasSubmitObjErrors = true;
            $scope.submitObjError = "Please select the objective period";
        } else {
            $http.post("/getAllUnactionedObjs", period).success(function(res) {
                $scope.unactionedKPAs = [];
                $scope.showSubErr = false;
                $scope.unactionedKPAs = res;
                $scope.showSubmit = true;
                $scope.noUnactionedObj = false;
                $scope.hasSubmitObjInfo = false;
                $scope.submitObjInfo = null;

                if (res.length <= 0) {
                    $scope.noUnactionedObj = true;
                    $scope.hasSubmitObjInfo = true;
                    $scope.showSubmit = false;
                    $scope.submitObjInfo = "There are no unactioned objectives at the moment";
                } else {
                    var unactionedKPAConfig = {
                        "name": "unactioned",
                        "columns": [{
                            "header": "",
                            "render": function(value, line) {
                                var edit = '<a href="#editObjective" class="btn btn-sm btn-warning btn-block" data-toggle="tab" ng-click="getEditObjective(value.data)"><span class="glyphicon glyphicon-edit" >Edit</span></a>';
                                return edit;
                            }
                        }, {
                            "header": "",
                            "render": function(value, line) {
                                var remove = '<a data-backdrop="static" class="btn btn-sm btn-danger btn-block" data-keyboard="false" href="#delObjectiveModal" ng-click="selectToDelObj(value.data._id)"data-toggle="modal"><span class="glyphicon glyphicon-trash">Delete</span></a>';
                                return remove;
                            }
                        },{
                            "header": "Mark/Unmark",
                            "render": function(value, line) {
                                var mark = '<span><input type="checkbox" ng-checked="master" name="select" ng-click="selectObjForSubmission(value.data)"/>Mark</span>';
                                return mark;
                            }
                        }, {
                            "header": "Perspective",
                            "property": "perspective",
                            "order": true,
                            "type": "text",
                            "edit": true,
                            "selected": true,
                        }, {
                            "header": "Key Perfomance Area",
                            "property": "kpa",
                            "order": true,
                            "type": "text",
                            "edit": true
                        }, {
                            "header": "Key Perfomance Indicator",
                            "property": "kpi",
                            "order": true,
                            "type": "text",
                            "edit": true
                        }, {
                            "header": "Period",
                            "property": "objPeriod",
                            "order": true,
                            "type": "text",
                            "edit": true
                        }, {
                            "header": "weighting",
                            "property": "detailedWeighting",
                            "order": true,
                            "type": "text",
                            "edit": true
                        }],
                        "pagination": {
                            "mode": 'local'
                        },
                        "order": {
                            "mode": 'local'
                        },
                        "hide": {
                            "active": true,
                            "showButton": true
                        }
                    }

                    //Data for all unactioned kpas
                    var unactionedKpaData = $scope.unactionedKPAs;

                    //Initialising the datatable with this configuration
                    $scope.unactionedKPADT = datatable(unactionedKPAConfig);
                    //Setting the data to the datatable
                    $scope.unactionedKPADT.setData(unactionedKpaData);
                }

               // if ($scope.unactionedKPAs.length > 0) {
                //    $scope.showSubErr = false;
                //}
            }).error(function() {
                console.log('There is an error');
            });
        }
    };

    $scope.getAllStateObjs = function () {
        $scope.hasAllStateObjInfo = false;
        $scope.allStateObjInfo = null;

        $http.post("/getAllStateObjectives").success(function(res) {
            $scope.allStateKPAs = res;

            if ($scope.allStateKPAs.length <= 0) {
                $scope.hasAllStateObjInfo = true;
                $scope.allStateObjInfo = "There are no objectives sent for approval";
            } else {

                var allStateDTConfig = {
                    "name": "allState",
                    "columns": [{
                        "header": "Perspective",
                        "property": "perspective",
                        "order": true,
                        "type": "text",
                        "edit": true,
                        "selected": true,
                    }, {
                        "header": "Key Perfomance Area",
                        "property": "kpa",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }, {
                        "header": "Key Perfomance Indicator",
                        "property": "kpi",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }, {
                        "header": "Period",
                        "property": "objPeriod",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }, {
                        "header": "Status",
                        "property": "status",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }],
                    "pagination": {
                        "mode": 'local'
                    },
                    "order": {
                        "mode": 'local'
                    },
                    "hide": {
                        "active": true,
                        "showButton": true
                    }
                };

                //Data for Employee Objects DT
                var allStateObjData = $scope.allStateKPAs;

                //Initialising the datatable with this configuration
                $scope.allStateObjDT = datatable(allStateDTConfig);
                //Setting the data to the datatable
                $scope.allStateObjDT.setData(allStateObjData);
            }

            
        }).error(function() {
            console.log('There is an error');
        });
    }

    $scope.captureObj = function(val) {
        console.log(val.data._id);
    }

    // retrieve getRejectedObjectives : 
    $scope.getEmpRejectedObjs = function() {
        $scope.hasRejectedObjsInfo = false;
        $scope.rejectedObjInfo = null;

        $scope.rejectedKPAs = [];
        $http.post("/getAllUnapprovedObjectives").success(function(res) {
            if (res.length > 0) {
                $scope.rejectedKPAs = res;

                var rejectedKPAConfig = {
                    "name": "rejected",
                    "columns": [{
                        "header": "",
                        "render": function(value, line) {
                            var edit = '<a class="btn btn-sm btn-warning btn-block" href="#editObjective"  data-toggle="tab" ng-click="getEditObjective(objective)"><span class="glyphicon glyphicon-edit" >Edit</span></a>';
                            return edit;
                        }
                    }, {
                        "header": "",
                        "render": function(value, line) {
                            var replace = '<a class="btn btn-sm btn-primary btn-block" href="#editObjective"  data-toggle="tab" ng-click="getEditObjectiveRep(objective)"><span class="glyphicon glyphicon-repeat">Replace</span></a>';
                            return replace;
                        }
                    }, {
                        "header": "Perspective",
                        "property": "perspective",
                        "order": true,
                        "type": "text",
                        "edit": true,
                        "selected": true,
                    }, {
                        "header": "Key Perfomance Area",
                        "property": "kpa",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }, {
                        "header": "Key Perfomance Indicator",
                        "property": "kpi",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }, {
                        "header": "Period",
                        "property": "objPeriod",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }, {
                        "header": "weighting",
                        "property": "detailedWeighting",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }, {
                        "header": "Reason Rejected",
                        "property": "approvalComment",
                        "order": true,
                        "type": "text",
                        "edit": true
                    }],
                    "pagination": {
                        "mode": 'local'
                    },
                    "order": {
                        "mode": 'local'
                    },
                    "hide": {
                        "active": true,
                        "showButton": true
                    }
                }

                //Data for all unactioned kpas
                var rejectedKpaData = $scope.rejectedKPAs;

                //Initialising the datatable with this configuration
                $scope.rejectedKPADT = datatable(rejectedKPAConfig);
                //Setting the data to the datatable
                $scope.rejectedKPADT.setData(rejectedKpaData);
            } else if (res.length <= 0) {
                $scope.hasRejectedObjInfo = true;
                $scope.rejectedObjInfo = "There are no rejected objectives at the moment";
            }
        }).error(function() {
            console.log('There is an error');
        });
    };

    // retrieve selected objective's information for editing : 
    $scope.getEditObjective = function(obj) {
        var id = {
            objectiveId: obj._id
        };
        $http.post("/getEditObjective", id).success(function(res) {
            $scope.empEditObjective = res;

            if ($scope.empEditObjective.metrixType == "time") {
                $scope.showEditTimeMatrix = true;
                $scope.showEditOtherMatrixTypes = false;

            } else {
                $scope.empEditObjective.metricOneDef = res.metricOneDef.label;
                $scope.empEditObjective.metricTwoDef = res.metricTwoDef.label;
                $scope.empEditObjective.metricThreeDef = res.metricThreeDef.label;
                $scope.empEditObjective.metricFourDef = res.metricFourDef.label;
                $scope.empEditObjective.metricFiveDef = res.metricFiveDef.label;
                $scope.showEditOtherMatrixTypes = true;
                $scope.showEditTimeMatrix = false;
            }

            $scope.getUnactndObjectives();
        });
    };

    // retrieve selected rejected objective's information for editing : 
    $scope.getEditObjectiveRej = function(obj) {
        var id = {
            objectiveId: obj._id
        };
        $http.post("/getEditObjective", id).success(function(res) {
            $scope.empEditObjective = res;

            if ($scope.empEditObjective.metrixType == "time") {
                $scope.showEditTimeMatrix = true;
                $scope.showEditOtherMatrixTypes = false;
            } else {
                $scope.empEditObjective.metricOneDef = $scope.empEditObjective.metricOneDef.label;
                $scope.empEditObjective.metricTwoDef = $scope.empEditObjective.metricTwoDef.label;
                $scope.empEditObjective.metricThreeDef = $scope.empEditObjective.metricThreeDef.label;
                $scope.empEditObjective.metricFourDef = $scope.empEditObjective.metricFourDef.label;
                $scope.empEditObjective.metricFiveDef = $scope.empEditObjective.metricFiveDef.label;
                $scope.showEditOtherMatrixTypes = true;
                $scope.showEditTimeMatrix = false;
            }

            $scope.getUnactndObjectives();
        });
    };

    // edit selected objective : 
    $scope.editObjective = function(obj) {
        $http.post("/editObjective", obj).success(function(res) {
            $scope.editObjSuccess = true;
            $scope.editObjSuccessMsg = res;
            $scope.empEditObjective = {};
            $scope.getUnactndObjectives();
        });
    };

    // create array of selected objectives for submission : 
    $scope.selectObjForSubmission = function(obj) {
        var elemPos = $scope.toSubmitObjs.indexOf(obj);
        if (elemPos == -1) {
            $scope.toSubmitObjs.push(obj);
            $scope.sumDetailedWeighting = Number($scope.sumDetailedWeighting) + Number(obj.detailedWeighting);
        } else {
            $scope.toSubmitObjs.splice(elemPos, 1);
            $scope.sumDetailedWeighting = Number($scope.sumDetailedWeighting) - Number(obj.detailedWeighting);
        }
    };

    // submit objectives = all selected objectives in an array : 
    $scope.submitObjectives = function() {

        $scope.hasSubmitObjErrors = false;
        $scope.submitObjError = null;
        $scope.submitObjSuccess = false;
        $scope.submitObjSuccessMsg = null;

        if ($scope.sumDetailedWeighting < 100) {
            $scope.hasSubmitObjErrors = true;
            $scope.submitObjError = "Detailed weightings should add up to 100%, currently at : " + $scope.sumDetailedWeighting + " %";
        } else {
            $http.post("/submitEmpObjectives", $scope.toSubmitObjs).success(function(res) {
                $scope.submitObjSuccess = true;
                $scope.submitObjSuccessMsg = res;
                $scope.unactionedKPAs = [];
                //$scope.getUnactndObjectives();
            });
        }
    };

    // retrieve rated objectives : 
    $scope.getSubBscObjs = function(id) {

        $scope.allGroupedPerspectives = [];
        $scope.empTotalScore = 0;
        $scope.empDetailedW = 0;
        $scope.hasViewBscSupInfo = false;
        $scope.viewBscSupInfoMsg = null;

        $http.post("/getAllSupBsc",{empId:id}).success(function(res) {

            if (res.length <= 0) {
                $scope.approvedKPAs = [];
                $scope.hasViewBscSupInfo = true;
                $scope.viewBscSupInfoMsg = "There are no employee balanced score cards yet";
            } else {
                $scope.showConErr = false;
                $scope.approvedKPAs = res;
                for (var i = 0; i < $scope.approvedKPAs.length; i++) {
                    $scope.empTotalScore = $scope.empTotalScore + Number($scope.approvedKPAs[i].score);
                    $scope.empDetailedW = $scope.empDetailedW + Number($scope.approvedKPAs[i].detailedWeighting);
                }
                $scope.scorecardHeights = $scope.approvedKPAs.length + 1;

                for (var i = 0; i < $scope.allPerspectives.length; i++) {
                    $scope[$scope.allPerspectives[i].perspName] = [];

                    for (var j = 0; j < $scope.approvedKPAs.length; j++) {
                        if ($scope.approvedKPAs[j].perspective == $scope.allPerspectives[i].perspName) {
                            $scope[$scope.allPerspectives[i].perspName].push($scope.approvedKPAs[j]);
                        }
                    }
                }

                for (var m = 0; m < $scope.allPerspectives.length; m++) {
                    var entry = {
                        pers: $scope.allPerspectives[m].perspName,
                        objs: $scope[$scope.allPerspectives[m].perspName]
                    };
                    $scope.allGroupedPerspectives.push(entry);
                }
            }
        }).error(function() {
            console.log('There is an error');
        });
    };

    // select all objectives for submission : 
    $scope.selectAllObjsForSubmission = function() {

        $scope.master = !$scope.master;

        if ($scope.master) {
            $scope.toSubmitObjs = [];
            $scope.sumDetailedWeighting = 0;
            for (var i = 0; i < $scope.unactionedKPAs.length; i++) {
                $scope.toSubmitObjs.push($scope.unactionedKPAs[i]);
                $scope.sumDetailedWeighting = Number($scope.sumDetailedWeighting) + Number($scope.unactionedKPAs[i].detailedWeighting);
            }
        } else if (!$scope.master) {
            $scope.toSubmitObjs = [];
        }
    }

    // select objective to be deleted. This is to initialize the variable used by confirm modal: 
    $scope.selectToDelObj = function(objId) {
        $scope.toDelObjective = objId;
    };

    // remove objective : 
    $scope.delObjective = function(objId) {
        var id = {
            objectiveId: objId
        };
        $http.post("/deleteObjective", id).success(function (res) {
            $scope.getUnactndObjectives();
        });
    };

    $scope.clearEmpObjectivesErrors = function() {
        $scope.createObjSuccess = false;
        $scope.finObjError = [];
        $scope.createObjectiveErrorMsgs = [];
        $scope.hasCreateObjErrors = false;
    };

    // objective creation : 
    $scope.createObjective = function() {
        $scope.finObjError = [];
        $scope.createObjectiveErrorMsgs = [];
        $scope.hasCreateObjErrors = false;
        $scope.hasFinKPAError = false;
        $scope.hasFinKPIError = false;

        if ($scope.empObjective.detailedWeighting == null) {
            $scope.hasCreateObjErrors = true;
            $scope.createObjError = "Please enter detailed category weighting!!";
        } else if (isNaN($scope.empObjective.detailedWeighting == null)) {
            $scope.hasCreateObjErrors = true;
            $scope.createObjError = "Detailed category weighting should be a number!!";
        } else if ($scope.empObjective.kpa == null) {
            $scope.hasCreateObjErrors = true;
            $scope.createObjError = "Please enter Key Perfomance Area";
        } else if ($scope.empObjective.kpi == null) {
            $scope.hasCreateObjErrors = true;
            $scope.createObjError = "Please enter Key Perfomance Indicator";
        } else if ($scope.empObjective.metrixType == "--Select--") {
            $scope.hasCreateObjErrors = true;
            $scope.createObjError = "Please Select Metrix type";
        } else if ($scope.empObjective.metrixType == "time") {

            var metricOneFrom = new Date ($scope.empObjective.metricOneFrom);
            var metricOneTo = new Date ($scope.empObjective.metricOneTo);
            var metricTwoFrom = new Date ($scope.empObjective.metricTwoFrom);
            var metricTwoTo = new Date ($scope.empObjective.metricTwoTo);
            var metricThreeFrom = new Date ($scope.empObjective.metricThreeFrom);
            var metricThreeTo = new Date ($scope.empObjective.metricThreeTo);
            var metricFourFrom = new Date ($scope.empObjective.metricFourFrom);
            var metricFourTo = new Date ($scope.empObjective.metricFourTo);
            var metricFiveFrom = new Date ($scope.empObjective.metricFiveFrom);
            var metricFiveTo = new Date ($scope.empObjective.metricFiveTo);

            if ($scope.empObjective.metricOneFrom == null || $scope.empObjective.metricOneTo == null || $scope.empObjective.metricTwoFrom == null || $scope.empObjective.metricTwoTo == null
                || $scope.empObjective.metricThreeFrom == null|| $scope.empObjective.metricThreeTo == null|| $scope.empObjective.metricFourFrom == null || $scope.empObjective.metricFourTo == null
                || $scope.empObjective.metricFiveFrom == null || $scope.empObjective.metricFiveTo == null) {
                $scope.hasCreateObjErrors = true;
                $scope.createObjError = "Please fill all Time metrix values";
            } else if ((metricOneFrom > metricOneTo) || (metricTwoFrom > metricTwoTo) || (metricThreeFrom > metricThreeFrom) || (metricFourFrom > metricFourFrom) ||(metricFiveFrom > metricFiveFrom)) {
                $scope.hasCreateObjErrors = true;
                $scope.createObjError = "From date cannot be more than To date";
            } else if ((metricOneTo > metricTwoFrom) || (metricTwoTo > metricThreeFrom) || (metricThreeTo > metricFourFrom) || (metricFourTo > metricFiveFrom)) {
                $scope.hasCreateObjErrors = true;
                $scope.createObjError = "To of a lower matric cannot be higher than From of the current matric";
            } else {
                $http.post("/createEmpObjective", $scope.empObjective).success(function(resp) {
                    $scope.createObjSuccess = true;
                    $scope.createObjSuccessMsg = resp;
                    $scope.empObjective = {};
                    $scope.empObjective.metrixType = '--Select--';
                    $scope.empObjective.perspective = '--Select--';
                    $scope.empObjective.objPeriod = '--Select--';
                    $scope.showBCT = false;
                    $scope.showOtherMatrixTypes = false;
                    $scope.showTimeMatrix = false;
                });
            }

        } else if ($scope.empObjective.metrixType == "percentage") {
            if ($scope.empObjective.metricOneDef == null || $scope.empObjective.metricTwoDef == null || $scope.empObjective.metricThreeDef == null|| $scope.empObjective.metricFourDef == null || $scope.empObjective.metricFiveDef == null
                ) {
                $scope.hasCreateObjErrors = true;
                $scope.createObjError = "Please fill all metrix values";
            } else {
                $http.post("/createEmpObjective", $scope.empObjective).success(function(resp) {
                    $scope.createObjSuccess = true;
                    $scope.createObjSuccessMsg = resp;
                    $scope.empObjective = {};
                    $scope.empObjective.metrixType = '--Select--';
                    $scope.empObjective.perspective = '--Select--';
                    $scope.showBCT = false;
                    $scope.showOtherMatrixTypes = false;
                    $scope.showTimeMatrix = false;
                });
            }
        } else {
            $http.post("/createEmpObjective", $scope.empObjective).success(function(resp) {
                $scope.createObjSuccess = true;
                $scope.createObjSuccessMsg = resp;
                $scope.empObjective = {};
                $scope.empObjective.metrixType = '--Select--';
                $scope.empObjective.perspective = '--Select--';
                $scope.showBCT = false;
                $scope.showOtherMatrixTypes = false;
                $scope.showTimeMatrix = false;
            });
        }
    };

    //By Mlandvo
    $scope.upload = function(files) {
        if (files && files.length) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                upload({
                        url: '/uploads/',
                        fields: {
                            //'username': $scope.username
                        },
                        file: file
                    })
                    .progress(function(evt) {
                        var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                        $scope.log = 'progress: ' + progressPercentage + '% ' + evt.config.file.name + '\n' + $scope.log;
                    })
                    .success(function(data, status, headers, config) {
                        $timeout(function() {
                            $scope.log = 'file: ' + config.file.name + ', Response: ' + JSON.stringify(data) + '\n' + $scope.log;
                        });
                    });
            }
        }
    };

    //By 
    $scope.selfEvaluate = function() {
        $http.post("/empSelfEvaluate", $scope.capturedRatings).success(function(res) {
            $scope.submitEvalSuccess = true;
            $scope.submitEvalSuccessMsg = "Objectives have been successfully evaluated.";
            $scope.evalMsgNot = false;
        });
    };

    $scope.captureRating = function(obj) {
        var elemPos = $scope.capturedRatings.indexOf(obj);
        if (elemPos == -1) {
            $scope.capturedRatings.push(obj);
        } else {
            $scope.capturedRatings.splice(elemPos, 1);
            $scope.capturedRatings.push(obj);
        }
    }

    // retrieve approved objectives : 
    $scope.getContractObjs = function() {

        $scope.allGroupedPerspectives = [];

        $http.post("/getAllApprovedObjectives").success(function(res) {
            if (res.length > 0) {
                $scope.showSCardErr = false;
                $scope.approvedKPAs = res;
            } else if (res.length <= 0) {
                $scope.approvedKPAs = [];
            }

            $scope.scorecardHeights = $scope.approvedKPAs.length + 1;

            for (var i = 0; i < $scope.allPerspectives.length; i++) {
                $scope[$scope.allPerspectives[i].perspName] = [];

                for (var j = 0; j < $scope.approvedKPAs.length; j++) {
                    if ($scope.approvedKPAs[j].perspective == $scope.allPerspectives[i].perspName) {
                        $scope[$scope.allPerspectives[i].perspName].push($scope.approvedKPAs[j]);
                    }
                }
            }

            for (var m = 0; m < $scope.allPerspectives.length; m++) {
                var entry = {
                    pers: $scope.allPerspectives[m].perspName,
                    objs: $scope[$scope.allPerspectives[m].perspName]
                };
                $scope.allGroupedPerspectives.push(entry);
            }

        }).error(function() {
            console.log('There is an error');
        });
    };

    // retrieve approved objectives for a specific period: 
    $scope.getPeriodicContractObjs = function() {

        $scope.showContract = false;
        $scope.showSCardErr = false;
        $scope.hasShowContractErrors = false;
        $scope.showContractInfo = null;

        $scope.allGroupedPerspectives = [];
        var item = {period : $scope.contractPeriod};

        $http.post("/getSpecificApprovedObjs", item).success(function(res) {
            if (res.length <= 0) {
                $scope.showContract = false;
                $scope.showSCardErr = true;
                $scope.approvedKPAs = [];

                $scope.hasShowContractErrors = true;
                $scope.showContractInfo = "Perfomance contract not yet ready";
            } else {
                $scope.showContract = true;
                $scope.showSCardErr = false;
                $scope.approvedKPAs = res;
                $scope.scorecardHeights = $scope.approvedKPAs.length + 1;

                for (var i = 0; i < $scope.allPerspectives.length; i++) {
                    $scope[$scope.allPerspectives[i].perspName] = [];

                    for (var j = 0; j < $scope.approvedKPAs.length; j++) {
                        if ($scope.approvedKPAs[j].perspective == $scope.allPerspectives[i].perspName) {
                            $scope[$scope.allPerspectives[i].perspName].push($scope.approvedKPAs[j]);
                        }
                    }
                }

                for (var m = 0; m < $scope.allPerspectives.length; m++) {
                    var entry = {
                        pers: $scope.allPerspectives[m].perspName,
                        objs: $scope[$scope.allPerspectives[m].perspName]
                    };
                    $scope.allGroupedPerspectives.push(entry);
                }
            }
        }).error(function() {
            console.log('There is an error');
        });
    };

    // retrieve rated objectives : 
    $scope.getBscObjs = function() {

        $scope.allGroupedPerspectives = [];
        $scope.empTotalScore = 0;
        $scope.empDetailedW = 0;

        $http.post("/getAllEmpBsc").success(function(res) {
            if (res.length > 0) {
                $scope.showConErr = false;
                $scope.approvedKPAs = res;
                for (var i = 0; i < $scope.approvedKPAs.length; i++) {
                    $scope.empTotalScore = $scope.empTotalScore + Number($scope.approvedKPAs[i].score);
                    $scope.empDetailedW = $scope.empDetailedW + Number($scope.approvedKPAs[i].detailedWeighting);
                }
            } else if (res.length <= 0) {
                $scope.approvedKPAs = [];
            }



            $scope.scorecardHeights = $scope.approvedKPAs.length + 1;

            for (var i = 0; i < $scope.allPerspectives.length; i++) {
                $scope[$scope.allPerspectives[i].perspName] = [];

                for (var j = 0; j < $scope.approvedKPAs.length; j++) {
                    if ($scope.approvedKPAs[j].perspective == $scope.allPerspectives[i].perspName) {
                        $scope[$scope.allPerspectives[i].perspName].push($scope.approvedKPAs[j]);
                    }
                }
            }

            for (var m = 0; m < $scope.allPerspectives.length; m++) {
                var entry = {
                    pers: $scope.allPerspectives[m].perspName,
                    objs: $scope[$scope.allPerspectives[m].perspName]
                };
                $scope.allGroupedPerspectives.push(entry);
            }

        }).error(function() {
            console.log('There is an error');
        });
    };

    // retrieve rated objectives : 
    $scope.getPeriodicBscObjs = function() {

        $scope.allGroupedPerspectives = [];
        $scope.empTotalScore = 0;
        $scope.empDetailedW = 0;
        var item = {period : $scope.bscPeriod};
        $scope.hasShowBscInfo = false;
        $scope.showBscInfo = null;

        $http.post("/getPeriodicBscObjs", item).success(function(res) {

            if (res.length <= 0) {
                $scope.approvedKPAs = [];
                $scope.hasShowBscInfo = true;
                $scope.showBscInfo = "Balanced Score Card is not yet ready";
            } else {
                $scope.showConErr = false;
                $scope.approvedKPAs = res;
                for (var i = 0; i < $scope.approvedKPAs.length; i++) {
                    $scope.empTotalScore = $scope.empTotalScore + Number($scope.approvedKPAs[i].score);
                    $scope.empDetailedW = $scope.empDetailedW + Number($scope.approvedKPAs[i].detailedWeighting);
                }
                $scope.showBalanceScore = true;
                $scope.scorecardHeights = $scope.approvedKPAs.length + 1;

                for (var i = 0; i < $scope.allPerspectives.length; i++) {
                    $scope[$scope.allPerspectives[i].perspName] = [];

                    for (var j = 0; j < $scope.approvedKPAs.length; j++) {
                        if ($scope.approvedKPAs[j].perspective == $scope.allPerspectives[i].perspName) {
                            $scope[$scope.allPerspectives[i].perspName].push($scope.approvedKPAs[j]);
                        }
                    }
                }

                for (var m = 0; m < $scope.allPerspectives.length; m++) {
                    var entry = {
                        pers: $scope.allPerspectives[m].perspName,
                        objs: $scope[$scope.allPerspectives[m].perspName]
                    };
                    $scope.allGroupedPerspectives.push(entry);
                }

            }
        }).error(function() {
            console.log('There is an error');
        });
    };

    $scope.clearSubmitModal = function() {
        $scope.unactionedKPAs = null;
        $scope.showSubErr = true;
    };

    $scope.getKPA = function(Obj) {
        var id = Obj._id;
        $http.post("/getKPA/" + id)
            .success(function(res) {
                $scope.kpaID = res._id;
            });
    };

    $scope.closeObjPeriod = function () {
        $scope.hasCloseObjErrors = false;
        $scope.closeObjSuccess = false;
        $scope.closeObjError = null;
        $scope.closeObjSuccessMsg = null;

        var period = {period:$scope.emptocloseobjperiod};

        if ($scope.emptocloseobjperiod == null || $scope.emptocloseobjperiod == "") {
            $scope.hasCloseObjErrors = true;
            $scope.closeObjError = "Please select the objective period";
        } else {
            $http.post("/closeobjperiod", period).success(function(res) {
                $scope.closeObjSuccess = true;
                $scope.closeObjSuccessMsg = res;
            })
        }
    }
}])

.controller('ctrl560cfdc514d04f8439306951', ['$scope', '$http', 'datatable', function($scope, $http, datatable) {
    $scope.initCompIcon = 'glyphicon glyphicon-tower';
    $scope.initCompStructType = 'company';
    $scope.initCompParObjId = '0';
    $scope.listOfPos = null;

    $scope.myTree = [];

    $scope.structType = [{
        disp: "Division",
        val: "division"
    }, {
        disp: "Department",
        val: "department"
    }, {
        disp: "Section",
        val: "section"
    }, {
        disp: "Subsection",
        val: "subsection"
    }, {
        disp: "Position",
        val: "position"
    }];

    //$("#obj560cf73114d04f843930692a").hide();

    setTimeout(function() {
        $('#tree').treeview({
            data: $scope.myTree //$scope.getTree()
        });
    }, 1500);

    $scope.func560d4856d00d941c304c7254 = function() {
        $http.post('/route560d4856d00d941c304c7254').success(function(resp) {
            $scope.listOfPos = resp;
        });
    }

    $scope.getPerspectives = function() {
        $http.post('/getPerspectives').success(function(resp) {
            $scope.listOfPersp = resp;
        });
    }

    // get ObjPeriods : 
    $scope.getObjPeriods = function() {
        $http.post("/getAllObjPeriods").success(function(res) {
            if (res.length > 0) {
                $scope.allObjPeriods = res;
            } else if (res.length <= 0) {
                $scope.allObjPeriods = [];
            }
        }).error(function() {
            console.log('There is an error');
        });
    };

    $scope.getObjPeriods();

    // get ObjPeriods : 
    $scope.getFinYears = function() {
        $http.post("/getAllFinYears").success(function(res) {

            if (res.length > 0) {
                $scope.allFinYears = res;
            } else if (res.length <= 0) {
                $scope.allFinYears = [];
            }

        }).error(function() {
            console.log('There is an error');
        });
    };

    $scope.getFinYears();

    $scope.evalPeriod = {};

    $scope.createEvalPeriod = function () {
        $scope.hasCreateEvalPErrors = false;
        $scope.createEvalError = null;
        $scope.createEvalPMsg = null;
        $scope.createEvalPSuccess = false;

        if ($scope.evalPeriod.name == null || $scope.evalPeriod.from == null || $scope.evalPeriod.to == null) {
            $scope.hasCreateEvalPErrors = true;
            $scope.createEvalPError = "Please fill all fields"; 
        }

        $http.post('/createEvalPeriod',$scope.evalPeriod).success(function(resp) {
            $scope.createEvalPSuccess = true;
            $scope.createEvalPMsg = resp;
            $scope.fetchEvalPeriods();
            $scope.evalPeriod = {};
        });
    }

    $scope.companyGoal = {};

    $scope.createNewGoal = function () {
        $scope.hasCreateGoalErrors = false;
        $scope.createGoalError = null;
        $scope.createGoalSuccessMsg = null;
        $scope.createCGoalSuccess = false;

        if ($scope.companyGoal.name == null || $scope.companyGoal.from == '--Select--' || $scope.companyGoal.name == null) {
            $scope.hasCreateGoalErrors = true;
            $scope.createGoalError = "Please fill all fields"; 
        } else {
            $http.post('/createCompanyGoal', $scope.companyGoal).success(function(resp) {
                $scope.createCGoalSuccess = true;
                $scope.createGoalSuccessMsg = resp;
                $scope.companyGoal = {};
                $scope.fetchCompanyGoals();
            }); 
        }
    }

    $scope.fetchCompanyGoals = function() {
        $scope.fetchCGoalInfo = null;
        $scope.hsFetchCGoalInfo = false;

        $http.post('/fetchAllCGoals').success(function(resp) {
            $scope.companyGoals = resp;

            if (resp.length <= 0) {
                $scope.fetchCGoalInfo = "There are no company goals yet";
                $scope.hsFetchCGoalInfo = true;
            } else {
                //Current Perspective Objects Datatable Config
                var companyGoalsConfig = {
                    "name": "simple_datatable",
                    "columns": [{
                        "header": "Goal",
                        "property": "name",
                        "order": true,
                        "type": "text",
                        "edit": true,
                        "selected": true
                    }],
                    "edit": {
                        "active": true,
                        "columnMode": true
                    },
                    "pagination": {
                        "mode": 'local'
                    },
                    "order": {
                        "mode": 'local'
                    },
                    "remove": {
                        "active": true,
                        "mode": 'remote',
                        "url": function(value) {
                            return "/dtRemoveCGoal/:" + value._id
                        },
                        "method": "delete"
                    },
                    "save": {
                        "active": true,
                        "mode": 'remote',
                        "url": "/dtEditCGoal",
                        "method": "post"
                    },
                    "hide": {
                        "active": true,
                        "showButton": true
                    },
                    "filter": {
                        "active": true,
                        "highlight": true,
                        "columnMode": true
                    }
                };

                var goalsDatatableData = $scope.companyGoals;

                //Initialising the datatable with this configuration
                $scope.companyGoalsDT = datatable(companyGoalsConfig);
                //Setting the data to the datatable
                $scope.companyGoalsDT.setData(goalsDatatableData);
            } 
        })
    };

    $scope.objPeriod = {};

    $scope.createObjPeriod = function () {
        $scope.hasCreateEvalPErrors = false;
        $scope.createEvalError = null;
        $scope.createEvalPMsg = null;
        $scope.createEvalPSuccess = false;

        if ($scope.objPeriod.name == null || $scope.objPeriod.from == null || $scope.objPeriod.to == null) {
            $scope.hasCreateObjPErrors = true;
            $scope.createObjError = "Please fill all fields"; 
        }

        $http.post('/createObjPeriod',$scope.objPeriod).success(function(resp) {
            $scope.createObjPSuccess = true;
            $scope.createObjPMsg = resp;
            $scope.objPeriod = {};
            $scope.fetchObjPeriods();
        });
    }

    $scope.fetchObjPeriods = function() {

        $http.post('/fetchAllObjPeriods').success(function(resp) {
            $scope.objPeriods = resp;

            console.log(resp);

            //Current Perspective Objects Datatable Config
            var objPeriodsConfig = {
                "name": "simple_datatable",
                "columns": [{
                    "header": "Name",
                    "property": "name",
                    "order": true,
                    "type": "text",
                    "edit": true,
                    "selected": true
                }, {
                    "header": "From",
                    "property": "from",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "To",
                    "property": "to",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "Status",
                    "property": "status",
                    "order": true,
                    "type": "text",
                    "edit": true
                }],
                "edit": {
                    "active": true,
                    "columnMode": true
                },
                "pagination": {
                    "mode": 'local'
                },
                "order": {
                    "mode": 'local'
                },
                "remove": {
                    "active": true,
                    "mode": 'remote',
                    "url": function(value) {
                        return "/dtRemoveObjP/:" + value._id
                    },
                    "method": "delete"
                },
                "save": {
                    "active": true,
                    "mode": 'remote',
                    "url": "/dtEditObjP",
                    "method": "post"
                },
                "hide": {
                    "active": true,
                    "showButton": true
                },
                "filter": {
                    "active": true,
                    "highlight": true,
                    "columnMode": true
                }
            };

            var datatableData2 = $scope.objPeriods;

            //Initialising the datatable with this configuration
            $scope.objPeriodsDT = datatable(objPeriodsConfig);
            //Setting the data to the datatable
            $scope.objPeriodsDT.setData(datatableData2);
        })
    };

    $scope.finYear = {};

    $scope.createFinYear = function () {
        $scope.hasCreateFinYrErrors = false;
        $scope.createFinYrError = null;
        $scope.createFinYrMsg = null;
        $scope.createFinYrSuccess = false;

        if ($scope.finYear.name == null || $scope.finYear.from == null || $scope.finYear.to == null) {
            $scope.hasCreateFinYrErrors = true;
            $scope.createFinYrError = "Please fill all fields"; 
        } else {
            $http.post('/createFinYear',$scope.finYear).success(function(resp) {
                $scope.createFinYrSuccess = true;
                $scope.createFinYrMsg = resp;
                $scope.finYear = {};
                $scope.fetchFinYears();
            });
        }

        
    }

    $scope.fetchFinYears = function() {

        $http.post('/getAllFinYears').success(function(resp) {
            $scope.finYears = resp;

            //Current Perspective Objects Datatable Config
            var finYearsConfig = {
                "name": "simple_datatable",
                "columns": [{
                    "header": "Name",
                    "property": "name",
                    "order": true,
                    "type": "text",
                    "edit": true,
                    "selected": true
                }, {
                    "header": "From",
                    "property": "from",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "To",
                    "property": "to",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "Status",
                    "property": "status",
                    "order": true,
                    "type": "text",
                    "edit": true
                }],
                "edit": {
                    "active": true,
                    "columnMode": true
                },
                "pagination": {
                    "mode": 'local'
                },
                "order": {
                    "mode": 'local'
                },
                "remove": {
                    "active": true,
                    "mode": 'remote',
                    "url": function(value) {
                        return "/dtRemoveFinYr/:" + value._id
                    },
                    "method": "delete"
                },
                "save": {
                    "active": true,
                    "mode": 'remote',
                    "url": "/dtEditFinYr",
                    "method": "post"
                },
                "hide": {
                    "active": true,
                    "showButton": true
                },
                "filter": {
                    "active": true,
                    "highlight": true,
                    "columnMode": true
                }
            };

            var finYearsDataDt = $scope.finYears;

            //Initialising the datatable with this configuration
            $scope.finYearsDT = datatable(finYearsConfig);
            //Setting the data to the datatable
            $scope.finYearsDT.setData(finYearsDataDt);
        })
    };

    $scope.fetchEvalPeriods = function() {

        $http.post('/getAllEvalPeriods').success(function(resp) {
            $scope.evalPeriods = resp;

            //Current Perspective Objects Datatable Config
            var evalPeriodsConfig = {
                "name": "simple_datatable",
                "columns": [{
                    "header": "Name",
                    "property": "name",
                    "order": true,
                    "type": "text",
                    "edit": true,
                    "selected": true
                }, {
                    "header": "From",
                    "property": "from",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "To",
                    "property": "to",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "Status",
                    "property": "status",
                    "order": true,
                    "type": "text",
                    "edit": true
                }],
                "edit": {
                    "active": true,
                    "columnMode": true
                },
                "pagination": {
                    "mode": 'local'
                },
                "order": {
                    "mode": 'local'
                },
                "remove": {
                    "active": true,
                    "mode": 'remote',
                    "url": function(value) {
                        return "/dtRemoveEvalP/:" + value._id
                    },
                    "method": "delete"
                },
                "save": {
                    "active": true,
                    "mode": 'remote',
                    "url": "/dtEditEvalP",
                    "method": "post"
                },
                "hide": {
                    "active": true,
                    "showButton": true
                },
                "filter": {
                    "active": true,
                    "highlight": true,
                    "columnMode": true
                }
            };

            var datatableData2 = $scope.evalPeriods;

            //Initialising the datatable with this configuration
            $scope.evalPeriodsDT = datatable(evalPeriodsConfig);
            //Setting the data to the datatable
            $scope.evalPeriodsDT.setData(datatableData2);
        })
    };

    $scope.fetchCEvalPeriods = function() {

        $http.post('/getAllCEvalPeriods').success(function(resp) {
            $scope.cEvalPeriods = resp;
        });
    }

    $scope.fetchCObjPeriods = function() {

        $http.post('/getAllCObjPeriods').success(function(resp) {
            $scope.cObjPeriods = resp;
        });
    }

    //Get all perspectives
    $scope.getPerspectives();

    $scope.getPositions = function() {
        $http.post('/getPositions').success(function(resp) {
            $scope.listOfPos = resp;
        });

    }

    $scope.compPref = null;
    $scope.getCompPrefix = function() {
        $http.post('/getCompPrefix').success(function(resp) {
            $scope.compPref = resp.unamePref;
        });

    };
    //Set company prefix
    $scope.getCompPrefix();

    //Get all positions
    $scope.getPositions();

    $scope.func560d4856d00d941c304c7254();


    $scope.$on('begin560d000d14d04f84393069550', function(event, data) {
        $scope.func560d000d14d04f84393069550()
    });

    $scope.$on('end560d4062da6ba58814600b161', function(event, data) {
        $scope.func560d4062da6ba58814600b162()
    });

    $scope.hrInitCompMsg = "";
    $scope.func560d000d14d04f84393069550 = function() {
        $http.post('/route560d000d14d04f84393069550', {
            name: $scope.structInitCompName,
            icon: $scope.initCompIcon,
            parentObjid: $scope.initCompParObjId,
            structType: $scope.initCompStructType,
            unamePref: $scope.userNamePref

        }).success(function(resp) {
            $scope.myTree = [];
            $scope.func55df0ed0b2bc8bc76c51da16();
            $scope.getPositions();
            $scope.getCompPrefix();
            setTimeout(function() {
                $('#tree').treeview({
                    data: $scope.myTree //$scope.getTree()
                });
            }, 1000);

            if (resp = "Success!") {
                $scope.hrInitCompMsg = "<div class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Company Initialised!</strong></div>";
            } else {
                $scope.hrInitCompMsg = "<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>An Error Occured!</strong></div>";
            }
            $scope.$broadcast('end560d000d14d04f84393069550', 'Composite');
        });

    }

    $scope.testF = function() {
    }

    $scope.func55df0ed0b2bc8bc76c51da16 = function() {
        $http.post('/route55df0ed0b2bc8bc76c51da16').success(function(resp) {
            $scope.structPar = resp;

            //Current Structure Objects Datatable Config
            var datatableConfig = {
                "name": "simple_datatable",
                "columns": [{
                    "header": "Name",
                    "property": "name",
                    "order": true,
                    "type": "text",
                    "edit": true,
                    "selected": true,
                    "render": function(value, line) {
                        if (line.selected) {
                            $scope.parentObjid = value._id;
                        };
                        myVal = "<span ng-click='testF()'>" + value.name + "</span>";
                        return myVal
                    }
                }, {
                    "header": "Structre Type",
                    "property": "structType",
                    "order": true,
                    "type": "text",
                    "edit": false
                }],
                "edit": {
                    "active": true,
                    "columnMode": true
                },
                "pagination": {
                    "mode": 'local'
                },
                "order": {
                    "mode": 'local'
                },
                "remove": {
                    "active": true,
                    "mode": 'remote',
                    "url": function(value) {
                        return "/dtRemoveStruct/:" + value._id
                    },
                    "method": "delete",
                    "callback": function(dt, errs) {
                        $scope.func55df0ed0b2bc8bc76c51da16();
                        $scope.getPositions();
                        setTimeout(function() {
                            $('#tree').treeview({
                                data: $scope.myTree //$scope.getTree()
                            });
                        }, 1000);
                    }
                },
                "save": {
                    "active": true,
                    "mode": 'remote',
                    "url": "/dtEditStruct",
                    "method": "post",
                    "callback": function(dt, errs) {
                        $scope.func55df0ed0b2bc8bc76c51da16();
                        $scope.getPositions();
                        setTimeout(function() {
                            $('#tree').treeview({
                                data: $scope.myTree //$scope.getTree()
                            });
                        }, 1000);
                    }
                },
                "hide": {
                    "active": true,
                    "showButton": true
                },
                "filter": {
                    "active": true,
                    "highlight": true,
                    "columnMode": true
                }
            };

            //Data for Application Objects DT
            var datatableData = $scope.structPar;

            //Initialising the datatable with this configuration
            $scope.compStructDT = datatable(datatableConfig);
            //Setting the data to the datatable
            $scope.compStructDT.setData(datatableData);
        });

        $http.post('/getStructure').success(function(resp) {
            $scope.myTree = [];
            $scope.myTree.push(resp.nodeData);
        });

    }

    $scope.func55df0ed0b2bc8bc76c51da16();

    $scope.hrAddCompMsg = "";
    $scope.func55df11e094e05079749e0a04 = function() {
        var structIcon = '';

        if ($scope.structureType == "company") {
            structIcon = "glyphicon glyphicon-tower"
        } else if ($scope.structureType == "division") {
            structIcon = "glyphicon glyphicon-tasks"
        } else if ($scope.structureType == "department") {
            structIcon = "glyphicon glyphicon-home"
        } else if ($scope.structureType == "section") {
            structIcon = "glyphicon glyphicon-file"
        } else if ($scope.structureType == "subsection") {
            structIcon = "glyphicon glyphicon-th"
        } else if ($scope.structureType == "position") {
            structIcon = "glyphicon glyphicon-link"
        } else if ($scope.structureType == "employee") {
            structIcon = "glyphicon glyphicon-user"
        };

        $http.post('/route55df11e094e05079749e0a04', {
            parentObjid: $scope.parentObjid,
            name: $scope.name,
            structType: $scope.structureType,
            structCompoAddBtn: $scope.structCompoAddBtn,
            icon: structIcon
        }).success(function(resp) {
            $scope.name = '';
            $scope.func55df0ed0b2bc8bc76c51da16();
            $scope.getPositions();
            setTimeout(function() {
                $('#tree').treeview({
                    data: $scope.myTree //$scope.getTree()
                });
            }, 1000);
            if (resp = "Success!") {
                $scope.hrAddCompMsg = "<div class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Component Added!</strong></div>";
            } else {
                $scope.hrAddCompMsg = "<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>An Error Occured!</strong></div>";
            }
        });

    }

    $scope.fetchPersps = function() {
        //$scope.allMyEmployees = [];
        $http.post('/getAllPersps').success(function(resp) {
            $scope.listOfPersp = resp;

            //Current Perspective Objects Datatable Config
            var datatableConfig2 = {
                "name": "simple_datatable",
                "columns": [{
                    "header": "Id",
                    "property": "_id",
                    "order": true,
                    "type": "text",
                    "edit": false,
                    "hide": true

                }, {
                    "header": "Perspective",
                    "property": "perspName",
                    "order": true,
                    "type": "text",
                    "edit": true,
                    "selected": true
                }, {
                    "header": "Descr",
                    "property": "perspDescr",
                    "order": true,
                    "type": "text",
                    "edit": true
                }],
                "edit": {
                    "active": true,
                    "columnMode": true
                },
                "pagination": {
                    "mode": 'local'
                },
                "order": {
                    "mode": 'local'
                },
                "remove": {
                    "active": true,
                    "mode": 'remote',
                    "url": function(value) {
                        return "/dtRemovePersp/:" + value._id
                    },
                    "method": "delete"
                },
                "save": {
                    "active": true,
                    "mode": 'remote',
                    "url": "/dtEditPersp",
                    "method": "post"
                },
                "hide": {
                    "active": true,
                    "showButton": true
                },
                "filter": {
                    "active": true,
                    "highlight": true,
                    "columnMode": true
                }
            };

            //Data for Employee Objects DT
            var datatableData2 = $scope.listOfPersp;

            //Initialising the datatable with this configuration
            $scope.perspListDT = datatable(datatableConfig2);
            //Setting the data to the datatable
            $scope.perspListDT.setData(datatableData2);
        })
    };

    $scope.fetchEmployees = function() {
        $scope.allMyEmployees = [];
        $http.post('/getEmployees').success(function(resp) {
            $scope.allMyEmployees = resp;

            //Current Employee Objects Datatable Config
            var datatableConfig1 = {
                "name": "simple_datatable",
                "columns": [{
                    "header": "First Name",
                    "property": "fname",
                    "order": true,
                    "type": "text",
                    "edit": true,
                    "selected": true,
                    "render": function(value, line) {
                        if (line.selected) {
                            $scope.newEmpSup = value._id;
                        };
                        myVal = "<span>" + value.fname + "</span>";
                        return myVal
                    }
                }, {
                    "header": "Mid Name",
                    "property": "mname",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "Last Name",
                    "property": "lname",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "National ID",
                    "property": "natid",
                    "order": true,
                    "type": "text",
                    "edit": true
                }, {
                    "header": "Username",
                    "property": "userName",
                    "order": true,
                    "type": "text",
                    "edit": true
                }],
                "edit": {
                    "active": true,
                    "columnMode": true
                },
                "pagination": {
                    "mode": 'local'
                },
                "order": {
                    "mode": 'local'
                },
                "remove": {
                    "active": true,
                    "mode": 'remote',
                    "url": function(value) {
                        return "/dtRemoveEmp/:" + value._id
                    },
                    "method": "delete"
                },
                "save": {
                    "active": true,
                    "mode": 'remote',
                    "url": "/dtEditEmp",
                    "method": "post"
                },
                "hide": {
                    "active": true,
                    "showButton": true
                },
                "filter": {
                    "active": true,
                    "highlight": true,
                    "columnMode": true
                }
            };

            //Data for Employee Objects DT
            var datatableData1 = $scope.allMyEmployees;

            //Initialising the datatable with this configuration
            $scope.compEmpsDT = datatable(datatableConfig1);
            //Setting the data to the datatable
            $scope.compEmpsDT.setData(datatableData1);
        })
    };

    $scope.func560d4062da6ba58814600b162 = function() {
        $scope.perspName = "";
    }

    $scope.func560d4062da6ba58814600b16 = function() {
        $scope.$broadcast('begin560d000d14d04f84393069550', 'Composite start');
    }

    $scope.$on('end560d000d14d04f84393069550', function(event, data) {
        $scope.func560d000d14d04f84393069551()
    });

    $scope.$on('end560d4062da6ba58814600b160', function(event, data) {
        $scope.func560d4062da6ba58814600b161()
    });

    $scope.func560d000d14d04f84393069551 = function() {
        $http.post('/route560d000d14d04f84393069551').success(function(resp) {
            $scope.structInitCompName = "";
            $scope.userNamePref = "";
            $scope.$broadcast('end560d000d14d04f84393069551', 'Composite');
        });

    }

    $scope.func560d4062da6ba58814600b161 = function() {
        $http.post('/route560d4062da6ba58814600b161').success(function(resp) {
            $scope.listOfPersp = resp;
            $scope.$broadcast('end560d4062da6ba58814600b161', 'Composite');
        });

    }

    $scope.saveNewPerspective = function() {
        $http.post('/saveNewPerspective', {
            perspName: $scope.perspName,
            perspDescr: $scope.perspDescr
        }).success(function(resp) {
            $scope.perspName = "";
            $scope.perspDescr = "";
            $scope.listOfPersp = resp;

            //Current Perspective Objects Datatable Config
            var datatableConfig2 = {
                "name": "simple_datatable",
                "columns": [{
                    "header": "Id",
                    "property": "_id",
                    "order": true,
                    "type": "text",
                    "edit": false,
                    "hide": true

                }, {
                    "header": "Perspective",
                    "property": "perspName",
                    "order": true,
                    "type": "text",
                    "edit": true,
                    "selected": true
                }, {
                    "header": "Descr",
                    "property": "perspDescr",
                    "order": true,
                    "type": "text",
                    "edit": true
                }],
                "edit": {
                    "active": true,
                    "columnMode": true
                },
                "pagination": {
                    "mode": 'local'
                },
                "order": {
                    "mode": 'local'
                },
                "remove": {
                    "active": true,
                    "mode": 'remote',
                    "url": function(value) {
                        return "/dtRemovePersp/:" + value._id
                    },
                    "method": "delete"
                },
                "save": {
                    "active": true,
                    "mode": 'remote',
                    "url": "/dtEditPersp",
                    "method": "post"
                },
                "hide": {
                    "active": true,
                    "showButton": true
                },
                "filter": {
                    "active": true,
                    "highlight": true,
                    "columnMode": true
                }
            };

            //Data for Employee Objects DT
            var datatableData2 = $scope.listOfPersp;

            //Initialising the datatable with this configuration
            $scope.perspListDT = datatable(datatableConfig2);
            //Setting the data to the datatable
            $scope.perspListDT.setData(datatableData2);
        });

    }

    $scope.hrEmpCompMsg = '';
    $scope.saveNewEmployee = function() {
        if ($scope.newEmpFName == '' || $scope.newEmpFName == undefined) {
            $scope.hrEmpCompMsg = "<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Invalid First Name! Should be Aphabetical Chars!</strong></div>";
        } else if ($scope.newEmpMName == '' || $scope.newEmpMName == undefined) {
            $scope.hrEmpCompMsg = "<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Invalid Middle Name! Should be Aphabetical Chars!</strong></div>";
        } else if ($scope.newEmpLName == '' || $scope.newEmpLName == undefined) {
            $scope.hrEmpCompMsg = "<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Invalid Last Name! Should be Aphabetical Chars!</strong></div>";
        } else if ($scope.newEmpNatId == '' || $scope.newEmpNatId == undefined) {
            $scope.hrEmpCompMsg = "<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Invalid National ID! Should be Aphabetical Chars!</strong></div>";
        } else if ($scope.newEmpNum == '' || $scope.newEmpNum == undefined) {
            $scope.hrEmpCompMsg = "<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Invalid Employee Number! Should be Aphanumerical Chars!</strong></div>";
        } else {
            $http.post('/saveNewEmployee', {
                fname: $scope.newEmpFName,
                mname: $scope.newEmpMName,
                lname: $scope.newEmpLName,
                natid: $scope.newEmpNatId,
                empno: $scope.newEmpNum,
                empos: $scope.newEmpPos,
                empName: $scope.newEmpFName + " " + $scope.newEmpLName,
                position: $scope.newEmpPos,
                PFNum: $scope.newEmpNum,
                empSup: $scope.newEmpSup,
                userName: $scope.compPref + $scope.newEmpNum,
                password: "admin",
                roles: ["employee"]
            }).success(function(resp) {
                $scope.newEmpFName = "";
                $scope.newEmpMName = "";
                $scope.newEmpLName = "";
                $scope.newEmpNatId = "";
                $scope.newEmpNum = "";
                $scope.newEmpPos = "";
                $scope.newEmpSup = "";

                $scope.hrEmpCompMsg = "<div class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>New Employee Created!</strong></div>";
                fetchEmployees();
            });

        };

    }
}])

.controller('newSupRoleController', ['pendingObjectives', 'approvedObjectives', '$scope', '$http', function (pendingObjectives, approvedObjectives, $scope, $http) {

        $scope.clickObjectives = false;
        $scope.clickEmployees = false;
        $scope.clickScorecards = false; 
        $scope.clickEvaluate = false;
        $scope.clickEmpObj = false;
        $scope.clickConfirmApp = false;
        $scope.clickFinRejectComment = false;
        $scope.clickCustRejectComment = false;
        $scope.clickIntRejectComment = false;
        $scope.clickLearnRejectComment = false;
        $scope.finGetsApproved = false;
        $scope.custGetsApproved = false;
        $scope.intGetsApproved = false;
        $scope.learnGetsApproved = false;
        $scope.finAppMsg = "Finance Objective approved...";
        $scope.custAppMsg = "Customer Objective approved...";
        $scope.intAppMsg = "Internal Objective approved...";
        $scope.learnAppMsg = "Learning Objective approved...";
        $scope.table1 = true;
        $scope.table2 = false;
        $scope.table3 = false;
        $scope.table4 = false;
        $scope.someVar = false;
        $scope.tableCount = 4;
        $scope.disabledAccept = false;
        $scope.disabledReject = false;
        $scope.capturedRatings = [];

        $scope.showBCT = false;
        $scope.showOtherMatrixTypes = false;
        $scope.showTimeMatrix = false;


        // switch kpa template after pespective is created : 
        $scope.changeShowBCT = function () {
            if ($scope.empObjective.perspective == '--Select--') {
                $scope.showBCT = false;
                $scope.empObjective.metrixType = '--Select--';
            } else {
                $scope.showBCT = true;
                $scope.empObjective.metrixType = '--Select--';
                $scope.showOtherMatrixTypes = false;
                $scope.showTimeMatrix = false;
            }
        };

        // switch matrix templates based on matrix type selected : 
        $scope.changeShowMatrix = function (type) {

            if (type == "time") {
                $scope.showOtherMatrixTypes = false;
                $scope.showTimeMatrix = !$scope.showTimeMatrix;
            } else if (type == "--Select--") {
                $scope.showOtherMatrixTypes = false;
                $scope.showTimeMatrix = false;
            } else {
                $scope.showTimeMatrix = false;
                $scope.showOtherMatrixTypes = !$scope.showOtherMatrixTypes;
            }
        };

        // switch matrix templates based on matrix type selected for editing : 
        $scope.changeEditShowMatrix = function (type) {

            if (type == "time") {
                $scope.showEditOtherMatrixTypes = false;
                $scope.showEditTimeMatrix = !$scope.showEditTimeMatrix;
            } else if (type == "--Select--") {
                $scope.showEditOtherMatrixTypes = false;
                $scope.showEditTimeMatrix = false;
            } else {
                $scope.showEditTimeMatrix = false;
                $scope.showEditOtherMatrixTypes = !$scope.showEditOtherMatrixTypes;
            }
        };

        $scope.captureEmp = function (emp) {
            $scope.empToCreateObj = emp;
        }

        var currTab = 1;

        // get pespectives : 
        $scope.getPerspectives = function () {
            $http.post("/getAllPerspectives").success(function (res) {           
                if(res.length > 0){
                    $scope.allPerspectives = res;
                } else if (res.length <= 0) {
                    $scope.allPerspectives = [];
                }

                for (var i = 0; i < $scope.allPerspectives.length; i++) {
                    $scope[$scope.allPerspectives[i].perspName] = [];
                }

            }).error(function () {
                console.log('There is an error');
            }); 
        };

        $scope.incNumber = 0;
        $scope.clickEmpObj = false;

        // retrieve rated objectives : 
        $scope.getSubBscObjs = function(id) {

            $scope.allGroupedPerspectives = [];
            $scope.empTotalScore = 0;
            $scope.empDetailedW = 0;

            $http.post("/getAllSupBsc",{empId:id}).success(function(res) {
                if (res.length > 0) {
                    $scope.showConErr = false;
                    $scope.approvedKPAs = res;
                    for (var i = 0; i < $scope.approvedKPAs.length; i++) {
                        $scope.empTotalScore = $scope.empTotalScore + Number($scope.approvedKPAs[i].score);
                        $scope.empDetailedW = $scope.empDetailedW + Number($scope.approvedKPAs[i].detailedWeighting);
                    }
                } else if (res.length <= 0) {
                    $scope.approvedKPAs = [];
                }

                $scope.scorecardHeights = $scope.approvedKPAs.length + 1;

                for (var i = 0; i < $scope.allPerspectives.length; i++) {
                    $scope[$scope.allPerspectives[i].perspName] = [];

                    for (var j = 0; j < $scope.approvedKPAs.length; j++) {
                        if ($scope.approvedKPAs[j].perspective == $scope.allPerspectives[i].perspName) {
                            $scope[$scope.allPerspectives[i].perspName].push($scope.approvedKPAs[j]);
                        }
                    }
                }

                for (var m = 0; m < $scope.allPerspectives.length; m++) {
                    var entry = {
                        pers: $scope.allPerspectives[m].perspName,
                        objs: $scope[$scope.allPerspectives[m].perspName]
                    };
                    $scope.allGroupedPerspectives.push(entry);
                }

            }).error(function() {
                console.log('There is an error');
            });
        };

        // retrieve approved objectives : 
        $scope.getToApproveObjs = function (empId, empName) {

            $scope.clickEmpObj = true;
            $scope.clickEmployees = false;
            $scope.clickEvaluate = false;
            $scope.clickScorecards = false;
            $scope.allGroupedPerspectives = [];
            $scope.empAlias = {Id: empId, Name: empName};
            $scope.hasEmpToApprObjsError = false;
            $scope.empToApprObjsErrorMsg = null;
            $scope.hasEmpToApprObjsInfo = false;
            $scope.empToApprObjsInfoMsg = null;

            $http.post("/getToApproveObjs",{empId:empId}).success(function (res) {  
                if (res.length <= 0) {
                    $scope.sentKPAs = [];
                    $scope.hasEmpToApprObjsInfo = true;
                    $scope.empToApprObjsInfoMsg = "There are no submitted objectives for employee";
                } else {
                    for (var i = 0; i < res.length; i++) {
                        if (res[i].metrixType == 'time') {
                            res[i].metricOneDef['label'] = res[i].metricOneDef.from +' to '+res[i].metricOneDef.To;
                            res[i].metricTwoDef['label'] = res[i].metricTwoDef.from +' to '+res[i].metricTwoDef.To;
                            res[i].metricThreeDef['label'] = res[i].metricThreeDef.from +' to '+res[i].metricThreeDef.To;
                            res[i].metricFourDef['label'] = res[i].metricFourDef.from +' to '+res[i].metricFourDef.To;
                            res[i].metricFiveDef['label'] = res[i].metricFiveDef.from +' to '+res[i].metricFiveDef.To;
                        }
                    }

                    $scope.sentKPAs = res;

                    $scope.scorecardHeights = $scope.sentKPAs.length + 1;

                    var dummyObj = {kpa:0, kpi:0, metricOneDef:{label:"none"}, metricTwoDef:{label:"none"}, matricThreeDef:{label:"none"}, 
                        matricFourDef:{label:"none"}, matricFiveDef:{label:"none"},showActions:0};

                    // Group objectives by perspectives and store them in array with 
                    // perspective name as the index
                    for (var i = 0; i < $scope.allPerspectives.length; i++) {
                        $scope[$scope.allPerspectives[i].perspName] = [];

                        for (var j = 0; j < $scope.sentKPAs.length; j++) {
                            if ($scope.sentKPAs[j].perspective == $scope.allPerspectives[i].perspName) {
                                $scope.sentKPAs[j].showActions = 1;
                                $scope[$scope.allPerspectives[i].perspName].push($scope.sentKPAs[j]);
                            }
                        }

                        if ($scope[$scope.allPerspectives[i].perspName].length == 0) {
                            $scope[$scope.allPerspectives[i].perspName].push(dummyObj);
                        }
                    }


                    for (var m = 0; m < $scope.allPerspectives.length; m++) {
                        var entry = {pers:$scope.allPerspectives[m].perspName, objs:$scope[$scope.allPerspectives[m].perspName]};
                        $scope.allGroupedPerspectives.push(entry); 
                    }

                    $scope.currentPersp = $scope.allGroupedPerspectives[$scope.incNumber];
                }

            }).error(function () {
                console.log('There is an error');
            }); 
        };

        //var currLenght = $scope.currentPersp.length();
        $scope.getPerspectives();
 
        $scope.clickedObjectives = function(){
            $scope.clickObjectives = true;
            $scope.clickEmployees = true;
            $scope.clickScorecards = false;
            $scope.clickEvaluate =false;
            $scope.clickEmpObj = false;
        }

        $scope.clickedScorecards = function(){
            $scope.clickScorecards = true;
            $scope.clickObjectives = false;
            $scope.clickEvaluate = false;
        }

        $scope.clickedEvaluate = function(){
            $scope.clickEvaluate = true;
            $scope.clickScorecards = false;
            $scope.clickObjectives = false;
        }

        $scope.showEval = function(){
            $scope.clickEmpObj = false;
            $scope.clickEmployees = false;
            $scope.clickEvaluate = true;
            $scope.clickScorecards = false;
            $scope.allGroupedPerspectives = [];

            $http.post("/getToApproveObjs").success(function (res) {                
                if(res.length > 0){
                    $scope.sentKPAs = res;      
                } else if (res.length <= 0) {
                    $scope.sentKPAs = [];
                }

                $scope.scorecardHeights = $scope.sentKPAs.length + 1;

                for (var i = 0; i < $scope.allPerspectives.length; i++) {
                    $scope[$scope.allPerspectives[i].perspName] = [];

                    for (var j = 0; j < $scope.sentKPAs.length; j++) {
                        if ($scope.sentKPAs[j].perspective == $scope.allPerspectives[i].perspName) {
                            $scope[$scope.allPerspectives[i].perspName].push($scope.sentKPAs[j]);
                        }
                    }
                }

                for (var m = 0; m < $scope.allPerspectives.length; m++) {
                    var entry = {pers:$scope.allPerspectives[m].perspName, objs:$scope[$scope.allPerspectives[m].perspName]};
                    $scope.allGroupedPerspectives.push(entry); 
                }

                $scope.currentPersp = $scope.allGroupedPerspectives[$scope.incNumber];

            }).error(function () {
                console.log('There is an error');
            });
        }

        $scope.retrieveEmpObjs = function (empPF, empName) {
 
            $scope.clickEmpObj = true;
            $scope.clickEmployees = false;
            $scope.clickEvaluate = false;
            $scope.clickScorecards = false;

            $scope.empAlias = {PF: empPF, Name: empName};

            pendingObjectives.getPending()
            .success(function (res) {

                $scope.empObjArray = res;

                $scope.specificEmpFinObjs = [];
                $scope.specificEmpCustObjs = []; 
                $scope.specificEmpIntObjs = [];
                $scope.specificEmpLearnObjs = [];

                
                for (var i = 0; i < $scope.empObjArray.length; i++){
                    if (empPF == $scope.empObjArray[i].PFNum) {

                        if ($scope.empObjArray[i].perspective == "finance"){
                            $scope.specificEmpFinObjs.push($scope.empObjArray[i]);
                        }
                         if ($scope.empObjArray[i].perspective == "customer"){
                            $scope.specificEmpCustObjs.push($scope.empObjArray[i]);
                        } 
                        if ($scope.empObjArray[i].perspective == "internal"){
                            $scope.specificEmpIntObjs.push($scope.empObjArray[i]);
                        }
                        if ($scope.empObjArray[i].perspective =="learn"){
                            $scope.specificEmpLearnObjs.push($scope.empObjArray[i]);
                        }
                        else {
                            console.log("No other Objectives found!");
                        }
                    }
                }
            }) 
            .error(function () {
                console.log("Buzzer sound!!!");
            });
        }

        $scope.retrieveEmpEvald = function (empPF, empName) {

            $scope.empEvalObjError = false;
            $scope.empEvalObjErrorMsg = null;

            $http.post('/getSentForSupEval').success( function (res) {
                
                if (res.length > 0) {
                    $scope.submittedForEval = res;
                } else if (res.length <= 0) {
                    $scope.empEvalObjError = true;
                    $scope.empEvalObjErrorMsg = "There are no objectives sent for evaluation for employee";
                }
            })
        }

        $scope.approveCurrObj = function(id) {
            $scope.disabledAccept = true;

            $http.post('/approveCurrObj/' + id).success(function () {
                $scope.emps = null;
                $scope.getToApproveObjs($scope.empAlias.Id,$scope.empAlias.Name);
            })
            .error(function (err) {
                console.log("Bitch didn't leave -_- !!!");
            })

        }

        $scope.captureSupRating = function (obj) {
            var elemPos = $scope.capturedRatings.indexOf(obj);
            if (elemPos == -1) {
                $scope.capturedRatings.push(obj);
            } else {
                $scope.capturedRatings.splice(elemPos, 1);
                $scope.capturedRatings.push(obj);
            }
        };

        $scope.submitEvalSuccess = false;
        $scope.submitEvalSuccessMsg = null;

        $scope.supervisorEvaluation = function () {

            $scope.submitEvalSuccess = false;
            $scope.submitEvalSuccessMsg = null;

            $http.post("/supervisorEvaluation", $scope.capturedRatings).success(function(res) {
                $scope.submitEvalSuccess = true;
                $scope.submitEvalSuccessMsg = res;
                $scope.submittedForEval = [];
            });
        };

        $scope.clickApprove = function () {
        }

        $scope.rejectCurrObj = function () {
            $scope.clickFinRejectComment = true;
        }

        $scope.rejCurrObj = function (id, comment) {

            var rejectCurrObj = {id : id, comm : comment};
            $scope.disabledReject = true;

            $http.post('/rejectCurrentObj/' + id, rejectCurrObj)
            .success(function () {
                //$scope.learnGetsApproved = true;
                $scope.emps = null;
                $scope.getToApproveObjs($scope.empAlias.Id, $scope.empAlias.Name);
            })
            .error(function (err) {
                console.log(err);
            })
        }

        $scope.fnExcelSC = function(){
            var tab_text = '<html xlmns:x="urn:schemas-microsoft-com:office:excel">';
                tab_text = tab_text + '<head><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
                tab_text = tab_text + '<x:Name> Performance contract </x:Name>';
                tab_text = tab_text + '<x:WorksheetOptions><x:Panes></x:Panes></WorksheetOptions></ExcelWorksheet>';
                tab_text = tab_text + '</x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body>';

                tab_text = tab_text + "<table border='1px'>";
                tab_text = tab_text + $('#employeeSCModal').html();
                tab_text = tab_text + '</table></body></html>';

                var data_type = 'data:application/vnd.mx-excel';
                $('#excelID').attr('href', data_type + ', ' + encodeURIComponent(tab_text));
                $('#excelID').arrr('download', 'PerformanceContract.xls');
        }

        $scope.nextPerspective = function() {
            $scope.incNumber = $scope.incNumber + 1;

            if ($scope.incNumber == $scope.allPerspectives.length) {
                $scope.incNumber = 0;
            }

            $scope.currentPersp = $scope.allGroupedPerspectives[$scope.incNumber];

        }

        $scope.prevPerspective = function() {
            if (currTab!= $scope.tableCount) {
                currTab--;
                $scope["table"+currTab] = true;
                $scope["table"+(currTab+1)] = false;

                 if (currTab < 1) {
                    currTab = $scope.tableCount;
                    $scope["table"+currTab] = true;
                    $scope["table"+(currTab+1)] = false;
                }
            } else if (currTab == $scope.tableCount) {
                currTab--;
                $scope["table"+currTab] = true;
                $scope["table"+($scope.tableCount)] = false;

                if (currTab < 1) {
                    currTab = $scope.tableCount;
                    $scope["table"+currTab] = true;
                    $scope["table"+(currTab+1)] = false;
                }
            } 
        }

        //Initial variables used in "Edit Objective" button for Finance Objective
        $scope.financeEditLabel = true;
        $scope.financeUnedittable = true;
        $scope.finDSOUnedittable = true;
        $scope.finDescriptionUnedittable = true;
        $scope.finMetricOneUnedittable = true;
        $scope.finMetricTwoUnedittable = true;
        $scope.finMetricThreeUnedittable = true;
        $scope.finMetricFourUnedittable = true;
        $scope.finMetricFiveUnedittable = true;
        $scope.financeEditLabelText = "Unlock Objective";



        //Initial variables used in "Edit Objective" button for Customer Objective
        $scope.customerEditLabel = true;
        $scope.customerUnedittable = true;
        $scope.customerEditLabelText = "Unlock Objective";

        //Initial variables used in "Edit Objective" button for internal Objective
        $scope.isRejected = false;

        $scope.internalEditLabel = true;
        $scope.internalUnedittable = true;
        $scope.internalEditLabelText = "Unlock Objective";

        //Initial variables used in "Edit Objective" button for Learn Objective
        $scope.learnEditLabel = true;
        $scope.learnUnedittable = true;
        $scope.learnEditLabelText = "Unlock Objective";

        //Leave table of employees visible (rather than toggling between 'show and hide') 
        $scope.empKPAs = true;


        //Edit Finance Objective Button logic for toggling between states of "Edit" && "Lock"
        $scope.editFinanceObjective = function(iden) {
            $scope.financeUnedittable = !$scope.financeUnedittable;
            $scope.financeEditLabel = !$scope.financeEditLabel;

             if ($scope.financeEditLabel === false) {
                $scope.financeEditLabelText = "Lock Objective";
            }
            else if ($scope.financeEditLabel === true) {
                $scope.financeEditLabelText = "Unlock Objective";
            }
        }

        $scope.rejectFinanceObjective = function() {
            $scope.isRejected = true;
        }
        //Edit Customer Objective Button logic for toggling between states of "Edit" && "Lock"
        $scope.editCustomerObjective = function() {
            $scope.customerUnedittable = !$scope.customerUnedittable;
            $scope.customerEditLabel = !$scope.customerEditLabel;

             if ($scope.customerEditLabel === false) {
                $scope.customerEditLabelText = "Lock Objective";
            }
            else if ($scope.customerEditLabel === true) {
                $scope.customerEditLabelText = "Edit Objective";
            }
        }
        //Edit Internal Objective Button logic for toggling between states of "Edit" && "Lock"
        $scope.editInternalObjective = function() {
            $scope.internalUnedittable = !$scope.internalUnedittable;
            $scope.internalEditLabel = !$scope.internalEditLabel;

             if ($scope.internalEditLabel === false) {
                $scope.internalEditLabelText = "Lock Objective";
            }
            else if ($scope.internalEditLabel === true) {
                $scope.internalEditLabelText = "Edit Objective";
            }
        }
        //Edit Learn Objective Button logic for toggling between states of "Edit" && "Lock"
        $scope.editLearnObjective = function() {
            $scope.learnUnedittable = !$scope.learnUnedittable;
            $scope.learnEditLabel = !$scope.learnEditLabel;

             if ($scope.learnEditLabel === false) {
                $scope.learnEditLabelText = "Lock Objective";
            }
            else if ($scope.learnEditLabel === true) {
                $scope.learnEditLabelText = "Edit Objective";
            }
        }

        pendingObjectives.getPending()
        .success(function (res) {
            $scope.empKPAVal = res.length;
        });

        $scope.retrieveApproved = function (empPF, empName) {
            approvedObjectives.getApproved()
            .success(function (res) {
                
                $scope.empAlias = {PF: empPF, Name: empName};
                $scope.scorecardHeight = res.length + 1;
                $scope.appFinObj = [];
                $scope.appCustObj = [];
                $scope.appIntObj = [];
                $scope.appLearnObj = [];

                for (var i = 0; i<res.length; i++) {
                    if (res[i].perspective == "finance") {
                        $scope.appFinObj.push(res[i]);
                    }
                    else if (res[i].perspective == "customer") {
                        $scope.appCustObj.push(res[i]);
                    }
                    else if (res[i].perspective == "internal") {
                        $scope.appIntObj.push(res[i]);
                    }
                    else if (res[i].perspective == "learn") {
                        $scope.appLearnObj.push(res[i]);
                    }
                }

            })
            .error(function () {
                console.log("Could not retrieve Approved Objectives");
            });
        }


        $scope.getEmps = function() {
        }

        $scope.retrieveEmployees = function () {
            $http.post('/getEmpsPendingObjs').success( function (response) {
                $scope.emps = response;
            })
        }

        $scope.approveFinanceObjective = function (id, PFNum, finDescription, finDSO, finOneDef, finTwoDef, finThreeDef, finFourDef, finFiveDef) {
            $scope.approveFinObj = {PF: PFNum, description: finDescription, DSO: finDSO, oneDef: finOneDef, twoDef: finTwoDef, threeDef: finThreeDef, fourDef: finFourDef, fiveDef: finFiveDef, perspective: "finance"}
            $http.post('/approveFinanceObjective/' + id, $scope.approveFinObj)
            .success(function () {
                $('#successObjAlert12').show(500);
            })
            .error(function (err) {
                console.log("Objective empty!!");
            })
        }

        $scope.approveCustomerObjective = function (id, PFNum, custDescription, custDSO, custOneDef, custTwoDef, custThreeDef, custFourDef, custFiveDef) {
            $scope.approveCustObj = {PF: PFNum, description: custDescription, DSO: custDSO, oneDef: custOneDef, twoDef: custTwoDef, threeDef: custThreeDef, fourDef: custFourDef, fiveDef: custFiveDef, perspective: "customer"}
            $http.post('/approveCustomerObjective/' + id, $scope.approveCustObj)
            .success(function () {
                $('#successObjAlert22').show(500);
            })
            .error(function (err) {
                console.log(err);
            })
        }

        $scope.approveInternalObjective = function (id, PFNum, intDescription, intDSO, intOneDef, intTwoDef, intThreeDef, intFourDef, intFiveDef) {
            $scope.approveIntObj = {PF: PFNum, description: intDescription, DSO: intDSO, oneDef: intOneDef, twoDef: intTwoDef, threeDef: intThreeDef, fourDef: intFourDef, fiveDef: intFiveDef, perspective: "internal"}
            $http.post('/approveInternalObjective/' + id, $scope.approveIntObj)
            .success(function () {
                $('#successObjAlert32').show(500);
            })
            .error(function (err) {
                console.log(err);
            })
        }

        $scope.approveLearnObjective = function (id, PFNum, learnDescription, learnDSO, learnOneDef, learnTwoDef, learnThreeDef, learnFourDef, learnFiveDef) {
            $scope.approveLearnObj = {PF: PFNum, description: learnDescription, DSO: learnDSO, oneDef: learnOneDef, twoDef: learnTwoDef, threeDef: learnThreeDef, fourDef: learnFourDef, fiveDef: learnFiveDef, perspective: "learn"}
            $http.post('/approveLearnObjective/' + id, $scope.approveLearnObj)
            .success(function () {
                $('#successObjAlert42').show(500);
            })
            .error(function (err) {
                console.log(err);
            })
        }
}])

// unused
.controller('customerPerspectiveController', function($scope, $http) {})
.controller('financePerspectiveController', function($scope, $http) {})
.controller('learnPerspectiveController', function($scope, $http) {})
.controller('internalPerspectiveController', function($scope, $http) {})
.controller('hrRolesController', ['allObjectives', function(allObjectives) {}])
.controller('supEmpObjsCtrl', ['allObjectives', function(allObjectives) {}])
.controller('adminController', ['allObjectives', function(allObjectives) {}]);
