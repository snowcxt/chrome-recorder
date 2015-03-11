/// <reference path="../scripts/typings/angularjs/angular.d.ts" />
angular.module('mockServer', []).controller('MainController', ['$scope', function ($scope) {
    $scope.started = false;
    $scope.dataSet = false;
    $scope.logs = [];
    $scope.data = {
        port: "8593",
        json: "1231"
    };
    var sockeId = null, bg;
    $scope.showJson = function () {
        $scope.data.json = angular.toJson(Sh.data);
        $('#show-json').modal();
    };
    $scope.start = function () {
        Sh.createConnection(parseInt($scope.data.port), {
            onConnected: function (id) {
                sockeId = id;
                if (bg) {
                    bg.sockeId = id;
                }
                $scope.$apply(function () {
                    $scope.started = true;
                });
            },
            onAccept: function () {
            },
            onClear: function () {
                $scope.$apply(function () {
                    $scope.dataSet = false;
                });
            },
            onSet: function () {
                $scope.$apply(function () {
                    $scope.dataSet = true;
                });
            },
            onQuery: function (log) {
                $scope.$apply(function () {
                    if ($scope.logs.length >= 5) {
                        $scope.logs.splice(0, 1);
                    }
                    $scope.logs.push(log);
                });
            }
        });
    };
    $scope.stop = function () {
        Sh.closeConnection(sockeId, function () {
            sockeId = null;
            if (bg) {
                bg.sockeId = null;
            }
            $scope.$apply(function () {
                $scope.started = false;
            });
        });
    };
    $scope.close = function () {
        $scope.stop();
        chrome.app.window.current().close();
    };
    $scope.clearHistroy = function () {
        $scope.logs = [];
    };
    chrome.runtime.getBackgroundPage(function (background) {
        bg = background;
    });
    $scope.start();
}]);
//# sourceMappingURL=index.js.map