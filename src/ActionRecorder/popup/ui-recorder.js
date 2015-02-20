var Ar;
(function (Ar) {
    Ar.RecordStatus = {
        NEW: 0,
        LINKED: 1,
        STOPPED: 2
    };
    Ar.TestRunningStatus = {
        READY: 0,
        RUNNING: 1,
        DONE: 3
    };
    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }
    var Given = (function () {
        function Given() {
        }
        return Given;
    })();
    Ar.Given = Given;
    var ActionHistory = (function () {
        function ActionHistory(timeDiff, actionType, action, data) {
            this.delay = 0;
            this.wait = 0;
            this.hasFlag = false;
            this.id = guid();
            this.actionType = actionType;
            this.action = action;
            this.data = data;
            this.delay = timeDiff;
            this.memo = actionType;
            this.testResult = { isDone: false, isTimeout: false, imageComparison: null };
        }
        ActionHistory.prototype.play = function (tabId) {
            chrome.tabs.sendMessage(tabId, {
                'type': 'front-simulate',
                msg: this.action
            });
        };
        ActionHistory.prototype.getJson = function () {
            var json = _.omit(this, 'testResult', 'hasFlag', 'id');
            if (this.testResult.isDone) {
                json.testResult = {
                    imageComparison: this.testResult.imageComparison
                };
            }
            return json;
        };
        ActionHistory.prototype.setFlag = function (tabId) {
            var _this = this;
            if (this.hasPosition()) {
                this.hasFlag = true;
                if (this.actionType === 'wait') {
                    Ar.compareElment(this.data.element, tabId, this.action.x, this.action.y, this.action.frameIndex, function (isSame) {
                        if (isSame) {
                            chrome.tabs.sendMessage(tabId, {
                                'type': 'front-addElementBox',
                                msg: {
                                    frameIndex: _this.action.frameIndex,
                                    id: _this.id,
                                    text: _this.memo + ' (' + _this.data.element.tagName + ')',
                                    x: _this.action.x,
                                    y: _this.action.y
                                }
                            });
                        }
                    });
                }
                else {
                    chrome.tabs.sendMessage(tabId, {
                        'type': 'front-addFlag',
                        msg: {
                            frameIndex: this.action.frameIndex,
                            id: this.id,
                            text: this.memo,
                            x: this.action.x,
                            y: this.action.y
                        }
                    });
                }
            }
        };
        ActionHistory.prototype.unsetFlag = function (tabId) {
            if (this.hasPosition()) {
                this.hasFlag = false;
                chrome.tabs.sendMessage(tabId, {
                    'type': 'front-removeFlag',
                    msg: {
                        frameIndex: this.action.frameIndex,
                        id: this.id
                    }
                });
            }
        };
        ActionHistory.prototype.hasValue = function () {
            return this.action && this.action.type === 'input';
        };
        ActionHistory.prototype.hasPosition = function () {
            return this.action && (this.action.type === 'click' || this.action.type === 'input' || this.action.type === 'wait');
        };
        ActionHistory.prototype.isEvent = function () {
            return this.action && this.action.type !== 'wait' && this.action.type !== 'screenshot';
        };
        return ActionHistory;
    })();
    Ar.ActionHistory = ActionHistory;
    var Record = (function () {
        function Record() {
            this.status = Ar.RecordStatus.NEW;
            this.actions = [];
            this.testRunningStatus = Ar.TestRunningStatus.READY;
            this.given = new Given();
        }
        Record.prototype.relink = function (tabId) {
            chrome.tabs.sendMessage(tabId, { type: 'front-init' });
        };
        Record.prototype.start = function (tabId) {
            switch (this.status) {
                case Ar.RecordStatus.NEW:
                    chrome.tabs.sendMessage(tabId, { type: 'front-init' });
                    this.status = Ar.RecordStatus.LINKED;
                    this.last = Date.now();
                    break;
                case Ar.RecordStatus.STOPPED:
                    this.status = Ar.RecordStatus.LINKED;
                    this.last = Date.now();
                default:
            }
        };
        Record.prototype.stop = function () {
            if (this.status === Ar.RecordStatus.LINKED) {
                this.status = Ar.RecordStatus.STOPPED;
            }
        };
        Record.prototype.removeAction = function (index) {
            this.actions.splice(index, 1);
        };
        Record.prototype.clear = function () {
            this.actions = [];
        };
        Record.prototype.getLastAction = function (type) {
            var lastAction;
            if (this.actions.length > 0) {
                lastAction = this.actions[this.actions.length - 1];
                if (lastAction.action.type === type) {
                    return lastAction;
                }
            }
            return null;
        };
        Record.prototype.pushAction = function (action) {
            if (this.status == Ar.RecordStatus.LINKED) {
                var now = Date.now(), lastAction;
                switch (action.type) {
                    case 'scroll':
                        lastAction = this.getLastAction('scroll');
                        if (lastAction) {
                            lastAction.action.scrollX = action.scrollX;
                            lastAction.action.scrollY = action.scrollY;
                        }
                        else {
                            this.actions.push(new ActionHistory(now - this.last, action.type, action));
                        }
                        break;
                    case 'input':
                        lastAction = this.getLastAction('input');
                        if (lastAction) {
                            lastAction.action.value = action.value;
                        }
                        else {
                            this.actions.push(new ActionHistory(now - this.last, action.type, action));
                        }
                        break;
                    default:
                        this.actions.push(new ActionHistory(now - this.last, action.type, action));
                        break;
                }
                this.last = now;
            }
        };
        Record.prototype.takeScreenshot = function (width, height, tabId, windowId, next) {
            var _this = this;
            if (this.status == Ar.RecordStatus.LINKED) {
                chrome.tabs.captureVisibleTab(windowId, function (screenshotUrl) {
                    Ar.resizeImage(screenshotUrl, width, height, function (img) {
                        var now = Date.now();
                        _this.actions.push(new ActionHistory(now - _this.last, 'screenshot', null, img));
                        _this.last = now;
                        if (next) {
                            next(_this);
                        }
                    });
                });
            }
            else {
                if (next) {
                    next(this);
                }
            }
        };
        Record.prototype.pushWaitFor = function (waitFor) {
            var now = Date.now();
            this.actions.push(new ActionHistory(0, 'wait', {
                x: waitFor.x,
                y: waitFor.y,
                frameIndex: waitFor.frameIndex,
                type: 'wait'
            }, {
                timeOut: now - this.last,
                element: waitFor.element
            }));
            this.last = now;
        };
        Record.prototype.clearTestResults = function () {
            this.actions.forEach(function (action) {
                action.testResult.isDone = false;
                action.testResult.isTimeout = false;
                action.testResult.imageComparison = null;
            });
            this.testRunningStatus = Ar.TestRunningStatus.READY;
        };
        Record.prototype.getJson = function () {
            return {
                given: this.given,
                actions: _.map(this.actions, function (action) {
                    return action.getJson();
                })
            };
        };
        return Record;
    })();
    Ar.Record = Record;
    function resizeImage(imageUrl, width, height, next) {
        var img = new Image, oc, octx;
        img.onload = function () {
            if (img.width === width && img.height === height) {
                next(imageUrl);
            }
            else {
                oc = document.createElement('canvas'), octx = oc.getContext('2d');
                oc.width = width;
                oc.height = height;
                octx.drawImage(img, 0, 0, oc.width, oc.height);
                next(oc.toDataURL("image/png"));
            }
        };
        img.src = imageUrl;
    }
    Ar.resizeImage = resizeImage;
    function getWindowSize(tabId, next) {
        try {
            chrome.tabs.sendMessage(tabId, { type: 'front-size' }, function (response) {
                if (response) {
                    next(response);
                }
                else {
                    getWindowSize(tabId, next);
                }
            });
        }
        catch (e) {
            setTimeout(function () {
                getWindowSize(tabId, next);
            }, 10);
        }
    }
    function resizeWindow(tabId, win, innerWidth, innerHeight, next) {
        var devicePixelRatio, width, height;
        getWindowSize(tabId, function (response) {
            devicePixelRatio = response.devicePixelRatio && !isNaN(response.devicePixelRatio) && response.devicePixelRatio > 0.0 ? response.devicePixelRatio : 1;
            width = Math.floor(innerWidth * devicePixelRatio + win.width - response.w * devicePixelRatio);
            height = Math.floor(innerHeight * devicePixelRatio + win.height - response.h * devicePixelRatio);
            chrome.windows.update(win.id, {
                width: width,
                height: height
            }, function () {
                next(win);
            });
        });
    }
    function createWindow(url, windowType, innerWidth, innerHeight, next) {
        chrome.windows.create({
            url: url,
            type: windowType
        }, function (win) {
            resizeWindow(win.tabs[0].id, win, innerWidth, innerHeight, next);
        });
    }
    Ar.createWindow = createWindow;
    function getDelay(delay) {
        return delay && delay > 0 ? delay : 0;
    }
    function getElement(tabId, x, y, frameIndex, next) {
        chrome.tabs.sendMessage(tabId, {
            'type': 'front-getElement',
            msg: { x: x, y: y, frameIndex: frameIndex }
        }, function (response) {
            next(response);
        });
    }
    var compareElementTimeout;
    function compareElment(oldElement, tabId, x, y, frameIndex, next) {
        getElement(tabId, x, y, frameIndex, function (element) {
            clearTimeout(compareElementTimeout);
            next(element.tagName && oldElement.tagName === element.tagName && oldElement.innerText === element.innerText && _.isEqual(oldElement.computedStyle, element.computedStyle));
        });
        compareElementTimeout = setTimeout(function () {
            next(false);
        }, 200);
    }
    Ar.compareElment = compareElment;
    function waitForElement(history, record, tabId, x, y, frameIndex, time, timeout, oldElement, next) {
        if (record.testRunningStatus !== Ar.TestRunningStatus.RUNNING)
            return next(false);
        if (time < timeout) {
            compareElment(oldElement, tabId, x, y, frameIndex, function (isSame) {
                if (isSame) {
                    history.testResult.isDone = true;
                    next(true);
                }
                else {
                    setTimeout(function () {
                        waitForElement(history, record, tabId, x, y, frameIndex, time + 100, timeout, oldElement, next);
                    }, 100);
                }
            });
        }
        else {
            history.testResult.isTimeout = true;
            next(false);
        }
    }
    function playAction(history, tab, record, cleanFlag, next) {
        if (history.actionType === 'screenshot') {
            return chrome.tabs.captureVisibleTab(tab.windowId, function (imgData) {
                if (record.testRunningStatus !== Ar.TestRunningStatus.RUNNING)
                    return next(false);
                return resizeImage(imgData, record.given.innerWidth, record.given.innerHeight, function (zoomedImage) {
                    if (record.testRunningStatus !== Ar.TestRunningStatus.RUNNING)
                        return next(false);
                    return resemble(zoomedImage).compareTo(history.data).onComplete(function (data) {
                        if (record.testRunningStatus !== Ar.TestRunningStatus.RUNNING)
                            return next(false);
                        history.testResult.imageComparison = new Ar.ImageCompare(data);
                        history.testResult.isDone = true;
                        return next(true);
                    });
                });
            });
        }
        else if (history.actionType === 'wait') {
            history.unsetFlag(tab.id);
            return waitForElement(history, record, tab.id, history.action.x, history.action.y, history.action.frameIndex, 0, history.data.timeOut, history.data.element, next);
        }
        else {
            if (cleanFlag) {
                history.unsetFlag(tab.id);
            }
            history.play(tab.id);
            history.testResult.isDone = true;
            return next(true);
        }
    }
    function playActions(tab, record, actions, cleanFlag, notify) {
        if (record.testRunningStatus === Ar.TestRunningStatus.RUNNING && actions.length > 0) {
            var action = actions.shift();
            record.testRunningTimeout = setTimeout(function () {
                playAction(action, tab, record, cleanFlag, function (isContinue) {
                    if (isContinue) {
                        notify(action);
                        record.testRunningTimeout = setTimeout(function () {
                            playActions(tab, record, actions, cleanFlag, notify);
                        }, getDelay(action.wait));
                    }
                    else {
                        notify(null);
                    }
                });
            }, getDelay(action.delay));
        }
        else {
            notify(null);
        }
    }
    function runActionsFrom(tab, record, index, cleanFlag, notify) {
        record.testRunningStatus = Ar.TestRunningStatus.RUNNING;
        playActions(tab, record, record.actions.slice(index), cleanFlag, notify);
    }
    Ar.runActionsFrom = runActionsFrom;
    function runRecord(record, notify) {
        createWindow(record.given.url, record.given.windowType, record.given.innerWidth, record.given.innerHeight, function (win) {
            runActionsFrom(win.tabs[0], record, 0, false, notify);
        });
    }
    Ar.runRecord = runRecord;
    var ImageCompare = (function () {
        function ImageCompare(compareResult) {
            this.compareResult = compareResult;
            this.comparisonImage = this.compareResult.getImageDataUrl();
        }
        return ImageCompare;
    })();
    Ar.ImageCompare = ImageCompare;
    function createRecord(recordInterface) {
        var record = new Record();
        record.given = recordInterface.given;
        if (recordInterface.actions) {
            recordInterface.actions.forEach(function (action) {
                var newAction = new Ar.ActionHistory(action.delay, action.actionType, action.action, action.data);
                newAction.memo = action.memo;
                newAction.wait = action.wait;
                if (action.testResult) {
                    newAction.testResult.isDone = true;
                    newAction.testResult.imageComparison = action.testResult.imageComparison;
                    record.testRunningStatus = Ar.TestRunningStatus.DONE;
                }
                record.actions.push(newAction);
            });
        }
        return record;
    }
    Ar.createRecord = createRecord;
})(Ar || (Ar = {}));
//# sourceMappingURL=ui-recorder.js.map