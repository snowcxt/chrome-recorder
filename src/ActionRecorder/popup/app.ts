angular.module('ar', ['ui.sortable']).config([
    '$compileProvider', ($compileProvider) => {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|file|blob):|data:image\//);
    }
]).directive('fileOnChange',() => {
    return {
        restrict: 'A',
        link: (scope, element, attrs) => {
            var onChangeFunc = element.scope()[(<any>attrs).fileOnChange];
            element.bind('change', onChangeFunc);
        }
    };
});
