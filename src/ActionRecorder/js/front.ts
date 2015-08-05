/// <reference path="../scripts/typings/chrome/chrome.d.ts" />
module ArFront {
    var isLinked = false,
        showCursor = false,
        cursorLabel: HTMLDivElement,

        showElementSelector = false,
        stopSendingActions = false,
        selectedElement: HTMLElement,
        selectedRect: ClientRect,
        elementSelector: HTMLDivElement;

    export class Message {
        public type: string;
        public msg: any;
        public tabId: number;
        constructor(type: string, msg?: any) {
            this.type = type;
            this.msg = msg;
        }
    }

    export class ElementInfo {
        tagName: string;
        innerText: string;
        computedStyle: any;
        constructor(element: HTMLElement) {
            if (element) {
                this.tagName = element.tagName;
                this.innerText = element.innerText;
                this.computedStyle = {};

                var style = window.getComputedStyle(element),
                    value;

                for (var i = 0; i < style.length; i++) {
                    var key = style[i];
                    if (key.indexOf('-') !== 0) {
                        value = style.getPropertyValue(key);
                        this.computedStyle[key] = value;
                    }
                }
            }
        }
    }

    function adjustPosition(x: number, y: number) {
        var doc = document.documentElement,
            body = document.body;

        x += (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
        y += (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);

        return { x: x, y: y };
    }

    function createLabel(id: string, text: string, x: number, y: number, background: string): HTMLDivElement {
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

    function createBox(id: string, text: string, x: number, y: number, width: number, height: number) {
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
        div.addEventListener('mousedown',(e) => {
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

    function setRect(div: HTMLDivElement, x: number, y: number, width: number, heigth: number) {
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.width = width + 'px';
        div.style.height = heigth + 'px';
    }

    class UserAction implements Ar.IUserAction {
        public frameIndex: string;
        public type: string;
        //public element: string;
        public x: number;
        public y: number;

        public scrollX: number;
        public scrollY: number;

        public value: string;

        constructor(e: MouseEvent) {
            this.type = e.type;
            this.frameIndex = getFrameIndex();
            switch (this.type) {
                case 'click':
                    this.x = e.x;
                    this.y = e.y;
                    break;
                case 'scroll':
                    this.scrollX = (<any>window).scrollX;
                    this.scrollY = (<any>window).scrollY;
                    break;
                case 'input':
                    var rect = (<any>e.target).getBoundingClientRect();
                    this.x = Math.ceil(rect.left);
                    this.y = Math.ceil(rect.top);
                    this.value = (<any>e.target).value;
                    break;
            }
            //this.element = this.getSelector(<HTMLElement>e.target);
        }

        getSelector(context) {
            var index, pathSelector, that = context;
            if (that == 'null') throw 'not an  dom reference';
            index = this.getIndex(that);

            while (that.tagName) {
                pathSelector = that.localName + (pathSelector ? '>' + pathSelector : '');
                that = that.parentNode;
            }
            pathSelector = pathSelector + ':nth-of-type(' + index + ')';

            return pathSelector;
        }

        getIndex(node) {
            var i = 1;
            var tagName = node.tagName;

            while (node.previousSibling) {
                node = node.previousSibling;
                if (node.nodeType === 1 && (tagName.toLowerCase() == node.tagName.toLowerCase())) {
                    i++;
                }
            }
            return i;
        }
    }

    function addEventListener(name) {
        document.addEventListener(name,(e) => {
            if (!stopSendingActions || e.type !== 'click') {
                chrome.runtime.sendMessage(new Message('action', new UserAction(e)));
            }
        });
    }

    function getFrameIndexArray(win: Window, found: number[]): number[] {
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
                } catch (e) {
                }
            }
        }
        return found;
    }

    function getFrameIndex() {
        return getFrameIndexArray(window, []).join('/');
    }

    var setSelectorTimeout: number;

    export function init() {
        if (!isLinked) {
            addEventListener("click");
            addEventListener("scroll");
            addEventListener("input");

            cursorLabel = createLabel('ar-cursor-position', '', 0, 0, '#333');
            cursorLabel.style.display = 'none';

            elementSelector = createElementSeletorBorder();

            document.addEventListener('mousemove',(e) => {
                var position: { x: number; y: number; };
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

                    selectedElement = <any>document.elementFromPoint(e.x, e.y);
                    if (selectedElement) {
                        selectedRect = selectedElement.getBoundingClientRect();
                        position = adjustPosition(selectedRect.left, selectedRect.top);

                        setSelectorTimeout = setTimeout(() => {
                            elementSelector.style.display = 'block';
                            setRect(elementSelector, position.x, position.y, selectedRect.width, selectedRect.height);
                        }, 100);
                    }
                }
            });
        }

        isLinked = true;
    }

    export module simulate {
        function getIframeDocument(document: HTMLDocument, path: number[]) {
            if (path.length > 0) {
                var p = path.shift();
                return getIframeDocument((<HTMLIFrameElement>document.querySelectorAll('iframe')[p]).contentDocument, path);
            } else {
                return document;
            }
        }

        function mouseEvent(event: string, x: number, y: number, key: number) {
            var ev = document.createEvent("MouseEvent"),
                el = document.elementFromPoint(x, y);
            ev.initMouseEvent(
                event,
                true /* bubble */, true /* cancelable */,
                window, null,
                x, y, x, y, /* coordinates */
                false, false, false, false, /* modifier keys */
                key, null
                );
            el.dispatchEvent(ev);
        }

        function click(x, y) {
            mouseEvent("click", x, y, 0);
        }

        function mouseup(x: number, y: number, key: number) {
            mouseEvent("mouseup", x, y, key);
        }

        function scrollTo(scrollX, scrollY) {
            window.scrollTo(scrollX, scrollY);
        }

        function input(x, y, value) {
            var el = document.elementFromPoint(x, y);
            (<any>el).value = value;
        }

        export function run(action: Ar.IUserAction) {
            switch (action.type) {
                case 'click':
                    click(action.x, action.y);
                    break;
                case 'mouseup':
                    mouseup(action.x, action.y, action.key);
                    break;
                case 'input':
                    input(action.x, action.y, action.value);
                    break;
                case 'scroll':
                    scrollTo(action.scrollX, action.scrollY);
                    break;
            }
        }
    }

    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
        var msg, element;
        switch (message.type) {
            case 'front-init':
                init();
                break;
            case 'front-simulate':
                var action: Ar.IUserAction = message.msg;
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
                setTimeout(() => {
                    stopSendingActions = false;
                }, 500);
                break;
            case 'front-getElement':
                msg = message.msg;
                if (msg.frameIndex === getFrameIndex()) {
                    sendResponse(new ElementInfo(<any>document.elementFromPoint(msg.x, msg.y)));
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
}

