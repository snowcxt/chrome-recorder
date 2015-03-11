var Sh;
(function (Sh) {
    Sh.data = {};
    var dataArray = [], currentNumber = 0;
    function stringToUint8Array(string) {
        //string += '\n';
        var buffer = new ArrayBuffer(string.length);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < string.length; i++) {
            view[i] = string.charCodeAt(i);
        }
        return buffer;
    }
    ;
    function arrayBufferToString(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }
    function form2Json(str) {
        "use strict";
        var obj, i, pt, keys, j, ev;
        //if (typeof form2Json.br !== 'function') {
        var br = function (repl) {
            if (repl.indexOf(']') !== -1) {
                return repl.replace(/\](.+?)(,|$)/g, function ($1, $2, $3) {
                    return br($2 + '}' + $3);
                });
            }
            return repl;
        };
        //}
        str = '{"' + (str.indexOf('%') !== -1 ? decodeURI(str) : str) + '"}';
        obj = str.replace(/\=/g, '":"').replace(/&/g, '","').replace(/\[/g, '":{"');
        obj = JSON.parse(obj.replace(/\](.+?)(,|$)/g, function ($1, $2, $3) {
            return br($2 + '}' + $3);
        }));
        pt = ('&' + str).replace(/(\[|\]|\=)/g, '"$1"').replace(/\]"+/g, ']').replace(/&([^\[\=]+?)(\[|\=)/g, '"&["$1]$2');
        pt = (pt + '"').replace(/^"&/, '').split('&');
        for (i = 0; i < pt.length; i++) {
            ev = obj;
            keys = pt[i].match(/(?!:(\["))([^"]+?)(?=("\]))/g);
            for (j = 0; j < keys.length; j++) {
                if (!ev.hasOwnProperty(keys[j])) {
                    if (keys.length > (j + 1)) {
                        ev[keys[j]] = {};
                    }
                    else {
                        ev[keys[j]] = pt[i].split('=')[1].replace(/"/g, '');
                        break;
                    }
                }
                ev = ev[keys[j]];
            }
        }
        return obj;
    }
    var ContentType = {
        FormData: 0,
        FormUrlencoded: 1,
        Raw: 2
    };
    function getBody(startIndex, len, lines, contentType) {
        for (var i = startIndex; i < len - 1; i++) {
            if (!lines[i]) {
                if (contentType === ContentType.FormUrlencoded) {
                    return JSON.stringify(form2Json(lines[i + 1]));
                }
                else {
                    return lines[i + 1];
                }
            }
        }
        return null;
    }
    function getContentType(lines) {
        var contentTypeKey = 'Content-Type:', line, contentType, len = lines.length;
        for (var i = 1; i < len; i++) {
            line = lines[i].trim();
            if (line.indexOf(contentTypeKey) === 0) {
                contentType = line.substring(contentTypeKey.length + 1).trim();
                if (contentType.indexOf('multipart/form-data') === 0) {
                    return "";
                }
                else if (contentType.indexOf('application/x-www-form-urlencoded') === 0) {
                    return getBody(i + 1, len, lines, ContentType.FormUrlencoded);
                }
                else {
                    return getBody(i + 1, len, lines, ContentType.Raw);
                }
            }
        }
        return "";
    }
    function parseUrl(url) {
        var lastPartIndex = url.lastIndexOf('/');
        return {
            last: url.substring(lastPartIndex + 1)
        };
    }
    function createConnection(port, next) {
        chrome.sockets.tcpServer.create({}, function (createInfo) {
            chrome.sockets.tcpServer.listen(createInfo.socketId, '127.0.0.1', port, function (resultCode) {
                if (resultCode < 0) {
                    console.log("Error listening:" + chrome.runtime.lastError.message);
                    return;
                }
                chrome.sockets.tcpServer.onAccept.addListener(function (info) {
                    if (info.socketId != createInfo.socketId)
                        return;
                    chrome.sockets.tcp.setPaused(info.clientSocketId, false);
                });
                next.onConnected(createInfo.socketId);
            });
        });
        chrome.sockets.tcp.onReceive.addListener(function (recvInfo) {
            var datastr = arrayBufferToString(recvInfo.data);
            var lines = datastr.split('\r\n');
            var firstline = lines[0];
            var flparts = firstline.split(' ');
            var method = flparts[0];
            var uri = decodeURI(flparts[1].substring(1));
            var version = flparts[2];
            if (uri && uri.toLowerCase().indexOf("get/") === 0) {
                var query = uri.substring(uri.indexOf("get/") + "get/".length), response = Sh.data[query];
                datastr = response.response.content.text;
                next.onQuery({
                    time: new Date(),
                    method: response.request.method,
                    url: parseUrl(response.request.url)
                });
            }
            else if (uri && uri.toLowerCase() === "clear" && method === "GET") {
                Sh.data = {};
                dataArray = [];
                currentNumber = 0;
                datastr = 'true';
                next.onClear();
            }
            else if (method === 'PUT') {
                var slashIndex = uri ? uri.indexOf("/") : -1;
                if (slashIndex > -1) {
                    var currentIndex = parseInt(uri.substring(0, slashIndex)) - 1;
                    var total = parseInt(uri.substring(slashIndex + 1));
                    var length = dataArray.length;
                    if (length < currentIndex + 1) {
                        for (var i = length; i < currentIndex + 1; i++) {
                            dataArray.push('');
                        }
                    }
                    dataArray[currentIndex] = getContentType(lines);
                    currentNumber++;
                    if (currentNumber === total) {
                        Sh.data = JSON.parse(dataArray.join(''));
                        datastr = 'true';
                        next.onSet(Sh.data);
                    }
                    else {
                        datastr = 'false';
                    }
                }
                else {
                    Sh.data = JSON.parse(getContentType(lines));
                    datastr = 'true';
                }
            }
            var headers = [
                "HTTP/1.1 200 OK",
                "Access-Control-Allow-Origin: *"
            ];
            var result = stringToUint8Array(headers.join("\r\n") + "\r\n\r\n" + datastr);
            chrome.sockets.tcp.send(recvInfo.socketId, result, function () {
            });
            chrome.sockets.tcp.disconnect(recvInfo.socketId);
        });
    }
    Sh.createConnection = createConnection;
    function closeConnection(sockeId, next) {
        chrome.sockets.tcpServer.close(sockeId, next);
    }
    Sh.closeConnection = closeConnection;
})(Sh || (Sh = {}));
//# sourceMappingURL=socket-helper.js.map