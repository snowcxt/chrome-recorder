/// <reference path="../../scripts/typings/bootstrap/bootstrap.d.ts" />
angular.module('ar').controller('RecordController', ['$scope', ($scope) => {
    var record: Ar.Record = null,
        currentTab: chrome.tabs.Tab = null,
        background = null;
    window.onbeforeunload = () => {
        if (background) {
            background.popup = null;
        }
    };

    $scope.windowTypes = ['normal', 'popup', 'panel'];

    $scope.isReady = false;
    $scope.isTabReady = false;
    $scope.isLinked = false;
    $scope.isRunning = false;
    $scope.isCursorShown = false;
    $scope.isGetElementShown = false;

    //#region helper functions
    $scope.roundTimeDiff = (timeDiff) => {
        return Math.round(timeDiff / 100) / 10;
    };

    $scope.openImage = (imageUrl) => {
        window.open(imageUrl);
    };
    $scope.getMatchPercentage = (misMatchPercentage) => {
        return (100 - misMatchPercentage).toFixed(2);
    };

    $scope.getMemoIcon = (action: Ar.ActionHistory) => {
        switch (action.actionType) {
            case 'screenshot':
                return 'glyphicon-camera';
            case 'wait':
                return 'glyphicon-time';
            default:
                return 'glyphicon-flash';
        }
    };
    //#endregion
    
    //#region json
    $scope.uploadJson = (e) => {
        var element = e.target;
        if (element.files && element.files.length > 0) {
            var textFile = element.files[0],
                reader = new FileReader();
            reader.readAsText(textFile);
            reader.onload = () => {
                record = Ar.createRecord(angular.fromJson(reader.result));
                $scope.$apply(() => {
                    $scope.record = record;
                    $scope.isTabReady = false;
                    $scope.isLinked = false;
                    $scope.isRunning = false;
                    $scope.isCursorShown = false;
                    $scope.isGetElementShown = false;
                });
            };

            element.value = "";
        }
    };

    $scope.inputJson = () => {
        record = Ar.createRecord(angular.fromJson($scope.uploadedEvents));
        $scope.record = record;
        $scope.isTabReady = false;
        $scope.isLinked = false;
        $scope.isRunning = false;
        $scope.isCursorShown = false;
        $scope.isGetElementShown = false;
    };

    $scope.showJson = () => {
        $scope.eventsJson = angular.toJson(record.getJson());
        $('#events-json').modal();
    };

    function download(filename, text) {
        var pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', filename);
        pom.click();
    }

    $scope.downloadJson = () => {
        var json = angular.toJson(record.getJson());
        download('test.json', json);
    };
    //#endregion

    //#region start
    $scope.openUrl = () => {
        Ar.createWindow(record.given.url, record.given.windowType, record.given.innerWidth, record.given.innerHeight,(win) => {
            currentTab = win.tabs[0];
            $scope.$apply(() => {
                $scope.isRunning = false;
                $scope.isTabReady = true;
                $scope.isLinked = false;
                $scope.isCursorShown = false;
                $scope.isGetElementShown = false;
            });
        });
    };

    $scope.link = () => {
        record.start(currentTab.id);
        $scope.isLinked = true;
        $scope.isRunning = true;
    };
    //#endregion

    //#region test   
    function testRunCallback(action) {
        if (!action) {
            record.testRunningStatus = Ar.TestRunningStatus.DONE;
        }
        $scope.$apply(() => {
            $scope.record = record;
        });
    }

    $scope.isTestRunning = () => {
        return record.testRunningStatus === Ar.TestRunningStatus.RUNNING;
    };

    $scope.isTestDone = () => {
        return record.testRunningStatus === Ar.TestRunningStatus.DONE;
    };
    $scope.runTest = () => {
        if (record.testRunningStatus !== Ar.TestRunningStatus.RUNNING) {
            record.testRunningStatus = Ar.TestRunningStatus.RUNNING;
            Ar.runRecord(record, testRunCallback);
        }
    };

    $scope.stopTest = () => {
        record.testRunningStatus = Ar.TestRunningStatus.DONE;
        clearTimeout(record.testRunningTimeout);
    };

    $scope.clearTestResults = () => {
        record.clearTestResults();
    };
    //#endregion

    //#region action
    $scope.clear = () => {
        record.clear();
    };

    $scope.remove = (index, action: Ar.ActionHistory) => {
        action.unsetFlag(currentTab.id);
        record.removeAction(index);
    };

    $scope.play = (action: Ar.ActionHistory) => {
        if (action.hasFlag) {
            action.unsetFlag(currentTab.id);
        }
        action.play(currentTab.id);
    };

    $scope.playFrom = (index: number) => {
        Ar.runActionsFrom(currentTab, record, index, true, testRunCallback);
    };

    $scope.toggleFlag = (action: Ar.ActionHistory) => {
        if (action.hasFlag) {
            action.unsetFlag(currentTab.id);
        } else {
            action.setFlag(currentTab.id);
        }
    };

    $scope.showActionJson = (action: Ar.ActionHistory) => {
        $scope.eventsJson = angular.toJson(action.getJson());
        $('#events-json').modal();
    };

    $scope.current = {
        action: null
    };

    $scope.edit = (action) => {
        $scope.current.action = action;
        $('#edit-event').modal();
    };
    //#endregion

    //#region record events
    $scope.takeScreenshot = () => {
        record.takeScreenshot(record.given.innerWidth, record.given.innerHeight, currentTab.id, currentTab.windowId,() => {
            $scope.$apply(() => {
                $scope.record = record;
            });
        });
    };

    $scope.toggleCursor = () => {
        if ($scope.isLinked && $scope.isRunning) {
            if ($scope.isCursorShown) {
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideCursor' });
            } else {
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
                $scope.isGetElementShown = false;
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-showCursor' });
            }

            $scope.isCursorShown = !$scope.isCursorShown;
        }
    }

    $scope.toggleGetWaitFor = () => {
        if ($scope.isLinked && $scope.isRunning) {
            if ($scope.isGetElementShown) {
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
            } else {
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideCursor' });
                $scope.isCursorShown = false;
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-showElement' });
            }
            $scope.isGetElementShown = !$scope.isGetElementShown;
        }
    };

    $scope.stop = () => {
        record.stop();
        chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideCursor' });
        $scope.isCursorShown = false;

        chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
        $scope.isGetElementShown = false;

        $scope.isRunning = false;
    };

    $scope.resume = () => {
        record.start(currentTab.id);
        $scope.isRunning = true;
    };
    //#endregion

    chrome.runtime.onMessage.addListener((message: ArFront.Message, sender) => {
        switch (message.type) {
            case 'ready':
                if (sender.tab && record) {
                    if (record.status == Ar.RecordStatus.LINKED || record.status == Ar.RecordStatus.STOPPED) {
                        record.relink(currentTab.id);
                    }
                }
                break;
            case 'action':
                record.pushAction(message.msg);
                $scope.$apply(() => {
                    $scope.record = record;
                });
                break;
            case 'waitFor':
                record.pushWaitFor(message.msg);
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
                $scope.$apply(() => {
                    $scope.isGetElementShown = false;
                    $scope.record = record;
                });
                break;
            default:
                chrome.tabs.sendMessage(currentTab.id, message);
                break;
        }
    });

    chrome.runtime.getBackgroundPage((bg) => {
        background = bg;
        (<any>bg).popup = {
            takeScreenshot: () => {
                $scope.takeScreenshot();
            },
            toggleCursor: () => {
                $scope.$apply(() => {
                    $scope.toggleCursor();
                });
            },
            toggleGetWaitFor: () => {
                $scope.$apply(() => {
                    $scope.toggleGetWaitFor();
                });
            }
        };
        var tab = (<any>bg).currentTab;

        record = new Ar.Record();
        chrome.tabs.sendMessage(tab.id, { type: 'front-size' },(response) => {
            chrome.windows.get(tab.windowId,(window) => {
                $scope.$apply(() => {
                    record.given.url = tab.url;
                    record.given.windowType = window.type;
                    if (response) {
                        record.given.innerWidth = response.w;
                        record.given.innerHeight = response.h;
                    }

                    $scope.record = record;
                    $scope.isReady = true;
                });
            });
        });
    });
}]); 