/// <reference path="scripts/typings/chrome/chrome.d.ts" />
/// <reference path="scripts/typings/chrome/chrome-app.d.ts" />

var sockeId: number = null;

chrome.app.runtime.onLaunched.addListener(() => {
    chrome.app.window.create('index.html', {
        id: 'Chrome-Recorder-Socket-Server',
        frame: "none",
        singleton: true,
        innerBounds: {
            width: 600,
            height: 310
        }
    });
});

chrome.runtime.onSuspend.addListener(() => {
    if (sockeId !== null) {
        chrome.sockets.tcpServer.close(sockeId);
        console.log('close socket: ' + sockeId);
    }
});