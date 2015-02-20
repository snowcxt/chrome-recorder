# Chrome Recorder
Chrome Recorder is a chrome extension that can record the user interactions, take screenshots and replay the actions. 

You can install the extension via https://chrome.google.com/webstore/detail/gjdedjgddbgejncikonfdikgmjakmnoi. After the installation, please restart the Chrome then you can launch this extension and upload the sample test - getbootstrap.json by clicking  button and click  button to run the test.

## Tutorial 

#### Upload saved test case
![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424390416/input-upload_mtz115.png)

Input JSON- copy json into the textarea and click upload

Upload JSON- browse a json file and upload the file

#### Create a new test case
**Chrome Recorder now can only  record clicks, inputs and document level scroll events**

1. input the url, window type and window size
2. click ![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424390991/open_url_sfe74h.png) to open the url. **(Please do not resize the window. If you want to change the size, please input the window size again and open a new window)** 
3. click ![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424391067/record_events_d9ih0o.png) to start the events recording

 Now the extension will capture click, input the document level scroll events. You can click ![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424391129/take_screenshot_ewfrwj.png) to take a screenshot as a checking point of the testing case.

 In case of that the click event handler stops the default browser behavior, the Chrome Recorder cannot receive the click event. You can turn on the cursor position by clicking ![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424391190/view_cursor_b8puce.png). Now the Chrome Record can capture the click event, however it will not trigger the actual click event. You need to click ![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424391190/view_cursor_b8puce.png) again to turn it off and click the element.

4. click ![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424390416/waitfor_tj3z26.png) to get an element for waiting. The test case will pause the test process until the selected element shows up. 
5. click ![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424391318/stop_nnm3en.png) / ![alt tag](http://res.cloudinary.com/hypr6wanu/image/upload/v1424391318/resume_gxo6te.png) button to stop / resume the events capture


## TODO
- documentation
- refactor code
- capture more types of event, like mouse over, key press, touch start, etc.
- crop image. Instead of comparing the whole image, user can specify a region of an image for the comparison.
- better wait for mechanism. 
- custom step
- better ui design / logo
- XHR recorder
