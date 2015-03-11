module Ar {
    export module Rh {
        export function parseRequestBody(body: chrome.webRequest.RequestBody): any {
            var data: any = null;

            if (body.error) {
                data = body.error;
            } else if (body.formData) {
                data = {};
                for (var key in body.formData) {
                    var array = body.formData[key];
                    if (array.length > 1) {
                        data[key] = array;
                    } else {
                        data[key] = array[0];
                    }
                }
            } else {
                if ((<any>body.raw).length > 0) {
                    data = String.fromCharCode.apply(null, new Uint8Array(body.raw[0].bytes));
                }
            }
            return data;
        }

        function parsePostData(params: Array<{ name: string; value: string }>, omit: string[]) {
            var body = {};
            _.each(params,(param) => {
                if (omit.indexOf(param.name) < 0) {
                    body[param.name] = param.value;
                }
            });

            return body;
        }

        function getQueryParams(qs) {
            qs = qs.split("+").join(" ");

            var params = {}, tokens,
                re = /[?&]?([^=]+)=([^&]*)/g;

            while (tokens = re.exec(qs)) {
                params[decodeURIComponent(tokens[1])]
                = decodeURIComponent(tokens[2]);
            }

            return params;
        };

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

        export function getMockRequestIndex(url: string, method: string, requestBody: any, omit: string[], entries: any[]): number {
            var index = -1,
                body,
                request,
                urlObject = parseUrl(url, omit);
            _.each(entries,(entry: any, i) => {
                if (entry.request.method === method && _.isEqual(urlObject, parseUrl(entry.request.url, omit))) {
                    if (requestBody) {
                        if (entry.request.postData.params) {
                            request = _.omit(requestBody, omit);
                            body = parsePostData(entry.request.postData.params, omit);
                            if (_.isEqual(request, body)) {
                                index = i;
                                return false;
                            }
                        } else if (entry.request.postData.text && entry.request.postData.text === requestBody) {
                            index = i;
                            return false;
                        }
                    } else {
                        index = i;
                        return false;
                    }
                }
                return true;
            });

            return index;
        }

        export function filterHarEntries(entries: Array<any>, mimeTypes: string[]) {
            if (mimeTypes && mimeTypes.length > 0) {
                entries = _.filter(entries,(entry: any) => {
                    return mimeTypes.indexOf(entry.response.content.mimeType) > -1;
                });
            }
            return _.map(entries,(entry) => {
                entry.hitLog = [];
                return entry;
            });
        }
    }
}