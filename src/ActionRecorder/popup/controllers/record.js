/// <reference path="../../scripts/typings/bootstrap/bootstrap.d.ts" />
/// <reference path="../request-helper.ts" />
/// <reference path="../../scripts/typings/angularjs/angular.d.ts" />
angular.module('ar').controller('RecordController', ['$scope', '$http', function ($scope, $http) {
    var record = null, currentTab = null, background = null;
    window.onbeforeunload = function () {
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
    $scope.isResponseDataReady = false;
    $scope.showResponseError = true;
    $scope.mockServer = {
        ignoreRequestParmasInput: ""
    };
    var mockServerAddress = 'http://127.0.0.1:8593/';
    function resetUiRecorderStatus() {
        $scope.isTabReady = false;
        $scope.isLinked = false;
        $scope.isRunning = false;
        $scope.isCursorShown = false;
        $scope.isGetElementShown = false;
    }
    function resetServerMockStatus() {
        $scope.isResponseDataReady = false;
    }
    function upload(e, next) {
        var element = e.target;
        if (element.files && element.files.length > 0) {
            var textFile = element.files[0], reader = new FileReader();
            reader.readAsText(textFile);
            reader.onload = function () {
                next(reader.result);
            };
            element.value = "";
        }
    }
    function download(filename, text) {
        var pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', filename);
        pom.click();
    }
    //#region helper functions
    $scope.roundTimeDiff = function (timeDiff) {
        return Math.round(timeDiff / 100) / 10;
    };
    $scope.openImage = function (imageUrl) {
        window.open(imageUrl);
    };
    $scope.getMatchPercentage = function (misMatchPercentage) {
        return (100 - misMatchPercentage).toFixed(2);
    };
    $scope.getMemoIcon = function (action) {
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
    $scope.uploadJson = function (e) {
        upload(e, function (result) {
            record = Ar.createRecord(angular.fromJson(result));
            $scope.$apply(function () {
                $scope.record = record;
                resetUiRecorderStatus();
            });
        });
    };
    $scope.downloadJson = function () {
        var json = angular.toJson(record.getJson());
        download('test.json', json);
    };
    //#endregion
    //#region start
    $scope.openUrl = function () {
        Ar.createWindow(record.given.url, record.given.windowType, record.given.innerWidth, record.given.innerHeight, function (win) {
            currentTab = win.tabs[0];
            $scope.$apply(function () {
                $scope.isRunning = false;
                $scope.isTabReady = true;
                $scope.isLinked = false;
                $scope.isCursorShown = false;
                $scope.isGetElementShown = false;
            });
        });
    };
    $scope.link = function () {
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
        $scope.$apply(function () {
            $scope.record = record;
        });
    }
    $scope.isTestRunning = function () {
        return record.testRunningStatus === Ar.TestRunningStatus.RUNNING;
    };
    $scope.isTestDone = function () {
        return record.testRunningStatus === Ar.TestRunningStatus.DONE;
    };
    $scope.runTest = function () {
        if (record.testRunningStatus !== Ar.TestRunningStatus.RUNNING) {
            record.testRunningStatus = Ar.TestRunningStatus.RUNNING;
            Ar.runRecord(record, testRunCallback);
        }
    };
    $scope.stopTest = function () {
        record.testRunningStatus = Ar.TestRunningStatus.DONE;
        clearTimeout(record.testRunningTimeout);
    };
    $scope.clearTestResults = function () {
        record.clearTestResults();
    };
    //#endregion
    //#region action
    $scope.clear = function () {
        record.clear();
    };
    $scope.remove = function (index, action) {
        if (currentTab) {
            action.unsetFlag(currentTab.id);
        }
        record.removeAction(index);
    };
    $scope.play = function (action) {
        if (action.hasFlag) {
            action.unsetFlag(currentTab.id);
        }
        action.play(currentTab.id);
    };
    $scope.playFrom = function (index) {
        Ar.runActionsFrom(currentTab, record, index, true, testRunCallback);
    };
    $scope.toggleFlag = function (action) {
        if (action.hasFlag) {
            action.unsetFlag(currentTab.id);
        }
        else {
            action.setFlag(currentTab.id);
        }
    };
    $scope.showActionJson = function (action) {
        $scope.eventsJson = angular.toJson(action.getJson());
        $('#events-json').modal();
    };
    $scope.current = {
        action: null
    };
    $scope.edit = function (action) {
        $scope.current.action = action;
        $('#edit-event').modal();
    };
    //#endregion
    //#region record events
    $scope.takeScreenshot = function () {
        record.takeScreenshot(record.given.innerWidth, record.given.innerHeight, currentTab.id, currentTab.windowId, function () {
            $scope.$apply(function () {
                $scope.record = record;
            });
        });
    };
    $scope.toggleCursor = function () {
        if ($scope.isLinked && $scope.isRunning) {
            if ($scope.isCursorShown) {
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideCursor' });
            }
            else {
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
                $scope.isGetElementShown = false;
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-showCursor' });
            }
            $scope.isCursorShown = !$scope.isCursorShown;
        }
    };
    $scope.toggleGetWaitFor = function () {
        if ($scope.isLinked && $scope.isRunning) {
            if ($scope.isGetElementShown) {
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
            }
            else {
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideCursor' });
                $scope.isCursorShown = false;
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-showElement' });
            }
            $scope.isGetElementShown = !$scope.isGetElementShown;
        }
    };
    $scope.stop = function () {
        record.stop();
        chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideCursor' });
        $scope.isCursorShown = false;
        chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
        $scope.isGetElementShown = false;
        $scope.isRunning = false;
    };
    $scope.resume = function () {
        record.start(currentTab.id);
        $scope.isRunning = true;
    };
    //#endregion
    //#region xhr
    $scope.harMimeTypeFilters = { "application/json": true, "text/html": true };
    $scope.ignoreRequestParams = ["__RequestVerificationToken", "timestamp"];
    $scope.addIgnoreParams = function () {
        if ($scope.mockServer.ignoreRequestParmasInput) {
            var params = _.map($scope.mockServer.ignoreRequestParmasInput.split(','), function (p) {
                return p.trim();
            });
            _.each(params, function (p) {
                $scope.ignoreRequestParams.push(p);
            });
            $scope.mockServer.ignoreRequestParmasInput = "";
        }
    };
    $scope.removeIgnoreParam = function (index) {
        $scope.ignoreRequestParams.splice(index, 1);
    };
    $scope.harEntries = [];
    $scope.uploadHar = function (e) {
        upload(e, function (result) {
            var filters = [];
            for (var key in $scope.harMimeTypeFilters) {
                if ($scope.harMimeTypeFilters[key]) {
                    filters.push(key);
                }
            }
            $scope.$apply(function () {
                $scope.harEntries = Ar.Rh.filterHarEntries(angular.fromJson(result).log.entries, filters);
                resetServerMockStatus();
            });
        });
    };
    $scope.downloadHar = function () {
        var json = angular.toJson({ log: { entries: $scope.harEntries } });
        download('test.har', json);
    };
    $scope.startResponseMock = function () {
        $scope.showResponseError = false;
        $scope.isResponseDataReady = false;
        var json = angular.toJson($scope.harEntries), num = Math.ceil(json.length / 3000);
        $http.get(mockServerAddress + 'clear').success(function () {
            for (var i = 0; i < num; i++) {
                $http.put(mockServerAddress + (i + 1) + "/" + num, json.substring(i * 3000, i * 3000 + 3000)).success(function (data) {
                    if (data.data === 'true') {
                        $scope.isResponseDataReady = true;
                    }
                });
            }
        }).error(function () {
            $scope.showResponseError = true;
        });
    };
    $scope.stopResponseMock = function () {
        $scope.isResponseDataReady = false;
    };
    $scope.closeResponseAlert = function () {
        $scope.showResponseError = false;
    };
    $scope.removeEntry = function (index) {
        $scope.harEntries.splice(index, 1);
    };
    function parseXhr(url, method, requestBody) {
        if ($scope.isResponseDataReady) {
            var index = Ar.Rh.getMockRequestIndex(url, method, requestBody, $scope.ignoreRequestParams, $scope.harEntries);
            if (index !== -1) {
                $scope.$apply(function () {
                    $scope.harEntries[index].hitLog.push(new Date());
                });
                return {
                    redirectUrl: mockServerAddress + 'get/' + index
                };
            }
        }
        return {};
    }
    chrome.webRequest.onBeforeRequest.addListener(function (info) {
        if ($scope.isResponseDataReady) {
            if (info.requestBody) {
                return parseXhr(info.url, info.method, Ar.Rh.parseRequestBody(info.requestBody));
            }
            else {
                return parseXhr(info.url, info.method, null);
            }
        }
        return {};
    }, {
        urls: ["<all_urls>"],
        types: ["xmlhttprequest"]
    }, ["blocking", "requestBody"]);
    //#endregion
    chrome.runtime.onMessage.addListener(function (message, sender) {
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
                $scope.$apply(function () {
                    $scope.record = record;
                });
                break;
            case 'waitFor':
                record.pushWaitFor(message.msg);
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
                $scope.$apply(function () {
                    $scope.isGetElementShown = false;
                    $scope.record = record;
                });
                break;
            default:
                chrome.tabs.sendMessage(currentTab.id, message);
                break;
        }
    });
    chrome.runtime.getBackgroundPage(function (bg) {
        background = bg;
        bg.popup = {
            takeScreenshot: function () {
                $scope.takeScreenshot();
            },
            toggleCursor: function () {
                $scope.$apply(function () {
                    $scope.toggleCursor();
                });
            },
            toggleGetWaitFor: function () {
                $scope.$apply(function () {
                    $scope.toggleGetWaitFor();
                });
            }
        };
        var tab = bg.currentTab;
        record = new Ar.Record();
        chrome.tabs.sendMessage(tab.id, { type: 'front-size' }, function (response) {
            chrome.windows.get(tab.windowId, function (window) {
                $scope.$apply(function () {
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
//# sourceMappingURL=record.js.map