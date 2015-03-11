/// <reference path="../scripts/typings/angularjs/angular.d.ts" />

interface IScope extends ng.IRootScopeService {

    started: boolean;
    dataSet: boolean;
    logs: Sh.ILog[];
    start: () => void;
    stop: () => void;
    close: () => void;
    data: {
        port: string;
        json: string;
    };
    showJson: () => void;
    clearHistroy: () => void;
}

angular.module('mockServer', []).controller('MainController', ['$scope', ($scope: IScope) => {
    $scope.started = false;
    $scope.dataSet = false;

    $scope.logs = [];
    $scope.data = {
        port: "8593",
        json: "1231"
    };
    var sockeId: number = null,
        bg: any;

    $scope.showJson = () => {
        $scope.data.json = angular.toJson(Sh.data);
        $('#show-json').modal();
    };

    $scope.start = () => {
        Sh.createConnection(parseInt($scope.data.port), {
            onConnected: (id) => {
                sockeId = id;
                if (bg) {
                    bg.sockeId = id;
                }
                $scope.$apply(() => {
                    $scope.started = true;
                });
            },
            onAccept: () => { },
            onClear: () => {
                $scope.$apply(() => {
                    $scope.dataSet = false;
                });
            },
            onSet: () => {
                $scope.$apply(() => {
                    $scope.dataSet = true;
                });
            },
            onQuery: (log) => {
                $scope.$apply(() => {
                    if ($scope.logs.length >= 5) {
                        $scope.logs.splice(0, 1);
                    }
                    $scope.logs.push(log);
                });
            }
        });
    };

    $scope.stop = () => {
        Sh.closeConnection(sockeId,() => {
            sockeId = null;
            if (bg) {
                bg.sockeId = null;
            }
            $scope.$apply(() => {
                $scope.started = false;
            });
        });
    };

    $scope.close = () => {
        $scope.stop();
        chrome.app.window.current().close();
    };

    $scope.clearHistroy = () => {
        $scope.logs = [];
    };

    chrome.runtime.getBackgroundPage((background) => {
        bg = background;
    });

    $scope.start();
}]);