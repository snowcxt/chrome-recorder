angular.module('ar', ['ui.sortable']).config([
    '$compileProvider',
    function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|file|blob):|data:image\//);
    }
]).directive('fileOnChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeFunc = element.scope()[attrs.fileOnChange];
            element.bind('change', onChangeFunc);
        }
    };
});
//# sourceMappingURL=app.js.map