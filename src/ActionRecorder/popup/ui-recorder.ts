declare var resemble: any;

module Ar {
    export interface IUserAction {
        frameIndex: string;
        type: string;
        //element: string;
        x?: number;
        y?: number;
        scrollX?: number;
        scrollY?: number;
        value?: string;
    }

    export var RecordStatus = {
        NEW: 0,
        LINKED: 1,
        STOPPED: 2
    }

    export var TestRunningStatus = {
        READY: 0,
        RUNNING: 1,
        DONE: 3
    };

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    export class Given {
        public url: string;
        public windowType: string;
        public innerWidth: number;
        public innerHeight: number;
    }

    export class ActionHistory {
        id: string;

        public actionType: string;
        public action: IUserAction;
        public data: any;
        public delay: number = 0;
        public wait: number = 0;
        public memo: string;
        public hasFlag = false;

        public testResult: {
            isDone: boolean;
            isTimeout: boolean;
            imageComparison: Ar.ImageCompare;
        };

        constructor(timeDiff: number, actionType: string, action: IUserAction, data?: any) {
            this.id = guid();

            this.actionType = actionType;
            this.action = action;
            this.data = data;
            this.delay = timeDiff;
            this.memo = actionType;
            this.testResult = { isDone: false, isTimeout: false, imageComparison: null };
        }

        public play(tabId: number) {
            chrome.tabs.sendMessage(tabId, {
                'type': 'front-simulate',
                msg: this.action
            });
        }

        public getJson() {
            var json: any = _.omit(this, 'testResult', 'hasFlag', 'id');

            if (this.testResult.isDone) {
                json.testResult = {
                    imageComparison: this.testResult.imageComparison
                }
            }

            return json;
        }

        public setFlag(tabId: number) {
            if (this.hasPosition()) {
                this.hasFlag = true;

                if (this.actionType === 'wait') {
                    Ar.compareElment(this.data.element, tabId, this.action.x, this.action.y, this.action.frameIndex,(isSame) => {
                        if (isSame) {
                            chrome.tabs.sendMessage(tabId, {
                                'type': 'front-addElementBox',
                                msg: {
                                    frameIndex: this.action.frameIndex,
                                    id: this.id,
                                    text: this.memo + ' (' + this.data.element.tagName + ')',
                                    x: this.action.x,
                                    y: this.action.y
                                }
                            });
                        }
                    });
                } else {
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
        }

        public unsetFlag(tabId: number) {
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
        }

        public hasValue() {
            return this.action && this.action.type === 'input';
        }

        public hasPosition() {
            return this.action && (this.action.type === 'click' || this.action.type === 'input' || this.action.type === 'wait');
        }

        public isEvent() {
            return this.action && this.action.type !== 'wait' && this.action.type !== 'screenshot';
        }
    }

    export class Record {
        public status: number = RecordStatus.NEW;
        public actions: ActionHistory[] = [];
        public given: Given;
        public testRunningStatus: number = TestRunningStatus.READY;
        public testRunningTimeout: number;

        last: number;
        constructor() {
            this.given = new Given();
        }

        public relink(tabId: number) {
            chrome.tabs.sendMessage(tabId, { type: 'front-init' });
        }

        public start(tabId: number) {
            switch (this.status) {
                case RecordStatus.NEW:
                    chrome.tabs.sendMessage(tabId, { type: 'front-init' });
                    this.status = RecordStatus.LINKED;
                    this.last = Date.now();
                    break;
                case RecordStatus.STOPPED:
                    this.status = RecordStatus.LINKED;
                    this.last = Date.now();
                default:
            }
        }

        public stop() {
            if (this.status === RecordStatus.LINKED) {
                this.status = RecordStatus.STOPPED;
            }
        }

        public removeAction(index) {
            this.actions.splice(index, 1);
        }

        public clear() {
            this.actions = [];
        }

        getLastAction(type) {
            var lastAction: ActionHistory;
            if (this.actions.length > 0) {
                lastAction = this.actions[this.actions.length - 1];
                if (lastAction.action.type === type) {
                    return lastAction;
                }
            }

            return null;
        }

        public pushAction(action: IUserAction) {
            if (this.status == RecordStatus.LINKED) {
                var now = Date.now(),
                    lastAction: ActionHistory;
                switch (action.type) {
                    case 'scroll':
                        lastAction = this.getLastAction('scroll');
                        if (lastAction) {
                            lastAction.action.scrollX = action.scrollX;
                            lastAction.action.scrollY = action.scrollY;
                        } else {
                            this.actions.push(new ActionHistory(now - this.last, action.type, action));
                        }
                        break;
                    case 'input':
                        lastAction = this.getLastAction('input');
                        if (lastAction) {
                            lastAction.action.value = action.value;
                        } else {
                            this.actions.push(new ActionHistory(now - this.last, action.type, action));
                        }
                        break;
                    default:
                        this.actions.push(new ActionHistory(now - this.last, action.type, action));
                        break;
                }
                this.last = now;
            }
        }

        public takeScreenshot(width: number, height: number, tabId: number, windowId: number, next?: (record: Record) => void) {
            if (this.status == RecordStatus.LINKED) {
                chrome.tabs.captureVisibleTab(windowId,(screenshotUrl) => {
                    Ar.resizeImage(screenshotUrl, width, height,(img) => {
                        var now = Date.now();
                        this.actions.push(new ActionHistory(now - this.last, 'screenshot', null, img));
                        this.last = now;
                        if (next) {
                            next(this);
                        }
                    });
                });
            } else {
                if (next) {
                    next(this);
                }
            }
        }

        public pushWaitFor(waitFor: { x: number; y: number; frameIndex: string; element: ArFront.ElementInfo; }) {
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
        }

        public clearTestResults() {
            this.actions.forEach((action) => {
                action.testResult.isDone = false;
                action.testResult.isTimeout = false;
                action.testResult.imageComparison = null;
            });
            this.testRunningStatus = TestRunningStatus.READY;
        }

        public getJson() {
            return {
                given: this.given,
                actions: _.map(this.actions,(action) => {
                    return action.getJson();
                })
            };
        }
    }

    export function resizeImage(imageUrl: string, width: number, height: number, next: (imageUrl: string) => void) {
        var img = new Image,
            oc: HTMLCanvasElement,
            octx: CanvasRenderingContext2D;

        img.onload = () => {
            if (img.width === width && img.height === height) {
                next(imageUrl);
            } else {
                oc = document.createElement('canvas'),
                octx = oc.getContext('2d');

                oc.width = width;
                oc.height = height;
                octx.drawImage(img, 0, 0, oc.width, oc.height);

                next(oc.toDataURL("image/png"));
            }
        }
        img.src = imageUrl;
    }

    function getWindowSize(tabId: number, next: (response: {
        w: number;
        h: number;
        devicePixelRatio: number;
    }) => void) {
        try {
            chrome.tabs.sendMessage(tabId, { type: 'front-size' },(response) => {
                if (response) {
                    next(response);
                } else {
                    getWindowSize(tabId, next);
                }
            });
        } catch (e) {
            setTimeout(() => {
                getWindowSize(tabId, next);
            }, 10);
        }
    }

    function resizeWindow(tabId: number, win: chrome.windows.Window, innerWidth: number, innerHeight: number, next: (window: chrome.windows.Window) => void) {
        var devicePixelRatio: number,
            width: number,
            height: number;

        getWindowSize(tabId,(response) => {
            devicePixelRatio = response.devicePixelRatio && !isNaN(response.devicePixelRatio) && response.devicePixelRatio > 0.0 ? response.devicePixelRatio : 1;

            width = Math.floor(innerWidth * devicePixelRatio + win.width - response.w * devicePixelRatio);
            height = Math.floor(innerHeight * devicePixelRatio + win.height - response.h * devicePixelRatio);

            chrome.windows.update(win.id, {
                width: width,
                height: height
            },() => {
                    next(win);
                });
        });
    }

    export function createWindow(url: string, windowType: string, innerWidth: number, innerHeight: number, next: (window: chrome.windows.Window) => void) {
        chrome.windows.create({
            url: url,
            type: windowType
        },(win) => {
                resizeWindow(win.tabs[0].id, win, innerWidth, innerHeight, next);
            });
    }

    function getDelay(delay) {
        return delay && delay > 0 ? delay : 0;
    }

    function getElement(tabId: number, x: number, y: number, frameIndex: string, next: (element: ArFront.ElementInfo) => void) {
        chrome.tabs.sendMessage(tabId, {
            'type': 'front-getElement',
            msg: { x: x, y: y, frameIndex: frameIndex }
        },(response) => {
                next(response);
            });
    }

    var compareElementTimeout: number;
    export function compareElment(oldElement: ArFront.ElementInfo, tabId: number, x: number, y: number, frameIndex: string, next: (isSame: boolean) => void) {
        getElement(tabId, x, y, frameIndex,(element: ArFront.ElementInfo) => {
            clearTimeout(compareElementTimeout);
            next(element.tagName && oldElement.tagName === element.tagName && oldElement.innerText === element.innerText && _.isEqual(oldElement.computedStyle, element.computedStyle));
        });

        compareElementTimeout = setTimeout(() => {
            next(false);
        }, 200);
    }

    function waitForElement(history: ActionHistory, record: Ar.Record, tabId: number, x: number, y: number, frameIndex: string, time: number, timeout: number, oldElement: ArFront.ElementInfo, next) {
        if (record.testRunningStatus !== TestRunningStatus.RUNNING) return next(false);

        if (time < timeout) {
            compareElment(oldElement, tabId, x, y, frameIndex,(isSame) => {
                if (isSame) {
                    history.testResult.isDone = true;
                    next(true);
                } else {
                    setTimeout(() => {
                        waitForElement(history, record, tabId, x, y, frameIndex, time + 100, timeout, oldElement, next);
                    }, 100);
                }
            });
        } else {
            history.testResult.isTimeout = true;
            next(false);
        }
    }

    function playAction(history: ActionHistory, tab: chrome.tabs.Tab, record: Ar.Record, cleanFlag: boolean, next: (isContinue: boolean) => void) {
        if (history.actionType === 'screenshot') {
            return chrome.tabs.captureVisibleTab(tab.windowId,(imgData) => {
                if (record.testRunningStatus !== TestRunningStatus.RUNNING) return next(false);

                return resizeImage(imgData, record.given.innerWidth, record.given.innerHeight,(zoomedImage) => {
                    if (record.testRunningStatus !== TestRunningStatus.RUNNING) return next(false);

                    return resemble(zoomedImage).compareTo(history.data).onComplete((data) => {
                        if (record.testRunningStatus !== TestRunningStatus.RUNNING) return next(false);

                        history.testResult.imageComparison = new Ar.ImageCompare(data);
                        history.testResult.isDone = true;
                        return next(true);
                    });
                });
            });
        } else if (history.actionType === 'wait') {
            history.unsetFlag(tab.id);
            return waitForElement(history, record, tab.id, history.action.x, history.action.y, history.action.frameIndex, 0, history.data.timeOut, history.data.element, next);
        } else {
            if (cleanFlag) {
                history.unsetFlag(tab.id);
            }
            history.play(tab.id);
            history.testResult.isDone = true;
            return next(true);
        }
    }

    function playActions(tab: chrome.tabs.Tab, record: Ar.Record, actions: ActionHistory[], cleanFlag: boolean, notify: (actions: ActionHistory) => void) {
        if (record.testRunningStatus === TestRunningStatus.RUNNING && actions.length > 0) {
            var action = actions.shift();

            record.testRunningTimeout = setTimeout(() => {
                playAction(action, tab, record, cleanFlag,(isContinue) => {
                    if (isContinue) {
                        notify(action);
                        record.testRunningTimeout = setTimeout(() => {
                            playActions(tab, record, actions, cleanFlag, notify);
                        }, getDelay(action.wait));
                    } else {
                        notify(null);
                    }
                });
            }, getDelay(action.delay));
        } else {
            notify(null);
        }
    }

    export function runActionsFrom(tab: chrome.tabs.Tab, record: Ar.Record, index: number, cleanFlag: boolean, notify: (actions: ActionHistory) => void) {
        record.testRunningStatus = TestRunningStatus.RUNNING;
        playActions(tab, record, record.actions.slice(index), cleanFlag, notify);
    }

    export function runRecord(record: Ar.Record, notify: (actions: ActionHistory) => void) {
        createWindow(record.given.url, record.given.windowType, record.given.innerWidth, record.given.innerHeight,(win) => {
            runActionsFrom(win.tabs[0], record, 0, false, notify);
        });
    }

    export class ImageCompare {
        public comparisonImage: string;
        public compareResult: { isSameDimensions: boolean; misMatchPercentage: number; getImageDataUrl: () => string };

        constructor(compareResult) {
            this.compareResult = compareResult;
            this.comparisonImage = this.compareResult.getImageDataUrl();
        }
    }

    export function createRecord(recordInterface: Record) {
        var record = new Record();
        record.given = recordInterface.given;
        if (recordInterface.actions) {
            recordInterface.actions.forEach((action) => {
                var newAction = new Ar.ActionHistory(action.delay, action.actionType, action.action, action.data);
                newAction.memo = action.memo;
                newAction.wait = action.wait;

                if (action.testResult) {
                    newAction.testResult.isDone = true;
                    newAction.testResult.imageComparison = action.testResult.imageComparison;
                    record.testRunningStatus = TestRunningStatus.DONE;
                }
                record.actions.push(newAction);
            });
        }

        return record;
    }
} 