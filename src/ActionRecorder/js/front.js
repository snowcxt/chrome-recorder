/// <reference path="../scripts/typings/chrome/chrome.d.ts" />
var ArFront;
(function (ArFront) {
    var isLinked = false, showCursor = false, cursorLabel, showElementSelector = false, stopSendingActions = false, selectedElement, selectedRect, elementSelector;
    var Message = (function () {
        function Message(type, msg) {
            this.type = type;
            this.msg = msg;
        }
        return Message;
    })();
    ArFront.Message = Message;
    var ElementInfo = (function () {
        function ElementInfo(element) {
            if (element) {
                this.tagName = element.tagName;
                this.computedStyle = window.getComputedStyle(element);
                this.innerText = element.innerText;
            }
        }
        return ElementInfo;
    })();
    ArFront.ElementInfo = ElementInfo;
    function adjustPosition(x, y) {
        var doc = document.documentElement, body = document.body;
        x += (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
        y += (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
        return { x: x, y: y };
    }
    function createLabel(id, text, x, y, background) {
        var div = document.createElement('div');
        div.id = id;
        div.innerText = text;
        div.style.position = 'absolute';
        div.style.zIndex = '10000000000';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.fontSize = '12px';
        div.style.fontFamily = '"Helvetica Neue",Helvetica,Arial,sans-serif';
        div.style.fontWeight = '700';
        div.style.color = '#fff';
        div.style.background = background;
        div.style.padding = '.2em .6em .3em';
        div.style.borderRadius = '.25em';
        document.body.appendChild(div);
        return div;
    }
    function createBox(id, text, x, y, width, height) {
        var div = document.createElement('div');
        div.id = id;
        div.innerText = text;
        div.style.position = 'absolute';
        div.style.zIndex = '10000000000';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.width = width + 'px';
        div.style.height = height + 'px';
        div.style.fontSize = '12px';
        div.style.fontFamily = '"Helvetica Neue",Helvetica,Arial,sans-serif';
        div.style.fontWeight = '700';
        div.style.color = '#d9534f';
        div.style.border = '2px solid #d9534f';
        div.style.borderRadius = '.25em';
        div.style.background = 'rgba(160,160,160,0.5)';
        document.body.appendChild(div);
        return div;
    }
    function createElementSeletorBorder() {
        var div = document.createElement('div');
        div.style.display = 'none';
        div.style.position = 'absolute';
        div.style.zIndex = '10000000000';
        div.style.boxShadow = '0px 0px 2px 1px #888, 0 0 2px 1px #888 inset';
        div.style.border = '2px solid #333';
        div.addEventListener('mousedown', function (e) {
            clearTimeout(setSelectorTimeout);
            chrome.runtime.sendMessage(new Message('waitFor', {
                x: Math.ceil(e.x),
                y: Math.ceil(e.y),
                frameIndex: getFrameIndex(),
                element: new ElementInfo(selectedElement)
            }));
        });
        document.body.appendChild(div);
        return div;
    }
    function setRect(div, x, y, width, heigth) {
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.width = width + 'px';
        div.style.height = heigth + 'px';
    }
    var UserAction = (function () {
        function UserAction(e) {
            this.type = e.type;
            this.frameIndex = getFrameIndex();
            switch (this.type) {
                case 'click':
                    this.x = e.x;
                    this.y = e.y;
                    break;
                case 'scroll':
                    this.scrollX = window.scrollX;
                    this.scrollY = window.scrollY;
                    break;
                case 'input':
                    var rect = e.target.getBoundingClientRect();
                    this.x = Math.ceil(rect.left);
                    this.y = Math.ceil(rect.top);
                    this.value = e.target.value;
                    break;
            }
            //this.element = this.getSelector(<HTMLElement>e.target);
        }
        UserAction.prototype.getSelector = function (context) {
            var index, pathSelector, that = context;
            if (that == 'null')
                throw 'not an  dom reference';
            index = this.getIndex(that);
            while (that.tagName) {
                pathSelector = that.localName + (pathSelector ? '>' + pathSelector : '');
                that = that.parentNode;
            }
            pathSelector = pathSelector + ':nth-of-type(' + index + ')';
            return pathSelector;
        };
        UserAction.prototype.getIndex = function (node) {
            var i = 1;
            var tagName = node.tagName;
            while (node.previousSibling) {
                node = node.previousSibling;
                if (node.nodeType === 1 && (tagName.toLowerCase() == node.tagName.toLowerCase())) {
                    i++;
                }
            }
            return i;
        };
        return UserAction;
    })();
    function addEventListener(name) {
        document.addEventListener(name, function (e) {
            if (!stopSendingActions || e.type !== 'click') {
                chrome.runtime.sendMessage(new Message('action', new UserAction(e)));
            }
        });
    }
    function getFrameIndexArray(win, found) {
        var parent = win.parent;
        if (parent && parent !== win) {
            found = getFrameIndexArray(parent, found);
            var pf = parent.document.getElementsByTagName('iframe');
            for (var i = 0; i < pf.length; i++) {
                try {
                    if (pf[i].contentWindow === win) {
                        found.push(i);
                        break;
                    }
                }
                catch (e) {
                }
            }
        }
        return found;
    }
    function getFrameIndex() {
        return getFrameIndexArray(window, []).join('/');
    }
    var setSelectorTimeout;
    function init() {
        if (!isLinked) {
            addEventListener("click");
            addEventListener("scroll");
            addEventListener("input");
            cursorLabel = createLabel('ar-cursor-position', '', 0, 0, '#333');
            cursorLabel.style.display = 'none';
            elementSelector = createElementSeletorBorder();
            document.addEventListener('mousemove', function (e) {
                var position;
                if (showCursor) {
                    chrome.runtime.sendMessage(new Message('front-cursor-iframe', getFrameIndex()));
                    position = adjustPosition(e.x, e.y);
                    cursorLabel.style.display = 'block';
                    cursorLabel.style.left = position.x + 'px';
                    cursorLabel.style.top = position.y + 'px';
                    cursorLabel.innerText = e.x + ', ' + e.y;
                }
                if (showElementSelector) {
                    chrome.runtime.sendMessage(new Message('front-element-iframe', getFrameIndex()));
                    elementSelector.style.display = 'none';
                    clearTimeout(setSelectorTimeout);
                    selectedElement = document.elementFromPoint(e.x, e.y);
                    if (selectedElement) {
                        selectedRect = selectedElement.getBoundingClientRect();
                        position = adjustPosition(selectedRect.left, selectedRect.top);
                        setSelectorTimeout = setTimeout(function () {
                            elementSelector.style.display = 'block';
                            setRect(elementSelector, position.x, position.y, selectedRect.width, selectedRect.height);
                        }, 100);
                    }
                }
            });
        }
        isLinked = true;
    }
    ArFront.init = init;
    var simulate;
    (function (simulate) {
        function getIframeDocument(document, path) {
            if (path.length > 0) {
                var p = path.shift();
                return getIframeDocument(document.querySelectorAll('iframe')[p].contentDocument, path);
            }
            else {
                return document;
            }
        }
        function click(x, y) {
            var ev = document.createEvent("MouseEvent"), el = document.elementFromPoint(x, y);
            ev.initMouseEvent("click", true, true, window, null, x, y, 0, 0, false, false, false, false, 0, null);
            el.dispatchEvent(ev);
        }
        function scrollTo(scrollX, scrollY) {
            window.scrollTo(scrollX, scrollY);
        }
        function input(x, y, value) {
            var el = document.elementFromPoint(x, y);
            el.value = value;
        }
        function run(action) {
            switch (action.type) {
                case 'click':
                    click(action.x, action.y);
                    break;
                case 'input':
                    input(action.x, action.y, action.value);
                    break;
                case 'scroll':
                    scrollTo(action.scrollX, action.scrollY);
                    break;
            }
        }
        simulate.run = run;
    })(simulate = ArFront.simulate || (ArFront.simulate = {}));
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        var msg, element;
        switch (message.type) {
            case 'front-init':
                init();
                break;
            case 'front-simulate':
                var action = message.msg;
                if (action.frameIndex === getFrameIndex()) {
                    simulate.run(action);
                }
                break;
            case 'front-size':
                if (getFrameIndex() === "") {
                    sendResponse({
                        w: window.innerWidth,
                        h: window.innerHeight,
                        devicePixelRatio: devicePixelRatio
                    });
                }
                break;
            case 'front-addFlag':
                msg = message.msg;
                if (msg.frameIndex === getFrameIndex()) {
                    var position = adjustPosition(msg.x, msg.y);
                    createLabel('ar-flag-' + msg.id, msg.text, position.x, position.y, '#d9534f');
                }
                break;
            case 'front-addElementBox':
                msg = message.msg;
                if (msg.frameIndex === getFrameIndex()) {
                    element = document.elementFromPoint(msg.x, msg.y);
                    if (element && element.tagName) {
                        var rect = element.getBoundingClientRect();
                        position = adjustPosition(rect.left, rect.top);
                        createBox('ar-flag-' + msg.id, msg.text, position.x, position.y, rect.width, rect.height);
                    }
                }
                break;
            case 'front-removeFlag':
                msg = message.msg;
                if (msg.frameIndex === getFrameIndex()) {
                    element = document.getElementById('ar-flag-' + msg.id);
                    if (element) {
                        document.body.removeChild(element);
                    }
                }
                break;
            case 'front-showCursor':
                showCursor = true;
                cursorLabel.style.display = 'block';
                break;
            case 'front-hideCursor':
                showCursor = false;
                cursorLabel.style.display = 'none';
                break;
            case 'front-showElement':
                showElementSelector = true;
                stopSendingActions = true;
                elementSelector.style.display = 'block';
                break;
            case 'front-hideElement':
                showElementSelector = false;
                elementSelector.style.display = 'none';
                clearTimeout(setSelectorTimeout);
                setTimeout(function () {
                    stopSendingActions = false;
                }, 500);
                break;
            case 'front-getElement':
                msg = message.msg;
                if (msg.frameIndex === getFrameIndex()) {
                    sendResponse(new ElementInfo(document.elementFromPoint(msg.x, msg.y)));
                }
                break;
            case 'front-cursor-iframe':
                if (message.msg !== getFrameIndex()) {
                    cursorLabel.style.display = 'none';
                }
                break;
            case 'front-element-iframe':
                if (message.msg !== getFrameIndex()) {
                    elementSelector.style.display = 'none';
                }
                break;
        }
    });
    chrome.runtime.sendMessage(new Message('ready'));
})(ArFront || (ArFront = {}));
//# sourceMappingURL=front.js.map