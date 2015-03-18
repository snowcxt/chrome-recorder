var Ar;
(function (Ar) {
    var Rh;
    (function (Rh) {
        function parseRequestBody(body) {
            var data = null;
            if (body.error) {
                data = body.error;
            }
            else if (body.formData) {
                data = {};
                for (var key in body.formData) {
                    var array = body.formData[key];
                    if (array.length > 1) {
                        data[key] = array;
                    }
                    else {
                        data[key] = array[0];
                    }
                }
            }
            else {
                if (body.raw.length > 0) {
                    data = String.fromCharCode.apply(null, new Uint8Array(body.raw[0].bytes));
                }
            }
            return data;
        }
        Rh.parseRequestBody = parseRequestBody;
        function parsePostData(params, omit) {
            var body = {};
            _.each(params, function (param) {
                if (omit.indexOf(param.name) < 0) {
                    body[param.name] = param.value;
                }
            });
            return body;
        }
        function getQueryParams(qs) {
            qs = qs.split("+").join(" ");
            var params = {}, tokens, re = /[?&]?([^=]+)=([^&]*)/g;
            while (tokens = re.exec(qs)) {
                params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
            }
            return params;
        }
        ;
        function parseUrl(url, omit) {
            var parser = document.createElement('a');
            parser.href = url;
            //"http://example.com:3000/pathname/?search=test#hash";
            //parser.protocol; // => "http:"
            //parser.hostname; // => "example.com"
            //parser.port;     // => "3000"
            //parser.pathname; // => "/pathname/"
            //parser.search;   // => "?search=test"
            //parser.hash;     // => "#hash"
            //parser.host;     // => "example.com:3000"
            //return parser;
            return {
                host: parser.host,
                pathname: parser.pathname,
                params: _.omit(getQueryParams(parser.search), omit)
            };
        }
        function getMockRequestIndex(url, method, requestBody, omit, entries) {
            var index = -1, body, request, urlObject = parseUrl(url, omit);
            _.each(entries, function (entry, i) {
                if (entry.request.method === method && _.isEqual(urlObject, parseUrl(entry.request.url, omit))) {
                    if (requestBody) {
                        if (entry.request.postData.params) {
                            request = _.omit(requestBody, omit);
                            body = parsePostData(entry.request.postData.params, omit);
                            if (_.isEqual(request, body)) {
                                index = i;
                                return false;
                            }
                        }
                        else if (entry.request.postData.text) {
                            index = i;
                            return false;
                        }
                    }
                    else {
                        index = i;
                        return false;
                    }
                }
                return true;
            });
            return index;
        }
        Rh.getMockRequestIndex = getMockRequestIndex;
        function filterHarEntries(entries, mimeTypes) {
            if (mimeTypes && mimeTypes.length > 0) {
                entries = _.filter(entries, function (entry) {
                    return mimeTypes.indexOf(entry.response.content.mimeType) > -1;
                });
            }
            return _.map(entries, function (entry) {
                entry.hitLog = [];
                return entry;
            });
        }
        Rh.filterHarEntries = filterHarEntries;
    })(Rh = Ar.Rh || (Ar.Rh = {}));
})(Ar || (Ar = {}));
//# sourceMappingURL=request-helper.js.map