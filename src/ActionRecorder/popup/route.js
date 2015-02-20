angular.module('ar').config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider.state('record', {
        url: "/record",
        templateUrl: 'views/record.html',
        controller: 'RecordController'
    });
    $urlRouterProvider.otherwise("/record");
});
//# sourceMappingURL=route.js.map