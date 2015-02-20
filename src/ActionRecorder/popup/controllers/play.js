/// <reference path="../../scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../scripts/typings/q/q.d.ts" />
angular.module('ar').controller('PlayController', ['$scope', function ($scope) {
    var record;
    $scope.recordText = "";
    $scope.upload = function () {
        record = Ar.createRecord(angular.fromJson($scope.recordText));
    };
    $scope.results = [];
    $scope.run = function () {
        Ar.runRecord(record, function (data) {
            $scope.$apply(function () {
                $scope.results.push(data);
            });
        });
    };
}]);
//# sourceMappingURL=play.js.map