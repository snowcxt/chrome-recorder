var popup,
    currentTab;

chrome.browserAction.onClicked.addListener((tab) => {
    if (!popup) {
        chrome.tabs.query({ active: true, currentWindow: true },(tabs) => {
            currentTab = tabs[0];

            chrome.windows.create({
                url: "popup/index.html",
                type: "popup",
                width: 1150,
                height: 700
            });
        });
    }
});

chrome.commands.onCommand.addListener((command) => {
    if (popup) {
        try {
            switch (command) {
                case 'screenshot':
                    popup.takeScreenshot();
                    break;
                case 'cursor':
                    popup.toggleCursor();
                    break;
                case 'wait':
                    popup.toggleGetWaitFor();
                    break;;
            }
        } catch (e) {
        }
    }
});