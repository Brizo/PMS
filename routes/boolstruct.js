//DB Connection
//include access to the MongoDB driver for Node
var mongojs = require("mongojs") 
//localhost specified       
    ,host = "127.0.0.1" 
//use the default port for Mongo server/client connections          
    ,port = "27017"             
//init BSCIMS (database) and Objectives (collection)
    ,db = mongojs("sebentiledb", ["structure"]);

var fs = require('fs');
//var db = require("mongojs").connect(dburl, collections);
var Q = require('q');

var ObjectId = db.ObjectId;

//DOM Manipulator
var cheerio = require('cheerio');

function boolNode(nodeIsn, nodeName, nodeParIsn, nodeType, nodeIcon, newData) {
    var self = this;
    //Properties
    self.nodeIsn = nodeIsn;
    self.nodeName = nodeName;
    self.nodeParIsn = nodeParIsn;
    self.nodeType = nodeType;
    self.nodeIcon = nodeIcon;
    self.childNodes = [];
    self.nodeData = newData;

    //Methods
    self.setParent = function(newParIsn) {
        self.nodeParIsn = newParIsn;
    }

    self.getData = function() {
        return self.nodeData;
    }

    self.setData = function(newData) {
        self.nodeData = newData;
    }
}

function boolTree() {
    var self = this;
    self.treeData = [];

    //var rootNode = new boolNode(rootNodeIsn, 0,null);
    //this.treeData.push(rootNode);

    this.inArray = function(value, array) {
        return array.indexOf(value) > -1;
    }

    this.isArr = function(arr) {
        return Object.prototype.toString.call(arr) === '[object Array]';
    }

    this.inMulti = function(needle, haystack) {
        found = false;
        haystack.forEach(function(stack) {
            //console.log(stack);
            stack.forEach(function(val) {
                if (val == needle) {
                    //console.log(val);
                    found = true;
                }
            });
        })

        return found;
    }

    this.pushNode = function(nodeIsn, nodeName, nodeParIsn, nodeType, nodeIcon, pos) {
        var nodeData = {
            //_id: nodeIsn,
            text: nodeName,
            //parentObjid: nodeParIsn,
            //structType: nodeType,
            icon: nodeIcon,
            //Nodes:[]
        }
        var myNode = new boolNode(nodeIsn, nodeName, nodeParIsn, nodeType, nodeIcon, nodeData);
        //console.dir(myNode);
        self.treeData[pos] = myNode;
    }

    this.hasChildren = function(nodeParIsn) {
        self.treeData.forEach(function(node) {
            if (node.nodeParIsn == nodeParIsn) {
                //console.log(nodeParIsn);
                return true;
            };
        });

        return false;
    }

    this.getChildren = function(nodeParIsn) {
        children = [];
        self.treeData.forEach(function(node) {
            if (node.nodeParIsn == nodeParIsn) {
                children.push(node);
            };
        });

        return children;
    }

    this.hasSiblings = function(nodeIsn) {
        parent = null;
        sibs = false;

        self.treeData.forEach(function(node) {
            if (node.nodeIsn == nodeIsn) {
                parent = node.nodeParIsn;
                return;
            };
        });

        self.treeData.forEach(function(node) {
            if (node.nodeParIsn == parent && node.nodeIsn != nodeIsn && node.nodeParIsn != null) {
                sibs = true;
                return;
            };
        });

        return sibs;
    }

    this.getSiblings = function(nodeIsn) {
        parent = null;
        sibs = [];

        self.treeData.forEach(function(node) {
            if (node.nodeIsn == nodeIsn) {
                parent = node.nodeParIsn;
                return;
            }
        });

        self.treeData.forEach(function(node) {
            if (node.nodeParIsn == parent && node.nodeIsn != nodeIsn) {
                sibs.push(node.nodeIsn);
            };
        });

        return sibs;
    }

    this.printTree = function() {
        levels = [];

        self.treeData.forEach(function(node) {
            sibs = [];
            if (!(self.inMulti(node.nodeIsn, levels))) {
                if (node.nodeParIsn == 0) {
                    sibs.push(node.nodeIsn);
                    levels.push(sibs);
                    //console.log(node);
                } else {
                    nodeSibs = self.getSiblings(node.nodeIsn);
                    nodeSibs.push(node.nodeIsn);

                    if (self.hasSiblings(node.nodeParIsn)) {
                        currKey = levels.length;
                        nodeParSibs = levels[currKey - 1];
                        //console.log(self.treeData);
                        nodeParSibs.forEach(function(parent) {
                            if (parent != node.nodeParIsn) {
                                children = self.getChildren(parent);
                                children.forEach(function(child) {
                                    nodeSibs.push(child.nodeIsn);
                                });
                            };
                        });
                        levels.push(nodeSibs);
                    } else {
                        levels.push(nodeSibs);
                    }
                }
            }
        });

        return levels;
    }

    this.showStruct = function(){
        return self.treeData[0];
    }

    this.depth = function() {
        tree = self.printTree();

        return tree.length;
    }

    this.getLevel = function(x) {
        tree = self.printTree();

        return tree[x];
    }

    this.setNodeData = function(nodeIsn, newData) {
        self.treeData.forEach(function(node) {
            if (node.nodeIsn == nodeIsn) {
                node.nodeData.nodes = newData;
            };
        });
    }

    this.getNodeData = function(nodeIsn) {
        self.treeData.forEach(function(node) {
            if (node.nodeIsn == nodeIsn) {
                nodeData = node.nodeData.nodes;
            };
        });
        return nodeData;
    }

    this.concatSibs = function(nodeParIsn) {
        nodes = self.getChildren(nodeParIsn);
        //nodes.sort(self.dynamicSort("seq"));
        sibsData = [];

        nodes.forEach(function(node) {
            //console.dir(node);
            sibsData.push(node.nodeData);
        });

        if (sibsData.length > 0) {return sibsData};        
    }

    this.attrSet = function(nodeIsn) {
        self.treeData.forEach(function(node) {
            if (node.nodeIsn == nodeIsn) {
                //console.log(node);
                if (node.baseWigName == "panel") {
                    panelType = "panel-" + node.nodeOps.panelType;
                    panelWidthElem = '<div class="col-sm-' + node.nodeWidth + ' col-sm-offset-' + node.nodeOffset + '"></div>';
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    if ($('div').hasClass('panel')) {
                        $('div').addClass(panelType);
                        //Set controller if one exists
                        if (node.nodeCtrl.length > 0) {
                            renderCtrl = "ctrl" + node.nodeCtrl;
                            $('div').attr('ng-controller', renderCtrl);
                        };

                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('div').attr('ng-click', renderFunc);
                            };
                        };
                    }
                    newParData = $.html();
                    $ = cheerio.load(panelWidthElem);
                    $('div').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData);

                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "accordion") {
                    //panelType = "panel-"+node.nodeOps.panelType;
                    panelWidthElem = '<div class="col-sm-' + node.nodeWidth + ' col-sm-offset-' + node.nodeOffset + '"></div>';
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    if ($('div').hasClass('panel-group')) {
                        $('div').attr('id', node.nodeId);
                        //Set controller if one exists
                        if (node.nodeCtrl.length > 0) {
                            renderCtrl = "ctrl" + node.nodeCtrl;
                            $('div').attr('ng-controller', renderCtrl);
                        };

                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('div').attr('ng-click', renderFunc);
                            };
                        };
                    }
                    newParData = $.html();
                    $ = cheerio.load(panelWidthElem);
                    $('div').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData);

                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "accordion-part") {
                    panelType = "panel-" + node.nodeOps.panelType;
                    panelWidthElem = '<div class="col-sm-' + node.nodeWidth + '"></div>';
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);
                    $('div').attr('id', "obj" + nodeIsn); //Set obj's html id
                    if ($('div').hasClass('panel')) {
                        $('div').addClass(panelType);
                        //Set controller if one exists
                        if (node.nodeCtrl.length > 0) {
                            renderCtrl = "ctrl" + node.nodeCtrl;
                            $('div').attr('ng-controller', renderCtrl);
                        };

                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('div').attr('ng-click', renderFunc);
                            };
                        };
                    }
                    newParData = $.html();
                    //$ = cheerio.load(panelWidthElem);
                    //$('div').append(newParData);

                    //newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "accordion-panel-body") {
                    //panelType = "panel-"+node.nodeOps.panelType;
                    //panelWidthElem = '<div class="col-sm-'+node.nodeWidth+'"></div>';
                    //console.log(node);
                    partCont = '<div id="' + node.nodeOps.parName + '" class="panel-collapse collapse"></div>';
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);
                    $('div').attr('id', "obj" + nodeIsn); //Set obj's html id
                    if ($('div').hasClass('panel')) {
                        $('div').addClass(panelType);
                        //Set controller if one exists
                        if (node.nodeCtrl.length > 0) {
                            renderCtrl = "ctrl" + node.nodeCtrl;
                            $('div').attr('ng-controller', renderCtrl);
                        };

                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('div').attr('ng-click', renderFunc);
                            };
                        };
                    }
                    newParData = $.html();
                    $ = cheerio.load(partCont);
                    $('div').append(newParData);

                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "tab") {
                    tabOffset = "col-sm-offset-" + node.nodeOffset;
                    tabWidthElem = '<div class="col-sm-' + node.nodeWidth + '"></div>';
                    newParData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(tabWidthElem);
                    $('div').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').addClass(tabOffset);
                    //Set controller if one exists
                    if (node.nodeCtrl.length > 0) {
                        renderCtrl = "ctrl" + node.nodeCtrl;
                        $('div').attr('ng-controller', renderCtrl);
                    };

                    //Check for actions and set them
                    if (node.nodeActs.length > 0) {
                        myFunc = node.nodeActs[0];
                        renderFunc = "func" + node.nodeActs[0] + "()";
                        renderEvent = node.nodeActEvents[myFunc];
                        if (renderEvent == "Click") {
                            $('div').attr('ng-click', renderFunc);
                        };
                    };
                    $('div').append(newParData);
                    newParData = $.html();
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "tab-link") {
                    linkTit = node.nodeOps.navtitle;
                    linkRef = "#" + node.nodeOps.navid;
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);
                    $('li').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('a').attr('href', linkRef);
                    $('a').text(linkTit);
                    //Check for actions and set them
                    if (node.nodeActs.length > 0) {
                        myFunc = node.nodeActs[0];
                        renderFunc = "func" + node.nodeActs[0] + "()";
                        renderEvent = node.nodeActEvents[myFunc];
                        if (renderEvent == "Click") {
                            $('a').attr('ng-click', renderFunc);
                        };
                    };
                    newParData = $.html();
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "tab-link-menu") {
                    linkTit = node.nodeOps.navtitle;
                    linkRef = "#" + node.nodeOps.navid;
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);
                    $('li').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('a').text(linkTit);
                    //Check for actions and set them
                    if (node.nodeActs.length > 0) {
                        myFunc = node.nodeActs[0];
                        renderFunc = "func" + node.nodeActs[0] + "()";
                        renderEvent = node.nodeActEvents[myFunc];
                        if (renderEvent == "Click") {
                            $('a').attr('ng-click', renderFunc);
                        };
                    };
                    newParData = $.html();
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "tab-navigator") {
                    navType = "nav-" + node.nodeOps.tabType;
                    navStack = "nav-" + node.nodeOps.tabStacking;
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);
                    $('ul').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('ul').addClass(navType);
                    $('ul').addClass(navStack);
                    //Set controller if one exists
                    if (node.nodeCtrl.length > 0) {
                        renderCtrl = "ctrl" + node.nodeCtrl;
                        $('ul').attr('ng-controller', renderCtrl);
                    };

                    //Check for actions and set them
                    if (node.nodeActs.length > 0) {
                        myFunc = node.nodeActs[0];
                        renderFunc = "func" + node.nodeActs[0] + "()";
                        renderEvent = node.nodeActEvents[myFunc];
                        if (renderEvent == "Click") {
                            $('ul').attr('ng-click', renderFunc);
                        };
                    };
                    newParData = $.html();
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "tab-pane") {
                    linkRef = node.nodeOps.navid + "";
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);
                    $('div').attr('id', "obj" + nodeIsn); //Set obj's html id
                    if (node.nodeCtrl.length > 0) {
                        renderCtrl = "ctrl" + node.nodeCtrl;
                        $('div').attr('ng-controller', renderCtrl);
                    };
                    if ($('div').hasClass('tab-pane')) {
                        $('div').attr('id', linkRef);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.tab-pane').attr('ng-click', renderFunc);
                            };
                        };
                    }
                    newParData = $.html();
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "panel-header") {
                    titSize = node.nodeOps.panelTitleSize;
                    tit = node.nodeOps.panelTitle;
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);
                    $('.panel-heading').attr('id', "obj" + nodeIsn); //Set obj's html id
                    panelTitle = "<h" + titSize + ">" + tit + "</h" + titSize + ">";
                    if ($('div').hasClass('panel-title')) {
                        $('.panel-title').append(panelTitle);
                        //Set controller if one exists
                        if (node.nodeCtrl.length > 0) {
                            renderCtrl = "ctrl" + node.nodeCtrl;
                            $('div').attr('ng-controller', renderCtrl);
                        };

                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.panel-title').attr('ng-click', renderFunc);
                            };
                        };
                    }
                    newParData = $.html();
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "accordion-panel-header") {
                    //console.log(node.objOps);
                    titSize = node.nodeOps.panelTitleSize;
                    tit = node.nodeOps.panelTitle;
                    titRef = '<a data-toggle="collapse" data-parent="#' + node.nodeOps.accoId + '" href="#' + node.nodeOps.parName + '">' + tit + '</a>';
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);
                    $('.panel-heading').attr('id', "obj" + nodeIsn); //Set obj's html id
                    panelTitle = "<h" + titSize + ">" + titRef + "</h" + titSize + ">";
                    if ($('div').hasClass('panel-title')) {
                        $('.panel-title').append(panelTitle);
                        //Set controller if one exists
                        if (node.nodeCtrl.length > 0) {
                            renderCtrl = "ctrl" + node.nodeCtrl;
                            $('div').attr('ng-controller', renderCtrl);
                        };

                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.panel-title').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.panel-title').attr('ng-change', renderFunc);
                            }
                        };
                    }
                    newParData = $.html();
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "form") {
                    //console.log(node.baseWigName);
                    formType = "form-" + node.nodeOps.formType;
                    formWidthElem = '<div class="col-sm-' + node.nodeWidth + '"></div>';
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    //Set controller if one exists
                    if (node.nodeCtrl.length > 0) {
                        renderCtrl = "ctrl" + node.nodeCtrl;
                        $('form').attr('ng-controller', renderCtrl);
                    };
                    if ($('form').hasClass('bool-container')) {
                        $('form').addClass(formType);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-container').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-container').attr('ng-change', renderFunc);
                            }
                        };
                    }
                    newParData = $.html();
                    $ = cheerio.load(formWidthElem);
                    $('div').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);

                } else if (node.baseWigName == "textfield") {
                    inpLabel = node.nodeOps.textInputLabel;
                    inpPlaceHolder = node.nodeOps.textInputPlaceHolder;
                    modelName = "\"" + node.objName + "\"";
                    inpRequired = node.nodeOps.textInputRequired; //IMPORTANT ==> CODE LABEL LENGTH
                    fieldLabel = '<label for="' + node.nodeId + '" class="col-sm-2 control-label">' + inpLabel + ':</label>';
                    textWidthElem = '<div class="col-sm-' + node.nodeWidth + '"></div>';
                    grp = "<div class='form-group'></div>"
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    if ($('.form-control').hasClass('bool-input')) {
                        //Set model name for form component
                        $('.bool-input').attr('ng-model', modelName);
                        //Set input place holder
                        $('.bool-input').attr('placeholder', inpPlaceHolder);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-input').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-input').attr('ng-change', renderFunc);
                            }
                        };
                        //console.log(parData);
                        //$('.bool-input').attr('id', node.nodeId);
                        $('.bool-input').attr('ng-model', node.nodeId);
                    }
                    newParData = $.html();
                    $ = cheerio.load(textWidthElem);
                    $('div').append(newParData);
                    newParData = $.html();
                    newParData1 = fieldLabel + newParData;
                    $ = cheerio.load(grp);
                    $('.form-group').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData1);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "textarea") {
                    inpLabel = node.nodeOps.textInputLabel;
                    inpPlaceHolder = node.nodeOps.textInputPlaceHolder;
                    modelName = "\"" + node.objName + "\"";
                    inpRequired = node.nodeOps.textInputRequired; //IMPORTANT ==> CODE LABEL LENGTH
                    fieldLabel = '<label for="' + node.nodeId + '" class="col-sm-2 control-label">' + inpLabel + ':</label>';
                    textWidthElem = '<div class="col-sm-' + node.nodeWidth + '"></div>';
                    grp = "<div class='form-group'></div>"
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    if ($('.form-control').hasClass('bool-input')) {
                        //Set model name for form component
                        $('.bool-input').attr('ng-model', modelName);
                        //Set input place holder
                        $('.bool-input').attr('placeholder', inpPlaceHolder);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-input').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-input').attr('ng-change', renderFunc);
                            }
                        };
                        //console.log(parData);
                        //$('.bool-input').attr('id', node.nodeId);
                        $('.bool-input').attr('ng-model', node.nodeId);
                    }
                    newParData = $.html();
                    $ = cheerio.load(textWidthElem);
                    $('div').append(newParData);
                    newParData = $.html();
                    newParData1 = fieldLabel + newParData;
                    $ = cheerio.load(grp);
                    $('.form-group').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData1);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "select") {
                    inpLabel = node.nodeOps.textInputLabel;
                    inpLOV = node.nodeOps.inputSelectLOV;
                    dispField = node.nodeOps.selectDispField;
                    valField = node.nodeOps.selectValField;
                    //inpRepeatCommand = "item in "+inpLOV;
                    inpOpts = "<option ng-repeat='item in " + inpLOV + "' value={{item." + valField + "}}>{{item." + dispField + "}}</option>";
                    modelName = "\"" + node.objName + "\"";
                    inpRequired = node.nodeOps.textInputRequired; //IMPORTANT ==> CODE LABEL LENGTH
                    fieldLabel = '<label for="' + node.nodeId + '" class="col-sm-2 control-label">' + inpLabel + ':</label>';
                    textWidthElem = '<div class="col-sm-' + node.nodeWidth + '"></div>';
                    grp = "<div class='form-group'></div>"
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    //$('.bool-input').attr('ng-repeat', inpRepeatCommand);
                    $('.bool-input').html(inpOpts);
                    if ($('.form-control').hasClass('bool-input')) {
                        //Set model name for form component
                        $('.bool-input').attr('ng-model', modelName);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-input').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-input').attr('ng-change', renderFunc);
                            }
                        };
                        //console.log(parData);
                        //$('.bool-input').attr('id', node.nodeId);
                        $('.bool-input').attr('ng-model', node.nodeId);
                    }
                    newParData = $.html();
                    $ = cheerio.load(textWidthElem);
                    $('div').append(newParData);
                    newParData = $.html();
                    newParData1 = fieldLabel + newParData;
                    $ = cheerio.load(grp);
                    $('.form-control').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData1);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "password") {
                    inpLabel = node.nodeOps.textInputLabel;
                    modelName = "\"" + node.objName + "\"";
                    inpRequired = node.nodeOps.textInputRequired; //IMPORTANT ==> CODE LABEL LENGTH
                    fieldLabel = '<label for="' + node.nodeId + '" class="col-sm-2 control-label">' + inpLabel + ':</label>';
                    textWidthElem = '<div class="col-sm-' + node.nodeWidth + '"></div>';
                    grp = "<div class='form-group'></div>"
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    if ($('.form-control').hasClass('bool-input')) {
                        //Set model name for form component
                        $('.bool-input').attr('ng-model', modelName);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-input').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-input').attr('ng-change', renderFunc);
                            }
                        };
                        //console.log(parData);
                        //$('.bool-input').attr('id', node.nodeId);
                        $('.bool-input').attr('ng-model', node.nodeId);
                    }
                    newParData = $.html();
                    $ = cheerio.load(textWidthElem);
                    $('div').append(newParData);
                    newParData = $.html();
                    newParData1 = fieldLabel + newParData;
                    $ = cheerio.load(grp);
                    $('.form-group').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData1);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "hidden") {
                    inpLabel = node.nodeOps.textInputLabel;
                    inpMin = node.nodeOps.textInputMin;
                    inpMax = node.nodeOps.textInputMax;
                    inpReg = node.nodeOps.textInputReg;
                    modelName = "\"" + node.objName + "\"";
                    inpRequired = node.nodeOps.textInputRequired; //IMPORTANT ==> CODE LABEL LENGTH
                    fieldLabel = '<label for="' + node.nodeId + '" class="col-sm-2 control-label">' + inpLabel + ':</label>';
                    textWidthElem = '<div class="col-sm-' + node.nodeWidth + '"></div>';
                    grp = "<div class='form-group'></div>"
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    if ($('.form-control').hasClass('bool-input')) {
                        //Set model name for form component
                        $('.bool-input').attr('ng-model', modelName);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-input').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-input').attr('ng-change', renderFunc);
                            }
                        };
                        //console.log(parData);
                        //$('.bool-input').attr('id', node.nodeId);
                        $('.bool-input').attr('ng-model', node.nodeId);
                    }
                    newParData = $.html();
                    $ = cheerio.load(textWidthElem);
                    $('div').append(newParData);
                    newParData = $.html();
                    newParData1 = fieldLabel + newParData;
                    $ = cheerio.load(grp);
                    $('.form-group').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData1);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "button") {
                    inpLabel = node.nodeOps.textInputLabel;
                    inpSizeType = node.nodeOps.inputSizeType;
                    inpBtnType = node.nodeOps.inputBtnType;
                    inpGlyph = node.nodeOps.inputGlyph;
                    inpHasGlph = node.nodeOps.inputHasGlyph;
                    modelName = "\"" + node.objName + "\"";
                    inpRequired = node.nodeOps.textInputRequired; //IMPORTANT ==> CODE LABEL LENGTH
                    //fieldLabel = '<label for="'+node.nodeId+'" class="col-sm-2 control-label">'+inpLabel+':</label>';
                    textWidthElem = '<div class="col-sm-' + node.nodeWidth + ' col-sm-offset-' + node.nodeOffset + '"></div>';
                    grp = "<div class='form-group'></div>"
                    parData = self.getNodeData(nodeIsn);
                    $ = cheerio.load(parData);

                    $('button').text(inpLabel);
                    if (inpHasGlph) {
                        $('button').addClass('glyphicon');
                        $('button').addClass(inpGlyph);
                    };
                    $('button').addClass(inpSizeType);
                    $('button').addClass(inpBtnType);

                    if ($('.form-control').hasClass('bool-input')) {
                        //Set model name for form component
                        $('.bool-input').attr('ng-model', modelName);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-input').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-input').attr('ng-change', renderFunc);
                            }
                        };
                        //console.log(parData);
                        //$('.bool-input').attr('id', node.nodeId);
                        $('.bool-input').attr('ng-model', node.nodeId);
                    }

                    $('.bool-input').removeClass('form-control');
                    newParData = $.html();
                    $ = cheerio.load(textWidthElem);
                    $('div').append(newParData);
                    newParData = $.html();
                    newParData1 = newParData;
                    $ = cheerio.load(grp);
                    $('.form-group').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData1);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "checkbox") {
                    inpLabel = node.nodeOps.textInputLabel;
                    inpMin = node.nodeOps.textInputMin;
                    inpMax = node.nodeOps.textInputMax;
                    inpReg = node.nodeOps.textInputReg;
                    modelName = "\"" + node.objName + "\"";
                    inpRequired = node.nodeOps.textInputRequired; //IMPORTANT ==> CODE LABEL LENGTH
                    textWidthElem = '<div class="col-sm-' + node.nodeWidth + ' col-sm-offset-' + node.nodeOffset + '"></div>';
                    //textWidthElem = '<div class="col-sm"></div>';
                    grp = "<div class='form-group'></div>"
                    parData = self.getNodeData(nodeIsn);
                    parData = '<div class="checkbox"><label>' + parData + inpLabel + '</label></div>';
                    $ = cheerio.load(parData);

                    if ($('.form-control').hasClass('bool-input')) {
                        //Set model name for form component
                        $('.bool-input').attr('ng-model', modelName);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-input').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-input').attr('ng-change', renderFunc);
                            }
                        };
                        //console.log(parData);
                        //$('.bool-input').attr('id', node.nodeId);
                        $('.bool-input').attr('ng-model', node.nodeId);
                    }

                    $('.bool-input').removeClass('form-control');
                    newParData = $.html();
                    $ = cheerio.load(textWidthElem);
                    $('div').append(newParData);
                    newParData = $.html();
                    newParData1 = newParData;
                    $ = cheerio.load(grp);
                    $('.form-control').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData1);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);
                } else if (node.baseWigName == "radiobutton") {
                    inpLabel = node.nodeOps.textInputLabel;
                    dispField = node.nodeOps.radioDispField;
                    valField = node.nodeOps.radioValField;
                    modelName = "\"" + node.objName + "\"";
                    //inpRequired = node.nodeOps.textInputRequired; //IMPORTANT ==> CODE LABEL LENGTH
                    textWidthElem = '<div class="col-sm-' + node.nodeWidth + ' col-sm-offset-' + node.nodeOffset + '"></div>';
                    //textWidthElem = '<div class="col-sm"></div>';
                    grp = "<div class='form-group' data-toggle='buttons'></div>"
                        //inpOpts = "<option ng-repeat='item in "+inpLOV+"' value={{item."+valField+"}}>{{item."+dispField+"}}</option>";
                    inpOpts = "<label ng-repeat='item in " + inpLOV + "' class='btn btn-default'><input class='bool-input' type='radio' name='" + inpLabel + "' value={{item." + valField + "}}' />{{item." + dispField + "}}</label>";
                    parData = "<div class='btn-group'>" + inpOpts + "</div>";
                    $ = cheerio.load(parData);

                    if ($('input').hasClass('bool-input')) {
                        //Set model name for form component
                        $('.bool-input').attr('ng-model', modelName);
                        //Check for actions and set them
                        if (node.nodeActs.length > 0) {
                            myFunc = node.nodeActs[0];
                            renderFunc = "func" + node.nodeActs[0] + "()";
                            renderEvent = node.nodeActEvents[myFunc];
                            if (renderEvent == "Click") {
                                $('.bool-input').attr('ng-click', renderFunc);
                            } else if (renderEvent == "Change") {
                                $('.bool-input').attr('ng-change', renderFunc);
                            }
                        };
                        //console.log(parData);
                        //$('.bool-input').attr('id', node.nodeId);
                        $('.bool-input').attr('ng-model', node.nodeId);
                    }

                    //$('.bool-input').removeClass('form-control');
                    newParData = $.html();
                    $ = cheerio.load(textWidthElem);
                    $('div').append(newParData);
                    newParData = $.html();
                    newParData1 = newParData;
                    $ = cheerio.load(grp);
                    $('div').attr('id', "obj" + nodeIsn); //Set obj's html id
                    $('div').append(newParData1);
                    newParData = $.html();
                    //console.log(newParData);
                    self.setNodeData(nodeIsn, newParData);
                }

                return;
            };
        });
    }

    this.init = function() {
        //Find all App Objects and set treeData
        db.structure.find({}).sort({
            _id: 1
        }, function(err, data) {
            if (err || !data) console.log("No data found!");
            else {
                numNodes = 0;
                data.forEach(function(node) {
                    self.pushNode(String(node._id), node.name, node.parentObjid, node.structType, node.icon, numNodes);
                    //self.setNodeData(String(node._id), node.baseWigCode, node.baseWigName, node.objOps, node.objWidth, node.objRow, node.objOffset, node.objName);
                    //console.log(self.treeData[numNodes]);
                    numNodes++;

                });
            };

        });
    }

    this.render = function() {

        var newParData = [];
        //setTimeout(function() {
            treeDepth = self.depth();
            lowLevel = self.getLevel(treeDepth - 1);
            /*lowLevel.forEach(function(child) {
                self.attrSet(child);
            });*/
            for (var i = treeDepth - 1; i >= 0; i--) {
                lev = self.getLevel(i);
                
                for (var j = 0; j <= lev.length - 1; j++) {
                    parent = lev[j];

                    if (i != 0) {
                        //console.log(self.hasChildren(parent), parent);
                        if (!self.hasChildren(parent)) {
                            //console.log(parent);
                            sibsData = self.concatSibs(parent);
                            //parData = self.getNodeData(parent);
                            
                            newParData = sibsData;
                            self.setNodeData(parent, newParData);
                        } else {
                            console.log("Has Children: ", parent);
                        }
                        
                    } else if (i == 0) {
                        sibsData = self.concatSibs(parent);
                        //parData = self.getNodeData(parent);
                        
                        newParData = sibsData;
                        self.setNodeData(parent, newParData);
                        //boolAppBody = header + newParData + footer;
                        //console.dir(self.treeData[0]);
                        
                    }
                };
            }
        //}, 300);
    }

    this.dynamicSort = function(property) {
        var sortOrder = 1;
        if (property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function(a, b) {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        }
    }
}

//module.exports = boolNode;
module.exports = boolTree;
